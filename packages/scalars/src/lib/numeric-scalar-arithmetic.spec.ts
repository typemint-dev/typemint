import { describe, expect, it } from 'vitest';
import { assertErr, assertOk } from '@typemint/result';
import { Int, IsIntInvariantErrorKind } from './int.js';
import { IsUintInvariantErrorKind, Uint } from './uint.js';
import * as IntMath from './numeric-math.js';
import { DEFAULT_ROUNDING_MODE, RoundingMode } from './numeric-math.js';
import { NumericScalarArithmetic } from './numeric-scalar-arithmetic.js';

// The two instantiations under test. `ScalarArithmetic` is generic over the
// descriptor, so the same factory is exercised against a signed domain (`Int`)
// and its non-negative restriction (`Uint`). The pure rounding math is trusted
// (pinned exhaustively in math.spec.ts); these tests verify the *factory* wiring
// — delegation to the right `IntMath` helper and re-branding through `.of`.
const IntArith = NumericScalarArithmetic(Int);
const UintArith = NumericScalarArithmetic(Uint);

// Bare branded constructors — the arithmetic API consumes branded values, not
// raw numbers. `ofUnsafe` skips the Result wrapper for known-valid literals.
const int = (n: number): Int => Int.ofUnsafe(n);
const uint = (n: number): Uint => Uint.ofUnsafe(n);

// `+ 0` normalizes a negative zero to `+0` so `toBe` doesn't distinguish the
// two (e.g. `divideTruncate(-1, 2)` yields `-0`); see the note in int.spec.ts.
const norm = (n: number): number => n + 0;

// Unwrap a `Result<Int | Uint, …>` and assert its numeric payload in one step.
function expectOk(
  result: ReturnType<typeof Int.of> | ReturnType<typeof Uint.of>,
  expected: number,
): void {
  assertOk(result);
  expect(norm(result.value)).toBe(expected);
}

// Every rounding mode paired with the factory method that hard-codes it, so the
// dispatch (`divide(a, b, mode)`) and the dedicated `divideX` method can be
// cross-checked against the same `IntMath` oracle in one table.
const DIVIDE_METHODS = {
  truncate: 'divideTruncate',
  floor: 'divideFloor',
  ceil: 'divideCeil',
  halfEven: 'divideHalfEven',
  halfOdd: 'divideHalfOdd',
  halfUp: 'divideHalfUp',
  halfDown: 'divideHalfDown',
  halfTowardsZero: 'divideHalfTowardsZero',
  halfAwayFromZero: 'divideHalfAwayFromZero',
} as const satisfies Record<
  RoundingMode,
  keyof NumericScalarArithmetic<typeof Int>
>;

const MODES = Object.keys(DIVIDE_METHODS) as RoundingMode[];

// Dividend/divisor pairs spanning the full sign space plus an exact division,
// enough to distinguish every rounding mode from its neighbours.
const DIVIDE_PAIRS = [
  { a: 7, b: 2 },
  { a: -7, b: 2 },
  { a: 7, b: -2 },
  { a: -7, b: -2 },
  { a: 5, b: 2 },
  { a: -5, b: 2 },
  { a: 10, b: 2 },
] as const;

const MAX = Number.MAX_SAFE_INTEGER;

describe('(unit) ScalarArithmetic', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // MARK: factory surface
  // ───────────────────────────────────────────────────────────────────────────
  describe('factory', () => {
    it('should expose every operation as a function', () => {
      const ops = [
        'add',
        'subtract',
        'multiply',
        'pow',
        'modulo',
        'clamp',
        'min',
        'max',
        'divide',
        'divideFloor',
        'divideCeil',
        'divideTruncate',
        'divideHalfEven',
        'divideHalfOdd',
        'divideHalfUp',
        'divideHalfDown',
        'divideHalfAwayFromZero',
        'divideHalfTowardsZero',
      ] as const;

      for (const op of ops) {
        expect(IntArith[op]).toBeTypeOf('function');
      }
    });

    it('should produce independent surfaces per descriptor', () => {
      // The `Int` and `Uint` instances are distinct objects, not a shared
      // singleton — each closes over its own `.of`.
      expect(IntArith).not.toBe(UintArith);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: fallible arithmetic (Int — signed domain)
  // ───────────────────────────────────────────────────────────────────────────
  describe('arithmetic over Int', () => {
    it.each([
      { a: 3, b: 5, expected: 8 },
      { a: -3, b: 5, expected: 2 },
      { a: 5, b: 0, expected: 5 },
    ])('should add $a + $b = $expected', ({ a, b, expected }) => {
      expectOk(IntArith.add(int(a), int(b)), expected);
    });

    it.each([
      { a: 10, b: 3, expected: 7 },
      { a: 3, b: 10, expected: -7 },
      { a: -3, b: -5, expected: 2 },
    ])('should subtract $a - $b = $expected', ({ a, b, expected }) => {
      expectOk(IntArith.subtract(int(a), int(b)), expected);
    });

    it.each([
      { a: 3, b: 5, expected: 15 },
      { a: 3, b: -5, expected: -15 },
      { a: 5, b: 0, expected: 0 },
    ])('should multiply $a * $b = $expected', ({ a, b, expected }) => {
      expectOk(IntArith.multiply(int(a), int(b)), expected);
    });

    it.each([
      { a: 2, b: 10, expected: 1024 },
      { a: 5, b: 0, expected: 1 },
      { a: -2, b: 3, expected: -8 },
    ])('should raise $a ** $b = $expected', ({ a, b, expected }) => {
      expectOk(IntArith.pow(int(a), int(b)), expected);
    });

    it.each([
      { a: 7, b: 3, expected: 1 },
      { a: -7, b: 3, expected: -1 },
      { a: 6, b: 3, expected: 0 },
    ])('should take $a %% $b = $expected', ({ a, b, expected }) => {
      expectOk(IntArith.modulo(int(a), int(b)), expected);
    });

    it('should reject an addition that overflows the safe range', () => {
      const result = IntArith.add(int(MAX), int(1));

      assertErr(result);
      expect(result.error.kind).toBe(IsIntInvariantErrorKind);
    });

    it('should reject a multiplication that overflows the safe range', () => {
      const result = IntArith.multiply(int(MAX), int(2));

      assertErr(result);
      expect(result.error.kind).toBe(IsIntInvariantErrorKind);
    });

    it('should reject a power that is not a safe integer', () => {
      // 2 ** -1 = 0.5 — a finite non-integer, rejected by the Int invariant.
      const result = IntArith.pow(int(2), int(-1));

      assertErr(result);
      expect(result.error.kind).toBe(IsIntInvariantErrorKind);
    });

    it('should reject modulo by zero (NaN is not a safe integer)', () => {
      const result = IntArith.modulo(int(7), int(0));

      assertErr(result);
      expect(result.error.kind).toBe(IsIntInvariantErrorKind);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: domain re-validation (Uint — the "for free" difference)
  // ───────────────────────────────────────────────────────────────────────────
  describe('domain re-validation over Uint', () => {
    it('should keep an in-domain result branded', () => {
      expectOk(UintArith.add(uint(3), uint(5)), 8);
      expectOk(UintArith.subtract(uint(10), uint(3)), 7);
    });

    it('should reject a subtraction that underflows below zero', () => {
      // The headline of the generic design: no per-`Uint` body is written, yet
      // the below-domain result surfaces as the Uint invariant error because
      // the factory re-brands through `Uint.of`.
      const result = UintArith.subtract(uint(3), uint(10));

      assertErr(result);
      expect(result.error.kind).toBe(IsUintInvariantErrorKind);
    });

    it('should reject an addition that overflows via the inherited Int invariant', () => {
      const result = UintArith.add(uint(MAX), uint(1));

      assertErr(result);
      expect(result.error.kind).toBe(IsIntInvariantErrorKind);
    });

    it('should reject a division by zero', () => {
      const result = UintArith.divide(uint(7), uint(0));

      assertErr(result);
      expect(result.error.kind).toBe(IsIntInvariantErrorKind);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: total range ops (return a branded value, never a Result)
  // ───────────────────────────────────────────────────────────────────────────
  describe('range ops', () => {
    it.each([
      { value: 5, min: 0, max: 10, expected: 5 },
      { value: -5, min: 0, max: 10, expected: 0 },
      { value: 15, min: 0, max: 10, expected: 10 },
    ])(
      'should clamp $value into [$min, $max] = $expected',
      ({ value, min, max, expected }) => {
        // `clamp` returns the branded value directly — no `.isOk`, no unwrap.
        expect(norm(IntArith.clamp(int(value), int(min), int(max)))).toBe(
          expected,
        );
      },
    );

    it.each([
      { a: 3, b: 5, expected: 3 },
      { a: 5, b: 3, expected: 3 },
      { a: -3, b: 5, expected: -3 },
    ])('should take min($a, $b) = $expected', ({ a, b, expected }) => {
      expect(norm(IntArith.min(int(a), int(b)))).toBe(expected);
    });

    it.each([
      { a: 3, b: 5, expected: 5 },
      { a: 5, b: 3, expected: 5 },
      { a: -3, b: -5, expected: -3 },
    ])('should take max($a, $b) = $expected', ({ a, b, expected }) => {
      expect(norm(IntArith.max(int(a), int(b)))).toBe(expected);
    });

    it('should return the branded input on a tie', () => {
      // Both operands are equal — either is a valid answer; assert the value.
      expect(norm(IntArith.min(int(4), int(4)))).toBe(4);
      expect(norm(IntArith.max(int(4), int(4)))).toBe(4);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: division & rounding dispatch
  // ───────────────────────────────────────────────────────────────────────────
  describe('divide', () => {
    it('should default to the truncate rounding mode', () => {
      const withoutMode = IntArith.divide(int(7), int(2));
      const withTruncate = IntArith.divide(int(7), int(2), 'truncate');

      expect(DEFAULT_ROUNDING_MODE).toBe('truncate');
      expectOk(withoutMode, 3);
      assertOk(withoutMode);
      assertOk(withTruncate);
      expect(norm(withoutMode.value)).toBe(norm(withTruncate.value));
    });

    // For every mode and sign combination, the factory's dispatched `divide`
    // must agree with the trusted `IntMath.divideRounded` oracle.
    it.each(
      MODES.flatMap((mode) => DIVIDE_PAIRS.map(({ a, b }) => ({ mode, a, b }))),
    )('should dispatch divide($a, $b, $mode)', ({ mode, a, b }) => {
      const expected = norm(IntMath.divideRounded(a, b, mode));

      expectOk(IntArith.divide(int(a), int(b), mode), expected);
    });

    // …and each dedicated `divideX` method must equal the same oracle, proving
    // the per-mode wiring is not mis-linked.
    it.each(
      MODES.flatMap((mode) =>
        DIVIDE_PAIRS.map(({ a, b }) => ({
          method: DIVIDE_METHODS[mode],
          mode,
          a,
          b,
        })),
      ),
    )('should wire $method to the $mode oracle', ({ method, mode, a, b }) => {
      const expected = norm(IntMath.divideRounded(a, b, mode));

      expectOk(IntArith[method](int(a), int(b)), expected);
    });

    it('should reject a division by zero', () => {
      const result = IntArith.divide(int(1), int(0));

      assertErr(result);
      expect(result.error.kind).toBe(IsIntInvariantErrorKind);
    });
  });
});
