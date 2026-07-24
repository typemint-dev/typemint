import type { InferScalarType, ScalarDescriptor } from '@typemint/data';
import {
  DEFAULT_ROUNDING_MODE,
  divideHalfAwayFromZero,
  divideHalfDown,
  divideHalfEven,
  divideHalfOdd,
  divideHalfTowardsZero,
  divideHalfUp,
  divideRounded,
  divideTruncate,
  divideFloor,
  divideCeil,
  type RoundingMode,
} from './numeric-math.js';

// ─────────────────────────────────────────────────────────────────────────────
// #region: generic scalar arithmetic
//
// The mechanical core of an integer arithmetic surface: every operation whose
// body is "do the pure `number → number` math, then re-brand through the
// scalar's own `.of`". That covers `add`/`subtract`/`multiply`/`pow`/`modulo`,
// the range ops (`clamp`/`min`/`max`), and the whole `divide*` family.
//
// Crucially, the *domain* differences fall out for free from `.of`
// re-validation: `subtract` on a `Uint` that would go below zero, or any op
// that overflows the safe-integer range, surfaces as that scalar's own
// invariant error — no per-scalar body required. What does NOT fit here is any
// op with a scalar-specific *type* or totality (`sign`: `-1 | 0 | 1` vs
// `0 | 1`; `abs`: fallible `Math.abs` vs a total no-op). Those stay hand-written
// and the consumer grafts them on (see the smoke test at the bottom).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A numeric scalar descriptor — the input the factory accepts.
 *
 * The root slot is `any`, not `number`, on purpose: `ScalarDescriptor.extend`
 * mentions the root contravariantly, so pinning it to `number` makes `extend`
 * invariant and rejects both `Int` (root `number`) *and* `Uint` (root
 * `Scalar<'Int', number>`). This is the same `<string, any, unknown>` shape the
 * package's own `InferScalarType` uses for exactly this reason. Numeric-ness is
 * enforced at the body's `n()` boundary, not by this bound.
 */
export type NumericScalarDescriptor = ScalarDescriptor<string, any, unknown>;

/**
 * The generic integer-arithmetic surface for a numeric scalar `T`.
 *
 * - `TValue` — the branded operand/return type (`InferScalarType<T>`).
 * - `TResult` — the fallible constructor result (`ReturnType<T['of']>`), i.e.
 *   `Result<TValue, …invariantError>`. Ops that can leave the domain return
 *   this; range ops that only ever return one of their inputs return `TValue`.
 */
export interface NumericScalarArithmetic<
  T extends NumericScalarDescriptor,
  TValue = InferScalarType<T>,
  TResult = ReturnType<T['of']>,
> {
  /**
   * **Addition** — puts two numbers together.
   *
   * The sum is re-validated through the scalar's own `.of`, so a result that
   * leaves the domain (e.g. an overflow of the safe-integer range) surfaces as
   * that scalar's invariant error rather than a value.
   *
   * @param augend - The starting number.
   * @param addend - The number being added.
   * @returns The sum, or an error if it leaves the scalar's domain.
   *
   * @example
   * ```ts
   * ScalarArithmetic(Uint).add(3, 5);  // 8
   * ScalarArithmetic(Uint).add(5, 0);  // 5
   * ```
   */
  add(augend: TValue, addend: TValue): TResult;

  /**
   * **Subtraction** — takes one number away from another.
   *
   * The difference is re-validated through `.of`, so a result that leaves the
   * domain returns an error. On a scalar bounded below (e.g. `Uint`), a
   * difference that would go negative is out of domain and fails its invariant.
   *
   * @param minuend    - The number you start with.
   * @param subtrahend - The number being taken away.
   * @returns The difference, or an error if it leaves the scalar's domain.
   *
   * @example
   * ```ts
   * ScalarArithmetic(Uint).subtract(10, 3);  //  7
   * ScalarArithmetic(Uint).subtract(3, 10);  //  error — underflows below zero
   * ```
   */
  subtract(minuend: TValue, subtrahend: TValue): TResult;

  /**
   * **Multiplication** — repeated addition.
   *
   * @param multiplicand - The first factor.
   * @param multiplier   - The second factor.
   * @returns The product, or an error if it leaves the scalar's domain.
   *
   * @example
   * ```ts
   * ScalarArithmetic(Uint).multiply(3, 5);  // 15
   * ScalarArithmetic(Uint).multiply(5, 0);  //  0
   * ```
   */
  multiply(multiplicand: TValue, multiplier: TValue): TResult;

  /**
   * **Exponentiation** — multiplies a number by itself many times.
   *
   * @param base     - The number being multiplied.
   * @param exponent - How many times to multiply.
   * @returns `base` raised to `exponent`, or an error if it leaves the domain.
   *
   * @example
   * ```ts
   * ScalarArithmetic(Uint).pow(2, 10);  // 1024
   * ScalarArithmetic(Uint).pow(5, 0);   //    1
   * ```
   */
  pow(base: TValue, exponent: TValue): TResult;

  /**
   * **Modulo** — the remainder left over after division.
   *
   * @param a - The dividend.
   * @param b - The divisor.
   * @returns The remainder of `a ÷ b`, or an error when `b` is `0`.
   *
   * @example
   * ```ts
   * ScalarArithmetic(Uint).modulo(7, 3);  // 1
   * ScalarArithmetic(Uint).modulo(6, 3);  // 0
   * ```
   */
  modulo(a: TValue, b: TValue): TResult;

  /**
   * **Clamp** — forces a number to stay within a range.
   *
   * Total: it always returns one of its (already branded) inputs, so there is
   * no re-validation and no `Result` wrapper.
   *
   * @param value - The number to clamp.
   * @param min   - The smallest allowed value.
   * @param max   - The largest allowed value.
   * @returns `min` when `value < min`, `max` when `value > max`, otherwise
   *          `value`.
   *
   * @example
   * ```ts
   * ScalarArithmetic(Uint).clamp(5,  0, 10);  //  5
   * ScalarArithmetic(Uint).clamp(15, 0, 10);  // 10
   * ```
   */
  clamp(value: TValue, min: TValue, max: TValue): TValue;

  /**
   * **Minimum** — picks the smaller of two numbers. Total.
   *
   * @param a - The first number to compare.
   * @param b - The second number to compare.
   * @returns Whichever of `a` and `b` is smaller.
   *
   * @example
   * ```ts
   * ScalarArithmetic(Uint).min(3, 5);  // 3
   * ```
   */
  min(a: TValue, b: TValue): TValue;

  /**
   * **Maximum** — picks the larger of two numbers. Total.
   *
   * @param a - The first number to compare.
   * @param b - The second number to compare.
   * @returns Whichever of `a` and `b` is larger.
   *
   * @example
   * ```ts
   * ScalarArithmetic(Uint).max(3, 5);  // 5
   * ```
   */
  max(a: TValue, b: TValue): TValue;

  /**
   * **Division** with a configurable rounding mode.
   *
   * Defaults to `'truncate'`. Each mode resolves the fractional remainder
   * differently — see the dedicated `divide*` methods for the individual rules.
   *
   * @param dividend     - The number being divided.
   * @param divisor      - The number to divide by.
   * @param roundingMode - How to handle the remainder. Defaults to `'truncate'`.
   * @returns The rounded quotient, or an error on division by zero.
   *
   * @example
   * ```ts
   * ScalarArithmetic(Uint).divide(7, 2);            // 3  (truncate, default)
   * ScalarArithmetic(Uint).divide(7, 2, 'ceil');    // 4
   * ScalarArithmetic(Uint).divide(7, 2, 'halfEven'); // 4
   * ```
   */
  divide(
    dividend: TValue,
    divisor: TValue,
    roundingMode?: RoundingMode,
  ): TResult;

  /**
   * **Floor division** — rounds toward −∞.
   *
   * @param dividend - The number being divided.
   * @param divisor  - The number to divide by.
   * @returns The quotient rounded toward −∞, or an error on division by zero.
   */
  divideFloor(dividend: TValue, divisor: TValue): TResult;

  /**
   * **Ceiling division** — rounds toward +∞.
   *
   * @param dividend - The number being divided.
   * @param divisor  - The number to divide by.
   * @returns The quotient rounded toward +∞, or an error on division by zero.
   */
  divideCeil(dividend: TValue, divisor: TValue): TResult;

  /**
   * **Truncate division** — drops the fractional part (rounds toward zero).
   *
   * @param dividend - The number being divided.
   * @param divisor  - The number to divide by.
   * @returns The quotient with the fraction discarded, or an error on division
   *          by zero.
   */
  divideTruncate(dividend: TValue, divisor: TValue): TResult;

  /**
   * **Half-even division** (banker's rounding) — ties go to the nearest even
   * integer.
   *
   * @param dividend - The number being divided.
   * @param divisor  - The number to divide by.
   * @returns The quotient with banker's rounding, or an error on division by
   *          zero.
   */
  divideHalfEven(dividend: TValue, divisor: TValue): TResult;

  /**
   * **Half-odd division** — ties go to the nearest odd integer.
   *
   * @param dividend - The number being divided.
   * @param divisor  - The number to divide by.
   * @returns The quotient with half-odd rounding, or an error on division by
   *          zero.
   */
  divideHalfOdd(dividend: TValue, divisor: TValue): TResult;

  /**
   * **Half-up division** — ties round toward +∞.
   *
   * @param dividend - The number being divided.
   * @param divisor  - The number to divide by.
   * @returns The quotient with ties rounded toward +∞, or an error on division
   *          by zero.
   */
  divideHalfUp(dividend: TValue, divisor: TValue): TResult;

  /**
   * **Half-down division** — ties round toward −∞.
   *
   * @param dividend - The number being divided.
   * @param divisor  - The number to divide by.
   * @returns The quotient with ties rounded toward −∞, or an error on division
   *          by zero.
   */
  divideHalfDown(dividend: TValue, divisor: TValue): TResult;

  /**
   * **Half-away-from-zero division** — ties round away from zero.
   *
   * @param dividend - The number being divided.
   * @param divisor  - The number to divide by.
   * @returns The quotient with ties rounded away from zero, or an error on
   *          division by zero.
   */
  divideHalfAwayFromZero(dividend: TValue, divisor: TValue): TResult;

  /**
   * **Half-towards-zero division** — ties round toward zero.
   *
   * @param dividend - The number being divided.
   * @param divisor  - The number to divide by.
   * @returns The quotient with ties rounded toward zero, or an error on
   *          division by zero.
   */
  divideHalfTowardsZero(dividend: TValue, divisor: TValue): TResult;
}

/**
 * Builds the {@link NumericScalarArithmetic} surface for a numeric scalar descriptor,
 * so `ScalarArithmetic(Uint)` yields all the shared integer operations with
 * `Uint`-precise types.
 *
 * Two casts carry the numeric assumption the `any`-root bound can't state:
 * - {@link n} — a raw `number` view of a branded operand (sound because the
 *   scalar's root primitive is `number`).
 * - {@link of} — `S.of` re-typed as `(value: number) => TResult`; the concrete
 *   `T` inferred at the call site keeps `TResult` precise.
 */
export function NumericScalarArithmetic<T extends NumericScalarDescriptor>(
  descriptor: T,
): NumericScalarArithmetic<T> {
  const of = descriptor.of as (value: number) => ReturnType<T['of']>;

  const ops: NumericScalarArithmetic<T> = {
    add: (a, b) => of(a + b),
    subtract: (a, b) => of(a - b),
    multiply: (a, b) => of(a * b),
    pow: (a, b) => of(a ** b),
    modulo: (a, b) => of(a % b),

    // Range ops never leave the domain — they return one of their (already
    // branded) inputs, so no re-validation and no `Result` wrapper.
    clamp: (value, min, max) => (value < min ? min : value > max ? max : value),
    min: (a, b) => (a < b ? a : b),
    max: (a, b) => (a > b ? a : b),

    divide: (a, b, mode = DEFAULT_ROUNDING_MODE) =>
      of(divideRounded(a, b, mode)),
    divideFloor: (a, b) => of(divideFloor(a, b)),
    divideCeil: (a, b) => of(divideCeil(a, b)),
    divideTruncate: (a, b) => of(divideTruncate(a, b)),
    divideHalfEven: (a, b) => of(divideHalfEven(a, b)),
    divideHalfOdd: (a, b) => of(divideHalfOdd(a, b)),
    divideHalfUp: (a, b) => of(divideHalfUp(a, b)),
    divideHalfDown: (a, b) => of(divideHalfDown(a, b)),
    divideHalfAwayFromZero: (a, b) => of(divideHalfAwayFromZero(a, b)),
    divideHalfTowardsZero: (a, b) => of(divideHalfTowardsZero(a, b)),
  };

  return ops;
}
