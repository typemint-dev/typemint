import { Result } from '@typemint/result';
import type { Decoder } from './decoder.js';
import { Invariant, type InferInvariantError } from './invariant.js';
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

export type ScalarMethods<TName extends string, TRoot> = Record<
  string,
  (value: Scalar<TName, TRoot>, ...args: any[]) => unknown
>;

/**
 * Derives the union of error types produced by a tuple of invariants. This
 * only yields a precise union when `TInvariants` is a readonly tuple — a
 * non-tuple `Invariant<TRoot, any>[]` collapses to `any`.
 */
export type InferInvariantsError<
  TInvariants extends readonly Invariant<any, any>[],
> = InferInvariantError<TInvariants[number]>;

export type ScalarConfig<
  TName extends string,
  TRoot,
  TInvariants extends readonly Invariant<TRoot, any>[] = readonly Invariant<
    TRoot,
    any
  >[],
  TMethods extends ScalarMethods<TName, TRoot> = ScalarMethods<TName, TRoot>,
> = {
  /**
   * Invariants enforced on every value produced by this scalar. Declare the
   * array `as const` (or inline it in the call) so it stays a readonly tuple —
   * that is what lets the error types be derived as a precise union instead of
   * collapsing to `any`.
   *
   * The `of` method combines them with {@link Invariant.and} — fail-fast: the
   * first failing invariant short-circuits and its error is returned.
   */
  readonly invariants?: TInvariants;

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
  readonly methods?: (
    self: ScalarDescriptor<TName, TRoot, InferInvariantsError<TInvariants>>,
  ) => TMethods;
};

export function Scalar<const TName extends string, TRoot>(
  name: TName,
  decoder: Decoder<unknown, TRoot, TypeMismatchError<TRoot, unknown>>,
): ScalarDescriptor<TName, TRoot, never>;
export function Scalar<
  const TName extends string,
  TRoot,
  const TInvariants extends readonly Invariant<TRoot, any>[] = readonly [],
  TMethods extends ScalarMethods<TName, TRoot> = Record<never, never>,
>(
  name: TName,
  decoder: Decoder<unknown, TRoot, TypeMismatchError<TRoot, unknown>>,
  config: ScalarConfig<TName, TRoot, TInvariants, TMethods>,
): ScalarDescriptor<TName, TRoot, InferInvariantsError<TInvariants>> & TMethods;
export function Scalar<const TName extends string, TRoot>(
  name: TName,
  decoder: Decoder<unknown, TRoot, TypeMismatchError<TRoot, unknown>>,
  config?: ScalarConfig<TName, TRoot>,
): ScalarDescriptor<TName, TRoot, any> {
  const [first, ...rest] = config?.invariants ?? [];
  // `of` enforces the invariants fail-fast: the first failure short-circuits.
  const invariant = first ? Invariant.and(first, ...rest) : undefined;

  function of(value: TRoot): Result<Scalar<TName, TRoot>, any> {
    return invariant
      ? invariant(value).andThen(() => Result.Ok(value as Scalar<TName, TRoot>))
      : Result.Ok(value as Scalar<TName, TRoot>);
  }

  function parse(value: unknown): Result<Scalar<TName, TRoot>, any> {
    return decoder(value).andThen(of);
  }

  const descriptor: ScalarDescriptor<TName, TRoot, any> = {
    name,
    of,
    parse,
  };

  return config?.methods
    ? Object.assign(descriptor, config.methods(descriptor))
    : descriptor;
}

export type ScalarFactory<TName extends string, TRoot> = typeof Scalar<
  TName,
  TRoot
>;

export type InferScalarError<
  T extends ScalarDescriptor<string, unknown, unknown>,
> = T extends ScalarDescriptor<string, unknown, infer TError> ? TError : never;
