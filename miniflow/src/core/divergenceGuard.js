// PRD §6: "if the LLM output diverges wildly in length from the transcript
// (>1.5x or <0.5x), fall back to the raw transcript."
//
// Two refinements found while testing against the PRD's own examples:
//
// 1. Length is measured in words, not characters, so punctuation-only edits
//    never trip the guard.
// 2. The lower bound is measured against a *baseline* (the transcript after
//    deterministic filler/correction removal), not the raw transcript.
//    The PRD's own example — "let's meet Tuesday, wait, no, Friday" ->
//    "Let's meet Friday." — shrinks to 0.43x of the raw words, which the
//    literal rule would wrongly reject. Corrections legitimately delete
//    words; hallucinations add them. So: growth is judged against the raw
//    transcript (nothing may be added), shrinkage against the baseline
//    (nothing may be cut beyond what cleanup is allowed to cut).

export const MAX_RATIO = 1.5;
export const MIN_RATIO = 0.5;

export function wordCount(s) {
  return s.split(/\s+/).filter(Boolean).length;
}

export function isAcceptable(transcript, cleaned, baseline = transcript) {
  const original = wordCount(transcript);
  const result = wordCount(cleaned);

  // An empty cleanup result is never acceptable for a non-empty transcript.
  if (original > 0 && result === 0) return false;
  if (original === 0) return result === 0;

  // Short utterances legitimately shrink a lot ("um, uh, hi" -> "Hi."),
  // so the ratio guard only applies once there is enough signal.
  if (original < 6) return result <= original + 2;

  const floor = Math.min(original, wordCount(baseline));
  return result >= MIN_RATIO * floor && result <= MAX_RATIO * original;
}

/** Returns `cleaned` when it is within bounds, otherwise `transcript`. */
export function choose(transcript, cleaned, baseline = transcript) {
  return isAcceptable(transcript, cleaned, baseline) ? cleaned : transcript;
}
