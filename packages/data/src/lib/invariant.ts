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
