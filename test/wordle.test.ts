import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { matchGuess } from '../src/wordle';

// Recitation Part 1: follow along with your TA, filling in the todos below.
// Problem set Task 1: keep adding properties until `npm run mutants:wordle`
// kills every mutant. Read the spec in src/wordle/matchGuess.ts.
//
// Label every property with its pattern, on the line above its `it(`:
//   // Pattern: invariant. The result always has exactly five colors.
// (invariant, algebraic, metamorphic, differential, or conditional)

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// Step 1: a generator for five-letter uppercase words.
// const word = ...

const wordFrom = (letters: string) =>
  fc.array(fc.constantFrom(...letters), { minLength: 5, maxLength: 5}).map(cs => cs.join(''));

const word = wordFrom(ALPHABET);

// Generate distinct letters directly, without filtering.
const distinctLetters = (count: number) =>
  fc.shuffledSubarray([...ALPHABET], {
    minLength: count,
    maxLength: count,
  });


describe('matchGuess', () => {
  //it.todo('returns exactly five colors');
  
  // Pattern: invariant. the result always has exactly five colors
  it('returns exactly five colors', () => {
    fc.assert(
      fc.property(word, word, (secret, guess) => {
        expect(matchGuess(secret, guess)).toHaveLength(5);
      }),
    );
  });


  //it.todo('only uses the colors G, Y, B');

  // Pattern: invariant. every color is G Y or B
  it('only uses the colors G, Y, B', () => {
    fc.assert(
      fc.property(word, word, (secret, guess) => {
        for (const c of matchGuess(secret, guess)) expect(['G', 'Y', 'B']).toContain(c);
      }),
    );
  });


  // Pattern: conditional. If the guess equals the secret, every position is green.
  it('guessing the secret gives all greens', () => {
    fc.assert(
      fc.property(word, w => {
        expect(matchGuess(w, w)).toEqual(['G', 'G', 'G', 'G', 'G']);
      }),
    );
  });


  // Pattern: invariant. A letter is never credited more often than it occurs in the secret.
  it('never credits a letter more times than the secret contains it', () => {
    fc.assert(
      fc.property(word, word, (secret, guess) => {
        const result = matchGuess(secret, guess);
        for (const letter of new Set(guess)){
          const credited = [...guess].filter((c, i) => c == letter && result[i] != 'B').length;
          const inSecret = [...secret].filter(c => c == letter).length;
          expect(credited).toBeLessThanOrEqual(inSecret);
        }
      }),
    );
  });

  // Pattern: conditional. Rotating five distinct letters makes every match yellow.
  it('returns all yellows for a rotation of five distinct letters', () => {
    fc.assert(
      fc.property(distinctLetters(5), letters => {
        const secret = letters.join('');
        const guess = [...letters.slice(1), letters[0]].join('');

        expect(matchGuess(secret, guess)).toEqual([
          'Y', 'Y', 'Y', 'Y', 'Y',
        ]);
      }),
    );
  });

  // Pattern: conditional. Green matches consume a letter before extra copies can receive yellow.
  it('reserves a letter for its green match before crediting duplicates', () => {
    fc.assert(
      fc.property(distinctLetters(2), ([a, b]) => {
        const secret = a + a + a + a + b;
        const guess = a + a + a + b + b;

        expect(matchGuess(secret, guess)).toEqual([
          'G', 'G', 'G', 'B', 'G',
        ]);
      }),
    );
  });

  // Pattern: invariant. A position is green exactly when the letters at that position match.
  it('marks exactly the matching positions green', () => {
    fc.assert(
      fc.property(word, word, (secret, guess) => {
        const result = matchGuess(secret, guess);

        for (let i = 0; i < 5; i++) {
          expect(result[i] === 'G').toBe(secret[i] === guess[i]);
        }
      }),
    );
  });

  // Pattern: metamorphic. Consistently renaming letters preserves the match colors.
  it('preserves colors when both words use the same letter renaming', () => {
    fc.assert(
      fc.property(
        wordFrom('ABC'),
        wordFrom('ABC'),
        distinctLetters(ALPHABET.length),
        (secret, guess, renamedAlphabet) => {
          const rename = (w: string) =>
            [...w]
              .map(c => renamedAlphabet[ALPHABET.indexOf(c)])
              .join('');

          expect(matchGuess(rename(secret), rename(guess))).toEqual(
            matchGuess(secret, guess),
          );
        },
      ),
    );
  });

});
