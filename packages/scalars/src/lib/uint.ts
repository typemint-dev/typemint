import { type Kind, type WithDetail, type WithMessage } from '@typemint/core';
import { Invariant, type InferScalarType } from '@typemint/data';
import { Int } from './int.js';
import { NumericScalarArithmetic } from './numeric-scalar-arithmetic.js';

// ─────────────────────────────────────────────────────────────────────────────
// #region: Uint
export const IsUintInvariantErrorKind = 'IsUintInvariantError' as const;
export type IsUintInvariantError = Kind<typeof IsUintInvariantErrorKind> &
  WithMessage &
  WithDetail<{ value: number }>;
function ofIsUintInvariantError(value: number): IsUintInvariantError {
  return {
    kind: IsUintInvariantErrorKind,
    message: 'Value must be a positive integer',
    details: { value },
  };
}

const isUintInvariant = Invariant<Int, IsUintInvariantError>(
  (value: Int) => value >= 0,
  ofIsUintInvariantError,
);

export const Uint = Int.extend('Uint', {
  invariants: [isUintInvariant],
});

export type Uint = InferScalarType<typeof Uint>;

// #endregion
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// #region: Uint arithmetic
//
// The mechanical operations — add/subtract/multiply/pow/modulo, the range ops
// (clamp/min/max), and the whole divide* family — come straight from the
// generic `NumericScalarArithmetic` surface built from `Uint`. Every result is
// re-validated through `Uint.of`, so an operation that leaves the domain
// surfaces as an error rather than a value:
//
// - a result that is **negative** (only `subtract` can produce one) fails the
//   `>= 0` invariant with an {@link IsUintInvariantError};
// - a result that is **not a safe integer** (an overflow, or dividing by zero)
//   fails the inherited integer invariant with an `IsIntInvariantError`.
//
// The per-op documentation lives on `NumericScalarArithmetic`. Only the two ops
// with a `Uint`-specific type or totality are hand-written and grafted on here:
// `abs` (a total no-op, never fails) and `sign` (`0 | 1`, never `-1`).
// ─────────────────────────────────────────────────────────────────────────────
export const UintArithmetic = {
  ...NumericScalarArithmetic(Uint),

  /**
   * **Absolute value** — a no-op for unsigned integers.
   *
   * A `Uint` is already non-negative, so its magnitude is itself. Provided
   * for API symmetry with {@link IntArithmetic.abs}; it returns the value
   * unchanged and, unlike the `Int` version, cannot fail.
   *
   * @param value - Any unsigned integer.
   * @returns `value`, unchanged.
   *
   * @example
   * ```ts
   * UintArithmetic.abs(42);  // 42
   * UintArithmetic.abs(0);   //  0
   * ```
   */
  abs(value: Uint): Uint {
    return value;
  },

  /**
   * **Sign** — tells you whether an unsigned integer is positive or zero.
   *
   * A `Uint` can never be negative, so — unlike {@link IntArithmetic.sign} —
   * this never returns `-1`.
   *
   * @param value - The integer to check.
   * @returns `1` if positive, `0` if zero.
   *
   * @example
   * ```ts
   * UintArithmetic.sign(42);  // 1
   * UintArithmetic.sign(0);   // 0
   * ```
   */
  sign(value: Uint): 0 | 1 {
    return value > 0 ? 1 : 0;
  },
};

// #endregion
// ─────────────────────────────────────────────────────────────────────────────
