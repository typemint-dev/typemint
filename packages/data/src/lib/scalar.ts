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
 *
 * `symbol` is excluded too, despite being an immutable primitive: it is neither
 * value-equal (`Symbol('x') !== Symbol('x')`) nor serializable, which defeats
 * the two properties this restriction exists to guarantee (see {@link Scalar}).
 */
export type ScalarPrimitive = string | number | bigint | boolean;

/**
 * The runtime discriminant identifying which primitive a {@link Scalar}
 * refines. These are exactly the `typeof` results for the supported primitives,
 * so recognizing a value at runtime is a direct `typeof` check — no decoder or
 * codec required.
 */
export type ScalarPrimitiveKind = 'string' | 'number' | 'bigint' | 'boolean';

/**
 * Maps a {@link ScalarPrimitiveKind} to the primitive type it denotes. Used by
 * the {@link Scalar} factory to turn the runtime `kind` argument into the
 * compile-time root type of the descriptor.
 *
 * @example
 * type A = KindToPrimitive<'string'>; // string
 * type B = KindToPrimitive<'bigint'>; // bigint
 */
export type KindToPrimitive<TKind extends ScalarPrimitiveKind> = {
  string: string;
  number: number;
  bigint: bigint;
  boolean: boolean;
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
 * const isEmail = Invariant(
 *   (value: string) => value.includes('@'),
 *   () => 'NOT_EMAIL' as const,
 * );
 * const Email = Scalar('Email', 'string', { invariants: [isEmail] });
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

/**
 * Extracts the branded {@link Scalar} type produced by a {@link ScalarDescriptor}.
 * Given the descriptor's static type, this yields the nominal value type its
 * `of` / `parse` / `validate` methods return on success. Resolves to `never`
 * for anything that is not a descriptor.
 *
 * @example
 * const Email = Scalar('Email', 'string');
 * type Email = InferScalarType<typeof Email>; // Scalar<'Email', string>
 */
export type InferScalarType<
  // `any` (not `ScalarPrimitive`) in the root slot: `of`/`validate` accept
  // `RemoveAllTags<TRoot>` in a contravariant position, which collapses a wide
  // `ScalarPrimitive` root to a bare primitive and severs the descriptor's
  // assignability to a fixed-width instantiation. `any` matches any root.
  T extends ScalarDescriptor<string, any, unknown>,
> =
  T extends ScalarDescriptor<
    infer TName,
    infer TType extends ScalarPrimitive,
    unknown
  >
    ? Scalar<TName, TType>
    : never;

/**
 * Recovers the underlying primitive of a scalar — the raw {@link ScalarPrimitive}
 * beneath all brands. Accepts either a {@link Scalar} value type or a
 * {@link ScalarDescriptor}. For a nested/extended scalar every layer of brand is
 * peeled away, so a `Scalar<'UInt', Scalar<'Int', number>>` resolves to `number`.
 * Resolves to `never` for anything else.
 *
 * @example
 * type Int = Scalar<'Int', number>;
 * type UInt = Scalar<'UInt', Int>;
 * type Root = InferScalarRoot<UInt>; // number
 *
 * const MyString = Scalar('MyString', 'string');
 * type FromDescriptor = InferScalarRoot<typeof MyString>; // string
 */
export type InferScalarRoot<
  // `any` in the descriptor root slot — see {@link InferScalarType} for why a
  // fixed-width `ScalarPrimitive` root no longer matches a concrete descriptor.
  T extends
    | Scalar<string, ScalarPrimitive>
    | ScalarDescriptor<string, any, unknown>,
> =
  T extends Scalar<string, ScalarPrimitive>
    ? RemoveAllTags<T>
    : // `infer TName`, not a fixed `string`: `TName` is invariant on the
      // descriptor — it sits contravariantly in `unwrap`'s `Scalar<TName, TRoot>`
      // parameter and in the `is` predicate — so pinning it to `string` makes a
      // literal-named descriptor fail to match, and the branch collapses to
      // `never`. Inferring it lets the pattern line up, exactly as
      // {@link InferScalarType} does.
      T extends ScalarDescriptor<
          infer _TName,
          infer TType extends ScalarPrimitive,
          unknown
        >
      ? TType
      : never;

/**
 * Extracts the invariant error channel of a {@link ScalarDescriptor} — the union
 * of every error its invariants can produce (the `TInvariantError` returned by
 * `of` and `validate`, and part of the error union returned by `parse`).
 * Resolves to `never` when the descriptor declares no invariants.
 *
 * @example
 * const isEmail = Invariant(
 *   (value: string) => value.includes('@'),
 *   () => 'NOT_EMAIL' as const,
 * );
 * const Email = Scalar('Email', 'string', { invariants: [isEmail] });
 * type EmailError = InferScalarInvariantError<typeof Email>; // 'NOT_EMAIL'
 */
export type InferScalarInvariantError<
  // `any` in the root slot — see {@link InferScalarType} for why a fixed-width
  // `ScalarPrimitive` root no longer matches a concrete descriptor.
  T extends ScalarDescriptor<string, any, unknown>,
> =
  T extends ScalarDescriptor<string, any, infer TInvariantError>
    ? TInvariantError
    : never;

/**
 * The runtime handle for a scalar type, returned by the {@link Scalar} factory
 * and by {@link ScalarDescriptor.extend}. It bundles the scalar's name with the
 * constructors and guards used to move between raw primitives and branded
 * {@link Scalar} values, and carries any custom `methods` / `consts` declared in
 * its {@link ScalarConfig}.
 *
 * Type parameters:
 * - `TName` — the brand name.
 * - `TRoot` — the type being refined, and the payload of this scalar's brand
 *   (for an extended scalar this is the parent's *branded* type, so brands
 *   nest). The constructors (`of`, `validate`) accept the underlying primitive
 *   beneath every brand (`RemoveAllTags<TRoot>`), not `TRoot` itself.
 * - `TInvariantError` — the union of errors this scalar's invariants can raise.
 *
 * @example
 * const isEmail = Invariant(
 *   (value: string) => value.includes('@'),
 *   () => 'NOT_EMAIL' as const,
 * );
 * const Email = Scalar('Email', 'string', { invariants: [isEmail] });
 * // Email: ScalarDescriptor<'Email', string, 'NOT_EMAIL'>
 *
 * const result = Email.parse(userInput); // Result<Scalar<'Email', string>, …>
 */
export type ScalarDescriptor<
  TName extends string,
  TRoot extends ScalarPrimitive,
  TInvariantError = never,
> = {
  /** The scalar's brand name, available at runtime and in the type. */
  readonly name: TName;

  /**
   * Brands a value that is **already** the correct primitive, enforcing the
   * **full** invariant chain — this scalar's invariants *and* every ancestor's
   * (fail-fast: the first failing invariant short-circuits). Use this when the
   * input type is statically known to be the underlying primitive; use
   * {@link ScalarDescriptor.parse} when it is `unknown`.
   *
   * The argument is the underlying primitive (`RemoveAllTags<TRoot>`), so an
   * extended scalar is constructed in one call from the raw value — e.g.
   * `UInt.of(5)`, never `UInt.of(Int.of(5).value)`. There is no constructor
   * chain: `of` re-checks the inherited invariants, so a branded base is neither
   * required nor trusted.
   *
   * @example
   * const r = Email.of('a@b.com'); // Result<Scalar<'Email', string>, 'NOT_EMAIL'>
   * if (r.isOk()) r.value; // branded email
   */
  of(
    value: RemoveAllTags<TRoot>,
  ): Result<Scalar<TName, TRoot>, TInvariantError>;

  /**
   * The **throwing** counterpart to {@link ScalarDescriptor.of}. Runs the same
   * full, fail-fast invariant chain, but instead of returning a `Result` it
   * returns the branded {@link Scalar} **directly** on success and **throws a
   * {@link PanicException}** on the first failing invariant — that invariant's
   * error is attached as the exception's `cause` so it stays inspectable.
   *
   * A thrown invariant failure signals a bug: the value was asserted to be
   * valid but was not. Use this only where a violation is unrecoverable and
   * should crash rather than be handled — asserting a value from a trusted,
   * already-validated source (a persisted row, a prior `parse`/`of` result
   * whose brand was erased in transit, a test fixture). For untrusted input use
   * {@link ScalarDescriptor.parse}; to handle failure as a value use `of`.
   *
   * Prefer this over an `as` cast: it re-checks the invariants, is easy to
   * search for, and is correctly typed (it accepts only the underlying
   * primitive `RemoveAllTags<TRoot>`, so it cannot brand the wrong primitive).
   *
   * @throws {PanicException} if any invariant fails; the first failing
   *   invariant's error is the exception's `cause`.
   *
   * @example
   * // Re-hydrating a value validated when it was persisted — throws if the
   * // stored value has since drifted out of the domain.
   * const email = Email.ofUnsafe(row.email); // Scalar<'Email', string>
   */
  ofUnsafe(value: RemoveAllTags<TRoot>): Scalar<TName, TRoot>;

  /**
   * Recognizes an `unknown` value, then brands it. It first checks the value is
   * the right primitive (a `TypeMismatchError` otherwise) and then applies the
   * invariants fail-fast. This is the entry point for untrusted input.
   *
   * @example
   * const r = Email.parse(JSON.parse(body).email);
   * // Result<Scalar<'Email', string>, TypeMismatchError<string, unknown> | 'NOT_EMAIL'>
   */
  parse(
    value: unknown,
  ): Result<
    Scalar<TName, TRoot>,
    TypeMismatchError<RemoveAllTags<TRoot>, unknown> | TInvariantError
  >;

  /**
   * The **throwing** counterpart to {@link ScalarDescriptor.parse}. Runs the
   * same recognize-then-validate pipeline — the primitive-kind check followed
   * by the full, fail-fast invariant chain — but returns the branded
   * {@link Scalar} **directly** on success and **throws a
   * {@link PanicException}** on failure. Whichever error `parse` would have
   * returned (a {@link TypeMismatchError} for the wrong primitive, or the first
   * failing invariant's error) is attached as the exception's `cause` so it
   * stays inspectable.
   *
   * A failure signals a bug: an `unknown` was asserted to be a valid value of
   * this scalar but was not. Use this only where a violation is unrecoverable
   * and should crash rather than be handled — a value from a source you fully
   * trust to be well-formed. For untrusted input you want to handle on failure,
   * use {@link ScalarDescriptor.parse}; when the input type is already the
   * underlying primitive, use {@link ScalarDescriptor.ofUnsafe}.
   *
   * @throws {PanicException} if the value is the wrong primitive or any
   *   invariant fails; the underlying error is the exception's `cause`.
   *
   * @example
   * // Asserting a value from a trusted config source — throws if it is
   * // missing, the wrong type, or out of the scalar's domain.
   * const email = Email.parseUnsafe(config.adminEmail); // Scalar<'Email', string>
   */
  parseUnsafe(value: unknown): Scalar<TName, TRoot>;

  /**
   * Like {@link ScalarDescriptor.of}, but **collects every** invariant failure
   * instead of stopping at the first, returning them as a readonly array. Runs
   * the same **full** invariant chain as `of` (this scalar's plus every
   * ancestor's), so an inherited invariant failure is reported alongside the
   * rest. Use it to report all problems with a value at once (e.g. form
   * validation).
   *
   * @example
   * const r = Password.validate(input);
   * if (r.isErr()) r.error; // e.g. ['TOO_SHORT', 'NO_DIGIT']
   */
  validate(
    value: RemoveAllTags<TRoot>,
  ): Result<Scalar<TName, TRoot>, readonly TInvariantError[]>;

  /**
   * Type guard: narrows an `unknown` value to the branded {@link Scalar} when it
   * both is the right primitive and satisfies every invariant. Equivalent to
   * `parse(value).isOk()`.
   *
   * @example
   * if (Email.is(x)) {
   *   // x: Scalar<'Email', string>
   * }
   */
  is(value: unknown): value is Scalar<TName, TRoot>;

  /**
   * Strips **every** brand off a branded value and returns the underlying
   * primitive — the inverse of {@link ScalarDescriptor.of}. Regardless of how
   * many times the scalar was extended, the result is the raw root primitive
   * (`RemoveAllTags<TRoot>`), so `UInt.unwrap` and `PositiveInt.unwrap` both
   * yield a plain `number`.
   *
   * This is a pure type-level operation: brands are phantom, so at runtime the
   * value is returned unchanged. Use it to hand a validated value to an API
   * that wants the bare primitive without widening through `as`.
   *
   * @example
   * const n: number = UInt.unwrap(uintValue); // no cast, no brand
   */
  unwrap(value: Scalar<TName, TRoot>): RemoveAllTags<TRoot>;

  /**
   * Refines this scalar into a stricter one. The derived scalar's root is
   * **this** scalar's branded value (`Scalar<TName, TRoot>`), so its brand
   * nests (`Scalar<TNewName, Scalar<TName, TRoot>>`) and a derived value stays
   * assignable to this one — a `UInt` is an `Int`.
   *
   * Invariants are **composed**: the derived scalar enforces this scalar's
   * invariants *and* the new ones, so its error channel is the union of both
   * (`TInvariantError | InferInvariantsError<TNewInvariants>`). The composed
   * set runs in `of`, `parse`, and `validate` alike — the derived scalar's
   * constructors take the underlying primitive and re-check the inherited
   * invariants, so `UInt.of(2.5)` rejects on the base `isInteger` and there is
   * no `UInt.of(Int.of(2.5).value)` chain to assemble.
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

/**
 * Shape of the custom methods attachable to a descriptor via
 * {@link ScalarConfig.methods}. Each method takes a validated branded value as
 * its first argument (so only values that passed the invariants can be passed
 * in) followed by any extra arguments.
 *
 * @example
 * type EmailMethods = ScalarCustomMethods<'Email', string>;
 * // e.g. { getDomain: (value: Scalar<'Email', string>) => string | undefined }
 */
export type ScalarCustomMethods<
  TName extends string,
  TRoot extends ScalarPrimitive,
> = Record<string, (value: Scalar<TName, TRoot>, ...args: any[]) => unknown>;

/**
 * Shape of the custom constants attachable to a descriptor via
 * {@link ScalarConfig.consts} — an arbitrary record of static data that travels
 * with the type (e.g. `{ MIN_LENGTH: 3 }`).
 */
export type ScalarCustomConsts = Record<string, unknown>;

/**
 * Derives the union of error types produced by a tuple of invariants. This
 * only yields a precise union when `TInvariants` is a readonly tuple — a
 * non-tuple `Invariant<TRoot, any>[]` collapses to `any`.
 */
export type InferInvariantsError<
  TInvariants extends readonly Invariant<any, any>[],
> = InferInvariantError<TInvariants[number]>;

/**
 * Optional configuration for a scalar, passed as the third argument to the
 * {@link Scalar} factory (and to {@link ScalarDescriptor.extend}). It declares
 * the scalar's `invariants`, plus any custom `methods` and `consts` to hang off
 * the descriptor. Every field is optional; an empty/absent config yields a
 * scalar that only checks the primitive kind.
 *
 * @example
 * const Email = Scalar('Email', 'string', {
 *   invariants: [isEmail],
 *   methods: (self) => ({
 *     getDomain: (email: InferScalarType<typeof self>) => email.split('@')[1],
 *   }),
 *   consts: { MAX_LENGTH: 254 },
 * });
 */
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
   * A method name colliding with a **built-in** member (`name`, `of`, `parse`,
   * `validate`, `is`, `unwrap`, `extend`) is a compile error, enforced by the
   * `{ [K in ReservedScalarKeys]?: never }` guard. A collision with a `const`
   * declared in the same config is **not** caught statically — the two maps are
   * checked independently — and surfaces at construction time as a
   * {@link PanicException} instead.
   *
   * @example
   * const Email = Scalar('Email', 'string', {
   *   methods: (self) => ({
   *     getDomain: (email: InferScalarType<typeof self>) => email.split('@')[1],
   *   }),
   * });
   * const parsedEmail = Email.parse('a@b.com');
   * if (parsedEmail.isOk()) Email.getDomain(parsedEmail.value); // 'b.com'
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
   * A const name colliding with a **built-in** member is a compile error
   * (the `{ [K in ReservedScalarKeys]?: never }` guard). A collision with a
   * declared `method`, however, is only caught at runtime — the method and
   * const maps are validated independently at the type level — and throws a
   * {@link PanicException} at construction time.
   *
   * @example
   * const Username = Scalar('Username', 'string', {
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
};

/**
 * Shared construction for every scalar descriptor. `recognize` turns an unknown
 * into the recognized (still-unbranded) primitive or a type-mismatch error — a
 * plain `typeof` check that never changes across an `extend` chain (the root
 * primitive of `UInt` is still `number`). `parentInvariants` carries the
 * accumulated invariants of every ancestor; this scalar's own invariants are
 * appended, and the **combined** set is what `of` (fail-fast), `validate`
 * (all-settled), and `parse` (after recognizing) all enforce. This is what lets
 * `UInt.of(2.5)` reject on the inherited `isInteger` — the base invariants are
 * not hidden behind the parent's `parse`, they travel with the descriptor.
 */
function buildScalar(
  name: string,
  recognize: (value: unknown) => Result<any, any>,
  parentInvariants: readonly Invariant<any, any>[],
  config: ScalarConfig<any, any> | undefined,
): ScalarDescriptor<any, any, any> {
  const invariants = [
    ...parentInvariants,
    ...((config?.invariants ?? []) as readonly Invariant<any, any>[]),
  ];
  const [first, ...rest] = invariants;
  const failFastInvariant = first ? Invariant.and(first, ...rest) : undefined;
  const allSettledInvariant = first
    ? Invariant.andSettled(first, ...rest)
    : undefined;

  function of(value: any): Result<any, any> {
    return failFastInvariant
      ? failFastInvariant(value).andThen(() => Result.Ok(value))
      : Result.Ok(value);
  }

  // Runs the same fail-fast invariant chain as `of`, but throws on the first
  // failure instead of returning an `Err`, and returns the branded value
  // directly on success. The offending invariant's error is attached as the
  // exception's `cause` so it stays inspectable.
  function ofUnsafe(value: any): any {
    const valueR = of(value);
    if (valueR.isErr()) {
      throw new PanicException(
        `Scalar("${name}"): value does not satisfy its invariants ` +
          `(first failing invariant attached as \`cause\`)`,
        valueR.error,
      );
    }
    return valueR.value;
  }

  function parse(value: unknown): Result<any, any> {
    return recognize(value).andThen(of);
  }

  // Runs the same recognize-then-validate pipeline as `parse`, but throws on
  // failure instead of returning an `Err`, and returns the branded value
  // directly on success. The offending error — a type mismatch or the first
  // failing invariant — is attached as the exception's `cause`.
  function parseUnsafe(value: unknown): any {
    const valueR = parse(value);
    if (valueR.isErr()) {
      throw new PanicException(
        `Scalar("${name}"): value could not be parsed ` +
          `(a type mismatch or failing invariant attached as \`cause\`)`,
        valueR.error,
      );
    }
    return valueR.value;
  }

  function validate(value: any): Result<any, readonly any[]> {
    return allSettledInvariant
      ? allSettledInvariant(value).andThen(() => Result.Ok(value))
      : Result.Ok(value);
  }

  function is(value: unknown): value is Scalar<string, ScalarPrimitive> {
    return parse(value).isOk();
  }

  // Brands are phantom, so unwrapping is identity at runtime — only the static
  // type changes, from the branded scalar back to its underlying primitive.
  function unwrap(value: any): any {
    return value;
  }

  // Refines this scalar: the derived scalar shares THIS scalar's raw recognizer
  // (the root primitive is unchanged) and inherits the full accumulated
  // invariant set, layering the new invariants on top. Methods and consts are
  // not inherited.
  function extend(
    newName: string,
    newConfig?: ScalarConfig<any, any>,
  ): ScalarDescriptor<any, any, any> {
    return buildScalar(newName, recognize, invariants, newConfig);
  }

  // Compile-time guard: the non-generic built-ins must match the public
  // contract for a representative instantiation *before* the `any` cast (which
  // the phantom brand and dynamically-assigned custom members make
  // unavoidable) widens the type and erases all checking. This catches a
  // renamed, removed, or mis-shaped core member at typecheck time. `extend`'s
  // generic `& TMethods & TConsts` return cannot satisfy a concrete
  // instantiation, so it is excluded here and covered by the contract type
  // tests instead.
  const builtIns = {
    name,
    of,
    ofUnsafe,
    parse,
    parseUnsafe,
    validate,
    is,
    unwrap,
    // `unknown` (not `never`) as the error channel: these functions genuinely
    // return `Err`, and `Result<_, never>` would collapse to `Ok`-only.
  } satisfies Omit<
    ScalarDescriptor<string, ScalarPrimitive, unknown>,
    'extend'
  >;

  const descriptor = {
    ...builtIns,
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

/**
 * Creates a {@link ScalarDescriptor} — the factory for a branded primitive type.
 * A scalar is a pure refinement: it validates a value of the given primitive
 * `kind` against its invariants and brands it as-is, never transforming it (see
 * {@link Scalar the Scalar type} for the rationale and constraints).
 *
 * @param name - The brand name. Two scalars with the same underlying primitive
 *   but different names are distinct nominal types.
 * @param kind - The {@link ScalarPrimitiveKind} to refine, recognized at runtime
 *   with a direct `typeof` check.
 * @param config - Optional {@link ScalarConfig} declaring `invariants`, custom
 *   `methods`, and `consts`.
 * @returns A frozen descriptor exposing `of`, `parse`, `validate`, `is`,
 *   `unwrap`, `extend`, and any declared custom members.
 * @throws {PanicException} if a custom method or const name collides with a
 *   built-in descriptor member or another custom member.
 *
 * @example
 * // Bare scalar — only checks the primitive kind.
 * const UserId = Scalar('UserId', 'string');
 * const id = UserId.parse(req.params.id); // Result<Scalar<'UserId', string>, …>
 *
 * @example
 * // With invariants, methods, and consts.
 * const isEmail = Invariant(
 *   (value: string) => value.includes('@'),
 *   () => 'NOT_EMAIL' as const,
 * );
 * const Email = Scalar('Email', 'string', {
 *   invariants: [isEmail],
 *   methods: (self) => ({
 *     getDomain: (email: InferScalarType<typeof self>) => email.split('@')[1],
 *   }),
 *   consts: { MAX_LENGTH: 254 },
 * });
 * const parsed = Email.parse('a@b.com');
 * if (parsed.isOk()) Email.getDomain(parsed.value); // 'b.com'
 *
 * @example
 * // Refine an existing scalar with `extend`; invariants compose.
 * const Int = Scalar('Int', 'number', { invariants: [isInteger] });
 * const UInt = Int.extend('UInt', { invariants: [isNonNegative] });
 */
export function Scalar<
  const TName extends string,
  const TKind extends ScalarPrimitiveKind,
>(
  name: TName,
  kind: TKind,
): ScalarDescriptor<TName, KindToPrimitive<TKind>, never>;
/**
 * Overload with a {@link ScalarConfig} — the invariant, method, and const types
 * are inferred from `config` so the returned descriptor carries a precise error
 * channel and the declared custom members. See the primary overload above for
 * details and examples.
 */
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

  return buildScalar(name, recognize, [], config) as ScalarDescriptor<
    TName,
    KindToPrimitive<TKind>,
    any
  >;
}

/**
 * The type of the {@link Scalar} factory itself, bound to a specific name and
 * primitive kind. Useful for typing a variable or parameter that should hold or
 * receive the factory for a particular scalar rather than a built descriptor.
 *
 * @example
 * const makeString: ScalarFactory<'MyString', 'string'> = Scalar;
 * const MyString = makeString('MyString', 'string');
 */
export type ScalarFactory<
  TName extends string,
  TKind extends ScalarPrimitiveKind,
> = typeof Scalar<TName, TKind>;
