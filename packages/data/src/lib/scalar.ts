import { Result } from '@typemint/result';
import { Invariant, type InferInvariantError } from './invariant.js';
import { TypeMismatchError } from './type-mismatch.js';
import { PanicException, TypeDescriptor, witness } from '@typemint/core';

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
 * The runtime discriminant identifying which primitive a {@link Scalar}
 * refines. These are exactly the `typeof` results for the supported primitives,
 * so recognizing a value at runtime is a direct `typeof` check — no decoder or
 * codec required.
 */
export type ScalarPrimitiveKind =
  | 'string'
  | 'number'
  | 'bigint'
  | 'boolean'
  | 'symbol';

/** Maps a {@link ScalarPrimitiveKind} to the primitive type it denotes. */
export type KindToPrimitive<TKind extends ScalarPrimitiveKind> = {
  string: string;
  number: number;
  bigint: bigint;
  boolean: boolean;
  symbol: symbol;
}[TKind];

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
export type Scalar<
  TName extends string,
  TType extends ScalarPrimitive,
> = TType & Tag<TName>;

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

export type InferScalarType<
  T extends ScalarDescriptor<string, ScalarPrimitive, unknown>,
> =
  T extends ScalarDescriptor<
    infer TName,
    infer TType extends ScalarPrimitive,
    unknown
  >
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
> =
  T extends ScalarDescriptor<string, ScalarPrimitive, infer TInvariantError>
    ? TInvariantError
    : never;

export type ScalarDescriptor<
  TName extends string,
  TRoot extends ScalarPrimitive,
  TInvariantError = never,
> = {
  readonly name: TName;

  of(value: TRoot): Result<Scalar<TName, TRoot>, TInvariantError>;

  parse(
    value: unknown,
  ): Result<Scalar<TName, TRoot>, TypeMismatchError<TRoot, unknown> | TInvariantError>;

  validate(value: TRoot): Result<Scalar<TName, TRoot>, readonly TInvariantError[]>;

  is(value: unknown): value is Scalar<TName, TRoot>;

  /**
   * Refines this scalar into a stricter one. The derived scalar's root is
   * **this** scalar's branded value (`Scalar<TName, TRoot>`), so its brand
   * nests (`Scalar<TNewName, Scalar<TName, TRoot>>`) and a derived value stays
   * assignable to this one — a `UInt` is an `Int`.
   *
   * Invariants are **composed**: the derived scalar enforces this scalar's
   * invariants *and* the new ones, so its error channel is the union of both
   * (`TInvariantError | InferInvariantsError<TNewInvariants>`).
   *
   * Methods and constants are **not** inherited — the derived scalar carries
   * only those declared here. This scalar's own methods/consts remain reachable
   * on a derived value through this descriptor (subtyping), e.g.
   * `Int.someMethod(uintValue)`.
   *
   * @example
   * const Int = Scalar('Int', 'number', { invariants: [isInteger] });
   * const UInt = Int.extend('UInt', { invariants: [isNonNegative] });
   * // UInt: ScalarDescriptor<'UInt', Scalar<'Int', number>, IntError | UIntError>
   */
  extend<
    const TNewName extends string,
    const TNewInvariants extends readonly Invariant<
      Scalar<TName, TRoot>,
      any
    >[] = readonly [],
    TNewMethods extends ScalarCustomMethods<TNewName, Scalar<TName, TRoot>> =
      Record<never, never>,
    const TNewConsts extends ScalarCustomConsts = Record<never, never>,
  >(
    name: TNewName,
    config?: ScalarConfig<
      TNewName,
      Scalar<TName, TRoot>,
      TNewInvariants,
      TNewMethods,
      TNewConsts
    >,
  ): ScalarDescriptor<
    TNewName,
    Scalar<TName, TRoot>,
    TInvariantError | InferInvariantsError<TNewInvariants>
  > &
    TNewMethods &
    TNewConsts;
};

type ReservedScalarKeys<
  TName extends string,
  TRoot extends ScalarPrimitive,
> = keyof ScalarDescriptor<TName, TRoot>;

export type ScalarCustomMethods<
  TName extends string,
  TRoot extends ScalarPrimitive,
> = Record<string, (value: Scalar<TName, TRoot>, ...args: any[]) => unknown>;

export type ScalarCustomConsts = Record<string, unknown>;

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
  TMethods extends ScalarCustomMethods<TName, TRoot> = ScalarCustomMethods<
    TName,
    TRoot
  >,
  TConsts extends ScalarCustomConsts = ScalarCustomConsts,
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

const KIND_DESCRIPTORS: Record<
  ScalarPrimitiveKind,
  TypeDescriptor<ScalarPrimitive, string>
> = {
  string: TypeDescriptor('string', witness<string>()),
  number: TypeDescriptor('number', witness<number>()),
  bigint: TypeDescriptor('bigint', witness<bigint>()),
  boolean: TypeDescriptor('boolean', witness<boolean>()),
  symbol: TypeDescriptor('symbol', witness<symbol>()),
};

/**
 * Shared construction for every scalar descriptor. `recognize` turns an unknown
 * into the recognized (still-unbranded) root value or a decode error: the
 * top-level factory passes a `typeof` check, while {@link ScalarDescriptor.extend}
 * passes the parent's `parse` (base recognition + base invariants). `of` and
 * `validate` then apply this scalar's own invariants, and `parse` recognizes
 * first.
 */
function buildScalar(
  name: string,
  recognize: (value: unknown) => Result<any, any>,
  config: ScalarConfig<any, any> | undefined,
): ScalarDescriptor<any, any, any> {
  const [first, ...rest] = (config?.invariants ?? []) as readonly Invariant<
    any,
    any
  >[];
  const failFastInvariant = first ? Invariant.and(first, ...rest) : undefined;
  const allSettledInvariant = first
    ? Invariant.andSettled(first, ...rest)
    : undefined;

  function of(value: any): Result<any, any> {
    return failFastInvariant
      ? failFastInvariant(value).andThen(() => Result.Ok(value))
      : Result.Ok(value);
  }

  function parse(value: unknown): Result<any, any> {
    return recognize(value).andThen(of);
  }

  function validate(value: any): Result<any, readonly any[]> {
    return allSettledInvariant
      ? allSettledInvariant(value).andThen(() => Result.Ok(value))
      : Result.Ok(value);
  }

  function is(value: unknown): value is Scalar<string, ScalarPrimitive> {
    return parse(value).isOk();
  }

  // Refines this scalar: the derived scalar recognizes via THIS scalar's
  // `parse` (base recognition + base invariants) and layers the new invariants
  // on top. Methods and consts are not inherited.
  function extend(
    newName: string,
    newConfig?: ScalarConfig<any, any>,
  ): ScalarDescriptor<any, any, any> {
    return buildScalar(newName, parse, newConfig);
  }

  const descriptor = {
    name,
    of,
    parse,
    validate,
    is,
    extend,
  } as ScalarDescriptor<any, any, any>;

  const target = descriptor as Record<string, unknown>;

  // Assigns custom members one by one, panicking on any collision with a
  // built-in member or a previously defined custom member. Methods are defined
  // before consts so the check also catches method/const clashes.
  function assignMembers(members: Record<string, unknown>): void {
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
    assignMembers(config.methods(descriptor));
  }
  if (config?.consts) {
    assignMembers(config.consts);
  }

  return Object.freeze(descriptor);
}

export function Scalar<
  const TName extends string,
  const TKind extends ScalarPrimitiveKind,
>(
  name: TName,
  kind: TKind,
): ScalarDescriptor<TName, KindToPrimitive<TKind>, never>;
export function Scalar<
  const TName extends string,
  const TKind extends ScalarPrimitiveKind,
  const TInvariants extends readonly Invariant<KindToPrimitive<TKind>, any>[] =
    readonly [],
  TMethods extends ScalarCustomMethods<TName, KindToPrimitive<TKind>> = Record<
    never,
    never
  >,
  const TConsts extends ScalarCustomConsts = Record<never, never>,
>(
  name: TName,
  kind: TKind,
  config: ScalarConfig<
    TName,
    KindToPrimitive<TKind>,
    TInvariants,
    TMethods,
    TConsts
  >,
): ScalarDescriptor<
  TName,
  KindToPrimitive<TKind>,
  InferInvariantsError<TInvariants>
> &
  TMethods &
  TConsts;
export function Scalar<
  const TName extends string,
  const TKind extends ScalarPrimitiveKind,
>(
  name: TName,
  kind: TKind,
  config?: ScalarConfig<TName, KindToPrimitive<TKind>>,
): ScalarDescriptor<TName, KindToPrimitive<TKind>, any> {
  const kindDescriptor = KIND_DESCRIPTORS[kind];

  // Recognizes the primitive with a direct `typeof` check — no decoder, no
  // transformation.
  function recognize(value: unknown): Result<KindToPrimitive<TKind>, any> {
    return typeof value === kind
      ? Result.Ok(value as KindToPrimitive<TKind>)
      : Result.Err(TypeMismatchError(kindDescriptor, value));
  }

  return buildScalar(name, recognize, config) as ScalarDescriptor<
    TName,
    KindToPrimitive<TKind>,
    any
  >;
}

export type ScalarFactory<
  TName extends string,
  TKind extends ScalarPrimitiveKind,
> = typeof Scalar<TName, TKind>;
