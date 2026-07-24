import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ROUNDING_MODE,
  divideCeil,
  divideFloor,
  divideHalfAwayFromZero,
  divideHalfDown,
  divideHalfEven,
  divideHalfOdd,
  divideHalfTowardsZero,
  divideHalfUp,
  divideRounded,
  divideTruncate,
  RoundingMode,
} from './numeric-math.js';

// `+ 0` normalizes a negative zero to `+0` so `toBe` doesn't distinguish the
// two (e.g. `divideTruncate(-1, 2)` yields `-0`). The rounding math is a pure
// `number → number` layer here — the branded `Int`/`Uint` re-validation lives
// in int.spec.ts / uint.spec.ts; this file pins the shared helpers directly.
const norm = (n: number): number => n + 0;

// Every rounding mode paired with its dedicated implementation. Keyed by the
// `RoundingMode` string so `divideRounded` dispatch can be cross-checked below.
const METHODS: Record<
  RoundingMode,
  (dividend: number, divisor: number) => number
> = {
  truncate: divideTruncate,
  floor: divideFloor,
  ceil: divideCeil,
  halfEven: divideHalfEven,
  halfOdd: divideHalfOdd,
  halfUp: divideHalfUp,
  halfDown: divideHalfDown,
  halfTowardsZero: divideHalfTowardsZero,
  halfAwayFromZero: divideHalfAwayFromZero,
};

const MODES = Object.keys(METHODS) as RoundingMode[];

describe('(unit) math', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // MARK: RoundingMode literal union
  // ───────────────────────────────────────────────────────────────────────────
  describe('RoundingMode', () => {
    it('should expose every rounding mode as a self-named member', () => {
      // Each LiteralUnion member equals its own name.
      for (const mode of MODES) {
        expect(RoundingMode[mode]).toBe(mode);
      }
    });

    it('should default to truncate', () => {
      // Assert
      expect(DEFAULT_ROUNDING_MODE).toBe(RoundingMode.truncate);
      expect(DEFAULT_ROUNDING_MODE).toBe('truncate');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: divideTruncate — round toward zero
  // ───────────────────────────────────────────────────────────────────────────
  describe('divideTruncate', () => {
    it.each([
      { d: 7, v: 2, expected: 3 },
      { d: -7, v: 2, expected: -3 }, // toward zero, not −∞
      { d: 7, v: -2, expected: -3 },
      { d: -7, v: -2, expected: 3 },
      { d: -1, v: 2, expected: 0 }, // would be −0
      { d: 6, v: 3, expected: 2 }, // exact
    ])('$d ÷ $v → $expected', ({ d, v, expected }) => {
      expect(norm(divideTruncate(d, v))).toBe(expected);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: divideFloor — round toward −∞
  // ───────────────────────────────────────────────────────────────────────────
  describe('divideFloor', () => {
    it.each([
      { d: 7, v: 2, expected: 3 },
      { d: -7, v: 2, expected: -4 }, // toward −∞
      { d: 7, v: -2, expected: -4 },
      { d: -7, v: -2, expected: 3 },
      { d: 6, v: 3, expected: 2 }, // exact: no adjustment
    ])('$d ÷ $v → $expected', ({ d, v, expected }) => {
      expect(norm(divideFloor(d, v))).toBe(expected);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: divideCeil — round toward +∞
  // ───────────────────────────────────────────────────────────────────────────
  describe('divideCeil', () => {
    it.each([
      { d: 7, v: 2, expected: 4 }, // toward +∞
      { d: -7, v: 2, expected: -3 },
      { d: 7, v: -2, expected: -3 },
      { d: -7, v: -2, expected: 4 },
      { d: 6, v: 3, expected: 2 }, // exact: no adjustment
    ])('$d ÷ $v → $expected', ({ d, v, expected }) => {
      expect(norm(divideCeil(d, v))).toBe(expected);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: half-modes — representative below/above/tie cases
  // ───────────────────────────────────────────────────────────────────────────
  describe('divideHalfEven', () => {
    it.each([
      { d: 5, v: 2, expected: 2 }, // tie → even (2, not 3)
      { d: 7, v: 2, expected: 4 }, // tie → even (4, not 3)
      { d: -5, v: 2, expected: -2 }, // tie → even
      { d: 8, v: 3, expected: 3 }, // above half → up
      { d: 7, v: 3, expected: 2 }, // below half → down
    ])('$d ÷ $v → $expected', ({ d, v, expected }) => {
      expect(norm(divideHalfEven(d, v))).toBe(expected);
    });
  });

  describe('divideHalfOdd', () => {
    it.each([
      { d: 5, v: 2, expected: 3 }, // tie → odd
      { d: 7, v: 2, expected: 3 }, // tie → odd
      { d: -5, v: 2, expected: -3 }, // tie → odd
      { d: 8, v: 3, expected: 3 }, // above half → up
    ])('$d ÷ $v → $expected', ({ d, v, expected }) => {
      expect(norm(divideHalfOdd(d, v))).toBe(expected);
    });
  });

  describe('divideHalfAwayFromZero', () => {
    it.each([
      { d: 7, v: 2, expected: 4 }, // tie → away from zero
      { d: -7, v: 2, expected: -4 }, // tie → away from zero
      { d: 7, v: 3, expected: 2 }, // below half → down
    ])('$d ÷ $v → $expected', ({ d, v, expected }) => {
      expect(norm(divideHalfAwayFromZero(d, v))).toBe(expected);
    });
  });

  describe('divideHalfTowardsZero', () => {
    it.each([
      { d: 7, v: 2, expected: 3 }, // tie → toward zero
      { d: -7, v: 2, expected: -3 }, // tie → toward zero
      { d: 8, v: 3, expected: 3 }, // above half → up
    ])('$d ÷ $v → $expected', ({ d, v, expected }) => {
      expect(norm(divideHalfTowardsZero(d, v))).toBe(expected);
    });
  });

  describe('divideHalfUp', () => {
    it.each([
      { d: 7, v: 2, expected: 4 }, // tie → toward +∞
      { d: -7, v: 2, expected: -3 }, // tie → toward +∞
      { d: 7, v: 3, expected: 2 }, // below half → down
      { d: 8, v: 3, expected: 3 }, // above half → up
    ])('$d ÷ $v → $expected', ({ d, v, expected }) => {
      expect(norm(divideHalfUp(d, v))).toBe(expected);
    });
  });

  describe('divideHalfDown', () => {
    it.each([
      { d: 7, v: 2, expected: 3 }, // tie → toward −∞
      { d: -7, v: 2, expected: -4 }, // tie → toward −∞
      { d: 5, v: 2, expected: 2 }, // tie → toward −∞
      { d: 8, v: 3, expected: 3 }, // above half → up
    ])('$d ÷ $v → $expected', ({ d, v, expected }) => {
      expect(norm(divideHalfDown(d, v))).toBe(expected);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: exhaustive reference cross-check
  // ───────────────────────────────────────────────────────────────────────────
  // The strongest guard: an independent exact-rational rounding oracle checked
  // against every helper over the full sign space. This is what catches a
  // sign-quadrant regression in the `Math.trunc` + adjustment logic.
  describe('reference cross-check', () => {
    /** Exact-rounding oracle, independent of the implementation under test. */
    function oracle(mode: RoundingMode, d: number, v: number): number {
      const exact = d / v;
      const fl = Math.floor(exact);
      const ce = Math.ceil(exact);
      if (mode === 'truncate') return Math.trunc(exact);
      if (mode === 'floor') return fl;
      if (mode === 'ceil') return ce;
      if (exact === fl) return fl; // exact integer, no rounding
      const frac = exact - fl; // strictly in (0, 1)
      if (frac < 0.5) return fl;
      if (frac > 0.5) return ce;
      switch (mode) {
        case 'halfEven':
          return fl % 2 === 0 ? fl : ce;
        case 'halfOdd':
          return fl % 2 !== 0 ? fl : ce;
        case 'halfUp':
          return ce; // toward +∞
        case 'halfDown':
          return fl; // toward −∞
        case 'halfTowardsZero':
          return Math.abs(fl) < Math.abs(ce) ? fl : ce;
        case 'halfAwayFromZero':
          return Math.abs(fl) > Math.abs(ce) ? fl : ce;
      }
    }

    it.each(MODES)(
      'divide[%s] matches the exact-rounding oracle across the sign space',
      (mode) => {
        // Act & Assert
        for (let d = -50; d <= 50; d++) {
          for (let v = -12; v <= 12; v++) {
            if (v === 0) continue;
            expect(norm(METHODS[mode](d, v)), `${mode}(${d}, ${v})`).toBe(
              norm(oracle(mode, d, v)),
            );
          }
        }
      },
    );
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: divideRounded — dispatcher
  // ───────────────────────────────────────────────────────────────────────────
  describe('divideRounded', () => {
    it.each(MODES)(
      'should dispatch %s to its dedicated helper across the sign space',
      (mode) => {
        // Act & Assert
        for (let d = -20; d <= 20; d++) {
          for (const v of [-3, -2, -1, 1, 2, 3]) {
            expect(divideRounded(d, v, mode), `${mode}(${d}, ${v})`).toBe(
              METHODS[mode](d, v),
            );
          }
        }
      },
    );
  });
});
