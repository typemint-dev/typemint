import { type Kind, type WithDetail, type WithMessage } from '@typemint/core';
import { Invariant, Scalar, type InferScalarType } from '@typemint/data';
import { DEFAULT_ROUNDING_MODE, RoundingMode } from './numeric-math.js';
import { NumericScalarArithmetic } from './numeric-scalar-arithmetic.js';

// ─────────────────────────────────────────────────────────────────────────────
// #region: Int
export const IsIntInvariantErrorKind = 'IsIntInvariantError' as const;
export type IsIntInvariantError = Kind<typeof IsIntInvariantErrorKind> &
  WithMessage &
  WithDetail<{ value: number }>;
function ofIsIntInvariantError(value: number): IsIntInvariantError {
  return {
    kind: IsIntInvariantErrorKind,
    message: `Value is not an integer: ${value}`,
    details: { value },
  };
}

// We check not only if a integer is an integer, but also if it can be
// represented by Javascript integer type
const isIntInvariant = Invariant(Number.isSafeInteger, ofIsIntInvariantError);

export const Int = Scalar('Int', 'number', {
  invariants: [isIntInvariant],
});

export type Int = InferScalarType<typeof Int>;

// #endregion
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// #region: Int arithmetic

// The rounding-mode vocabulary is generic (it applies to any integer division,
// `Int` or `Uint`), so it is owned by `./numeric-math.js`. Re-exported here for
// the int-facing public API, alongside the historical `Int`-prefixed aliases.
export { DEFAULT_ROUNDING_MODE, RoundingMode } from './numeric-math.js';

/** Int-flavoured alias of {@link RoundingMode}. */
export const IntRoundingMode = RoundingMode;
/** Int-flavoured alias of {@link RoundingMode}. */
export type IntRoundingMode = RoundingMode;
/** Int-flavoured alias of {@link DEFAULT_ROUNDING_MODE}. */
export const INT_DEFAULT_ROUNDING_MODE = DEFAULT_ROUNDING_MODE;

// The mechanical operations — add/subtract/multiply/pow/modulo, the range ops
// (clamp/min/max), and the whole divide* family — come straight from the
// generic `NumericScalarArithmetic` surface built from `Int`; their per-op
// documentation lives there. Only the two ops with an `Int`-specific type or
// totality are hand-written and grafted on here: `sign` (`-1 | 0 | 1`, vs the
// `Uint` codomain of `0 | 1`) and `abs` (a fallible `Math.abs` re-brand, vs the
// `Uint` total no-op).
export const IntArithmetic = {
  ...NumericScalarArithmetic(Int),

  /**
   * **Sign** — tells you whether an integer is positive, negative, or zero.
   *
   * Like checking a bank balance:
   * - Positive balance → you have money → `1`
   * - Negative balance → you owe money → `-1`
   * - Zero balance → exactly even → `0`
   *
   * @param value - The integer to check.
   * @returns `1` if positive, `-1` if negative, `0` if zero.
   *
   * @example
   * ```ts
   * IntArithmetic.sign(42);   //  1
   * IntArithmetic.sign(-42);  // -1
   * IntArithmetic.sign(0);    //  0
   * ```
   */
  sign(value: Int): -1 | 0 | 1 {
    return value > 0 ? 1 : value < 0 ? -1 : 0;
  },

  /**
   * **Absolute value** — the distance from zero, always non-negative.
   *
   * Think of it as removing the minus sign:
   * - The absolute value of 42 is 42 (already positive).
   * - The absolute value of −42 is 42 (drop the minus).
   * - The absolute value of 0 is 0.
   *
   * @param value - Any integer.
   * @returns The non-negative magnitude.
   *
   * @example
   * ```ts
   * IntArithmetic.abs(42);   // 42
   * IntArithmetic.abs(-42);  // 42
   * IntArithmetic.abs(0);    // 0
   * ```
   */
  abs(value: Int): ReturnType<typeof Int.of> {
    return Int.of(Math.abs(value));
  },
};
