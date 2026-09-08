#!/usr/bin/env python3
"""Regression tests for the transcript pipeline.

Each case here is a bug that was found by running the pipeline for the first
time. No network required -- fixtures stand in for real caption/feed output.

Run: python3 tools/ja-transcripts/tests/test_pipeline.py
"""
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FIXTURES = Path(__file__).resolve().parent / "fixtures"
sys.path.insert(0, str(ROOT))

import pull_podcasts  # noqa: E402
import vtt_to_txt  # noqa: E402


def render(name):
    """Parsed text lines for a fixture, without the timestamps."""
    cues = vtt_to_txt.parse((FIXTURES / name).read_text(encoding="utf-8"))
    return [text for _, text in cues]


class TestVtt(unittest.TestCase):
    def test_auto_captions_are_not_duplicated(self):
        """The rolling two-line window must collapse to plain prose."""
        self.assertEqual(render("auto.en.vtt"), [
            "the biggest opportunity in your",
            "business is hidden in plain",
            "sight and most people miss it",
        ])

    def test_first_cue_survives_space_only_line(self):
        """YouTube puts a space-only line inside cues; it is not a separator."""
        cues = vtt_to_txt.parse((FIXTURES / "auto.en.vtt").read_text())
        self.assertEqual(cues[0][0], "00:00:00")

    def test_cue_identifiers_are_not_text(self):
        """Numbered cue IDs in manual subtitles must not leak into the prose."""
        lines = render("manual.en.vtt")
        self.assertEqual(lines, [
            "Welcome back to the show.",
            "Today we talk about preeminence.",
            "It changes everything.",
        ])
        self.assertFalse(any(l.rstrip().endswith(("1", "2", "3")) for l in lines))

    def test_recognizer_revision_supersedes(self):
        """A re-emitted line with an edited word replaces, not repeats."""
        self.assertEqual(render("revise.en.vtt"), [
            "so the opportunities here",
            "are enormous for you",
        ])

    def test_note_block_between_cues_is_dropped(self):
        self.assertEqual(render("note.en.vtt"), [
            "First real caption line.",
            "Second real caption line.",
        ])

    def test_style_and_region_blocks_are_dropped(self):
        self.assertEqual(render("style.en.vtt"),
                         ["The real leverage is in the follow-up."])

    def test_distinct_language_tracks_do_not_collide(self):
        """`.en` and `.en-orig` for one video must not overwrite each other."""
        with tempfile.TemporaryDirectory() as d:
            src = (FIXTURES / "manual.en.vtt").read_text()
            outs = set()
            for tag in ("en", "en-orig"):
                p = Path(d) / f"2024-01-05_vid_Talk.{tag}.vtt"
                p.write_text(src)
                outs.add(vtt_to_txt.convert(p).name)
            self.assertEqual(len(outs), 2, f"collided on {outs}")


class TestPodcasts(unittest.TestCase):
    def test_feed_parses_titles_dates_and_audio(self):
        eps = pull_podcasts.parse_feed((FIXTURES / "feed.xml").as_uri())
        self.assertEqual(len(eps), 3)
        self.assertEqual(eps[0]["date"], "2026-09-03")
        self.assertTrue(all(e["audio"] for e in eps))

    def test_timestamps_do_not_wrap_after_24h(self):
        self.assertEqual(pull_podcasts.hms(0), "00:00:00")
        self.assertEqual(pull_podcasts.hms(3725.5), "01:02:05")
        self.assertEqual(pull_podcasts.hms(90000), "25:00:00")

    def test_slug_strips_punctuation_and_bounds_length(self):
        s = pull_podcasts.slug('Ep 300 — Why "Trusted Advisor" Wins')
        self.assertEqual(s, "Ep-300-Why-Trusted-Advisor-Wins")
        self.assertLessEqual(len(pull_podcasts.slug("x" * 500).encode()), 120)

    def test_failed_transcription_leaves_no_partial_txt(self):
        """A partial .txt would be treated as 'done' and never retried."""
        class Boom:
            def transcribe(self, path, **kw):
                def gen():
                    yield type("S", (), {"start": 0.0, "text": "ok"})()
                    raise RuntimeError("decode error midway")
                return gen(), None

        with tempfile.TemporaryDirectory() as d:
            out = Path(d) / "ep.txt"
            with self.assertRaises(RuntimeError):
                pull_podcasts.transcribe(Path("ep.mp3"), out, Boom())
            self.assertFalse(out.exists())


if __name__ == "__main__":
    unittest.main(verbosity=2)
