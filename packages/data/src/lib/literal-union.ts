import { PanicException } from '@typemint/core';

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
  toArray: () => readonly [T, ...T[]];

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
  [Symbol.iterator]: () => IterableIterator<T[number]>;

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
   *
   * function alpha2(country: InferLiteralUnion<typeof Country>): string {
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
};

export type LiteralUnionDescriptor<T extends LiteralUnionMemberBase> =
  LiteralUnionMembers<T> & LiteralUnionMethods<T>;

export function LiteralUnion<
  T extends readonly [LiteralUnionMemberBase, ...LiteralUnionMemberBase[]],
>(literals: T): LiteralUnionDescriptor<LiteralUnionFrom<T>> {
  if (literals.length === 0) {
    throw new PanicException('LiteralUnion requires at least one member');
  }
  const literalsCopy = [...literals] as readonly [T[number], ...T[number][]];

  const memoSet = new Set<LiteralUnionMemberBase>(literalsCopy);

  const members: LiteralUnionMembers<LiteralUnionFrom<T>> = Object.create(null);
  for (const lit of literalsCopy) {
    members[lit as T[number]] = lit;
  }

  function executeMatchHandler<T extends LiteralUnionMemberBase, U>(
    value: T,
    handlers: LiteralUnionMatchHandlers<T, U>,
  ): U {
    const handler = handlers[value];
    if (handler === undefined) {
      throw new PanicException(
        `LiteralUnion.match: missing handler for "${value}". ` +
          `Provided handlers: ${literalsCopy.join(', ')}`,
      );
    }
    if (typeof handler !== 'function') {
      throw new PanicException(
        `LiteralUnion.match: handler for "${value}" is ${typeof handler}, ` +
          `expected a function`,
      );
    }
    return handler(value);
  }

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
      if (typeof arg1 !== 'string') {
        throw new PanicException('LiteralUnion.match: value must be a string');
      }
      return executeMatchHandler(arg1, arg2);
    } else {
      // Data-last: validate arg1 is a non-null object
      if (typeof arg1 !== 'object' || arg1 === null) {
        throw new PanicException(
          'LiteralUnion.match: handlers must be an object',
        );
      }

      // Validate exhaustiveness eagerly
      for (const key of literalsCopy) {
        if (typeof arg1[key] !== 'function') {
          throw new PanicException(
            `LiteralUnion.match: handler for "${key}" is missing or not a function`,
          );
        }
      }

      return (value: T[number]) => executeMatchHandler(value, arg1);
    }
  }

  const descriptor: LiteralUnionDescriptor<LiteralUnionFrom<T>> = {
    ...members,

    get size(): number {
      return literalsCopy.length;
    },

    [Symbol.iterator](): IterableIterator<T[number]> {
      return literalsCopy[Symbol.iterator]();
    },

    [Symbol.toStringTag]: 'LiteralUnion',

    isOfType(value: unknown): value is T[number] {
      return typeof value === 'string' && memoSet.has(value);
    },

    toArray(): readonly [T[number], ...T[number][]] {
      return literalsCopy;
    },

    match,
  };

  return descriptor;
}
