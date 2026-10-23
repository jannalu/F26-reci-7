// import { describe, expect, it } from 'vitest';
// import fc from 'fast-check';
// import { mergeIntervals, type Interval } from '../src/intervals';

// // Recitation Part 2 (groups) and problem set Task 2.
// // Read the spec in src/intervals/mergeIntervals.ts, then check your progress
// // with `npm run mutants:intervals`.
// //
// // Label every property with its pattern, on the line above its `it(`:
// //   // Pattern: invariant. The output is sorted.
// // (invariant, algebraic, metamorphic, differential, or conditional)

// // A first attempt at a generator. It has a problem: run the tests and read
// // the counterexample.
// const interval: fc.Arbitrary<Interval> = fc.tuple(fc.integer(), fc.integer());
// const intervalList = fc.array(interval);

// describe('mergeIntervals', () => {
//   // Pattern: invariant. Every input interval lies inside some output interval.
//   it('every input interval lies inside some output interval', () => {
//     fc.assert(
//       fc.property(intervalList, xs => {
//         const out = mergeIntervals(xs);
//         const uncovered = xs.filter(([s, e]) => !out.some(([a, b]) => a <= s && e <= b));
//         expect(uncovered).toEqual([]);
//       }),
//     );
//   });

//   // Add your properties here. Aim for at least one of each pattern:
//   // invariant, algebraic, metamorphic, differential, conditional.
// });

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { mergeIntervals, type Interval } from '../src/intervals';

// Construct valid intervals: start <= end.
const interval: fc.Arbitrary<Interval> = fc
  .tuple(
    fc.integer({ min: -20, max: 20 }),
    fc.integer({ min: 0, max: 20 }),
  )
  .map(([start, width]): Interval => [start, start + width]);

const intervalList = fc.array(interval, { maxLength: 20 });

const copy = (xs: Interval[]): Interval[] =>
  xs.map(([s, e]): Interval => [s, e]);

const covers = (xs: Interval[], point: number) =>
  xs.some(([s, e]) => s <= point && point <= e);


describe('mergeIntervals', () => {
  // Pattern: invariant. Every input interval lies inside some output interval.
  it('every input interval lies inside some output interval', () => {
    fc.assert(
      fc.property(intervalList, xs => {
        const original = copy(xs);
        const out = mergeIntervals(xs);
        const uncovered = original.filter(
          ([s, e]) => !out.some(([a, b]) => a <= s && e <= b),
        );
        expect(uncovered).toEqual([]);
      }),
    );
  });

  // Pattern: invariant. Output intervals are valid, sorted, and do not touch.
  it('returns valid, sorted, strictly separated intervals', () => {
    fc.assert(
      fc.property(intervalList, xs => {
        const out = mergeIntervals(xs);

        for (const [s, e] of out) {
          expect(Number.isInteger(s)).toBe(true);
          expect(Number.isInteger(e)).toBe(true);
          expect(s).toBeLessThanOrEqual(e);
        }

        for (let i = 1; i < out.length; i++) {
          expect(out[i - 1][1]).toBeLessThan(out[i][0]);
        }
      }),
    );
  });

  // Pattern: differential. Point coverage agrees with a simple coverage oracle.
  it('preserves exactly the same points', () => {
    fc.assert(
      fc.property(intervalList, xs => {
        const original = copy(xs);
        const out = mergeIntervals(xs);

        const endpoints = [
          ...new Set([...original.flat(), ...out.flat()]),
        ].sort((a, b) => a - b);

        const points = [...endpoints];

        // Midpoints detect gaps between endpoints, including fractional gaps.
        for (let i = 1; i < endpoints.length; i++) {
          points.push((endpoints[i - 1] + endpoints[i]) / 2);
        }

        for (const point of points) {
          expect(covers(out, point)).toBe(covers(original, point));
        }
      }),
    );
  });

  // Pattern: metamorphic. Reversing the input order preserves the result.
  it('does not depend on input order', () => {
    fc.assert(
      fc.property(intervalList, xs => {
        const reversed = copy(xs).reverse();
        expect(mergeIntervals(xs)).toEqual(mergeIntervals(reversed));
      }),
    );
  });

  // Pattern: algebraic. Merging twice gives the same result as merging once.
  it('is idempotent', () => {
    fc.assert(
      fc.property(intervalList, xs => {
        const once = mergeIntervals(xs);
        const expected = copy(once);
        expect(mergeIntervals(once)).toEqual(expected);
      }),
    );
  });

  // Pattern: conditional. Already sorted and separated intervals stay unchanged.
  it('preserves already separated intervals', () => {
    const separatedList = fc
      .array(
        fc.tuple(
          fc.integer({ min: 0, max: 10 }),
          fc.integer({ min: 1, max: 10 }),
        ),
        { maxLength: 20 },
      )
      .map(blocks => {
        let start = -20;
        return blocks.map(([width, gap]): Interval => {
          const end = start + width;
          const result: Interval = [start, end];
          start = end + gap;
          return result;
        });
      });

    fc.assert(
      fc.property(separatedList, xs => {
        const expected = copy(xs);
        expect(mergeIntervals(xs)).toEqual(expected);
      }),
    );
  });

  // Pattern: conditional. Intervals that share an endpoint merge.
  it('merges touching intervals', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -20, max: 20 }),
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 1, max: 10 }),
        (start, left, right) => {
          const middle = start + left;
          const end = middle + right;

          expect(mergeIntervals([
            [start, middle],
            [middle, end],
          ])).toEqual([[start, end]]);
        },
      ),
    );
  });

  // Pattern: conditional. A one-unit gap must remain uncovered.
  it('keeps intervals with a one-unit gap separate', () => {
    fc.assert(
      fc.property(interval, ([s, e]) => {
        expect(mergeIntervals([
          [s, e],
          [e + 1, e + 2],
        ])).toEqual([
          [s, e],
          [e + 1, e + 2],
        ]);
      }),
    );
  });

  // Pattern: invariant. The input array and its nested intervals are unchanged.
  it('does not modify its input', () => {
    fc.assert(
      fc.property(intervalList, xs => {
        const before = copy(xs);
        mergeIntervals(xs);
        expect(xs).toEqual(before);
      }),
    );
  });

  // Pattern: conditional. Empty input produces empty output.
  it('handles empty input', () => {
    expect(mergeIntervals([])).toEqual([]);
  });

    // Pattern: invariant. Output intervals are valid, sorted, and strictly separated.
  it('returns valid, sorted intervals without overlaps or touching', () => {
    fc.assert(
      fc.property(intervalList, xs => {
        const out = mergeIntervals(xs);

        for (const [s, e] of out) {
          expect(Number.isInteger(s)).toBe(true);
          expect(Number.isInteger(e)).toBe(true);
          expect(s).toBeLessThanOrEqual(e);
        }

        for (let i = 1; i < out.length; i++) {
          expect(out[i - 1][1]).toBeLessThan(out[i][0]);
        }
      }),
    );
  });

  // Pattern: differential. Input and output cover exactly the same points.
  it('preserves point coverage', () => {
    const covers = (xs: Interval[], p: number) =>
      xs.some(([s, e]) => s <= p && p <= e);

    fc.assert(
      fc.property(intervalList, xs => {
        const original = xs.map(([s, e]): Interval => [s, e]);
        const out = mergeIntervals(xs);

        // Check endpoints and a midpoint between consecutive endpoints.
        // Coverage is constant between endpoints.
        const endpoints = [
          ...new Set([...original.flat(), ...out.flat()]),
        ].sort((a, b) => a - b);

        const points = [...endpoints];

        for (let i = 1; i < endpoints.length; i++) {
          points.push((endpoints[i - 1] + endpoints[i]) / 2);
        }

        for (const p of points) {
          expect(covers(out, p)).toBe(covers(original, p));
        }
      }),
    );
  });

  // Pattern: metamorphic. Reversing input order does not change the output.
  it('is independent of input order', () => {
    fc.assert(
      fc.property(intervalList, xs => {
        const reversed = xs
          .map(([s, e]): Interval => [s, e])
          .reverse();

        expect(mergeIntervals(xs)).toEqual(mergeIntervals(reversed));
      }),
    );
  });

  // Pattern: algebraic. Merging twice is equivalent to merging once.
  it('is idempotent', () => {
    fc.assert(
      fc.property(intervalList, xs => {
        const once = mergeIntervals(xs);
        const expected = once.map(([s, e]): Interval => [s, e]);

        expect(mergeIntervals(once)).toEqual(expected);
      }),
    );
  });

  // Pattern: conditional. Already sorted and separated intervals remain unchanged.
  it('preserves already sorted and separated intervals', () => {
    const separatedList = fc
      .array(
        fc.tuple(
          fc.integer({ min: 0, max: 10 }),
          fc.integer({ min: 1, max: 10 }),
        ),
        { maxLength: 20 },
      )
      .map(blocks => {
        let start = -20;

        return blocks.map(([width, gap]): Interval => {
          const end = start + width;
          const next: Interval = [start, end];
          start = end + gap;
          return next;
        });
      });

    fc.assert(
      fc.property(separatedList, xs => {
        const expected = xs.map(([s, e]): Interval => [s, e]);
        expect(mergeIntervals(xs)).toEqual(expected);
      }),
    );
  });
  
});