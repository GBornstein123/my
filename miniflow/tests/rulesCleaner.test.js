import { describe, it, expect } from 'vitest';
import { rulesClean, rulesCleaner } from '../src/core/rulesCleaner.js';
import { guarded } from '../src/core/guardedCleaner.js';

describe('rules cleaner — fillers', () => {
  it('removes um/uh fillers', () => {
    expect(rulesClean('um so I think uh we should ship it'))
      .toBe('So I think we should ship it.');
  });

  it('removes fillers written with punctuation', () => {
    expect(rulesClean("Um, let's start the meeting"))
      .toBe("Let's start the meeting.");
  });

  it('does not remove filler lookalikes inside words', () => {
    expect(rulesClean('bring the umbrella')).toBe('Bring the umbrella.');
  });
});

describe('rules cleaner — self-corrections (PRD user story #2)', () => {
  it('resolves "wait, no" to the corrected version only', () => {
    expect(rulesClean("let's meet Tuesday, wait, no, Friday"))
      .toBe("Let's meet Friday.");
  });

  it('resolves the PRD §1 example: "5pm, actually 6pm" becomes "6pm"', () => {
    expect(rulesClean('the call is at 5pm, actually 6pm'))
      .toBe('The call is at 6pm.');
  });

  it('resolves "I mean" corrections', () => {
    expect(rulesClean('send it to Bob, I mean Alice'))
      .toBe('Send it to Alice.');
  });

  it('leaves a leading "actually" alone (not a correction)', () => {
    expect(rulesClean("actually let's go with the second option"))
      .toBe("Actually let's go with the second option.");
  });
});

describe('rules cleaner — punctuation & casing', () => {
  it('capitalizes and adds terminal punctuation', () => {
    expect(rulesClean('this is a test')).toBe('This is a test.');
  });

  it('preserves existing terminal punctuation', () => {
    expect(rulesClean('is this working?')).toBe('Is this working?');
  });

  it('capitalizes standalone "i"', () => {
    expect(rulesClean('i think i can')).toBe('I think I can.');
  });

  it('returns empty for whitespace-only input', () => {
    expect(rulesClean('   ')).toBe('');
  });

  it('capitalizes after sentence breaks', () => {
    expect(rulesClean('ship it today. tell the team'))
      .toBe('Ship it today. Tell the team.');
  });
});

describe('guarded cleaner integration', () => {
  it('cleans a filler-heavy sentence end to end', async () => {
    const out = await guarded(rulesCleaner).clean(
      'um okay so uh the deploy went out this morning and uh everything looks stable');
    expect(out).toBe(
      'Okay so the deploy went out this morning and everything looks stable.');
  });

  it('falls back to the raw transcript when the cleaner throws', async () => {
    const exploding = { clean: async () => { throw new Error('boom'); } };
    expect(await guarded(exploding).clean('keep this exact text'))
      .toBe('keep this exact text');
  });

  it('applies the divergence guard to hallucinating cleaners', async () => {
    const hallucinating = {
      clean: async () => Array(100).fill('extra').join(' '),
    };
    const transcript = 'please just clean this one short sentence for me thanks';
    expect(await guarded(hallucinating).clean(transcript)).toBe(transcript);
  });
});
