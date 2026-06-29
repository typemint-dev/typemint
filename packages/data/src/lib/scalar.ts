import { Result } from '@typemint/result';
import type { Decoder } from './decoder.js';
import type { TypeMismatchError } from './type-mismatch.js';

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

export type InferScalarNames<
  T extends
    | Scalar<string, unknown, unknown>
    | ScalarDescriptor<string, unknown, unknown>,
> =
  T extends Scalar<string, unknown, unknown>
    ? T extends Scalar<infer UName, unknown, unknown>
      ? UName
      : never
    : T extends ScalarDescriptor<string, unknown, unknown>
      ? T['name']
      : never;

export type InferScalarType<T extends ScalarDescriptor<string, unknown>> =
  T extends ScalarDescriptor<infer TName, infer TType>
    ? Scalar<TName, TType>
    : never;

export type InferScalarRoot<
  T extends
    | Scalar<string, unknown, unknown>
    | ScalarDescriptor<string, unknown, unknown>,
> =
  T extends Scalar<string, unknown, unknown>
    ? RemoveAllTags<T>
    : T extends ScalarDescriptor<string, infer TType, unknown>
      ? TType
      : never;

export type InferScalarMeta<
  T extends
    | Scalar<string, unknown, unknown>
    | ScalarDescriptor<string, unknown, unknown>,
> =
  T extends Scalar<string, unknown, infer TMeta>
    ? TMeta
    : T extends ScalarDescriptor<string, unknown, infer TMeta>
      ? TMeta
      : never;

export type InferScalarInvariantError<
  T extends ScalarDescriptor<string, unknown, unknown>,
> = T extends ScalarDescriptor<string, unknown, infer TError> ? TError : never;

export type ScalarDescriptor<TName extends string, TRoot, TError = never> = {
  readonly name: TName;

  of(value: TRoot): Result<Scalar<TName, TRoot>, TError>;

  parse(
    value: unknown,
  ): Result<Scalar<TName, TRoot>, TypeMismatchError<TRoot, unknown> | TError>;
};

export type ScalarInvariant<TValue, TError> = (
  value: TValue,
) => Result<unknown, TError>;

export type ScalarMethods<TName extends string, TRoot> = Record<
  string,
  (value: Scalar<TName, TRoot>, ...args: any[]) => unknown
>;

export type ScalarConfig<
  TName extends string,
  TRoot,
  TError = never,
  TMethods extends ScalarMethods<TName, TRoot> = ScalarMethods<TName, TRoot>,
> = {
  readonly invariant?: ScalarInvariant<TRoot, TError>;

  /**
   * Defines additional methods on the scalar descriptor. The callback receives
   * `self`, the descriptor with the built-in members (`name`, `of`, `parse`),
   * so methods can reuse them (e.g. to return a new scalar via `self.of`).
   *
   * Each method takes a validated scalar value as its first argument, which
   * keeps values as plain primitives while ensuring only branded values can be
   * passed in:
   *
   * @example
   * const Email = Scalar('Email', stringDecoder, {
   *   methods: (self) => ({
   *     getDomain: (email) => email.split('@')[1],
   *   }),
   * });
   * Email.getDomain(parsedEmail);
   */
  readonly methods?: (self: ScalarDescriptor<TName, TRoot, TError>) => TMethods;
};

export function Scalar<const TName extends string, TRoot>(
  name: TName,
  decoder: Decoder<unknown, TRoot, TypeMismatchError<TRoot, unknown>>,
): ScalarDescriptor<TName, TRoot, never>;
export function Scalar<
  const TName extends string,
  TRoot,
  TError = never,
  TMethods extends ScalarMethods<TName, TRoot> = Record<never, never>,
>(
  name: TName,
  decoder: Decoder<unknown, TRoot, TypeMismatchError<TRoot, unknown>>,
  config: ScalarConfig<TName, TRoot, TError, TMethods>,
): ScalarDescriptor<TName, TRoot, TError> & TMethods;
export function Scalar<const TName extends string, TRoot, TError = never>(
  name: TName,
  decoder: Decoder<unknown, TRoot, TypeMismatchError<TRoot, unknown>>,
  config?: ScalarConfig<TName, TRoot, TError>,
): ScalarDescriptor<TName, TRoot, TError> {
  const invariant = config?.invariant;

  function of(value: TRoot): Result<Scalar<TName, TRoot>, TError> {
    return invariant
      ? invariant(value).andThen(() => Result.Ok(value as Scalar<TName, TRoot>))
      : Result.Ok(value as Scalar<TName, TRoot>);
  }

  function parse(
    value: unknown,
  ): Result<Scalar<TName, TRoot>, TypeMismatchError<TRoot, unknown> | TError> {
    return decoder(value).andThen(of);
  }

  const descriptor: ScalarDescriptor<TName, TRoot, TError> = {
    name,
    of,
    parse,
  };

  return config?.methods
    ? Object.assign(descriptor, config.methods(descriptor))
    : descriptor;
}

export type ScalarFactory<
  TName extends string,
  TRoot,
  TError = never,
> = typeof Scalar<TName, TRoot, TError>;

export type InferScalarError<
  T extends ScalarDescriptor<string, unknown, unknown>,
> = T extends ScalarDescriptor<string, unknown, infer TError> ? TError : never;
