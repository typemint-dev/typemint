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

export type LiteralUnionDescriptor<T extends LiteralUnionMemberBase> =
  LiteralUnionMembers<T>;

export function LiteralUnion<
  T extends readonly [LiteralUnionMemberBase, ...LiteralUnionMemberBase[]],
>(literals: T): LiteralUnionDescriptor<LiteralUnionFrom<T>> {
  if (literals.length === 0) {
    throw new PanicException('LiteralUnion requires at least one member');
  }

  const members: Record<string, string> = Object.create(null);
  for (const lit of literals) {
    members[lit] = lit;
  }

  return members as LiteralUnionDescriptor<LiteralUnionFrom<T>>;
}
