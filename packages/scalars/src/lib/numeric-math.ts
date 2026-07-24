import { LiteralUnion, type InferLiteralUnion } from '@typemint/data';

// ─────────────────────────────────────────────────────────────────────────────
// #region: rounding mode

/**
 * All supported rounding modes for integer division.
 *
 * Because integer division produces only whole integers, any fractional
 * part of the mathematical result must be resolved by picking one of
 * the two nearest integers. The rounding mode controls *which* integer
 * is chosen.
 *
 * | Mode                | Tie-breaking rule                          |
 * |---------------------|--------------------------------------------|
 * | `truncate`          | Drop the fraction (toward zero)            |
 * | `floor`             | Always round toward −∞                     |
 * | `ceil`              | Always round toward +∞                     |
 * | `halfEven`          | Ties go to the nearest *even* integer      |
 * | `halfOdd`           | Ties go to the nearest *odd* integer       |
 * | `halfUp`            | Ties go toward +∞                          |
 * | `halfDown`          | Ties go toward −∞                          |
 * | `halfTowardsZero`   | Ties go toward zero                        |
 * | `halfAwayFromZero`  | Ties go away from zero                     |
 */
export const RoundingMode = LiteralUnion([
  'truncate',
  'floor',
  'ceil',
  'halfEven',
  'halfOdd',
  'halfUp',
  'halfDown',
  'halfTowardsZero',
  'halfAwayFromZero',
] as const);
export type RoundingMode = InferLiteralUnion<typeof RoundingMode>;

/** The rounding mode used when none is given: drop the fraction. */
export const DEFAULT_ROUNDING_MODE = RoundingMode.truncate;

// #endregion
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// #region: integer division & rounding
//
// Pure `number → number` integer-division helpers, free of any scalar brand or
// `Result` wrapper. They are the single source of truth for the rounding math
// shared by `IntArithmetic` and `UintArithmetic`; each caller is responsible for
// re-validating the returned number through its own `.of` (so a non-finite
// result of dividing by zero, or a negative `Uint` result, surfaces as the
// appropriate invariant error).
//
// The exhaustive reference cross-check in `int.spec.ts` pins every function in
// this module against an independent exact-rational oracle across the full sign
// space; that is the guard that keeps the `Math.trunc` + adjustment logic honest.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The pieces every "round to nearest, break ties by …" mode needs.
 *
 * `doubled` is `|remainder| * 2`; comparing it against `absDivisor` locates the
 * exact result relative to the halfway point without any floating-point
 * division: `doubled < absDivisor` is below half, `> absDivisor` is above half,
 * and `=== absDivisor` is an exact tie. `awayFromZero` is the `±1` step that
 * moves the truncated quotient one integer further from zero (the direction of
 * the true quotient when the division is inexact).
 */
interface DivisionParts {
  quotient: number;
  doubled: number;
  absDivisor: number;
  awayFromZero: 1 | -1;
}

function divisionParts(dividend: number, divisor: number): DivisionParts {
  const quotient = Math.trunc(dividend / divisor);
  const remainder = dividend % divisor;
  return {
    quotient,
    doubled: Math.abs(remainder) * 2,
    absDivisor: Math.abs(divisor),
    awayFromZero: dividend > 0 === divisor > 0 ? 1 : -1,
  };
}

/** Drop the fractional part (round toward zero). */
export function divideTruncate(dividend: number, divisor: number): number {
  return Math.trunc(dividend / divisor);
}

/** Round toward −∞. */
export function divideFloor(dividend: number, divisor: number): number {
  const quotient = Math.trunc(dividend / divisor);
  const remainder = dividend % divisor;
  if (remainder !== 0 && dividend < 0 !== divisor < 0) {
    return quotient - 1;
  }
  return quotient;
}

/** Round toward +∞. */
export function divideCeil(dividend: number, divisor: number): number {
  const quotient = Math.trunc(dividend / divisor);
  const remainder = dividend % divisor;
  if (remainder !== 0 && dividend < 0 === divisor < 0) {
    return quotient + 1;
  }
  return quotient;
}

/** Round to nearest; ties go to the nearest even integer (banker's rounding). */
export function divideHalfEven(dividend: number, divisor: number): number {
  const { quotient, doubled, absDivisor, awayFromZero } = divisionParts(
    dividend,
    divisor,
  );
  if (doubled > absDivisor) return quotient + awayFromZero;
  if (doubled < absDivisor) return quotient;
  return quotient % 2 === 0 ? quotient : quotient + awayFromZero;
}

/** Round to nearest; ties go to the nearest odd integer. */
export function divideHalfOdd(dividend: number, divisor: number): number {
  const { quotient, doubled, absDivisor, awayFromZero } = divisionParts(
    dividend,
    divisor,
  );
  if (doubled > absDivisor) return quotient + awayFromZero;
  if (doubled < absDivisor) return quotient;
  return quotient % 2 !== 0 ? quotient : quotient + awayFromZero;
}

/** Round to nearest; ties go away from zero. */
export function divideHalfAwayFromZero(
  dividend: number,
  divisor: number,
): number {
  const { quotient, doubled, absDivisor, awayFromZero } = divisionParts(
    dividend,
    divisor,
  );
  return doubled >= absDivisor ? quotient + awayFromZero : quotient;
}

/** Round to nearest; ties go toward zero. */
export function divideHalfTowardsZero(
  dividend: number,
  divisor: number,
): number {
  const { quotient, doubled, absDivisor, awayFromZero } = divisionParts(
    dividend,
    divisor,
  );
  return doubled > absDivisor ? quotient + awayFromZero : quotient;
}

/** Round to nearest; ties go toward +∞. */
export function divideHalfUp(dividend: number, divisor: number): number {
  const { quotient, doubled, absDivisor, awayFromZero } = divisionParts(
    dividend,
    divisor,
  );
  if (doubled > absDivisor) return quotient + awayFromZero;
  if (doubled < absDivisor) return quotient;
  const positiveResult = dividend > 0 === divisor > 0;
  return positiveResult ? quotient + 1 : quotient;
}

/** Round to nearest; ties go toward −∞. */
export function divideHalfDown(dividend: number, divisor: number): number {
  const { quotient, doubled, absDivisor, awayFromZero } = divisionParts(
    dividend,
    divisor,
  );
  if (doubled > absDivisor) return quotient + awayFromZero;
  if (doubled < absDivisor) return quotient;
  const positiveResult = dividend > 0 === divisor > 0;
  return positiveResult ? quotient : quotient - 1;
}

/** Divide `dividend` by `divisor`, rounding the result per `mode`. */
export function divideRounded(
  dividend: number,
  divisor: number,
  mode: RoundingMode,
): number {
  return RoundingMode.match(mode, {
    truncate: () => divideTruncate(dividend, divisor),
    floor: () => divideFloor(dividend, divisor),
    ceil: () => divideCeil(dividend, divisor),
    halfEven: () => divideHalfEven(dividend, divisor),
    halfOdd: () => divideHalfOdd(dividend, divisor),
    halfUp: () => divideHalfUp(dividend, divisor),
    halfDown: () => divideHalfDown(dividend, divisor),
    halfTowardsZero: () => divideHalfTowardsZero(dividend, divisor),
    halfAwayFromZero: () => divideHalfAwayFromZero(dividend, divisor),
  });
}

// #endregion
// ─────────────────────────────────────────────────────────────────────────────
