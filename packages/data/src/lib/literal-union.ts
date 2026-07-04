import {
  Kind,
  PanicException,
  WithDetail,
  WithMessage,
  type NonEmptyReadonlyArray,
} from '@typemint/core';
import { Result } from '@typemint/result';

/**
 * The type of literal union members which the union can be built from.
 *
 * Restricted to `string` by design. A literal union models a closed set of
 * **nominal identities** — names a domain uses to refer to its members
 * (countries, statuses, roles, currencies, payment methods, …). The right
 * primitive for naming is text, and only `string` satisfies every property
 * a nominal identity needs:
 *
 * 1. **Self-documenting at every call site.** `status === 'pending'` carries
 *    its meaning; `status === 2` is a magic number that forces the reader to
 *    look up the mapping. Numeric "nominal" values are documentation debt.
 *
 * 2. **Survives every transport unchanged.** JSON, URLs, query strings,
 *    environment variables, database `VARCHAR` columns, log lines, telemetry
 *    attributes, error messages — all preserve strings losslessly. `bigint`
 *    throws in `JSON.stringify`; `symbol` is dropped silently; `boolean` is
 *    not a set; `number` survives but only if both ends agree which integer
 *    means what (see point 1).
 *
 * 3. **Compares safely across boundaries.** `'germany' === 'germany'` is
 *    unambiguous regardless of which module, package copy, or runtime declared
 *    it. `unique symbol` has reference identity, so two copies of the same
 *    module (npm hoisting, ESM dual packages, monorepo workspace duplication,
 *    HMR) produce non-equal symbols for the "same" member — a class of bugs
 *    that strings cannot have.
 *
 * 4. **Round-trips with external data.** When an API returns `"germany"`, the
 *    linchpin compares directly without coercion. Numeric identifiers from
 *    external systems (HTTP status codes, ISO 3166 numeric-3, ISO 4217
 *    numeric, gRPC enum ints, legacy DB integer enums) are *projections* of
 *    an underlying name and belong in dictionaries, not in the linchpin.
 *
 * 5. **Feeds the type-level machinery.** `Capitalize`, `Uppercase`, template
 *    literal types, and key remapping with `as` all require `string`.
 *    Restricting the base avoids the `` `${K}` `` coercion gymnastics and the
 *    `PropertyKey` edge cases that mixed-primitive members would force into
 *    every derived type.
 *
 * Apparently-numeric domains almost always reduce to "a name with a numeric
 * projection":
 *
 * | External numeric form              | Nominal identity (linchpin) | Numeric form lives in           |
 * | ---------------------------------- | --------------------------- | ------------------------------- |
 * | HTTP status (`200`, `404`)         | `'ok'`, `'notFound'`, …     | `Dictionary<HttpStatus, number>`|
 * | ISO 3166 numeric-3 (`276` = DE)    | `'germany'`, `'france'`, …  | `Dictionary<Country, number>`   |
 * | ISO 4217 numeric (`978` = EUR)     | `'eur'`, `'usd'`, …         | `Dictionary<Currency, number>`  |
 * | gRPC / protobuf enum ints          | The `.proto` enum names     | Dictionary to wire ints         |
 * | Legacy DB integer enum             | The named state in domain   | Dictionary to DB representation |
 *
 * The two genuine exceptions to "strings only" are intentionally **not**
 * served by this primitive:
 *
 * - **Bitfield flags** (`1 << 0`, `1 << 1`, …) are inherently numeric and need
 *   `|`/`&`/`^` operators. They are a different abstraction (a flag set, not a
 *   nominal union) and belong in a sibling primitive.
 * - **Closed numeric literal types** that need *only* the type and no runtime
 *   methods (e.g. `type HttpVersion = 1.0 | 1.1 | 2.0`) should be written as
 *   plain TypeScript unions; this factory adds nothing for them.
 *
 * Industry precedent for the same restriction:
 *
 * - **Zod** — `z.enum` is string-only by design; heterogeneous numeric enums
 *   go through the separate `z.nativeEnum` primitive.
 * - **TypeScript native `enum`** — historically allowed both, and the
 *   community converged on string enums almost universally because numeric
 *   enums caused too many serialization-boundary issues.
 * - **Rust `enum`** — discriminants are integers under the hood, but the
 *   user-facing API is *names*; the numeric form is an encoding detail.
 *
 * In short: the linchpin names things; dictionaries encode them. Names are
 * strings.
 */
export type LiteralUnionMemberBase = string;

/**
 * Derive a literal union from a tuple of literal union members.
 *
 * @example Build a literal union from a tuple of numbers.
 *
 * ```ts
 * const tuple = [1, 2, 3] as const;
 * type Union = LiteralUnionFrom<typeof tuple>;
 * // type Union = 1 | 2 | 3
 * ```
 *
 * @example Build a literal union from a tuple of strings.
 *
 * ```ts
 * const tuple = ['a', 'b', 'c'] as const;
 * type Union = LiteralUnionFrom<typeof tuple>;
 * // type Union = 'a' | 'b' | 'c'
 * ```
 *
 * @example Build a literal union from a tuple of branded primitives.
 *
 * ```ts
 * // Any branding system of your choice.
 * type WithTag<T> = T & { __tag: string };
 * const tuple = [WithTag<1>, WithTag<true>, WithTag<'a'>, WithTag<typeof symbolB>, WithTag<3n>] as const;
 * type Union = LiteralUnionFrom<typeof tuple>;
 * // type Union = WithTag<1> | WithTag<true> | WithTag<'a'> | WithTag<typeof symbolB> | WithTag<3n>
 * ```
 */
export type LiteralUnionFrom<
  T extends readonly [LiteralUnionMemberBase, ...LiteralUnionMemberBase[]],
> = T[number];

/** converts a literal union into a record of its members. */
export type LiteralUnionMembers<T extends LiteralUnionMemberBase> = {
  [K in T]: K;
};

export type InferLiteralUnion<T> =
  T extends LiteralUnionDescriptor<infer U> ? U : never;

/**
 * A structured error describing that a `string` was checked against a literal
 * union but is not one of its declared members.
 *
 * It is the intersection of three reusable shapes from `@typemint/core`:
 * - {@link Kind} — tags the object with the discriminant
 *   `'LiteralUnionMismatchError'` so it can be narrowed within discriminated
 *   unions. The discriminant is deliberately scoped to this primitive rather
 *   than a generic name like `'NotAMemberError'`, so it never collides with a
 *   structurally similar "value not in a closed set" error raised by a sibling
 *   primitive (e.g. a future dictionary key miss).
 * - {@link WithMessage} — a human-readable `message`.
 * - {@link WithDetail} — the structured `details`, holding the `expected`
 *   members (in declaration order) and the `received` value that failed.
 *
 * The two sides mirror {@link TypeMismatchError}, but the "expected" thing is a
 * closed set of *names* rather than a single type, so `expected` is the union's
 * member tuple — that is what makes both the message and any programmatic
 * recovery useful (the caller sees exactly which values were allowed).
 * `received` is always a `string`: this error is only raised *after* the value
 * has been recognized as a string, so a non-string input is a
 * {@link TypeMismatchError}, not this.
 *
 * @typeParam T - The literal union's member type. Defaults to the wide
 *   {@link LiteralUnionMemberBase} for standalone references; a descriptor's
 *   `parse`/`of` pin it to the precise member union.
 *
 * @example Narrowing a union on the `kind` discriminant
 *
 * ```ts
 * function handle(error: LiteralUnionMismatchError | TypeMismatchError<string, unknown>) {
 *   if (Kind.isOf(error, 'LiteralUnionMismatchError')) {
 *     console.error(error.message);          // "Expected one of …"
 *     console.error(error.details.expected); // the allowed members
 *   }
 * }
 * ```
 */
export type LiteralUnionMismatchError<
  T extends LiteralUnionMemberBase = LiteralUnionMemberBase,
> = Kind<'LiteralUnionMismatchError'> &
  WithMessage &
  WithDetail<{
    expected: NonEmptyReadonlyArray<T>;
    received: string;
  }>;

const literalUnionMismatchKind = Kind.from('LiteralUnionMismatchError');

/** How many members to list in the message before truncating with a count. */
const MISMATCH_MEMBERS_PREVIEW = 5;

/**
 * Renders the union's members for a {@link LiteralUnionMismatchError} message,
 * quoting each and truncating to the first {@link MISMATCH_MEMBERS_PREVIEW} with
 * a `… (+N more)` suffix. The full list always survives in `details.expected`,
 * so truncation only affects the human-readable string, never the data.
 */
function formatMembers(
  members: NonEmptyReadonlyArray<LiteralUnionMemberBase>,
): string {
  const preview = members
    .slice(0, MISMATCH_MEMBERS_PREVIEW)
    .map((member) => JSON.stringify(member));
  const remaining = members.length - preview.length;
  const head = preview.join(', ');

  return remaining > 0 ? `${head}, … (+${remaining} more)` : head;
}

/**
 * Creates a {@link LiteralUnionMismatchError} from the union's declared members
 * and the `string` that failed the membership check.
 *
 * `T` is inferred from `expected`, so the precise member union is carried in the
 * returned error's `details.expected` without being written out at the call
 * site. The `message` is derived as
 * `Expected one of <members> but got <received>`, with the member list
 * truncated for readability (see {@link formatMembers}); the full member tuple
 * and the raw value are preserved under `details` for programmatic access.
 *
 * @param expected - The union's members, in declaration order.
 * @param received - The `string` value that is not one of the members.
 * @returns A fully populated `LiteralUnionMismatchError`.
 *
 * @example
 *
 * ```ts
 * const error = LiteralUnionMismatchError(['germany', 'france', 'usa'], 'belgium');
 *
 * error.kind;             // 'LiteralUnionMismatchError'
 * error.message;          // 'Expected one of "germany", "france", "usa" but got "belgium"'
 * error.details.expected; // ['germany', 'france', 'usa']
 * error.details.received; // 'belgium'
 * ```
 */
export function LiteralUnionMismatchError<T extends LiteralUnionMemberBase>(
  expected: NonEmptyReadonlyArray<T>,
  received: string,
): LiteralUnionMismatchError<T> {
  const message = `Expected one of ${formatMembers(expected)} but got ${JSON.stringify(received)}`;

  return {
    ...literalUnionMismatchKind,
    ...WithMessage.from(message),
    ...WithDetail.from({ expected, received }),
  };
}

/**
 * Exhaustive handler set for {@link LiteralUnionMatchFn}.
 *
 * Every member of the union must have a handler. Each handler receives the
 * narrow literal type for its own key (`(value: 'germany') => U`), not the
 * full union — so `match` can carry per-branch type refinements through to
 * the handler body.
 */
export type LiteralUnionMatchHandlers<T extends LiteralUnionMemberBase, U> = {
  readonly [K in T]: (value: K) => U;
};

/**
 * Exhaustive handler set for {@link LiteralUnionDescriptor.matchResult}.
 *
 * Each handler receives the narrow literal for its key and returns a
 * {@link Result} carrying the success type `A` and error type `E`.
 */
export type LiteralUnionResultHandlers<
  T extends LiteralUnionMemberBase,
  A,
  E,
> = {
  readonly [K in T]: (value: K) => Result<A, E>;
};

export type LiteralUnionMethods<T extends LiteralUnionMemberBase> = {
  /**
   * Type guard that narrows an `unknown` value to a member of this literal
   * union. Returns `true` when `value` is one of the union's declared literals
   * and `false` otherwise.
   *
   * Use this at the boundary of your system — when a value arrives from an
   * untrusted source (HTTP payload, URL parameter, environment variable,
   * database column, user input, JSON file, …) and you need to prove it
   * belongs to the union before treating it as such.
   *
   * The check is a `Set`-backed `O(1)` lookup against the declared members.
   * Equality is strict reference equality on the string value, so the guard
   * is safe across module boundaries (no `unique symbol` identity pitfalls).
   *
   * @param value - The value to test. Accepts `unknown` so it can sit at the
   *   trust boundary without forcing the caller to pre-cast.
   * @returns `true` if `value` is a declared member of the union, narrowing
   *   `value` to the union type in the truthy branch.
   *
   * @example Guard at an API boundary
   *
   * ```ts
   * const Country = LiteralUnion(['germany', 'france', 'usa']);
   *
   * function handleRequest(body: { country: unknown }) {
   *   if (!Country.isOfType(body.country)) {
   *     throw new Error(`Unknown country: ${String(body.country)}`);
   *   }
   *   // body.country is now typed as 'germany' | 'france' | 'usa'
   *   return lookupCountry(body.country);
   * }
   * ```
   *
   * @example Filter an array of unknowns down to valid members
   *
   * ```ts
   * const Status = LiteralUnion(['active', 'pending', 'archived']);
   *
   * const raw: unknown[] = ['active', 42, 'pending', null, 'archived', 'bogus'];
   * const valid = raw.filter(Status.isOfType);
   * // valid: ('active' | 'pending' | 'archived')[]
   * // → ['active', 'pending', 'archived']
   * ```
   *
   * @example Parse an environment variable with a typed fallback
   *
   * ```ts
   * const LogLevel = LiteralUnion(['debug', 'info', 'warn', 'error']);
   *
   * const raw = process.env['LOG_LEVEL'];
   * const level = LogLevel.isOfType(raw) ? raw : 'info';
   * // level: 'debug' | 'info' | 'warn' | 'error'
   * ```
   *
   * @example Combine with `match` for exhaustive handling
   *
   * ```ts
   * function describe(input: unknown): string {
   *   if (!Country.isOfType(input)) return 'unknown';
   *   return Country.match(input, {
   *     germany: () => 'DE',
   *     france:  () => 'FR',
   *     usa:     () => 'US',
   *   });
   * }
   * ```
   *
   * @example What it does NOT do — narrow to a single member
   *
   * ```ts
   * // isOfType only proves membership in the union as a whole.
   * // To narrow to a specific literal, compare directly:
   * if (Country.isOfType(value) && value === Country.germany) {
   *   // value is now narrowed to 'germany'
   * }
   * ```
   */
  isOfType: (value: unknown) => value is T;

  /**
   * Validate that a `string` you already hold is a declared member of this
   * union, returning it — narrowed to the union type — on success, or a
   * {@link LiteralUnionMismatchError} on failure.
   *
   * Use `of` when the input is *statically known to be a `string`* but not yet
   * known to be a member: an environment variable, a `VARCHAR` column, a CLI
   * argument, a value already narrowed to `string` upstream. The "is it a
   * string" question is answered by the type system, so `of` only checks
   * membership. When the input is `unknown` (a JSON payload, a request body),
   * recognize the `string` at the boundary first before reaching for `of`.
   *
   * `of` never throws and never mutates — it returns the outcome as a
   * {@link Result}. The success value is the *same* string, re-typed as the
   * union member; there is no branding or transformation (a literal union is
   * structural, so the value already *is* its own identity).
   *
   * Membership is a `Set`-backed `O(1)` lookup, identical to {@link isOfType} —
   * `of` is the {@link Result}-returning companion to that boolean guard.
   *
   * @param value - A `string` to check for membership.
   * @returns `Ok` with `value` narrowed to the union member, or `Err` carrying
   *   a {@link LiteralUnionMismatchError} whose `details.expected` lists every
   *   declared member.
   *
   * @example Validate an environment variable
   *
   * ```ts
   * const LogLevel = LiteralUnion(['debug', 'info', 'warn', 'error']);
   *
   * const level = LogLevel.of(process.env['LOG_LEVEL'] ?? 'info');
   * if (level.isOk()) {
   *   level.value; // 'debug' | 'info' | 'warn' | 'error'
   * } else {
   *   level.error.message; // 'Expected one of "debug", … but got "verbose"'
   * }
   * ```
   *
   * @example Compose in a `Result` pipeline
   *
   * ```ts
   * const Country = LiteralUnion(['germany', 'france', 'usa']);
   *
   * const capital = Country.of(row.country).map(lookupCapital);
   * // capital: Result<string, LiteralUnionMismatchError<'germany' | 'france' | 'usa'>>
   * ```
   */
  of(value: LiteralUnionMemberBase): Result<T, LiteralUnionMismatchError<T>>;

  /**
   * The **throwing** counterpart to {@link of}. Runs the same membership check,
   * but instead of returning a {@link Result} it returns the value — narrowed
   * to the union type — **directly** on success and **throws a
   * {@link PanicException}** when the value is not a member. The
   * {@link LiteralUnionMismatchError} is attached as the exception's `cause` so
   * it stays inspectable.
   *
   * A failure signals a bug: the value was asserted to be a member but was not.
   * Use this only where a violation is unrecoverable and should crash rather
   * than be handled — asserting a value from a trusted, already-validated
   * source (a persisted row, a prior `of`/parse result whose narrowing was lost
   * in transit, a test fixture). For values you merely *believe* are members
   * but want to handle on failure, use {@link of}; for `unknown` input from a
   * trust boundary, recognize the `string` first.
   *
   * Prefer this over an `as` cast: it re-checks membership, is easy to search
   * for, and only accepts a `string`, so it cannot brand the wrong primitive.
   *
   * @param value - A `string` asserted to be a member of the union.
   * @returns `value`, narrowed to the union member type.
   * @throws {PanicException} if `value` is not a declared member; the
   *   {@link LiteralUnionMismatchError} is the exception's `cause`.
   *
   * @example Re-narrowing a value validated when it was persisted
   *
   * ```ts
   * const Country = LiteralUnion(['germany', 'france', 'usa']);
   *
   * // Throws if the stored value has since drifted out of the union.
   * const country = Country.ofUnsafe(row.country); // 'germany' | 'france' | 'usa'
   * ```
   */
  ofUnsafe(value: LiteralUnionMemberBase): T;

  /**
   * Return the declared members of the union as a non-empty `readonly` tuple,
   * in the same order they were passed to {@link LiteralUnion}.
   *
   * The result is the canonical iterable form of the union — useful anywhere a
   * runtime list of every member is needed: rendering UI options, seeding a
   * database, generating documentation, building a parser, validating a CLI
   * argument, etc.
   *
   * **Order is preserved.** The returned tuple matches declaration order, so
   * callers that depend on order (e.g. dropdown lists, priority sequences)
   * can rely on it. This is one of the reasons the factory takes a *tuple*
   * rather than a `Set`: the union itself is unordered, but the descriptor
   * remembers how it was declared.
   *
   * **The result is the same reference on every call.** No allocation
   * happens at the call site; the descriptor caches the array internally.
   * The tuple is `readonly` to communicate this — callers must not mutate it.
   * If you need a mutable copy, spread it: `[...Country.toArray()]`.
   *
   * **Type-level guarantee of non-emptiness.** The return type is
   * `readonly [T, ...T[]]` (a non-empty tuple), so destructuring the first
   * element is safe without an `undefined` check:
   *
   * ```ts
   * const [first] = Country.toArray(); // first: 'germany' | 'france' | 'usa'
   * ```
   *
   * @returns A non-empty `readonly` tuple of the union's members in
   *   declaration order. The same reference is returned on every call.
   *
   * @example Iterate every member
   *
   * ```ts
   * const Country = LiteralUnion(['germany', 'france', 'usa']);
   *
   * for (const country of Country.toArray()) {
   *   console.log(country); // 'germany', then 'france', then 'usa'
   * }
   * ```
   *
   * @example Render a `<select>` of options (React)
   *
   * ```ts
   * const Currency = LiteralUnion(['eur', 'usd', 'gbp']);
   *
   * <select>
   *   {Currency.toArray().map((c) => (
   *     <option key={c} value={c}>{c.toUpperCase()}</option>
   *   ))}
   * </select>
   * ```
   *
   * @example Build a Zod (or any schema-lib) enum from the same source of truth
   *
   * ```ts
   * const Role = LiteralUnion(['admin', 'editor', 'viewer']);
   *
   * // toArray() preserves the literal types, so z.enum infers correctly.
   * const RoleSchema = z.enum(Role.toArray());
   * // RoleSchema: z.ZodEnum<['admin', 'editor', 'viewer']>
   * ```
   *
   * @example Validate a CLI argument with a typed error message
   *
   * ```ts
   * const LogLevel = LiteralUnion(['debug', 'info', 'warn', 'error']);
   *
   * function parseLevel(input: string): LogLevel {
   *   if (!LogLevel.isOfType(input)) {
   *     throw new Error(
   *       `Invalid log level "${input}". Expected one of: ` +
   *       LogLevel.toArray().join(', '),
   *     );
   *   }
   *   return input;
   * }
   * ```
   *
   * @example Pick a default safely
   *
   * ```ts
   * // The non-empty tuple type guarantees the first element exists —
   * // no `undefined` check, no `!` assertion.
   * const [defaultLevel] = LogLevel.toArray();
   * // defaultLevel: 'debug' | 'info' | 'warn' | 'error'
   * ```
   *
   * @example When you need a mutable copy
   *
   * ```ts
   * // The cached array must not be mutated. Spread to get a fresh one:
   * const sorted = [...Country.toArray()].sort();
   * ```
   *
   * @example For a `Set`, use {@link toSet} instead
   *
   * ```ts
   * // Don't do: new Set(Country.toArray())
   * // Do:       Country.toSet()
   * // The descriptor already maintains a Set internally for `isOfType`.
   * ```
   */
  toArray: () => NonEmptyReadonlyArray<T>;

  /**
   * The number of members in the union.
   */
  size: number;

  /**
   * Return an iterator over the declared members of the union.
   *
   * The iterator is a `Symbol.iterator` method that returns an iterator over the
   * declared members of the union.
   */
  [Symbol.iterator]: () => IterableIterator<T>;

  /**
   * The string tag for the literal union.
   */
  [Symbol.toStringTag]: 'LiteralUnion';

  /**
   * Exhaustively dispatch on a member of this literal union, returning the
   * result produced by the matching handler.
   *
   * `match` is the canonical way to *do something* with a literal value once
   * you know which member it is. It pairs with {@link isOfType} for the
   * "guard at the boundary, dispatch in the body" pattern, and serves as the
   * value-side counterpart to a {@link Dictionary} (which projects every
   * member to a fixed value; `match` runs *code* per member).
   *
   * **Exhaustiveness is enforced at compile time.** The handlers object is
   * typed as a {@link LiteralUnionMatchHandlers} mapped record over every
   * member of the union. Missing a case is a TypeScript error; you cannot
   * accidentally fall through to a default.
   *
   * **Per-branch type narrowing.** Each handler receives the *narrow* literal
   * type for its own key, not the full union — so the body of the `germany`
   * handler sees `value: 'germany'`, not `value: 'germany' | 'france' | …`.
   * This carries through to anything you derive from `value` inside the body.
   *
   * **Two calling shapes.**
   * - **Data-first** (`match(value, handlers)`) — dispatch immediately. Best
   *   for direct, imperative use.
   * - **Data-last** (`match(handlers)`) — returns a matcher function awaiting
   *   the value. Best for `pipe` chains, `Array.prototype.map`, and any
   *   point-free style.
   *
   * **Synchronous only.** This method is sync. Handlers may *return*
   * Promises, in which case the result type is `Promise<U>` and the caller
   * is responsible for awaiting. There is no `matchAsync` variant — async
   * dispatch is the caller's concern, not the descriptor's. (If you find
   * yourself wanting one, the sync `match` already gives you it: just
   * `await Country.match(value, asyncHandlers)`.)
   *
   * @typeParam U - The handler return type, inferred from the union of every
   *   handler's return type. Use `as const` returns to preserve literal
   *   precision.
   *
   * @param value - The member to dispatch on. Must be a declared member of
   *   the union; TypeScript enforces this at the call site.
   * @param handlers - An exhaustive map from each member to a handler. Each
   *   handler receives the narrow literal for its key.
   * @returns The value produced by the handler that matched `value`.
   *
   * @throws {PanicException} If `handlers[value]` is missing or not a
   *   function. This only fires when callers bypass the type system (e.g.
   *   via `as any`, untyped JS, JSON-loaded handlers); statically-typed
   *   call sites cannot reach this branch.
   *
   * @example Data-first — direct dispatch
   *
   * ```ts
   * const Country = LiteralUnion(['germany', 'france', 'usa']);
   * type Country = InferLiteralUnion<typeof Country>;
   *
   * function alpha2(country: Country): string {
   *   return Country.match(country, {
   *     germany: () => 'DE',
   *     france:  () => 'FR',
   *     usa:     () => 'US',
   *   });
   * }
   * ```
   *
   * @example Data-last — pipe / partial application
   *
   * ```ts
   * const Currency = LiteralUnion(['eur', 'usd', 'gbp']);
   *
   * const symbol = Currency.match({
   *   eur: () => '€',
   *   usd: () => '$',
   *   gbp: () => '£',
   * });
   *
   * ['eur', 'usd', 'gbp'].map(symbol); // ['€', '$', '£']
   * ```
   *
   * @example Per-branch narrowing in the handler body
   *
   * ```ts
   * const Status = LiteralUnion(['active', 'pending', 'archived']);
   *
   * Status.match(s, {
   *   active:   (v) => `${v.toUpperCase()}!`,    // v: 'active'
   *   pending:  (v) => `${v} (waiting)`,         // v: 'pending'
   *   archived: (v) => `archived: ${v}`,         // v: 'archived'
   * });
   * ```
   *
   * @example Pair with `isOfType` to guard external input
   *
   * ```ts
   * function describe(input: unknown): string {
   *   if (!Country.isOfType(input)) return 'unknown';
   *   return Country.match(input, {
   *     germany: () => 'Deutschland',
   *     france:  () => 'France',
   *     usa:     () => 'United States',
   *   });
   * }
   * ```
   *
   * @example Exhaustiveness is enforced at compile time
   *
   * ```ts
   * // @ts-expect-error — Property 'usa' is missing in type ...
   * Country.match(country, {
   *   germany: () => 'DE',
   *   france:  () => 'FR',
   * });
   * ```
   *
   * @example Async handlers — caller awaits, no `matchAsync` exists
   *
   * ```ts
   * // U is inferred as Promise<User>; the caller awaits the result.
   * const user = await Country.match(country, {
   *   germany: () => fetchUser('de'),
   *   france:  () => fetchUser('fr'),
   *   usa:     () => fetchUser('us'),
   * });
   *
   * // There is no matchAsync — sync `match` already handles this case
   * // because it returns whatever the handler returns, including Promises.
   * ```
   */
  match<U>(value: T, handlers: LiteralUnionMatchHandlers<T, U>): U;

  /**
   * Data-last form of {@link match}. Returns a matcher function awaiting the
   * value, suitable for `pipe`, `Array.prototype.map`, and other point-free
   * use. See the data-first overload above for full documentation.
   *
   * @example
   *
   * ```ts
   * const symbol = Currency.match({
   *   eur: () => '€',
   *   usd: () => '$',
   *   gbp: () => '£',
   * });
   *
   * Currency.toArray().map(symbol); // ['€', '$', '£']
   * ```
   */
  match<U>(handlers: LiteralUnionMatchHandlers<T, U>): (value: T) => U;

  /**
   * Exhaustively dispatch on the success value of a {@link Result}, returning
   * a new `Result` whose error channel composes the input's error type with
   * the handlers' error type.
   *
   * `matchResult` is the {@link Result}-aware companion to {@link match}: it
   * lifts the dispatch into the `Result` monad, so callers can thread a
   * possibly-failed value through a literal-union dispatch without manually
   * destructuring `Ok`/`Err` at every step. It is implemented in terms of
   * `Result.andThen`, which means:
   *
   * - **`Err` short-circuits.** If the input is `Err(e)`, no handler is
   *   invoked; the error propagates unchanged through the output. The exact
   *   `Err` instance is preserved (no re-allocation), so reference identity
   *   and any attached metadata survive.
   * - **`Ok` dispatches.** If the input is `Ok(v)`, the handler matching
   *   `v`'s narrow literal runs and its returned `Result<A, E2>` becomes
   *   the output.
   * - **Errors compose.** The output's error type is `E1 | E2` — the union
   *   of "the input could already be failed" and "any handler can fail."
   *
   * **Exhaustiveness is enforced at compile time.** Every member of the
   * literal union must have a handler; missing one is a TypeScript error,
   * just like {@link match}. Per-handler narrowing also carries through, so
   * the `germany` handler sees `value: 'germany'`, not the wide union.
   *
   * **Two calling shapes** (mirroring {@link match}):
   * - **Data-first** — `descriptor.matchResult(result, handlers)`. Best for
   *   direct, imperative use.
   * - **Data-last** — `descriptor.matchResult(handlers)` returns a matcher
   *   `<E1>(result: Result<T, E1>) => Result<A, E1 | E2>` suitable for
   *   pipelines, `.map` over arrays of `Result`s, and `pipe`-style chaining.
   *
   * **Synchronous only.** Like {@link match}, this method dispatches
   * synchronously. Handlers may *return* `Result<Promise<A>, E>` if you need
   * async work, but there is no `matchResultAsync` — sync `matchResult`
   * already passes through whatever the handler returns. See {@link match}
   * for the broader rationale.
   *
   * @typeParam A - The handler success type, inferred from the union of every
   *   handler's `Ok` payload. Use `as const` returns to preserve literal
   *   precision.
   * @typeParam E1 - The input `Result`'s error type. Propagated unchanged
   *   when the input is `Err`.
   * @typeParam E2 - The handler error type, inferred from the union of every
   *   handler's `Err` payload.
   *
   * @param result - The `Result` whose `Ok` value will be dispatched on. If
   *   `Err`, the error short-circuits and no handler is invoked.
   * @param handlers - An exhaustive map from each member to a handler that
   *   returns `Result<A, E2>`. Each handler receives the narrow literal for
   *   its key.
   * @returns `Result<A, E1 | E2>` — the input's error or the dispatched
   *   handler's `Result`.
   *
   * @throws {PanicException} If `handlers` is missing a member's entry or
   *   that entry is not a function. Statically-typed call sites cannot reach
   *   this branch; it only fires when callers bypass the type system (e.g.
   *   `as any`, JSON-loaded handlers, untyped JS).
   *
   * @example Data-first — guard at a parser boundary
   *
   * ```ts
   * const Country = LiteralUnion(['germany', 'france', 'usa']);
   * type Country = InferLiteralUnion<typeof Country>;
   *
   * declare function parseCountry(input: unknown): Result<Country, ParseError>;
   * declare function lookupCapital(c: Country): Result<string, NotFoundError>;
   *
   * const capital = Country.matchResult(parseCountry(rawInput), {
   *   germany: () => lookupCapital('germany'),
   *   france:  () => lookupCapital('france'),
   *   usa:     () => lookupCapital('usa'),
   * });
   * // capital: Result<string, ParseError | NotFoundError>
   * ```
   *
   * @example Data-last — partial application for `Array.prototype.map`
   *
   * ```ts
   * const Currency = LiteralUnion(['eur', 'usd', 'gbp'] as const);
   *
   * const toSymbol = Currency.matchResult({
   *   eur: () => Result.Ok('€' as const),
   *   usd: () => Result.Ok('$' as const),
   *   gbp: () => Result.Ok('£' as const),
   * });
   * // toSymbol: <E>(r: Result<Currency, E>) => Result<'€' | '$' | '£', E>
   *
   * const inputs: Result<Currency, ParseError>[] = [...];
   * const symbols = inputs.map(toSymbol);
   * // symbols: Result<'€' | '$' | '£', ParseError>[]
   * ```
   *
   * @example Per-branch type narrowing in handler bodies
   *
   * ```ts
   * Country.matchResult(parseCountry(input), {
   *   germany: (v) => Result.Ok(`code:${v.toUpperCase()}`), // v: 'germany'
   *   france:  (v) => Result.Ok(`code:${v.toUpperCase()}`), // v: 'france'
   *   usa:     (v) => Result.Ok(`code:${v.toUpperCase()}`), // v: 'usa'
   * });
   * ```
   *
   * @example Error short-circuits — the original `Err` is preserved
   *
   * ```ts
   * const err = Result.Err({ kind: 'ParseError', input: 'xyz' } as const);
   *
   * const result = Country.matchResult(err, {
   *   germany: () => Result.Ok('DE'),
   *   france:  () => Result.Ok('FR'),
   *   usa:     () => Result.Ok('US'),
   * });
   *
   * result === err; // true — same reference, no re-allocation
   * ```
   *
   * @example Error types compose into the output
   *
   * ```ts
   * declare const r: Result<Country, ParseError>;
   *
   * const x = Country.matchResult(r, {
   *   germany: () => Result.Ok('Berlin' as const),                    // never fails
   *   france:  () => Result.Err({ kind: 'NotFound' as const }),       // adds NotFoundError
   *   usa:     () => Result.Ok('Washington' as const),                // never fails
   * });
   * // x: Result<'Berlin' | 'Washington', ParseError | { kind: 'NotFound' }>
   * ```
   *
   * @example Exhaustiveness is enforced at compile time
   *
   * ```ts
   * // @ts-expect-error — Property 'usa' is missing in type ...
   * Country.matchResult(parseCountry(input), {
   *   germany: () => Result.Ok('DE'),
   *   france:  () => Result.Ok('FR'),
   * });
   * ```
   *
   * @example Compose with {@link match} — sync-then-Result pipeline
   *
   * ```ts
   * function classify(input: unknown): Result<string, ParseError> {
   *   return Country.matchResult(parseCountry(input), {
   *     germany: () => Result.Ok(Country.match('germany', {
   *       germany: () => 'EU',
   *       france:  () => 'EU',
   *       usa:     () => 'NA',
   *     })),
   *     france:  () => Result.Ok('EU'),
   *     usa:     () => Result.Ok('NA'),
   *   });
   * }
   * ```
   *
   * @example Equivalence with manual `andThen` composition
   *
   * ```ts
   * // These two expressions are interchangeable; matchResult is the
   * // ergonomic form when the inner step is exactly a literal-union match.
   *
   * const a = Country.matchResult(parseCountry(input), {
   *   germany: () => lookupCapital('germany'),
   *   france:  () => lookupCapital('france'),
   *   usa:     () => lookupCapital('usa'),
   * });
   *
   * const b = parseCountry(input).andThen((country) =>
   *   Country.match(country, {
   *     germany: () => lookupCapital('germany'),
   *     france:  () => lookupCapital('france'),
   *     usa:     () => lookupCapital('usa'),
   *   }),
   * );
   * ```
   */
  matchResult<A, E1, E2>(
    result: Result<T, E1>,
    handlers: LiteralUnionResultHandlers<T, A, E2>,
  ): Result<A, E1 | E2>;

  /**
   * Data-last form of {@link matchResult}. Returns a matcher function
   * `<E1>(result: Result<T, E1>) => Result<A, E1 | E2>` suitable for
   * pipelines, `Array.prototype.map`, and `pipe`-style chaining.
   *
   * Handlers are validated eagerly at matcher-creation time — missing or
   * non-function handlers throw a {@link PanicException} immediately rather
   * than deferring the failure to the eventual call site.
   *
   * See the data-first overload above for full documentation.
   *
   * @example
   *
   * ```ts
   * const toCapital = Country.matchResult({
   *   germany: () => lookupCapital('germany'),
   *   france:  () => lookupCapital('france'),
   *   usa:     () => lookupCapital('usa'),
   * });
   *
   * const capitals = parsedInputs.map(toCapital);
   * // capitals: Result<string, ParseError | NotFoundError>[]
   * ```
   */
  matchResult<A, E2>(
    handlers: LiteralUnionResultHandlers<T, A, E2>,
  ): <E1>(result: Result<T, E1>) => Result<A, E1 | E2>;
};

export type LiteralUnionDescriptor<T extends LiteralUnionMemberBase> =
  LiteralUnionMembers<T> & LiteralUnionMethods<T>;

const reservedKeys = new Set([
  'isOfType',
  'of',
  'ofUnsafe',
  'toArray',
  'size',
  'match',
  'matchResult',
]);

export function LiteralUnion<
  const T extends NonEmptyReadonlyArray<LiteralUnionMemberBase>,
>(literals: T): LiteralUnionDescriptor<LiteralUnionFrom<T>> {
  if (literals.length === 0) {
    throw new PanicException('LiteralUnion requires at least one member');
  }

  const literalsCopy = Object.freeze([...literals] as NonEmptyReadonlyArray<
    T[number]
  >);

  for (const lit of literalsCopy) {
    if (reservedKeys.has(lit))
      throw new PanicException(
        `LiteralUnion: member name "${lit}" collides with a reserved ` +
          `descriptor key`,
      );
  }

  const memoSet = new Set<LiteralUnionMemberBase>(literalsCopy);

  const members: LiteralUnionMembers<LiteralUnionFrom<T>> = Object.create(null);
  for (const lit of literalsCopy) {
    members[lit] = lit;
  }

  function resolveHandler<U>(
    value: LiteralUnionMemberBase,
    handlers: LiteralUnionMatchHandlers<LiteralUnionMemberBase, U>,
  ): (value: LiteralUnionMemberBase) => U {
    if (typeof handlers !== 'object' || handlers === null) {
      throw new PanicException(
        `LiteralUnion.match: handlers must be an object`,
      );
    }

    const handler = handlers[value];

    if (handler === undefined) {
      throw new PanicException(
        `LiteralUnion.match: missing handler for "${value}". ` +
          `Provided handlers: ${Object.keys(handlers).join(', ')}`,
      );
    }
    if (typeof handler !== 'function') {
      throw new PanicException(
        `LiteralUnion.match: handler for "${value}" is ${typeof handler}, ` +
          `expected a function`,
      );
    }

    return handler;
  }

  // MARK: Match function
  function match<U>(
    value: T[number],
    handlers: LiteralUnionMatchHandlers<T[number], U>,
  ): U;
  function match<U>(
    handlers: LiteralUnionMatchHandlers<T[number], U>,
  ): (value: T[number]) => U;
  function match<U>(
    arg1: T[number] | LiteralUnionMatchHandlers<T[number], U>,
    arg2?: LiteralUnionMatchHandlers<T[number], U>,
  ): U | ((value: T[number]) => U) {
    if (typeof arg2 !== 'undefined') {
      // Data-first: validate arg1 is a string
      const value = arg1;
      const handlers = arg2;

      if (typeof value !== 'string') {
        throw new PanicException('LiteralUnion.match: value must be a string');
      }
      const handler = resolveHandler<U>(value, handlers);

      return handler(value);
    } else {
      // Data-last: validate arg1 is a non-null object
      if (typeof arg1 !== 'object' || arg1 === null) {
        throw new PanicException(
          'LiteralUnion.match: handlers must be an object',
        );
      }
      const handlers = arg1;

      return (value: T[number]) => {
        const handler = resolveHandler(value, handlers);

        return handler(value);
      };
    }
  }

  // MARK: match result
  function matchResult<A, E1, E2>(
    result: Result<T[number], E1>,
    handlers: LiteralUnionResultHandlers<T[number], A, E2>,
  ): Result<A, E1 | E2>;
  function matchResult<A, E2>(
    handlers: LiteralUnionResultHandlers<T[number], A, E2>,
  ): <E1>(result: Result<T[number], E1>) => Result<A, E1 | E2>;
  function matchResult<A, E1, E2>(
    ...args:
      | [Result<T[number], E1>, LiteralUnionResultHandlers<T[number], A, E2>]
      | [LiteralUnionResultHandlers<T[number], A, E2>]
  ):
    | Result<A, E1 | E2>
    | (<E>(result: Result<T[number], E>) => Result<A, E | E2>) {
    // Data-first
    if (args.length === 2) {
      const [result, handlers] = args;

      return result.andThen(match(handlers));
    }
    // Data-last
    const [handlers] = args;
    const dispatch = match(handlers);

    return <E>(result: Result<T[number], E>): Result<A, E | E2> =>
      result.andThen(dispatch);
  }

  function isOfType(value: unknown): value is T[number] {
    return typeof value === 'string' && memoSet.has(value);
  }

  // Membership-only validation over a known `string`. Reuses the same
  // `Set`-backed lookup as `isOfType`; on a miss it builds a
  // `LiteralUnionMismatchError` carrying the full member list.
  function of(
    value: LiteralUnionMemberBase,
  ): Result<T[number], LiteralUnionMismatchError<T[number]>> {
    return memoSet.has(value)
      ? Result.Ok(value as T[number])
      : Result.Err(LiteralUnionMismatchError(literalsCopy, value));
  }

  // Throwing counterpart to `of`: returns the narrowed value on success, or
  // panics on a miss with the `LiteralUnionMismatchError` attached as `cause`.
  function ofUnsafe(value: LiteralUnionMemberBase): T[number] {
    const result = of(value);
    if (result.isErr()) {
      throw new PanicException(
        `LiteralUnion.ofUnsafe: ${JSON.stringify(value)} is not a member of ` +
          `the union (LiteralUnionMismatchError attached as \`cause\`)`,
        result.error,
      );
    }
    return result.value;
  }

  function toArray(): NonEmptyReadonlyArray<T[number]> {
    return literalsCopy;
  }

  // Use Object.assign to create the descriptor object to avoid
  // prototype pollution. (No __proto__ or constructor pollution.)
  const descriptor: LiteralUnionDescriptor<LiteralUnionFrom<T>> = Object.assign(
    Object.create(null),
    members,
    {
      /* methods */
      get size(): number {
        return literalsCopy.length;
      },

      [Symbol.iterator](): IterableIterator<T[number]> {
        return literalsCopy[Symbol.iterator]();
      },
      [Symbol.toStringTag]: 'LiteralUnion',
      isOfType,
      of,
      ofUnsafe,
      toArray,
      match,
      matchResult,
    },
  );

  return descriptor;
}
