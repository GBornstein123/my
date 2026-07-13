// Deterministic, offline cleanup. Used when no Anthropic API key is set,
// when the network is down, and always as the safety net behind the LLM
// path. Intentionally conservative: it removes fillers, resolves the common
// self-correction shapes, and fixes casing/terminal punctuation — nothing
// else.

const FILLER_WORDS = new Set([
  'um', 'uh', 'uhm', 'umm', 'uhh', 'erm', 'er', 'hmm', 'hm', 'mhm',
]);

// Phrases that signal "discard what I just said, use what follows".
// Ordered longest-first so the longest marker wins.
const CORRECTION_MARKERS = [
  'wait, no,', 'wait no,', 'wait, no', 'wait no',
  'no, wait,', 'no wait,', 'no, wait', 'no wait',
  'actually,', 'actually',
  'i mean,', 'i mean',
  'scratch that,', 'scratch that',
];

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function removeFillers(text) {
  return text
    .split(/\s+/)
    .filter((token) => {
      const bare = token.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
      return !FILLER_WORDS.has(bare);
    })
    .join(' ');
}

// Resolves "X, wait, no, Y" / "X, actually Y" to "... Y".
//
// Heuristic: when a correction marker appears mid-sentence, the word
// immediately before it is what the speaker is replacing, so both the
// marker and that word are dropped. "let's meet Tuesday, wait, no, Friday"
// -> "let's meet Friday". Markers at the very start of an utterance
// ("Actually, let's go") are left alone.
export function resolveSelfCorrections(text) {
  let result = text;
  for (let pass = 0; pass < 5; pass++) {
    let changed = false;
    for (const marker of CORRECTION_MARKERS) {
      const pattern = new RegExp(
        `(\\S+?)[,.]?\\s+${escapeRegex(marker)}\\s+`, 'i');
      const match = pattern.exec(result);
      if (!match) continue;
      // A bare "actually" mid-sentence is often meaningful; it only counts
      // as a correction when ASR wrote a comma nearby.
      if (marker === 'actually' && !match[0].includes(',')) continue;
      result = result.slice(0, match.index) + result.slice(match.index + match[0].length);
      changed = true;
      break;
    }
    if (!changed) break;
  }
  return result;
}

export function normalizePunctuation(text) {
  let t = text
    .replace(/\s+/g, ' ')
    .replace(/ ,/g, ',')
    .replace(/ \./g, '.')
    .replace(/,{2,}/g, ',')
    .trim();
  // Leading orphan punctuation left behind by filler removal.
  t = t.replace(/^[,.;:\s]+/, '');
  if (!t) return t;
  const last = t[t.length - 1];
  if (!'.!?'.includes(last)) {
    if (last === ',' || last === ';') t = t.slice(0, -1);
    t += '.';
  }
  return t;
}

export function fixCasing(text) {
  if (!text) return text;
  let t = text[0].toUpperCase() + text.slice(1);
  t = t.replace(/([.!?]\s+)([a-z])/g, (_, sep, ch) => sep + ch.toUpperCase());
  t = t.replace(/\bi\b/g, 'I'); // standalone "i" -> "I"
  return t;
}

export function rulesClean(transcript) {
  let text = transcript.trim();
  if (!text) return '';
  text = removeFillers(text);
  text = resolveSelfCorrections(text);
  text = normalizePunctuation(text);
  text = fixCasing(text);
  return text;
}

/** TranscriptCleaner interface: { clean(transcript) -> Promise<string> } */
export const rulesCleaner = {
  clean: async (transcript) => rulesClean(transcript),
};
