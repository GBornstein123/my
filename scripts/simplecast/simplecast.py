"""Minimal Simplecast REST API client.

Standard library only, so it runs anywhere Python 3.8+ is installed.

Docs: https://apidocs.simplecast.com  (token: Simplecast -> Settings -> Private Apps)

Design notes
------------
* Every request is throttled and retried, because bulk jobs over a 300+ episode
  back catalog will otherwise trip rate limits partway through.
* ``update_episode`` probes the write verb once (PATCH -> POST -> PUT) and then
  caches whatever the API accepted. Simplecast's write surface is thinner than
  its read surface and the documented verb has moved around, so we find out
  empirically instead of hard-coding a guess.
"""

from __future__ import annotations

import json
import random
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, Iterable, Iterator, List, Optional

DEFAULT_BASE_URL = "https://api.simplecast.com"
RETRYABLE_STATUS = {408, 425, 429, 500, 502, 503, 504}
WRITE_METHOD_CANDIDATES = ("PATCH", "POST", "PUT")


class SimplecastError(RuntimeError):
    """An API call failed in a way we are not going to retry."""

    def __init__(self, message: str, status: Optional[int] = None, body: str = ""):
        super().__init__(message)
        self.status = status
        self.body = body


class SimplecastClient:
    def __init__(
        self,
        token: str,
        base_url: str = DEFAULT_BASE_URL,
        requests_per_second: float = 3.0,
        max_retries: int = 5,
        timeout: int = 30,
        update_method: str = "auto",
        log=print,
    ):
        if not token:
            raise SimplecastError("No API token. Set SIMPLECAST_API_TOKEN or pass --token.")
        self.token = token
        self.base_url = base_url.rstrip("/")
        self.min_interval = 1.0 / requests_per_second if requests_per_second > 0 else 0.0
        self.max_retries = max_retries
        self.timeout = timeout
        self.log = log
        self.request_count = 0
        self._last_request_at = 0.0
        if update_method == "auto":
            self._write_method: Optional[str] = None
            self._write_candidates: List[str] = list(WRITE_METHOD_CANDIDATES)
        else:
            self._write_method = update_method.upper()
            self._write_candidates = [self._write_method]

    # ------------------------------------------------------------------ HTTP

    def _throttle(self) -> None:
        wait = self.min_interval - (time.monotonic() - self._last_request_at)
        if wait > 0:
            time.sleep(wait)
        self._last_request_at = time.monotonic()

    def request(
        self,
        method: str,
        path: str,
        params: Optional[Dict[str, Any]] = None,
        body: Optional[Dict[str, Any]] = None,
    ) -> Any:
        url = path if path.startswith("http") else f"{self.base_url}/{path.lstrip('/')}"
        if params:
            clean = {k: v for k, v in params.items() if v is not None}
            if clean:
                sep = "&" if "?" in url else "?"
                url = f"{url}{sep}{urllib.parse.urlencode(clean)}"

        payload = json.dumps(body).encode() if body is not None else None
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Accept": "application/json",
            "User-Agent": "simplecast-bulk-updates/1.0",
        }
        if payload is not None:
            headers["Content-Type"] = "application/json"

        attempt = 0
        while True:
            self._throttle()
            req = urllib.request.Request(url, data=payload, headers=headers, method=method)
            try:
                self.request_count += 1
                with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                    raw = resp.read().decode("utf-8", "replace")
                return json.loads(raw) if raw.strip() else {}
            except urllib.error.HTTPError as exc:
                raw = exc.read().decode("utf-8", "replace")
                if exc.code in RETRYABLE_STATUS and attempt < self.max_retries:
                    delay = self._backoff(attempt, exc.headers.get("Retry-After"))
                    self.log(f"  [retry] {method} {url} -> HTTP {exc.code}; sleeping {delay:.1f}s")
                    time.sleep(delay)
                    attempt += 1
                    continue
                raise SimplecastError(
                    f"{method} {url} failed with HTTP {exc.code}: {raw[:400]}",
                    status=exc.code,
                    body=raw,
                ) from exc
            except urllib.error.URLError as exc:
                if attempt < self.max_retries:
                    delay = self._backoff(attempt, None)
                    self.log(f"  [retry] {method} {url} -> {exc.reason}; sleeping {delay:.1f}s")
                    time.sleep(delay)
                    attempt += 1
                    continue
                raise SimplecastError(f"{method} {url} failed: {exc.reason}") from exc

    @staticmethod
    def _backoff(attempt: int, retry_after: Optional[str]) -> float:
        if retry_after:
            try:
                return min(float(retry_after), 120.0)
            except ValueError:
                pass
        return min(2.0 ** attempt, 60.0) + random.uniform(0, 0.5)

    # ------------------------------------------------------------------ reads

    def paginate(self, path: str, params: Optional[Dict[str, Any]] = None, limit: int = 100) -> Iterator[dict]:
        """Yield every item of a paginated collection endpoint."""
        offset = 0
        seen = 0
        while True:
            page = self.request("GET", path, params={**(params or {}), "limit": limit, "offset": offset})
            items = page.get("collection") or []
            for item in items:
                yield item
            seen += len(items)
            pages = page.get("pages") or {}
            total = pages.get("total")
            if not items:
                return
            if isinstance(total, int) and seen >= total:
                return
            if len(items) < limit:
                return
            offset += limit

    def list_podcasts(self) -> List[dict]:
        return list(self.paginate("/podcasts"))

    def find_podcast(self, name_or_id: Optional[str]) -> dict:
        podcasts = self.list_podcasts()
        if not podcasts:
            raise SimplecastError("This token has access to no podcasts.")
        if not name_or_id:
            if len(podcasts) == 1:
                return podcasts[0]
            names = ", ".join(f"{p.get('title')!r}" for p in podcasts)
            raise SimplecastError(f"Multiple podcasts on this account; pass --podcast. Found: {names}")
        needle = name_or_id.strip().lower()
        for podcast in podcasts:
            if podcast.get("id") == name_or_id:
                return podcast
            if (podcast.get("title") or "").strip().lower() == needle:
                return podcast
        matches = [p for p in podcasts if needle in (p.get("title") or "").lower()]
        if len(matches) == 1:
            return matches[0]
        names = ", ".join(f"{p.get('title')!r}" for p in podcasts)
        raise SimplecastError(f"No podcast matched {name_or_id!r}. Available: {names}")

    def list_episodes(self, podcast_id: str, **params: Any) -> Iterator[dict]:
        return self.paginate(f"/podcasts/{podcast_id}/episodes", params=params)

    def get_episode(self, episode_id: str) -> dict:
        return self.request("GET", f"/episodes/{episode_id}")

    # ----------------------------------------------------------------- writes

    @property
    def write_method(self) -> Optional[str]:
        return self._write_method

    def update_episode(self, episode_id: str, payload: Dict[str, Any]) -> Any:
        """Write `payload` to an episode, discovering the accepted verb once."""
        path = f"/episodes/{episode_id}"
        if self._write_method:
            return self.request(self._write_method, path, body=payload)

        last_error: Optional[SimplecastError] = None
        for method in self._write_candidates:
            try:
                result = self.request(method, path, body=payload)
            except SimplecastError as exc:
                # 404/405/501 means "wrong verb"; anything else is a real failure
                # (bad field, permissions) and retrying other verbs only hides it.
                if exc.status in (404, 405, 501):
                    last_error = exc
                    self.log(f"  [probe] {method} not accepted for episode updates (HTTP {exc.status})")
                    continue
                raise
            self._write_method = method
            self.log(f"  [probe] using {method} for episode updates")
            return result
        raise SimplecastError(
            "No write verb accepted by /episodes/{id} (tried "
            + ", ".join(self._write_candidates)
            + "). Your token may be read-only.",
            status=last_error.status if last_error else None,
        )


def flatten(value: Any) -> str:
    """Render an arbitrary API value as comparable text."""
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    if isinstance(value, (int, float, bool)):
        return str(value)
    if isinstance(value, Iterable):
        return ", ".join(flatten(v) for v in value)
    return str(value)
