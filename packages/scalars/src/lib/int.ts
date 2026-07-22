import { type Kind, type WithDetail, type WithMessage } from '@typemint/core';
import {
  Invariant,
  LiteralUnion,
  Scalar,
  type InferLiteralUnion,
  type InferScalarType,
} from '@typemint/data';

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

/**
 * All supported rounding modes for int division.
 *
 * Because int division produces only whole integers, any fractional
 * part of the mathematical result must be resolved by picking one of
 * the two nearest integers. The rounding mode controls *which* integer
 * is chosen.
 *
 * | Mode                | Tie-breaking rule                          |
 * |---------------------|--------------------------------------------|
 * | `truncate`          | Drop the fraction (toward zero)            |
 * | `floor`             | Always round toward −∞                     |
 * | `ceil`              | Always round toward +∞                     |
 * | `halfEven`          | Ties go to the nearest *even* integer       |
 * | `halfOdd`           | Ties go to the nearest *odd* integer        |
 * | `halfUp`            | Ties go toward +∞                          |
 * | `halfDown`          | Ties go toward −∞                          |
 * | `halfTowardsZero`   | Ties go toward zero                        |
 * | `halfAwayFromZero`  | Ties go away from zero                     |
 */
export const IntRoundingMode = LiteralUnion([
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
export type IntRoundingMode = InferLiteralUnion<typeof IntRoundingMode>;

export const INT_DEFAULT_ROUNDING_MODE = IntRoundingMode.truncate;

export const IntArithmetic = {
  /**
   * **Addition** — puts two integers together.
   *
   * Think of it like combining two piles of coins:
   * if you have 3 coins and get 5 more, you now have 8.
   *
   *     3 + 5 = 8
   *
   * @param augend  - The starting integer (the first pile).
   * @param addend  - The integer being added (the second pile).
   * @returns The result of the addition of the two integers or an error if
   *    the addition overflows the safe integer range.
   *
   * @example
   * ```ts
   * IntArithmetic.add(3, 5);   //  8
   * IntArithmetic.add(-3, 5);  //  2
   * IntArithmetic.add(5, 0);   //  5  — adding zero changes nothing
   * ```
   */
  add(augend: Int, addend: Int): ReturnType<typeof Int.of> {
    return Int.of(augend + addend);
  },

  /**
   * **Clamp** — forces an integer to stay within a range.
   *
   * Imagine a thermometer that only goes from 0 to 100. If the real
   * temperature is -5 you read 0; if it is 120 you read 100; if it is
   * 42 you read 42.
   *
   * @param value - The integer to clamp.
   * @param min   - The smallest allowed value (lower fence).
   * @param max   - The largest allowed value (upper fence).
   * @returns `min` when `value < min`, `max` when `value > max`,
   *          otherwise `value` itself.
   *
   * @example
   * ```ts
   * IntArithmetic.clamp(5,  0, 10);  //  5  — already inside
   * IntArithmetic.clamp(-5, 0, 10);  //  0  — too low, clamped up
   * IntArithmetic.clamp(15, 0, 10);  // 10  — too high, clamped down
   * ```
   */
  clamp(value: Int, min: Int, max: Int): Int {
    return value < min ? min : value > max ? max : value;
  },

  /**
   * **Exponentiation** — multiplies an integer by itself many times.
   *
   * "2 to the power of 3" means 2 × 2 × 2 = 8.
   * "10 to the power of 3" means 10 × 10 × 10 = 1 000.
   *
   * @param base     - The integer being multiplied (the "base").
   * @param exponent - How many times to multiply (the "power").
   * @returns `base` raised to the `exponent`.
   *
   * @example
   * ```ts
   * IntArithmetic.pow(2, 10);  // 1024  (2×2×…×2, ten times)
   * IntArithmetic.pow(10, 3);  // 1000
   * IntArithmetic.pow(5, 0);   //    1  — anything to the power of 0 is 1
   * IntArithmetic.pow(-2, 3);  //   -8  — negative × negative × negative = negative
   * ```
   */
  pow(base: Int, exponent: Int): ReturnType<typeof Int.of> {
    return Int.of(base ** exponent);
  },

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
   * **Subtraction** — takes one integer away from another.
   *
   * If you have 10 apples and give away 3, you have 7 left.
   *
   *     10 − 3 = 7
   *
   * @param minuend    - The integer you start with (the whole pile).
   * @param subtrahend - The integer being taken away.
   * @returns The difference.
   *
   * @example
   * ```ts
   * IntArithmetic.subtract(10, 3);   //  7
   * IntArithmetic.subtract(3, 10);   // -7  — you took away more than you had
   * IntArithmetic.subtract(-3, -5);  //  2  — subtracting a negative adds
   * ```
   */
  subtract(minuend: Int, subtrahend: Int): ReturnType<typeof Int.of> {
    return Int.of(minuend - subtrahend);
  },

  /**
   * **Multiplication** — repeated addition.
   *
   * "3 times 5" means 5 + 5 + 5 = 15.
   *
   * Sign rules (just like in school):
   * - positive × positive = positive  ( 3 ×  5 =  15)
   * - positive × negative = negative  ( 3 × −5 = −15)
   * - negative × negative = positive  (−3 × −5 =  15)
   *
   * @param multiplicand - The first factor.
   * @param multiplier   - The second factor.
   * @returns The product.
   *
   * @example
   * ```ts
   * IntArithmetic.multiply(3,  5);   //  15
   * IntArithmetic.multiply(3, -5);   // -15
   * IntArithmetic.multiply(-3, -5);  //  15
   * IntArithmetic.multiply(5,  0);   //   0  — anything times zero is zero
   * ```
   */
  multiply(multiplicand: Int, multiplier: Int): ReturnType<typeof Int.of> {
    return Int.of(multiplicand * multiplier);
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

  /**
   * **Floor division** — always rounds toward −∞ (negative infinity).
   *
   * Picture a integer line: the result is the nearest integer that is
   * *to the left* (toward the minus side).
   *
   * ```
   *   ← toward −∞                       toward +∞ →
   *   ──┬────┬────┬────┬────┬────┬────┬────┬──
   *    -4   -3   -2   -1    0    1    2    3
   *                              ↓
   *           7 ÷ 2 = 3.5 → floor is 3   ✓
   *     ↓
   *          −7 ÷ 2 = −3.5 → floor is −4 ✓
   * ```
   *
   * @param dividend - The integer being divided.
   * @param divisor  - The integer to divide by.
   * @returns The quotient rounded toward −∞.
   *
   * @example
   * ```ts
   * IntArithmetic.divideFloor( 7,  2);  //  3   ( 3.5 → 3)
   * IntArithmetic.divideFloor(-7,  2);  // -4   (−3.5 → −4)
   * IntArithmetic.divideFloor( 7, -2);  // -4   (−3.5 → −4)
   * IntArithmetic.divideFloor(-7, -2);  //  3   ( 3.5 → 3)
   * IntArithmetic.divideFloor(10,  2);  //  5   (exact — no rounding needed)
   * ```
   */
  divideFloor(dividend: Int, divisor: Int): ReturnType<typeof Int.of> {
    const quotient = Math.trunc(dividend / divisor);
    const remainder = dividend % divisor;
    if (remainder !== 0 && dividend < 0 !== divisor < 0) {
      return Int.of(quotient - 1);
    }
    return Int.of(quotient);
  },

  /**
   * **Truncate division** — drops the fractional part (rounds toward zero).
   *
   * This is the default behaviour of JavaScript's `bigint / bigint`.
   * The fraction is simply chopped off — like cutting a rope and
   * throwing away the short end.
   *
   * ```
   *    7 ÷ 2 = 3.5  → chop → 3   (moved toward 0)
   *   −7 ÷ 2 = −3.5 → chop → −3  (moved toward 0)
   * ```
   *
   * @param dividend - The integer being divided.
   * @param divisor  - The integer to divide by.
   * @returns The quotient with the fractional part discarded.
   *
   * @example
   * ```ts
   * IntArithmetic.divideTruncate( 7,  2);  //  3
   * IntArithmetic.divideTruncate(-7,  2);  // -3
   * IntArithmetic.divideTruncate( 7, -2);  // -3
   * IntArithmetic.divideTruncate(-7, -2);  //  3
   * ```
   */
  divideTruncate(dividend: Int, divisor: Int): ReturnType<typeof Int.of> {
    return Int.of(Math.trunc(dividend / divisor));
  },

  /**
   * **Ceiling division** — always rounds toward +∞ (positive infinity).
   *
   * The opposite of floor: the result is the nearest integer *to the
   * right* on the integer line.
   *
   * ```
   *    7 ÷ 2 = 3.5  → ceil → 4
   *   −7 ÷ 2 = −3.5 → ceil → −3  (−3 is to the right of −3.5)
   * ```
   *
   * @param dividend - The integer being divided.
   * @param divisor  - The integer to divide by.
   * @returns The quotient rounded toward +∞.
   *
   * @example
   * ```ts
   * IntArithmetic.divideCeil( 7,  2);  //  4
   * IntArithmetic.divideCeil(-7,  2);  // -3
   * IntArithmetic.divideCeil( 7, -2);  // -3
   * IntArithmetic.divideCeil(-7, -2);  //  4
   * IntArithmetic.divideCeil(10,  2);  //  5  (exact)
   * ```
   */
  divideCeil(dividend: Int, divisor: Int): ReturnType<typeof Int.of> {
    const quotient = Math.trunc(dividend / divisor);
    const remainder = dividend % divisor;
    // Exact quotient is positive when signs agree; trunc rounded it toward zero
    // (down), so bump toward +∞.
    if (remainder !== 0 && dividend < 0 === divisor < 0) {
      return Int.of(quotient + 1);
    }
    return Int.of(quotient);
  },

  /**
   * **Half-even division** (banker's rounding) — rounds to the nearest
   * integer, and when the result is *exactly* halfway, picks the
   * nearest **even** integer.
   *
   * This is the gold standard for financial calculations because over
   * many operations the rounding errors cancel out (no systematic bias
   * toward higher or lower values).
   *
   * ```
   *   5 ÷ 2 = 2.5  → halfway → 2 is even, 3 is odd → pick 2
   *   7 ÷ 2 = 3.5  → halfway → 3 is odd,  4 is even → pick 4
   *   8 ÷ 3 = 2.67  → above half → round up → 3
   *   7 ÷ 3 = 2.33  → below half → round down → 2
   * ```
   *
   * @param dividend - The integer being divided.
   * @param divisor  - The integer to divide by.
   * @returns The quotient with banker's rounding applied.
   *
   * @example
   * ```ts
   * IntArithmetic.divideHalfEven(5,  2);  //  2  (tie → even)
   * IntArithmetic.divideHalfEven(7,  2);  //  4  (tie → even)
   * IntArithmetic.divideHalfEven(8,  3);  //  3  (above half → up)
   * IntArithmetic.divideHalfEven(-7, 2);  // -4  (tie → even)
   * IntArithmetic.divideHalfEven(-5, 2);  // -2  (tie → even)
   * ```
   */
  divideHalfEven(dividend: Int, divisor: Int): ReturnType<typeof Int.of> {
    const quotient = Math.trunc(dividend / divisor);
    const remainder = dividend % divisor;
    const doubled = Math.abs(remainder) * 2;
    const absDivisor = Math.abs(divisor);
    const awayFromZero = dividend > 0 === divisor > 0 ? 1 : -1;

    if (doubled > absDivisor) {
      return Int.of(quotient + awayFromZero);
    }
    if (doubled < absDivisor) {
      return Int.of(quotient);
    }
    return quotient % 2 === 0
      ? Int.of(quotient)
      : Int.of(quotient + awayFromZero);
  },

  /**
   * **Half-odd division** — rounds to the nearest integer, and when
   * the result is *exactly* halfway, picks the nearest **odd** integer.
   *
   * The mirror image of half-even. Rarely used in finance but
   * included for completeness.
   *
   * ```
   *   5 ÷ 2 = 2.5  → halfway → 2 is even, 3 is odd → pick 3
   *   7 ÷ 2 = 3.5  → halfway → 3 is odd,  4 is even → pick 3
   * ```
   *
   * @param dividend - The integer being divided.
   * @param divisor  - The integer to divide by.
   * @returns The quotient with half-odd rounding applied.
   *
   * @example
   * ```ts
   * IntArithmetic.divideHalfOdd(5,  2);  //  3  (tie → odd)
   * IntArithmetic.divideHalfOdd(7,  2);  //  3  (tie → odd)
   * IntArithmetic.divideHalfOdd(8,  3);  //  3  (above half → up)
   * IntArithmetic.divideHalfOdd(-5, 2);  // -3  (tie → odd)
   * ```
   */
  divideHalfOdd(dividend: Int, divisor: Int): ReturnType<typeof Int.of> {
    const quotient = Math.trunc(dividend / divisor);
    const remainder = dividend % divisor;
    const doubled = Math.abs(remainder) * 2;
    const absDivisor = Math.abs(divisor);
    const awayFromZero = dividend > 0 === divisor > 0 ? 1 : -1;

    if (doubled > absDivisor) {
      return Int.of(quotient + awayFromZero);
    }
    if (doubled < absDivisor) {
      return Int.of(quotient);
    }
    return quotient % 2 !== 0
      ? Int.of(quotient)
      : Int.of(quotient + awayFromZero);
  },

  /**
   * **Half-away-from-zero division** — rounds to the nearest integer,
   * and when the result is *exactly* halfway, rounds **away from zero**.
   *
   * This is what most people learn in school:
   * "if it's .5 or more, round up (in magnitude)".
   *
   * ```
   *    7 ÷ 2 =  3.5  → away from 0 →  4
   *   −7 ÷ 2 = −3.5  → away from 0 → −4
   * ```
   *
   * @param dividend - The integer being divided.
   * @param divisor  - The integer to divide by.
   * @returns The quotient rounded away from zero on ties.
   *
   * @example
   * ```ts
   * IntArithmetic.divideHalfAwayFromZero( 7, 2);  //  4
   * IntArithmetic.divideHalfAwayFromZero(-7, 2);  // -4
   * IntArithmetic.divideHalfAwayFromZero( 8, 3);  //  3  (above half → up)
   * IntArithmetic.divideHalfAwayFromZero( 7, 3);  //  2  (below half → down)
   * ```
   */
  divideHalfAwayFromZero(
    dividend: Int,
    divisor: Int,
  ): ReturnType<typeof Int.of> {
    const quotient = Math.trunc(dividend / divisor);
    const remainder = dividend % divisor;
    const doubled = Math.abs(remainder) * 2;
    const absDivisor = Math.abs(divisor);
    const awayFromZero = dividend > 0 === divisor > 0 ? 1 : -1;

    if (doubled >= absDivisor) {
      return Int.of(quotient + awayFromZero);
    }
    return Int.of(quotient);
  },

  /**
   * **Half-towards-zero division** — rounds to the nearest integer,
   * and when the result is *exactly* halfway, rounds **toward zero**.
   *
   * The opposite of half-away-from-zero: ties shrink toward zero.
   *
   * ```
   *    7 ÷ 2 =  3.5  → toward 0 →  3
   *   −7 ÷ 2 = −3.5  → toward 0 → −3
   * ```
   *
   * @param dividend - The integer being divided.
   * @param divisor  - The integer to divide by.
   * @returns The quotient rounded toward zero on ties.
   *
   * @example
   * ```ts
   * IntArithmetic.divideHalfTowardsZero( 7, 2);  //  3
   * IntArithmetic.divideHalfTowardsZero(-7, 2);  // -3
   * IntArithmetic.divideHalfTowardsZero( 8, 3);  //  3  (above half → up)
   * ```
   */
  divideHalfTowardsZero(
    dividend: Int,
    divisor: Int,
  ): ReturnType<typeof Int.of> {
    const quotient = Math.trunc(dividend / divisor);
    const remainder = dividend % divisor;
    const doubled = Math.abs(remainder) * 2;
    const absDivisor = Math.abs(divisor);
    const awayFromZero = dividend > 0 === divisor > 0 ? 1 : -1;

    if (doubled > absDivisor) {
      return Int.of(quotient + awayFromZero);
    }
    return Int.of(quotient);
  },

  /**
   * **Half-up division** — rounds to the nearest integer, and when the
   * result is *exactly* halfway, rounds toward **+∞** (positive infinity).
   *
   * "Up" here means *up the integer line* — toward larger integers — not
   * "up in magnitude".
   *
   * ```
   *    7 ÷ 2 =  3.5  → toward +∞ →  4
   *   −7 ÷ 2 = −3.5  → toward +∞ → −3  (−3 > −4)
   * ```
   *
   * @param dividend - The integer being divided.
   * @param divisor  - The integer to divide by.
   * @returns The quotient rounded toward +∞ on ties.
   *
   * @example
   * ```ts
   * IntArithmetic.divideHalfUp( 7, 2);  //  4  (tie → toward +∞)
   * IntArithmetic.divideHalfUp(-7, 2);  // -3  (tie → toward +∞)
   * IntArithmetic.divideHalfUp( 5, 2);  //  3
   * IntArithmetic.divideHalfUp(-5, 2);  // -2
   * ```
   */
  divideHalfUp(dividend: Int, divisor: Int): ReturnType<typeof Int.of> {
    const quotient = Math.trunc(dividend / divisor);
    const remainder = dividend % divisor;
    const doubled = Math.abs(remainder) * 2;
    const absDivisor = Math.abs(divisor);
    const awayFromZero = dividend > 0 === divisor > 0 ? 1 : -1;

    if (doubled > absDivisor) {
      return Int.of(quotient + awayFromZero);
    }
    if (doubled < absDivisor) {
      return Int.of(quotient);
    }
    const positiveResult = dividend > 0 === divisor > 0;
    return positiveResult ? Int.of(quotient + 1) : Int.of(quotient);
  },

  /**
   * **Half-down division** — rounds to the nearest integer, and when
   * the result is *exactly* halfway, rounds toward **−∞** (negative
   * infinity).
   *
   * "Down" means *down the integer line* — toward smaller integers.
   *
   * ```
   *    7 ÷ 2 =  3.5  → toward −∞ →  3
   *   −7 ÷ 2 = −3.5  → toward −∞ → −4  (−4 < −3)
   * ```
   *
   * @param dividend - The integer being divided.
   * @param divisor  - The integer to divide by.
   * @returns The quotient rounded toward −∞ on ties.
   *
   * @example
   * ```ts
   * IntArithmetic.divideHalfDown( 7, 2);  //  3  (tie → toward −∞)
   * IntArithmetic.divideHalfDown(-7, 2);  // -4  (tie → toward −∞)
   * IntArithmetic.divideHalfDown( 5, 2);  //  2
   * IntArithmetic.divideHalfDown(-5, 2);  // -3
   * ```
   */
  divideHalfDown(dividend: Int, divisor: Int): ReturnType<typeof Int.of> {
    const quotient = Math.trunc(dividend / divisor);
    const remainder = dividend % divisor;
    const doubled = Math.abs(remainder) * 2;
    const absDivisor = Math.abs(divisor);
    const awayFromZero = dividend > 0 === divisor > 0 ? 1 : -1;

    if (doubled > absDivisor) {
      return Int.of(quotient + awayFromZero);
    }
    if (doubled < absDivisor) {
      return Int.of(quotient);
    }
    const positiveResult = dividend > 0 === divisor > 0;
    return positiveResult ? Int.of(quotient) : Int.of(quotient - 1);
  },

  /**
   * **Division** with a configurable rounding mode.
   *
   * Division asks "how many times does the divisor fit into the
   * dividend?". When it does not fit evenly, there is a remainder and
   * we must *round* the answer to a whole int. The `roundingMode`
   * parameter controls how that rounding works.
   *
   * Defaults to `'truncate'` (drop the fraction, like native `int / int`).
   *
   * @param dividend     - The integer being divided (the "whole pie").
   * @param divisor      - The integer to divide by (the "integer of slices").
   * @param roundingMode - How to handle the fractional remainder. Defaults to `'truncate'`.
   * @returns The rounded quotient.
   *
   * @example
   * ```ts
   * //  7 ÷ 2 = 3.5
   * IntArithmetic.divide(7, 2);                     // 3  (truncate, default)
   * IntArithmetic.divide(7, 2, 'floor');             // 3
   * IntArithmetic.divide(7, 2, 'ceil');              // 4
   * IntArithmetic.divide(7, 2, 'halfEven');          // 4  (3 is odd → round up)
   * IntArithmetic.divide(7, 2, 'halfAwayFromZero');  // 4
   *
   * // −7 ÷ 2 = −3.5
   * IntArithmetic.divide(-7, 2, 'floor');            // -4  (toward −∞)
   * IntArithmetic.divide(-7, 2, 'ceil');             // -3  (toward +∞)
   * IntArithmetic.divide(-7, 2, 'halfUp');           // -3  (tie toward +∞)
   * IntArithmetic.divide(-7, 2, 'halfDown');         // -4  (tie toward −∞)
   * ```
   */
  divide(
    dividend: Int,
    divisor: Int,
    roundingMode: IntRoundingMode = INT_DEFAULT_ROUNDING_MODE,
  ): ReturnType<typeof Int.of> {
    return IntRoundingMode.match(roundingMode, {
      truncate: () => IntArithmetic.divideTruncate(dividend, divisor),
      floor: () => IntArithmetic.divideFloor(dividend, divisor),
      ceil: () => IntArithmetic.divideCeil(dividend, divisor),
      halfEven: () => IntArithmetic.divideHalfEven(dividend, divisor),
      halfOdd: () => IntArithmetic.divideHalfOdd(dividend, divisor),
      halfUp: () => IntArithmetic.divideHalfUp(dividend, divisor),
      halfDown: () => IntArithmetic.divideHalfDown(dividend, divisor),
      halfTowardsZero: () =>
        IntArithmetic.divideHalfTowardsZero(dividend, divisor),
      halfAwayFromZero: () =>
        IntArithmetic.divideHalfAwayFromZero(dividend, divisor),
    });
  },

  /**
   * **Minimum** — picks the smaller of two integers.
   *
   * Like comparing two prices and keeping the cheaper one:
   * between 3 and 5 the smaller is 3.
   *
   *     min(3, 5) = 3
   *
   * Remember that "smaller" runs down the integer line, so a negative
   * number is always smaller than a positive one.
   *
   * @param a - The first integer to compare.
   * @param b - The second integer to compare.
   * @returns Whichever of `a` and `b` is smaller (or either one when equal).
   *
   * @example
   * ```ts
   * IntArithmetic.min(3, 5);    //  3
   * IntArithmetic.min(5, 3);    //  3  — order does not matter
   * IntArithmetic.min(-3, 5);   // -3  — negatives are smaller
   * IntArithmetic.min(4, 4);    //  4  — equal, returns that value
   * ```
   */
  min(a: Int, b: Int): Int {
    return a < b ? a : b;
  },

  /**
   * **Maximum** — picks the larger of two integers.
   *
   * Like comparing two scores and keeping the higher one:
   * between 3 and 5 the larger is 5.
   *
   *     max(3, 5) = 5
   *
   * Remember that "larger" runs up the integer line, so a positive
   * number is always larger than a negative one.
   *
   * @param a - The first integer to compare.
   * @param b - The second integer to compare.
   * @returns Whichever of `a` and `b` is larger (or either one when equal).
   *
   * @example
   * ```ts
   * IntArithmetic.max(3, 5);    //  5
   * IntArithmetic.max(5, 3);    //  5  — order does not matter
   * IntArithmetic.max(-3, -5);  // -3  — closer to zero is larger
   * IntArithmetic.max(4, 4);    //  4  — equal, returns that value
   * ```
   */
  max(a: Int, b: Int): Int {
    return a > b ? a : b;
  },

  /**
   * **Modulo** — the remainder left over after division.
   *
   * If you share 7 sweets among 3 children, each child gets 2 and there
   * is 1 sweet left over — that leftover is the modulo.
   *
   *     7 % 3 = 1
   *
   * The sign of the result follows the **dividend** `a` (this is
   * JavaScript's `%` operator, i.e. a *truncated* remainder), so
   * `-7 % 3` is `-1`, not `2`.
   *
   * @param a - The dividend (the integer being divided).
   * @param b - The divisor (the integer to divide by).
   * @returns The remainder of `a ÷ b`, or an error when `b` is `0`
   *    (dividing by zero yields `NaN`, which is not a safe integer).
   *
   * @example
   * ```ts
   * IntArithmetic.modulo(7, 3);   //  1
   * IntArithmetic.modulo(-7, 3);  // -1  — sign follows the dividend
   * IntArithmetic.modulo(7, -3);  //  1
   * IntArithmetic.modulo(-7, -3); // -1
   * IntArithmetic.modulo(6, 3);   //  0  — divides evenly
   * ```
   */
  modulo(a: Int, b: Int): ReturnType<typeof Int.of> {
    return Int.of(a % b);
  },
};
