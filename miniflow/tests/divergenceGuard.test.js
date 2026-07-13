import { describe, it, expect } from 'vitest';
import { choose, isAcceptable } from '../src/core/divergenceGuard.js';

const transcript =
  'um so I think we should probably meet on Tuesday to go over the quarterly numbers together';

describe('divergence guard (PRD §6 hard rule)', () => {
  it('accepts a normal cleanup', () => {
    const cleaned =
      'I think we should meet on Tuesday to go over the quarterly numbers together.';
    expect(choose(transcript, cleaned)).toBe(cleaned);
  });

  it('rejects hallucinated expansion (>1.5x) — raw transcript wins', () => {
    const bloated = Array(40).fill('word').join(' ');
    expect(choose(transcript, bloated)).toBe(transcript);
  });

  it('rejects over-aggressive truncation (<0.5x) — raw transcript wins', () => {
    expect(choose(transcript, 'Meet Tuesday.')).toBe(transcript);
  });

  it('rejects an empty cleanup of a non-empty transcript', () => {
    expect(choose(transcript, '')).toBe(transcript);
  });

  it('lets short utterances shrink a lot ("um, uh, hi" -> "Hi.")', () => {
    expect(choose('um, uh, hi', 'Hi.')).toBe('Hi.');
  });

  it('does not let short utterances grow much', () => {
    expect(
      choose('send it', 'Please send the document over whenever you get a chance.'),
    ).toBe('send it');
  });

  it('accepts heavy shrinkage when the baseline says cleanup deletes that much', () => {
    // The PRD's own example shrinks to 0.43x of the raw words — legitimate,
    // because correction resolution deletes words. The baseline (rules-cleaned
    // transcript) tells the guard how much deletion is expected.
    const raw = "um let's meet Tuesday, wait, no, Friday";
    const cleaned = "Let's meet Friday.";
    expect(choose(raw, cleaned, "Let's meet Friday.")).toBe(cleaned);
    // Without a baseline the literal PRD rule still rejects it (documents
    // the deviation).
    expect(choose(raw, cleaned)).toBe(raw);
  });

  it('treats the 1.5x and 0.5x boundaries as acceptable', () => {
    const ten = Array(10).fill('w').join(' ');
    expect(isAcceptable(ten, Array(15).fill('w').join(' '))).toBe(true);
    expect(isAcceptable(ten, Array(5).fill('w').join(' '))).toBe(true);
    expect(isAcceptable(ten, Array(16).fill('w').join(' '))).toBe(false);
    expect(isAcceptable(ten, Array(4).fill('w').join(' '))).toBe(false);
  });
});
