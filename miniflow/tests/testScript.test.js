import { describe, it, expect } from 'vitest';
import { rulesClean } from '../src/core/rulesCleaner.js';

// PRD success criterion #2, made executable for the offline cleaner:
// a fixed 20-utterance script — 3 with deliberate self-corrections,
// 3 with um/uh fillers — where at least 16 of 20 outputs must match the
// "I'd send this without edits" expectation, and all 3 self-corrections
// must resolve to the corrected version only.
//
// (On the PC, the same script is read aloud end-to-end; this file pins the
// cleanup half of that behavior so regressions show up in CI, not in daily
// use.)

const SCRIPT = [
  // -- 3 deliberate self-corrections ---------------------------------------
  { say: "let's meet Tuesday, wait, no, Friday",
    want: "Let's meet Friday.", correction: true },
  { say: 'the call is at 5pm, actually 6pm',
    want: 'The call is at 6pm.', correction: true },
  { say: 'send the invite to Bob, I mean Alice',
    want: 'Send the invite to Alice.', correction: true },
  // -- 3 with um/uh fillers -------------------------------------------------
  { say: 'um can you review my pull request when you get a chance',
    want: 'Can you review my pull request when you get a chance.' },
  { say: 'the deploy uh went out this morning and uh everything looks stable',
    want: 'The deploy went out this morning and everything looks stable.' },
  { say: 'um so the meeting moved to thursday at noon',
    want: 'So the meeting moved to thursday at noon.' },
  // -- 14 typical utterances ------------------------------------------------
  { say: 'sounds good to me', want: 'Sounds good to me.' },
  { say: 'can we push the deadline to next week', want: 'Can we push the deadline to next week.' },
  { say: 'i will send the report tonight', want: 'I will send the report tonight.' },
  { say: 'thanks for the quick turnaround', want: 'Thanks for the quick turnaround.' },
  { say: 'let me know if the numbers look off', want: 'Let me know if the numbers look off.' },
  { say: 'is the staging environment back up?', want: 'Is the staging environment back up?' },
  { say: 'i think we should ship it', want: 'I think we should ship it.' },
  { say: 'please add me to the thread', want: 'Please add me to the thread.' },
  { say: 'the client signed off this afternoon', want: 'The client signed off this afternoon.' },
  { say: 'running five minutes late', want: 'Running five minutes late.' },
  { say: 'good catch, fixing it now', want: 'Good catch, fixing it now.' },
  { say: 'can you resend the invite', want: 'Can you resend the invite.' },
  { say: 'no objections from my side', want: 'No objections from my side.' },
  { say: 'lunch at the usual place?', want: 'Lunch at the usual place?' },
];

describe('PRD 20-utterance test script (offline cleaner)', () => {
  it('has exactly 20 utterances: 3 corrections, 3 filler-heavy', () => {
    expect(SCRIPT).toHaveLength(20);
    expect(SCRIPT.filter((u) => u.correction)).toHaveLength(3);
    expect(SCRIPT.filter((u) => /\b(um|uh)\b/.test(u.say))).toHaveLength(3);
  });

  it('at least 16 of 20 outputs need zero edits', () => {
    const zeroEdit = SCRIPT.filter((u) => rulesClean(u.say) === u.want);
    expect(zeroEdit.length).toBeGreaterThanOrEqual(16);
  });

  it('all 3 self-corrections resolve to the corrected version only', () => {
    for (const u of SCRIPT.filter((x) => x.correction)) {
      const out = rulesClean(u.say);
      expect(out).toBe(u.want);
      // The discarded word must be gone entirely.
      expect(out).not.toMatch(/Tuesday|5pm|Bob/);
    }
  });
});
