import { Result } from '@typemint/result';

// Taken from the type-fest "Tagged" type
declare const tag: unique symbol;
type TagContainer<Token> = {
  readonly [tag]: Token;
};

type Tag<Token extends PropertyKey, TagMetadata> = TagContainer<{
  [K in Token]: TagMetadata;
}>;

export type Scalar<TName extends string, TType, TMeta = never> = TType &
  Tag<TName, TMeta>;

type RemoveAllTags<T> =
  T extends Tag<PropertyKey, any>
    ? {
        [ThisTag in keyof T[typeof tag]]: T extends Scalar<
          ThisTag & string,
          infer Type,
          T[typeof tag][ThisTag]
        >
          ? RemoveAllTags<Type>
          : never;
      }[keyof T[typeof tag]]
    : T;

export type InferScalarNames<T extends Scalar<string, unknown, unknown>> =
  T extends Scalar<infer UName, unknown, unknown> ? UName : never;

export type InferScalarType<T extends ScalarDescriptor<string, unknown>> =
  T extends ScalarDescriptor<infer TName, infer TType>
    ? Scalar<TName, TType>
    : never;

export type InferScalarRoot<T extends Scalar<string, unknown, unknown>> =
  RemoveAllTags<T>;

export type InferScalarMeta<T extends Scalar<string, unknown, unknown>> =
  T extends Scalar<string, unknown, infer TMeta> ? TMeta : never;

export type ScalarDescriptor<TName extends string, TType, TError = never> = {
  readonly name: TName;

  of(value: TType): Result<Scalar<TName, TType>, TError>;
};

/*
function define<TName extends string, TType, TError = never>(
  name: TName,
  construct: (
    value: TType extends Scalar<string, infer UVal> ? UVal : never,
  ) => TType | Result<TType, TError>,
): ScalarDescriptor<TName, TType, TError> {
  function of(
    value: TType extends Scalar<string, infer UVal> ? UVal : never,
  ): Result<Scalar<TName, TType>, TError> {
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
  */
/*
export function Scalar<const TName extends string, TBaseType>(
  name: TName,
  baseType: TBaseType,
): ScalarDescriptor<TName, TBaseType> {}
*/

export type InferScalarError<
  T extends ScalarDescriptor<string, unknown, unknown>,
> = T extends ScalarDescriptor<string, unknown, infer TError> ? TError : never;
