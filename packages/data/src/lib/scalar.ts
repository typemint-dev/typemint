import { Result } from '@typemint/result';
import { Kind } from '@typemint/core';

// Inspired by type-fest "Tagged" type
declare const tag: unique symbol;
export type Scalar<TName extends string, TType, TMeta = never> = TType & {
  [tag]: {
    [K in TName]: TMeta;
  };
};

export type ScalarDescriptor<TName extends string, TType, TError = never> = {
  of(value: TType): Result<Scalar<TName, TType>, TError>;
} & Kind<TName>;

function define<TName extends string, TType, TError = never>(
  name: TName,
  construct: (value: TType) => TType | Result<TType, TError>,
): ScalarDescriptor<TName, TType, TError> {
  function of(value: TType): Result<Scalar<TName, TType>, TError> {
    const constructorOutput = construct(value);
    const valueR = Result.isResult(constructorOutput)
      ? constructorOutput
      : Result.Ok(constructorOutput);

    return valueR.map((v) => v as Scalar<TName, TType>);
  }

  const base = {
    ...Kind.from(name),
    of,
  };

  return base;
}

export const Scalar = define;

export type InferScalar<T extends ScalarDescriptor<string, unknown>> =
  T extends ScalarDescriptor<infer TName, infer TType>
    ? Scalar<TName, TType>
    : never;

export type InferScalarError<
  T extends ScalarDescriptor<string, unknown, unknown>,
> = T extends ScalarDescriptor<string, unknown, infer TError> ? TError : never;
