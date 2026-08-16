"""Minimal YouTube Data API v3 client with OAuth, stdlib only.

Why hand-rolled instead of google-api-python-client: this stays pip-free and
matches scripts/simplecast/. The OAuth flow is the standard installed-app
flow — browser consent once, refresh token cached after that.

Three things about this API that shape the whole design:

1. Writes need OAuth, not an API key. An API key only reads public data.
2. ``videos.update`` DELETES any snippet property you omit. Update the
   description without resending tags and the tags are gone. So every write
   here is read-modify-write of the FULL snippet.
   https://developers.google.com/youtube/v3/docs/videos/update
3. Quota is 10,000 units/day by default and an update costs 50 units, so a
   channel-wide edit is capped near 200 videos/day. Quota is metered here and
   the run stops before it blows through the budget.
"""

from __future__ import annotations

import http.server
import json
import random
import socketserver
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import webbrowser
from pathlib import Path
from typing import Any, Dict, Iterator, List, Optional

API_BASE = "https://www.googleapis.com/youtube/v3"
AUTH_URI = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URI = "https://oauth2.googleapis.com/token"
SCOPE = "https://www.googleapis.com/auth/youtube.force-ssl"

DAILY_QUOTA = 10_000
COST_LIST = 1
COST_UPDATE = 50

TITLE_MAX = 100
DESCRIPTION_MAX = 5000

RETRYABLE_STATUS = {429, 500, 502, 503, 504}


class YouTubeError(RuntimeError):
    def __init__(self, message: str, status: Optional[int] = None, reason: str = ""):
        super().__init__(message)
        self.status = status
        self.reason = reason


class QuotaExceeded(YouTubeError):
    pass


# ------------------------------------------------------------------- OAuth


class _CodeCatcher(http.server.BaseHTTPRequestHandler):
    code: Optional[str] = None
    error: Optional[str] = None

    def do_GET(self):  # noqa: N802
        params = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        _CodeCatcher.code = (params.get("code") or [None])[0]
        _CodeCatcher.error = (params.get("error") or [None])[0]
        body = (b"<h2>Authorized. You can close this tab and return to the terminal.</h2>"
                if _CodeCatcher.code else
                b"<h2>Authorization failed. Check the terminal.</h2>")
        self.send_response(200)
        self.send_header("Content-Type", "text/html")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass


def _load_client_secrets(path: Path) -> Dict[str, str]:
    raw = json.loads(path.read_text())
    block = raw.get("installed") or raw.get("web")
    if not block:
        raise YouTubeError(
            f"{path} is not an OAuth client file. In Google Cloud Console create an "
            "OAuth client of type 'Desktop app' and download its JSON."
        )
    return {"client_id": block["client_id"], "client_secret": block["client_secret"]}


def _token_request(payload: Dict[str, str]) -> Dict[str, Any]:
    data = urllib.parse.urlencode(payload).encode()
    req = urllib.request.Request(TOKEN_URI, data=data, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as exc:
        raise YouTubeError(f"OAuth token request failed: {exc.read().decode()[:300]}") from exc


class Credentials:
    """Access token with refresh, cached to disk between runs."""

    def __init__(self, client_secrets: Path, token_file: Path, log=print):
        self.client_secrets = Path(client_secrets)
        self.token_file = Path(token_file)
        self.log = log
        self._access_token: Optional[str] = None
        self._expires_at = 0.0
        self._refresh_token: Optional[str] = None
        if self.token_file.exists():
            cached = json.loads(self.token_file.read_text())
            self._refresh_token = cached.get("refresh_token")

    def token(self) -> str:
        if self._access_token and time.time() < self._expires_at - 60:
            return self._access_token
        if self._refresh_token:
            self._refresh()
        else:
            self._authorize()
        return self._access_token  # type: ignore[return-value]

    def _store(self, payload: Dict[str, Any]) -> None:
        self._access_token = payload["access_token"]
        self._expires_at = time.time() + int(payload.get("expires_in", 3600))
        if payload.get("refresh_token"):
            self._refresh_token = payload["refresh_token"]
        self.token_file.parent.mkdir(parents=True, exist_ok=True)
        self.token_file.write_text(json.dumps({"refresh_token": self._refresh_token}, indent=2))
        try:
            self.token_file.chmod(0o600)
        except OSError:
            pass

    def _refresh(self) -> None:
        secrets = _load_client_secrets(self.client_secrets)
        try:
            self._store(_token_request({
                **secrets,
                "refresh_token": self._refresh_token,
                "grant_type": "refresh_token",
            }))
        except YouTubeError:
            self.log("Cached refresh token rejected; re-authorizing.")
            self._refresh_token = None
            self._authorize()

    def _authorize(self) -> None:
        secrets = _load_client_secrets(self.client_secrets)
        with socketserver.TCPServer(("127.0.0.1", 0), _CodeCatcher) as httpd:
            port = httpd.server_address[1]
            redirect_uri = f"http://127.0.0.1:{port}"
            url = AUTH_URI + "?" + urllib.parse.urlencode({
                "client_id": secrets["client_id"],
                "redirect_uri": redirect_uri,
                "response_type": "code",
                "scope": SCOPE,
                "access_type": "offline",
                "prompt": "consent",
            })
            self.log("\nAuthorize this tool in your browser:\n" + url + "\n")
            try:
                webbrowser.open(url)
            except Exception:
                pass
            thread = threading.Thread(target=httpd.handle_request, daemon=True)
            thread.start()
            thread.join(timeout=300)

        if _CodeCatcher.error or not _CodeCatcher.code:
            raise YouTubeError(f"Authorization failed or timed out ({_CodeCatcher.error or 'no code'}).")

        self._store(_token_request({
            **secrets,
            "code": _CodeCatcher.code,
            "grant_type": "authorization_code",
            "redirect_uri": redirect_uri,
        }))
        _CodeCatcher.code = None
        self.log("Authorized. Refresh token cached at " + str(self.token_file))


# ------------------------------------------------------------------ client


class YouTubeClient:
    def __init__(self, credentials: Credentials, quota_budget: int = DAILY_QUOTA,
                 max_retries: int = 5, timeout: int = 30, base_url: str = API_BASE, log=print):
        self.credentials = credentials
        self.quota_budget = quota_budget
        self.quota_used = 0
        self.max_retries = max_retries
        self.timeout = timeout
        self.base_url = base_url.rstrip("/")
        self.log = log

    def _spend(self, cost: int) -> None:
        if self.quota_used + cost > self.quota_budget:
            raise QuotaExceeded(
                f"Quota budget reached ({self.quota_used}/{self.quota_budget} units). "
                "Quota resets at midnight Pacific. Re-run with --resume to continue then, "
                "or request a higher quota in the Google Cloud Console."
            )
        self.quota_used += cost

    def request(self, method: str, path: str, params: Optional[Dict[str, Any]] = None,
                body: Optional[Dict[str, Any]] = None, cost: int = 1) -> Dict[str, Any]:
        self._spend(cost)
        url = f"{self.base_url}/{path.lstrip('/')}"
        if params:
            clean = {k: v for k, v in params.items() if v is not None}
            if clean:
                url = f"{url}?{urllib.parse.urlencode(clean)}"

        attempt = 0
        while True:
            payload = json.dumps(body).encode() if body is not None else None
            headers = {
                "Authorization": f"Bearer {self.credentials.token()}",
                "Accept": "application/json",
            }
            if payload is not None:
                headers["Content-Type"] = "application/json"
            req = urllib.request.Request(url, data=payload, headers=headers, method=method)
            try:
                with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                    raw = resp.read().decode("utf-8", "replace")
                return json.loads(raw) if raw.strip() else {}
            except urllib.error.HTTPError as exc:
                raw = exc.read().decode("utf-8", "replace")
                reason = _extract_reason(raw)
                if reason in ("quotaExceeded", "dailyLimitExceeded"):
                    raise QuotaExceeded(
                        "YouTube reports the daily quota is exhausted. It resets at midnight "
                        "Pacific; re-run with --resume then.", status=exc.code, reason=reason)
                if exc.code in RETRYABLE_STATUS and attempt < self.max_retries:
                    delay = min(2.0 ** attempt, 60.0) + random.uniform(0, 0.5)
                    self.log(f"  [retry] {method} {path} -> HTTP {exc.code} ({reason}); sleeping {delay:.1f}s")
                    time.sleep(delay)
                    attempt += 1
                    continue
                raise YouTubeError(f"{method} {path} failed with HTTP {exc.code} ({reason}): {raw[:300]}",
                                   status=exc.code, reason=reason) from exc
            except urllib.error.URLError as exc:
                if attempt < self.max_retries:
                    time.sleep(min(2.0 ** attempt, 60.0))
                    attempt += 1
                    continue
                raise YouTubeError(f"{method} {path} failed: {exc.reason}") from exc

    # --------------------------------------------------------------- reads

    def uploads_playlist_id(self, channel_id: Optional[str] = None) -> str:
        params = {"part": "contentDetails"}
        if channel_id:
            params["id"] = channel_id
        else:
            params["mine"] = "true"
        data = self.request("GET", "channels", params=params, cost=COST_LIST)
        items = data.get("items") or []
        if not items:
            raise YouTubeError("No channel found for these credentials. "
                               "If you manage a brand account, pick it on the consent screen.")
        return items[0]["contentDetails"]["relatedPlaylists"]["uploads"]

    def video_ids(self, playlist_id: str) -> Iterator[str]:
        page_token = None
        while True:
            data = self.request("GET", "playlistItems", cost=COST_LIST, params={
                "part": "contentDetails", "playlistId": playlist_id,
                "maxResults": 50, "pageToken": page_token,
            })
            for item in data.get("items", []):
                video_id = item.get("contentDetails", {}).get("videoId")
                if video_id:
                    yield video_id
            page_token = data.get("nextPageToken")
            if not page_token:
                return

    def videos(self, video_ids: List[str]) -> List[dict]:
        """Full snippet+status for each id, 50 at a time (1 unit per batch)."""
        out: List[dict] = []
        for i in range(0, len(video_ids), 50):
            batch = video_ids[i:i + 50]
            data = self.request("GET", "videos", cost=COST_LIST, params={
                "part": "snippet,status", "id": ",".join(batch), "maxResults": 50,
            })
            out.extend(data.get("items", []))
        return out

    # -------------------------------------------------------------- writes

    def update_snippet(self, video: dict, changes: Dict[str, Any]) -> dict:
        """Write `changes` while preserving every other snippet property.

        The API deletes omitted properties, so this merges into the snippet we
        already read rather than sending a partial object.
        """
        snippet = dict(video.get("snippet") or {})
        snippet.update(changes)
        preflight(video.get("id", "?"), snippet)
        # Read-only fields the API rejects on write.
        for key in ("publishedAt", "channelId", "channelTitle", "thumbnails",
                    "liveBroadcastContent", "localized"):
            snippet.pop(key, None)

        return self.request("PUT", "videos", params={"part": "snippet"}, cost=COST_UPDATE,
                            body={"id": video["id"], "snippet": snippet})


def preflight(video_id: str, snippet: Dict[str, Any]) -> None:
    """Reject a write the API would refuse — or would silently make destructive.

    Called during planning so a dry run surfaces these, and again at write time.
    """
    if not snippet.get("title"):
        raise YouTubeError(f"Video {video_id} has no title; the API requires snippet.title.")
    if not snippet.get("categoryId"):
        raise YouTubeError(
            f"Video {video_id} has no categoryId; the API requires snippet.categoryId "
            "on any snippet write and would reject this. Set a category on the video first.")
    validate_lengths(snippet)


def validate_lengths(snippet: Dict[str, Any]) -> None:
    title = snippet.get("title") or ""
    description = snippet.get("description") or ""
    if len(title) > TITLE_MAX:
        raise YouTubeError(f"Title would be {len(title)} chars; YouTube's limit is {TITLE_MAX}.")
    if len(description) > DESCRIPTION_MAX:
        raise YouTubeError(
            f"Description would be {len(description)} chars; YouTube's limit is {DESCRIPTION_MAX}. "
            "Shorten the appended block or narrow the selection.")


def _extract_reason(raw: str) -> str:
    try:
        errors = json.loads(raw).get("error", {}).get("errors") or []
        return errors[0].get("reason", "") if errors else ""
    except (json.JSONDecodeError, AttributeError, IndexError):
        return ""
