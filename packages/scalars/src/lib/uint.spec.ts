import { describe, expect, it } from 'vitest';
import { assertErr, assertOk } from '@typemint/result';
import {
  INT_DEFAULT_ROUNDING_MODE,
  IntRoundingMode,
  IsIntInvariantErrorKind,
  type IntRoundingMode as IntRoundingModeType,
} from './int.js';
import { IsUintInvariantErrorKind, Uint, UintArithmetic } from './uint.js';

// Bare branded Uint factory — the arithmetic API consumes `Uint` values, not
// raw numbers. `ofUnsafe` skips the Result wrapper for known-valid literals.
const uint = (n: number): Uint => Uint.ofUnsafe(n);

// Unwrap a `Result<Uint, …>` and assert its numeric payload in one step.
// `+ 0` normalizes a negative zero to `+0` (see the note in int.spec.ts).
function expectOk(result: ReturnType<typeof Uint.of>, expected: number): void {
  assertOk(result);
  expect(result.value + 0).toBe(expected);
}

const MAX = Number.MAX_SAFE_INTEGER;

describe('(unit) Uint', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // MARK: scalar invariants
  // ───────────────────────────────────────────────────────────────────────────
  describe('scalar', () => {
    it('should accept a non-negative integer', () => {
      expectOk(Uint.of(0), 0);
      expectOk(Uint.of(42), 42);
    });

    it('should reject a negative integer with IsUintInvariantError', () => {
      // Act
      const result = Uint.of(-1);

      // Assert
      assertErr(result);
      expect(result.error.kind).toBe(IsUintInvariantErrorKind);
    });

    it('should reject a non-integer with the inherited IsIntInvariantError', () => {
      // Act — the base integer invariant runs first and short-circuits.
      const result = Uint.of(2.5);

      // Assert
      assertErr(result);
      expect(result.error.kind).toBe(IsIntInvariantErrorKind);
    });
  });
});

describe('(unit) UintArithmetic', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // MARK: add
  // ───────────────────────────────────────────────────────────────────────────
  describe('add', () => {
    it.each([
      { a: 3, b: 5, expected: 8 },
      { a: 5, b: 0, expected: 5 },
      { a: 0, b: 0, expected: 0 },
    ])('should add $a + $b = $expected', ({ a, b, expected }) => {
      // Act & Assert
      expectOk(UintArithmetic.add(uint(a), uint(b)), expected);
    });

    it('should reject an addition that overflows the safe range', () => {
      // Act
      const result = UintArithmetic.add(uint(MAX), uint(1));

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
      { a: 3, b: 3, expected: 0 },
    ])('should subtract $a - $b = $expected', ({ a, b, expected }) => {
      // Act & Assert
      expectOk(UintArithmetic.subtract(uint(a), uint(b)), expected);
    });

    it('should reject a difference that underflows below zero', () => {
      // Act — a negative result leaves the Uint domain.
      const result = UintArithmetic.subtract(uint(3), uint(10));

      // Assert
      assertErr(result);
      expect(result.error.kind).toBe(IsUintInvariantErrorKind);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: multiply
  // ───────────────────────────────────────────────────────────────────────────
  describe('multiply', () => {
    it.each([
      { a: 3, b: 5, expected: 15 },
      { a: 5, b: 0, expected: 0 },
    ])('should multiply $a × $b = $expected', ({ a, b, expected }) => {
      // Act & Assert
      expectOk(UintArithmetic.multiply(uint(a), uint(b)), expected);
    });

    it('should reject a product that overflows the safe range', () => {
      // Act
      const result = UintArithmetic.multiply(uint(MAX), uint(2));

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
      { base: 5, exponent: 0, expected: 1 },
      { base: 0, exponent: 0, expected: 1 },
    ])(
      'should raise $base ^ $exponent = $expected',
      ({ base, exponent, expected }) => {
        // Act & Assert
        expectOk(UintArithmetic.pow(uint(base), uint(exponent)), expected);
      },
    );

    it('should reject a power that overflows the safe range', () => {
      // Act
      const result = UintArithmetic.pow(uint(10), uint(20));

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
      { value: 0, expected: 0 },
    ])(
      'should return |$value| = $expected (identity)',
      ({ value, expected }) => {
        // Act & Assert
        expect(UintArithmetic.abs(uint(value))).toBe(expected);
      },
    );
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: sign
  // ───────────────────────────────────────────────────────────────────────────
  describe('sign', () => {
    it.each([
      { value: 42, expected: 1 },
      { value: 0, expected: 0 },
    ])('should report sign($value) = $expected', ({ value, expected }) => {
      // Act & Assert
      expect(UintArithmetic.sign(uint(value))).toBe(expected);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: clamp
  // ───────────────────────────────────────────────────────────────────────────
  describe('clamp', () => {
    it.each([
      { value: 5, expected: 5 }, // inside
      { value: 1, expected: 2 }, // below → min
      { value: 9, expected: 8 }, // above → max
    ])('should clamp $value into [2, 8] = $expected', ({ value, expected }) => {
      // Act & Assert
      expect(UintArithmetic.clamp(uint(value), uint(2), uint(8))).toBe(
        expected,
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: min
  // ───────────────────────────────────────────────────────────────────────────
  describe('min', () => {
    it.each([
      { a: 3, b: 5, expected: 3 },
      { a: 5, b: 3, expected: 3 },
      { a: 4, b: 4, expected: 4 },
    ])('should pick min($a, $b) = $expected', ({ a, b, expected }) => {
      // Act & Assert
      expect(UintArithmetic.min(uint(a), uint(b))).toBe(expected);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: max
  // ───────────────────────────────────────────────────────────────────────────
  describe('max', () => {
    it.each([
      { a: 3, b: 5, expected: 5 },
      { a: 5, b: 3, expected: 5 },
      { a: 4, b: 4, expected: 4 },
    ])('should pick max($a, $b) = $expected', ({ a, b, expected }) => {
      // Act & Assert
      expect(UintArithmetic.max(uint(a), uint(b))).toBe(expected);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: modulo
  // ───────────────────────────────────────────────────────────────────────────
  describe('modulo', () => {
    it.each([
      { a: 7, b: 3, expected: 1 },
      { a: 6, b: 3, expected: 0 },
      { a: 3, b: 7, expected: 3 },
    ])('should compute $a %% $b = $expected', ({ a, b, expected }) => {
      // Act & Assert
      expectOk(UintArithmetic.modulo(uint(a), uint(b)), expected);
    });

    it('should return an error (not throw) on modulo by zero', () => {
      // Act — `n % 0` is NaN, which is not a safe integer.
      const result = UintArithmetic.modulo(uint(7), uint(0));

      // Assert
      assertErr(result);
      expect(result.error.kind).toBe(IsIntInvariantErrorKind);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: division — dedicated rounding methods
  // ───────────────────────────────────────────────────────────────────────────
  // For non-negative operands, floor/truncate coincide and there are no
  // sign-quadrant subtleties; the exhaustive oracle cross-check below is the
  // real guard. These per-mode tables just pin a couple of representative cases.
  const DIVISION_CASES: Record<
    IntRoundingModeType,
    { method: (d: Uint, v: Uint) => ReturnType<typeof Uint.of> }
  > = {
    truncate: { method: UintArithmetic.divideTruncate },
    floor: { method: UintArithmetic.divideFloor },
    ceil: { method: UintArithmetic.divideCeil },
    halfEven: { method: UintArithmetic.divideHalfEven },
    halfOdd: { method: UintArithmetic.divideHalfOdd },
    halfUp: { method: UintArithmetic.divideHalfUp },
    halfDown: { method: UintArithmetic.divideHalfDown },
    halfTowardsZero: { method: UintArithmetic.divideHalfTowardsZero },
    halfAwayFromZero: { method: UintArithmetic.divideHalfAwayFromZero },
  };

  describe('divideTruncate', () => {
    it.each([
      { d: 7, v: 2, expected: 3 },
      { d: 1, v: 2, expected: 0 },
      { d: 10, v: 2, expected: 5 },
    ])('$d ÷ $v → $expected', ({ d, v, expected }) => {
      expectOk(DIVISION_CASES.truncate.method(uint(d), uint(v)), expected);
    });
  });

  describe('divideFloor', () => {
    it.each([
      { d: 7, v: 2, expected: 3 },
      { d: 1, v: 2, expected: 0 },
    ])('$d ÷ $v → $expected', ({ d, v, expected }) => {
      expectOk(DIVISION_CASES.floor.method(uint(d), uint(v)), expected);
    });
  });

  describe('divideCeil', () => {
    it.each([
      { d: 7, v: 2, expected: 4 },
      { d: 1, v: 2, expected: 1 },
      { d: 10, v: 2, expected: 5 },
    ])('$d ÷ $v → $expected', ({ d, v, expected }) => {
      expectOk(DIVISION_CASES.ceil.method(uint(d), uint(v)), expected);
    });
  });

  describe('divideHalfEven', () => {
    it.each([
      { d: 5, v: 2, expected: 2 }, // tie → even
      { d: 7, v: 2, expected: 4 }, // tie → even
      { d: 8, v: 3, expected: 3 }, // above half → up
      { d: 7, v: 3, expected: 2 }, // below half → down
    ])('$d ÷ $v → $expected', ({ d, v, expected }) => {
      expectOk(DIVISION_CASES.halfEven.method(uint(d), uint(v)), expected);
    });
  });

  describe('divideHalfOdd', () => {
    it.each([
      { d: 5, v: 2, expected: 3 }, // tie → odd
      { d: 7, v: 2, expected: 3 }, // tie → odd
      { d: 8, v: 3, expected: 3 }, // above half → up
    ])('$d ÷ $v → $expected', ({ d, v, expected }) => {
      expectOk(DIVISION_CASES.halfOdd.method(uint(d), uint(v)), expected);
    });
  });

  describe('divideHalfUp', () => {
    it.each([
      { d: 7, v: 2, expected: 4 }, // tie → toward +∞
      { d: 5, v: 2, expected: 3 },
      { d: 7, v: 3, expected: 2 }, // below half → down
    ])('$d ÷ $v → $expected', ({ d, v, expected }) => {
      expectOk(DIVISION_CASES.halfUp.method(uint(d), uint(v)), expected);
    });
  });

  describe('divideHalfDown', () => {
    it.each([
      { d: 7, v: 2, expected: 3 }, // tie → toward −∞
      { d: 5, v: 2, expected: 2 },
      { d: 8, v: 3, expected: 3 }, // above half → up
    ])('$d ÷ $v → $expected', ({ d, v, expected }) => {
      expectOk(DIVISION_CASES.halfDown.method(uint(d), uint(v)), expected);
    });
  });

  describe('divideHalfTowardsZero', () => {
    it.each([
      { d: 7, v: 2, expected: 3 }, // tie → toward 0
      { d: 8, v: 3, expected: 3 }, // above half → up
    ])('$d ÷ $v → $expected', ({ d, v, expected }) => {
      expectOk(
        DIVISION_CASES.halfTowardsZero.method(uint(d), uint(v)),
        expected,
      );
    });
  });

  describe('divideHalfAwayFromZero', () => {
    it.each([
      { d: 7, v: 2, expected: 4 }, // tie → away from 0
      { d: 7, v: 3, expected: 2 }, // below half → down
    ])('$d ÷ $v → $expected', ({ d, v, expected }) => {
      expectOk(
        DIVISION_CASES.halfAwayFromZero.method(uint(d), uint(v)),
        expected,
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: division — exhaustive reference cross-check
  // ───────────────────────────────────────────────────────────────────────────
  // Same exact-rounding oracle as int.spec.ts, restricted to the non-negative
  // dividend space (divisor > 0). Confirms every Uint division method agrees
  // with the shared int-math helpers over its whole domain.
  describe('reference cross-check', () => {
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
          return ce;
        case 'halfDown':
          return fl;
        case 'halfTowardsZero':
          return Math.abs(fl) < Math.abs(ce) ? fl : ce;
        case 'halfAwayFromZero':
          return Math.abs(fl) > Math.abs(ce) ? fl : ce;
      }
    }

    it.each(Object.keys(DIVISION_CASES) as IntRoundingModeType[])(
      'divide[%s] matches the exact-rounding oracle across the non-negative space',
      (mode) => {
        // Act & Assert
        for (let d = 0; d <= 50; d++) {
          for (let v = 1; v <= 12; v++) {
            const result = DIVISION_CASES[mode].method(uint(d), uint(v));
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
      // Assert — calling without a mode truncates.
      expect(INT_DEFAULT_ROUNDING_MODE).toBe(IntRoundingMode.truncate);
      expectOk(UintArithmetic.divide(uint(7), uint(2)), 3);
    });

    it.each(Object.keys(DIVISION_CASES) as IntRoundingModeType[])(
      'should dispatch %s to its dedicated method',
      (mode) => {
        // Arrange — a spread of dividends over a fixed divisor.
        for (const d of [7, 5, 8, 1, 0]) {
          // Act
          const viaDispatcher = UintArithmetic.divide(uint(d), uint(2), mode);
          const viaDedicated = DIVISION_CASES[mode].method(uint(d), uint(2));

          // Assert
          assertOk(viaDispatcher);
          assertOk(viaDedicated);
          expect(viaDispatcher.value).toBe(viaDedicated.value);
        }
      },
    );

    it('should return an error (not throw) on division by zero', () => {
      // Act
      const result = UintArithmetic.divide(uint(7), uint(0));

      // Assert
      assertErr(result);
      expect(result.error.kind).toBe(IsIntInvariantErrorKind);
    });
  });
});
