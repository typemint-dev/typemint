import { Result } from '@typemint/result';
import type { Decoder } from './decoder.js';
import { Invariant, type InferInvariantError } from './invariant.js';
import type { TypeMismatchError } from './type-mismatch.js';
import { PanicException } from '@typemint/core';

// Taken from the type-fest "Tagged" type
declare const tag: unique symbol;
type TagContainer<Token> = {
  readonly [tag]: Token;
};

type Tag<Token extends PropertyKey> = TagContainer<{
  [K in Token]: K;
}>;

/**
 * The set of primitive types a {@link Scalar} may refine. Restricted to
 * immutable, value-equal primitives on purpose — see {@link Scalar}.
 *
 * `null` and `undefined` are intentionally excluded: a scalar of them is
 * degenerate, and `null & Tag` / `undefined & Tag` collapse to `never`, so the
 * brand could not even form.
 */
export type ScalarPrimitive = string | number | bigint | boolean | symbol;

/**
 * A `Scalar` is a **pure refinement** of a single primitive value: the
 * underlying `TType` carried unchanged, plus a phantom `Tag<TName>` brand that
 * makes it a distinct nominal type. A `Scalar<'Email', string>` is still a
 * `string` at runtime — the brand exists only at the type level.
 *
 * Scalars **refine**, they never **transform**: construction validates the
 * value against its invariants and brands it as-is; the value is never
 * normalized or converted. Representation changes (parsing, normalizing,
 * encoding) belong to a codec layer, not here.
 *
 * `TType` is bound to {@link ScalarPrimitive} on purpose:
 *
 * - A brand certifies "this value passed its invariants", which is only honest
 *   if the value cannot change after the check. Primitives are immutable; a
 *   mutable object (`Date`, `URL`, `RegExp`) could be mutated after validation,
 *   turning the brand into a lie.
 * - Primitives compare by value (`===`), so branded scalars work as map keys,
 *   in sets, and in equality checks — reference-typed objects do not.
 *
 * Consequently:
 *
 * - **Records / plain objects** → model with a `Struct`, not a `Scalar`.
 * - **Value objects** (`Date`, `URL`, `Temporal.*`) → never use as a root.
 *   Brand their canonical primitive serialization instead — e.g. a `BirthDate`
 *   as an ISO-8601 `string` (or epoch `number`) — and reconstruct the rich
 *   object on demand via a method or codec. Prefer immutable representations.
 *
 * @example
 * const Email = Scalar('Email', stringDecoder, { invariants: [isEmail] });
 * type Email = InferScalarType<typeof Email>; // Scalar<'Email', string>
 */
export type Scalar<TName extends string, TType extends ScalarPrimitive> = TType &
  Tag<TName>;

type RemoveAllTags<T> =
  T extends Tag<PropertyKey>
    ? {
        [ThisTag in keyof T[typeof tag]]: T extends Scalar<
          ThisTag & string,
          infer Type extends ScalarPrimitive
        >
          ? RemoveAllTags<Type>
          : never;
      }[keyof T[typeof tag]]
    : T;

export type InferScalarNames<
  T extends
    | Scalar<string, ScalarPrimitive>
    | ScalarDescriptor<string, ScalarPrimitive, unknown>,
> =
  T extends Scalar<string, ScalarPrimitive>
    ? T extends Scalar<infer UName, ScalarPrimitive>
      ? UName
      : never
    : T extends ScalarDescriptor<string, ScalarPrimitive, unknown>
      ? T['name']
      : never;

export type InferScalarType<
  T extends ScalarDescriptor<string, ScalarPrimitive>,
> =
  T extends ScalarDescriptor<infer TName, infer TType extends ScalarPrimitive>
    ? Scalar<TName, TType>
    : never;

export type InferScalarRoot<
  T extends
    | Scalar<string, ScalarPrimitive>
    | ScalarDescriptor<string, ScalarPrimitive, unknown>,
> =
  T extends Scalar<string, ScalarPrimitive>
    ? RemoveAllTags<T>
    : T extends ScalarDescriptor<string, infer TType, unknown>
      ? TType
      : never;

export type InferScalarInvariantError<
  T extends ScalarDescriptor<string, ScalarPrimitive, unknown>,
> = T extends ScalarDescriptor<string, ScalarPrimitive, infer TError>
  ? TError
  : never;

export type ScalarDescriptor<
  TName extends string,
  TRoot extends ScalarPrimitive,
  TError = never,
> = {
  readonly name: TName;

  of(value: TRoot): Result<Scalar<TName, TRoot>, TError>;

  parse(
    value: unknown,
  ): Result<Scalar<TName, TRoot>, TypeMismatchError<TRoot, unknown> | TError>;

  validate(value: TRoot): Result<Scalar<TName, TRoot>, readonly TError[]>;

  is(value: unknown): value is Scalar<TName, TRoot>;
};

type ReservedScalarKeys<
  TName extends string,
  TRoot extends ScalarPrimitive,
> = keyof ScalarDescriptor<
  TName,
  TRoot
>;

export type ScalarMethods<
  TName extends string,
  TRoot extends ScalarPrimitive,
> = Record<
  string,
  (value: Scalar<TName, TRoot>, ...args: any[]) => unknown
>;

export type ScalarConsts = Record<string, unknown>;

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
  TRoot extends ScalarPrimitive,
  TInvariants extends readonly Invariant<TRoot, any>[] = readonly Invariant<
    TRoot,
    any
  >[],
  TMethods extends ScalarMethods<TName, TRoot> = ScalarMethods<TName, TRoot>,
  TConsts extends ScalarConsts = ScalarConsts,
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
   * `self`, the descriptor with the built-in members (`name`, `of`, `parse`,
   * `validate`), so methods can reuse them (e.g. to return a new scalar via
   * `self.of`).
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
  ) => TMethods & { [K in ReservedScalarKeys<TName, TRoot>]?: never };

  /**
   * Defines readonly constants on the scalar descriptor — static data that
   * travels with the type and is discoverable on the descriptor (e.g.
   * `MyString.MIN_LENGTH`). Declare them inline (or `as const`) so their
   * literal types are preserved.
   *
   * Constants must not collide with the built-in members or with any declared
   * method; a clash is a {@link PanicException} at construction time.
   *
   * @example
   * const Username = Scalar('Username', stringDecoder, {
   *   consts: { MIN_LENGTH: 3, MAX_LENGTH: 32 },
   * });
   * Username.MIN_LENGTH; // 3
   */
  readonly consts?: TConsts & {
    [K in ReservedScalarKeys<TName, TRoot>]?: never;
  };
};

export function Scalar<const TName extends string, TRoot extends ScalarPrimitive>(
  name: TName,
  decoder: Decoder<unknown, TRoot, TypeMismatchError<TRoot, unknown>>,
): ScalarDescriptor<TName, TRoot, never>;
export function Scalar<
  const TName extends string,
  TRoot extends ScalarPrimitive,
  const TInvariants extends readonly Invariant<TRoot, any>[] = readonly [],
  TMethods extends ScalarMethods<TName, TRoot> = Record<never, never>,
  const TConsts extends ScalarConsts = Record<never, never>,
>(
  name: TName,
  decoder: Decoder<unknown, TRoot, TypeMismatchError<TRoot, unknown>>,
  config: ScalarConfig<TName, TRoot, TInvariants, TMethods, TConsts>,
): ScalarDescriptor<TName, TRoot, InferInvariantsError<TInvariants>> &
  TMethods &
  TConsts;
export function Scalar<const TName extends string, TRoot extends ScalarPrimitive>(
  name: TName,
  decoder: Decoder<unknown, TRoot, TypeMismatchError<TRoot, unknown>>,
  config?: ScalarConfig<TName, TRoot>,
): ScalarDescriptor<TName, TRoot, any> {
  const [first, ...rest] = config?.invariants ?? [];
  // `of` enforces the invariants fail-fast: the first failure short-circuits.
  const failFastInvariant = first ? Invariant.and(first, ...rest) : undefined;
  const allSettledInvariant = first
    ? Invariant.andSettled(first, ...rest)
    : undefined;

  function of(value: TRoot): Result<Scalar<TName, TRoot>, any> {
    return failFastInvariant
      ? failFastInvariant(value).andThen(() =>
          Result.Ok(value as Scalar<TName, TRoot>),
        )
      : Result.Ok(value as Scalar<TName, TRoot>);
  }

  function parse(value: unknown): Result<Scalar<TName, TRoot>, any> {
    return decoder(value).andThen(of);
  }

  function validate(
    value: TRoot,
  ): Result<Scalar<TName, TRoot>, readonly any[]> {
    return allSettledInvariant
      ? allSettledInvariant(value).andThen(() =>
          Result.Ok(value as Scalar<TName, TRoot>),
        )
      : Result.Ok(value as Scalar<TName, TRoot>);
  }

  function is(value: unknown): value is Scalar<TName, TRoot> {
    return parse(value).isOk();
  }

  const descriptor: ScalarDescriptor<TName, TRoot, any> = {
    name,
    of,
    parse,
    validate,
    is,
  };

  const target = descriptor as Record<string, unknown>;

  // Assigns custom members one by one, panicking on any collision with a
  // built-in member or a previously defined custom member. Methods are
  // defined before consts so the check also catches method/const clashes.
  function define(members: Record<string, unknown>): void {
    for (const [key, value] of Object.entries(members)) {
      if (Object.hasOwn(descriptor, key)) {
        throw new PanicException(
          `Scalar("${name}"): member "${key}" collides with a built-in ` +
            `descriptor member or another custom member and cannot be defined`,
        );
      }
      target[key] = value;
    }
  }

  if (typeof config?.methods === 'function') {
    define(config.methods(descriptor));
  }
  if (config?.consts) {
    define(config.consts);
  }

  return Object.freeze(descriptor);
}

export type ScalarFactory<
  TName extends string,
  TRoot extends ScalarPrimitive,
> = typeof Scalar<TName, TRoot>;

export type InferScalarError<
  T extends ScalarDescriptor<string, ScalarPrimitive, unknown>,
> = T extends ScalarDescriptor<string, ScalarPrimitive, infer TError>
  ? TError
  : never;
