import { Result } from '@typemint/result';

export type Invariant<TValue, TError> = (value: TValue) => Result<void, TError>;

export function Invariant<TValue, TError>(
  predicate: (value: TValue) => boolean,
  error: (value: TValue) => TError,
): Invariant<TValue, TError> {
  return (value) =>
    predicate(value) ? Result.Ok(void 0) : Result.Err(error(value));
}

type AnyInvariant = Invariant<any, any>;
type InferInvariantValue<T extends AnyInvariant> =
  T extends Invariant<infer TValue, any> ? TValue : never;
export type InferInvariantError<T extends AnyInvariant> =
  T extends Invariant<any, infer TError> ? TError : never;

export namespace Invariant {
  /**
   * A customizable error message for an invariant: either a fixed string or a
   * function that computes the message from the offending value.
   *
   * Shared by every invariant's `*Options` type so the "string or factory"
   * shape is declared in exactly one place.
   */
  export type MessageOption<TValue> = string | ((value: TValue) => string);

  /**
   * Resolves a {@link MessageOption} against the offending value.
   *
   * - A function message is called with `value`.
   * - A string message is returned verbatim (including the empty string).
   * - When no custom message was supplied, `fallback` is invoked to build the
   *   default. `fallback` is only called in this last case, so the default
   *   message is never computed when a custom one overrides it.
   *
   * @param message - The caller-supplied message option, or `undefined`.
   * @param value - The value that failed the invariant.
   * @param fallback - Lazily produces the default message.
   * @returns The resolved message string.
   *
   * @example
   * ```ts
   * Invariant.resolveMessage(undefined, 5, () => 'too small'); // 'too small'
   * Invariant.resolveMessage('nope', 5, () => 'too small');    // 'nope'
   * Invariant.resolveMessage((n) => `got ${n}`, 5, () => '');  // 'got 5'
   * ```
   */
  export function resolveMessage<TValue>(
    message: MessageOption<TValue> | undefined,
    value: TValue,
    fallback: () => string,
  ): string {
    if (typeof message === 'function') {
      return message(value);
    }
    if (typeof message === 'string') {
      return message;
    }
    return fallback();
  }

  /**
   * Combines invariants with an **accumulating AND**: runs every invariant
   * regardless of earlier failures and collects all errors into an array.
   * Returns `Ok` only when every invariant passes; otherwise returns
   * `Err([...errors])` containing one entry per failing invariant.
   *
   * Prefer this over {@link and} when you want to surface every violation at
   * once — for example, form or schema validation where reporting only the
   * first error produces a poor experience.
   *
   * The error type of the combined invariant is an array of the union of every
   * individual error type.
   *
   * @example
   * ```ts
   * const validate = Invariant.andSettled(
   *   Invariant((n: number) => n > 0,   () => 'TOO_SMALL' as const),
   *   Invariant((n: number) => n < 100, () => 'TOO_LARGE' as const),
   *   Invariant((n: number) => n % 2 === 0, () => 'NOT_EVEN' as const),
   * );
   *
   * validate(50);   // Ok(void)
   * validate(-3);   // Err(['TOO_SMALL', 'NOT_EVEN']) — both violations reported
   * validate(200);  // Err(['TOO_LARGE', 'NOT_EVEN'])
   * ```
   */
  export function andSettled<
    const TFirst extends AnyInvariant,
    const TRest extends readonly Invariant<InferInvariantValue<TFirst>, any>[],
  >(
    first: TFirst,
    ...rest: TRest
  ): Invariant<
    InferInvariantValue<TFirst>,
    (InferInvariantError<TFirst> | InferInvariantError<TRest[number]>)[]
  > {
    const invariants = [first, ...rest] as const;
    return (value) => {
      const errors: (
        | InferInvariantError<TFirst>
        | InferInvariantError<TRest[number]>
      )[] = [];
      for (const invariant of invariants) {
        const result = invariant(value);
        if (result.isErr()) {
          errors.push(result.error);
        }
      }
      return errors.length > 0 ? Result.Err(errors) : Result.Ok(void 0);
    };
  }

  /**
   * Combines invariants with a **short-circuit OR**: runs each invariant left
   * to right and returns `Ok` immediately on the first success, without
   * evaluating the remaining invariants. Returns the **last** `Err` only when
   * every invariant fails.
   *
   * The error type of the combined invariant is the union of every individual
   * error type. The last error is returned on total failure because it
   * represents the final attempted path — consistent with how `Result.orElse`
   * propagates the last failure in a recovery chain.
   *
   * @example
   * ```ts
   * const isNonZero = Invariant.or(
   *   Invariant((n: number) => n > 0, () => 'NOT_POSITIVE' as const),
   *   Invariant((n: number) => n < 0, () => 'NOT_NEGATIVE' as const),
   * );
   *
   * isNonZero(5);   // Ok(void)  — first invariant passes, second never runs
   * isNonZero(-3);  // Ok(void)  — second invariant passes
   * isNonZero(0);   // Err('NOT_NEGATIVE')  — both fail, last error returned
   * ```
   */
  export function or<
    const TFirst extends AnyInvariant,
    const TRest extends readonly Invariant<InferInvariantValue<TFirst>, any>[],
  >(
    first: TFirst,
    ...rest: TRest
  ): Invariant<
    InferInvariantValue<TFirst>,
    InferInvariantError<TFirst> | InferInvariantError<TRest[number]>
  > {
    const invariants = [first, ...rest] as const;
    return (value) => {
      let last!: Result<
        void,
        InferInvariantError<TFirst> | InferInvariantError<TRest[number]>
      >;
      for (const invariant of invariants) {
        last = invariant(value);
        if (last.isOk()) {
          return last;
        }
      }
      return last;
    };
  }

  /**
   * Combines invariants with a **fail-fast AND**: runs each invariant left to
   * right and returns the first `Err` immediately, without evaluating the
   * remaining invariants. Returns `Ok` only when every invariant passes.
   *
   * The error type of the combined invariant is the union of every individual
   * error type, so callers can handle each failure mode precisely.
   *
   * Requires at least one invariant (`first`). Pass additional invariants as
   * rest arguments.
   *
   * @example
   * ```ts
   * const isInRange = Invariant.and(
   *   Invariant((n: number) => n > 0,   () => 'TOO_SMALL' as const),
   *   Invariant((n: number) => n < 100, () => 'TOO_LARGE' as const),
   * );
   *
   * isInRange(50);  // Ok(void)
   * isInRange(-1);  // Err('TOO_SMALL')  — second invariant never runs
   * isInRange(200); // Err('TOO_LARGE')
   * ```
   */
  export function and<
    const TFirst extends AnyInvariant,
    const TRest extends readonly Invariant<InferInvariantValue<TFirst>, any>[],
  >(
    first: TFirst,
    ...rest: TRest
  ): Invariant<
    InferInvariantValue<TFirst>,
    InferInvariantError<TFirst> | InferInvariantError<TRest[number]>
  > {
    const invariants = [first, ...rest] as const;
    return (value) => {
      for (const invariant of invariants) {
        const result = invariant(value);
        if (result.isErr()) {
          return result;
        }
      }
      return Result.Ok(void 0);
    };
  }
}
