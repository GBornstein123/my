import { choose } from './divergenceGuard.js';
import { rulesClean } from './rulesCleaner.js';

// Wraps any cleaner with the PRD's divergence guardrail: if the cleaned
// output diverges wildly in length from the transcript, or the cleaner
// throws, the raw transcript is used instead. Dictation must never fail
// because cleanup did.
//
// The deterministic rules-cleaned text serves as the shrinkage baseline:
// an LLM may delete as much as legitimate cleanup deletes, but not more
// (see divergenceGuard.js for why the raw transcript alone is the wrong
// yardstick).
export function guarded(cleaner) {
  return {
    async clean(transcript) {
      const trimmed = transcript.trim();
      if (!trimmed) return '';
      try {
        const cleaned = (await cleaner.clean(trimmed)).trim();
        return choose(trimmed, cleaned, rulesClean(trimmed));
      } catch {
        return trimmed;
      }
    },
  };
}
