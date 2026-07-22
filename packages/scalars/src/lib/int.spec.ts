import { describe, expect, it } from 'vitest';
import { assertErr, assertOk } from '@typemint/result';
import {
  INT_DEFAULT_ROUNDING_MODE,
  Int,
  IntArithmetic,
  IntRoundingMode,
  IsIntInvariantErrorKind,
  type IntRoundingMode as IntRoundingModeType,
} from './int.js';

// Bare branded Int factory — the arithmetic API consumes `Int` values, not raw
// numbers. `ofUnsafe` skips the Result wrapper for known-valid literals.
const int = (n: number): Int => Int.ofUnsafe(n);

// Unwrap a `Result<Int, …>` and assert its numeric payload in one step.
// `+ 0` normalizes a negative zero (e.g. `Math.trunc(-1 / 2)` → `-0`) to `+0`;
// `toBe` uses `Object.is`, which would otherwise report `-0 ≠ 0` even though
// they are the same integer.
function expectOk(result: ReturnType<typeof Int.of>, expected: number): void {
  assertOk(result);
  expect(result.value + 0).toBe(expected);
}

const MAX = Number.MAX_SAFE_INTEGER;
const MIN = Number.MIN_SAFE_INTEGER;

describe('(unit) IntArithmetic', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // MARK: add
  // ───────────────────────────────────────────────────────────────────────────
  describe('add', () => {
    it.each([
      { a: 3, b: 5, expected: 8 },
      { a: -3, b: 5, expected: 2 },
      { a: 5, b: 0, expected: 5 },
      { a: -3, b: -5, expected: -8 },
    ])('should add $a + $b = $expected', ({ a, b, expected }) => {
      // Act & Assert
      expectOk(IntArithmetic.add(int(a), int(b)), expected);
    });

    it('should reject an addition that overflows the safe range', () => {
      // Act
      const result = IntArithmetic.add(int(MAX), int(1));

      // Assert
      assertErr(result);
      expect(result.error.kind).toBe(IsIntInvariantErrorKind);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: subtract
  // ───────────────────────────────────────────────────────────────────────────
  describe('subtract', () => {
    it.each([
      { a: 10, b: 3, expected: 7 },
      { a: 3, b: 10, expected: -7 },
      { a: -3, b: -5, expected: 2 },
    ])('should subtract $a - $b = $expected', ({ a, b, expected }) => {
      // Act & Assert
      expectOk(IntArithmetic.subtract(int(a), int(b)), expected);
    });

    it('should reject a subtraction that underflows the safe range', () => {
      // Act
      const result = IntArithmetic.subtract(int(MIN), int(1));

      // Assert
      assertErr(result);
      expect(result.error.kind).toBe(IsIntInvariantErrorKind);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: multiply
  // ───────────────────────────────────────────────────────────────────────────
  describe('multiply', () => {
    it.each([
      { a: 3, b: 5, expected: 15 },
      { a: 3, b: -5, expected: -15 },
      { a: -3, b: -5, expected: 15 },
      { a: 5, b: 0, expected: 0 },
    ])('should multiply $a × $b = $expected', ({ a, b, expected }) => {
      // Act & Assert
      expectOk(IntArithmetic.multiply(int(a), int(b)), expected);
    });

    it('should reject a product that overflows the safe range', () => {
      // Act
      const result = IntArithmetic.multiply(int(MAX), int(2));

      // Assert
      assertErr(result);
      expect(result.error.kind).toBe(IsIntInvariantErrorKind);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: pow
  // ───────────────────────────────────────────────────────────────────────────
  describe('pow', () => {
    it.each([
      { base: 2, exponent: 10, expected: 1024 },
      { base: 10, exponent: 3, expected: 1000 },
      { base: 5, exponent: 0, expected: 1 },
      { base: -2, exponent: 3, expected: -8 },
      { base: 0, exponent: 0, expected: 1 },
    ])(
      'should raise $base ^ $exponent = $expected',
      ({ base, exponent, expected }) => {
        // Act & Assert
        expectOk(IntArithmetic.pow(int(base), int(exponent)), expected);
      },
    );

    it('should reject a power that overflows the safe range', () => {
      // Act
      const result = IntArithmetic.pow(int(10), int(20));

      // Assert
      assertErr(result);
      expect(result.error.kind).toBe(IsIntInvariantErrorKind);
    });

    it('should reject a negative exponent (fractional result is not an integer)', () => {
      // Act
      const result = IntArithmetic.pow(int(2), int(-1));

      // Assert
      assertErr(result);
      expect(result.error.kind).toBe(IsIntInvariantErrorKind);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: abs
  // ───────────────────────────────────────────────────────────────────────────
  describe('abs', () => {
    it.each([
      { value: 42, expected: 42 },
      { value: -42, expected: 42 },
      { value: 0, expected: 0 },
    ])('should take |$value| = $expected', ({ value, expected }) => {
      // Act & Assert
      expectOk(IntArithmetic.abs(int(value)), expected);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: sign
  // ───────────────────────────────────────────────────────────────────────────
  describe('sign', () => {
    it.each([
      { value: 42, expected: 1 },
      { value: -42, expected: -1 },
      { value: 0, expected: 0 },
    ])('should report sign($value) = $expected', ({ value, expected }) => {
      // Act & Assert
      expect(IntArithmetic.sign(int(value))).toBe(expected);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: clamp
  // ───────────────────────────────────────────────────────────────────────────
  describe('clamp', () => {
    it.each([
      { value: 5, expected: 5 }, // inside
      { value: -5, expected: 0 }, // below → min
      { value: 15, expected: 10 }, // above → max
      { value: 0, expected: 0 }, // on lower fence
      { value: 10, expected: 10 }, // on upper fence
    ])(
      'should clamp $value into [0, 10] = $expected',
      ({ value, expected }) => {
        // Act & Assert
        expect(IntArithmetic.clamp(int(value), int(0), int(10))).toBe(expected);
      },
    );
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: min
  // ───────────────────────────────────────────────────────────────────────────
  describe('min', () => {
    it.each([
      { a: 3, b: 5, expected: 3 },
      { a: 5, b: 3, expected: 3 }, // order does not matter
      { a: -3, b: 5, expected: -3 }, // negatives are smaller
      { a: -3, b: -5, expected: -5 },
      { a: 4, b: 4, expected: 4 }, // equal
    ])('should pick min($a, $b) = $expected', ({ a, b, expected }) => {
      // Act & Assert
      expect(IntArithmetic.min(int(a), int(b))).toBe(expected);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: max
  // ───────────────────────────────────────────────────────────────────────────
  describe('max', () => {
    it.each([
      { a: 3, b: 5, expected: 5 },
      { a: 5, b: 3, expected: 5 }, // order does not matter
      { a: -3, b: -5, expected: -3 }, // closer to zero is larger
      { a: -3, b: 5, expected: 5 },
      { a: 4, b: 4, expected: 4 }, // equal
    ])('should pick max($a, $b) = $expected', ({ a, b, expected }) => {
      // Act & Assert
      expect(IntArithmetic.max(int(a), int(b))).toBe(expected);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: modulo
  // ───────────────────────────────────────────────────────────────────────────
  describe('modulo', () => {
    it.each([
      { a: 7, b: 3, expected: 1 },
      { a: -7, b: 3, expected: -1 }, // sign follows the dividend
      { a: 7, b: -3, expected: 1 },
      { a: -7, b: -3, expected: -1 },
      { a: 6, b: 3, expected: 0 }, // divides evenly
    ])('should compute $a %% $b = $expected', ({ a, b, expected }) => {
      // Act & Assert
      expectOk(IntArithmetic.modulo(int(a), int(b)), expected);
    });

    it('should return an error (not throw) on modulo by zero', () => {
      // Act — `n % 0` is NaN, which is not a safe integer.
      const result = IntArithmetic.modulo(int(7), int(0));

      // Assert
      assertErr(result);
      expect(result.error.kind).toBe(IsIntInvariantErrorKind);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: division — dedicated rounding methods
  // ───────────────────────────────────────────────────────────────────────────
  // Every table below is the exact-rounding truth for its mode. The four
  // sign quadrants of 7÷2 and 5÷2 exercise the tie / sign interplay that the
  // `Math.trunc` + adjustment logic is easy to get wrong.
  const DIVISION_CASES: Record<
    IntRoundingModeType,
    { method: (d: Int, v: Int) => ReturnType<typeof Int.of> }
  > = {
    truncate: { method: IntArithmetic.divideTruncate },
    floor: { method: IntArithmetic.divideFloor },
    ceil: { method: IntArithmetic.divideCeil },
    halfEven: { method: IntArithmetic.divideHalfEven },
    halfOdd: { method: IntArithmetic.divideHalfOdd },
    halfUp: { method: IntArithmetic.divideHalfUp },
    halfDown: { method: IntArithmetic.divideHalfDown },
    halfTowardsZero: { method: IntArithmetic.divideHalfTowardsZero },
    halfAwayFromZero: { method: IntArithmetic.divideHalfAwayFromZero },
  };

  describe('divideTruncate', () => {
    it.each([
      { d: 7, v: 2, expected: 3 },
      { d: -7, v: 2, expected: -3 },
      { d: 7, v: -2, expected: -3 },
      { d: -7, v: -2, expected: 3 },
      { d: 1, v: 2, expected: 0 },
      { d: -1, v: 2, expected: 0 },
      { d: 10, v: 2, expected: 5 },
    ])('$d ÷ $v → $expected', ({ d, v, expected }) => {
      expectOk(DIVISION_CASES.truncate.method(int(d), int(v)), expected);
    });
  });

  describe('divideFloor', () => {
    it.each([
      { d: 7, v: 2, expected: 3 },
      { d: -7, v: 2, expected: -4 },
      { d: 7, v: -2, expected: -4 },
      { d: -7, v: -2, expected: 3 },
      { d: 1, v: 2, expected: 0 },
      { d: -1, v: 2, expected: -1 },
      { d: 10, v: 2, expected: 5 },
    ])('$d ÷ $v → $expected', ({ d, v, expected }) => {
      expectOk(DIVISION_CASES.floor.method(int(d), int(v)), expected);
    });
  });

  describe('divideCeil', () => {
    it.each([
      { d: 7, v: 2, expected: 4 },
      { d: -7, v: 2, expected: -3 },
      { d: 7, v: -2, expected: -3 },
      { d: -7, v: -2, expected: 4 },
      { d: 1, v: 2, expected: 1 },
      { d: -1, v: 2, expected: 0 },
      { d: 10, v: 2, expected: 5 },
    ])('$d ÷ $v → $expected', ({ d, v, expected }) => {
      expectOk(DIVISION_CASES.ceil.method(int(d), int(v)), expected);
    });
  });

  describe('divideHalfEven', () => {
    it.each([
      { d: 5, v: 2, expected: 2 }, // tie → even (2)
      { d: 7, v: 2, expected: 4 }, // tie → even (4)
      { d: -5, v: 2, expected: -2 }, // tie → even
      { d: -7, v: 2, expected: -4 }, // tie → even
      { d: 8, v: 3, expected: 3 }, // above half → up
      { d: 7, v: 3, expected: 2 }, // below half → down
    ])('$d ÷ $v → $expected', ({ d, v, expected }) => {
      expectOk(DIVISION_CASES.halfEven.method(int(d), int(v)), expected);
    });
  });

  describe('divideHalfOdd', () => {
    it.each([
      { d: 5, v: 2, expected: 3 }, // tie → odd (3)
      { d: 7, v: 2, expected: 3 }, // tie → odd (3)
      { d: -5, v: 2, expected: -3 }, // tie → odd
      { d: 8, v: 3, expected: 3 }, // above half → up
      { d: 7, v: 3, expected: 2 }, // below half → down
    ])('$d ÷ $v → $expected', ({ d, v, expected }) => {
      expectOk(DIVISION_CASES.halfOdd.method(int(d), int(v)), expected);
    });
  });

  describe('divideHalfUp', () => {
    it.each([
      { d: 7, v: 2, expected: 4 }, // tie → toward +∞
      { d: -7, v: 2, expected: -3 }, // tie → toward +∞
      { d: 5, v: 2, expected: 3 },
      { d: -5, v: 2, expected: -2 },
      { d: 8, v: 3, expected: 3 }, // above half → up
      { d: 7, v: 3, expected: 2 }, // below half → down
    ])('$d ÷ $v → $expected', ({ d, v, expected }) => {
      expectOk(DIVISION_CASES.halfUp.method(int(d), int(v)), expected);
    });
  });

  describe('divideHalfDown', () => {
    it.each([
      { d: 7, v: 2, expected: 3 }, // tie → toward −∞
      { d: -7, v: 2, expected: -4 }, // tie → toward −∞
      { d: 5, v: 2, expected: 2 },
      { d: -5, v: 2, expected: -3 },
      { d: 8, v: 3, expected: 3 }, // above half → up
      { d: 7, v: 3, expected: 2 }, // below half → down
    ])('$d ÷ $v → $expected', ({ d, v, expected }) => {
      expectOk(DIVISION_CASES.halfDown.method(int(d), int(v)), expected);
    });
  });

  describe('divideHalfTowardsZero', () => {
    it.each([
      { d: 7, v: 2, expected: 3 }, // tie → toward 0
      { d: -7, v: 2, expected: -3 }, // tie → toward 0
      { d: 5, v: 2, expected: 2 },
      { d: -5, v: 2, expected: -2 },
      { d: 8, v: 3, expected: 3 }, // above half → up
    ])('$d ÷ $v → $expected', ({ d, v, expected }) => {
      expectOk(DIVISION_CASES.halfTowardsZero.method(int(d), int(v)), expected);
    });
  });

  describe('divideHalfAwayFromZero', () => {
    it.each([
      { d: 7, v: 2, expected: 4 }, // tie → away from 0
      { d: -7, v: 2, expected: -4 }, // tie → away from 0
      { d: 5, v: 2, expected: 3 },
      { d: -5, v: 2, expected: -3 },
      { d: 8, v: 3, expected: 3 }, // above half → up
      { d: 7, v: 3, expected: 2 }, // below half → down
    ])('$d ÷ $v → $expected', ({ d, v, expected }) => {
      expectOk(
        DIVISION_CASES.halfAwayFromZero.method(int(d), int(v)),
        expected,
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: division — exhaustive reference cross-check
  // ───────────────────────────────────────────────────────────────────────────
  // The strongest guard: an independent exact-rational rounding oracle checked
  // against every method over the full sign space. This is what catches a
  // sign-quadrant regression (e.g. floor computed via Math.floor + adjustment).
  describe('reference cross-check', () => {
    /** Exact-rounding oracle, independent of the implementation under test. */
    function oracle(mode: IntRoundingModeType, d: number, v: number): number {
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

    it.each(Object.keys(DIVISION_CASES) as IntRoundingModeType[])(
      'divide[%s] matches the exact-rounding oracle across the sign space',
      (mode) => {
        // Act & Assert
        for (let d = -50; d <= 50; d++) {
          for (let v = -12; v <= 12; v++) {
            if (v === 0) continue;
            const result = DIVISION_CASES[mode].method(int(d), int(v));
            assertOk(result);
            expect(result.value, `${mode}(${d}, ${v})`).toBe(
              oracle(mode, d, v),
            );
          }
        }
      },
    );
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: divide — rounding-mode dispatcher
  // ───────────────────────────────────────────────────────────────────────────
  describe('divide', () => {
    it('should default to truncate rounding', () => {
      // Assert — the exported default is truncate…
      expect(INT_DEFAULT_ROUNDING_MODE).toBe(IntRoundingMode.truncate);
      // …and calling without a mode truncates.
      expectOk(IntArithmetic.divide(int(7), int(2)), 3);
      expectOk(IntArithmetic.divide(int(-7), int(2)), -3);
    });

    it.each(Object.keys(DIVISION_CASES) as IntRoundingModeType[])(
      'should dispatch %s to its dedicated method',
      (mode) => {
        // Arrange — a spread of dividends over a fixed divisor.
        for (const d of [7, -7, 5, -5, 8, 1]) {
          // Act
          const viaDispatcher = IntArithmetic.divide(int(d), int(2), mode);
          const viaDedicated = DIVISION_CASES[mode].method(int(d), int(2));

          // Assert
          assertOk(viaDispatcher);
          assertOk(viaDedicated);
          expect(viaDispatcher.value).toBe(viaDedicated.value);
        }
      },
    );

    it('should return an error (not throw) on division by zero', () => {
      // Act
      const result = IntArithmetic.divide(int(7), int(0));

      // Assert
      assertErr(result);
      expect(result.error.kind).toBe(IsIntInvariantErrorKind);
    });
  });
});
