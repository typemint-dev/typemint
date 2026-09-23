import { PanicException, type NonEmptyReadonlyArray } from '@typemint/core';
import {
  createLiteralUnion,
  type LiteralUnion,
  type LiteralUnionLike,
  type LiteralUnionMemberBase,
  type LiteralUnionMethods,
} from './literal-union.js';

// ─────────────────────────────────────────────────────────────────────────────
// MARK: Tuple helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Keep the members of `T` that extend `K`, preserving `T`'s order. Written
 * tail-recursively (accumulator) so long rank lists stay within the compiler's
 * recursion budget.
 *
 * The `H extends K` test must branch *around* the recursive call, not sit
 * inside its accumulator argument: a conditional in argument position defeats
 * tail-call elimination, and the pick/omit types then collapse to `never`
 * (TS2589) at around 100 members.
 */
type FilterTuple<
  T extends readonly LiteralUnionMemberBase[],
  K,
  Acc extends LiteralUnionMemberBase[] = [],
> = T extends readonly [
  infer H extends LiteralUnionMemberBase,
  ...infer R extends LiteralUnionMemberBase[],
]
  ? H extends K
    ? FilterTuple<R, K, [...Acc, H]>
    : FilterTuple<R, K, Acc>
  : Acc;

/**
 * Drop the members of `T` before `From`; `From` itself is kept.
 *
 * When `From` is a union (the argument is a variable, not a literal), the
 * slice starts at its **lowest** member — the widest suffix any runtime value
 * of `From` can produce, which is the union of all of them.
 */
type SliceFrom<
  T extends readonly LiteralUnionMemberBase[],
  From,
> = T extends readonly [
  infer H extends LiteralUnionMemberBase,
  ...infer R extends LiteralUnionMemberBase[],
]
  ? H extends From
    ? T
    : SliceFrom<R, From>
  : [];

/**
 * Keep the members of `T` up to and including `To`.
 *
 * When `To` is a union, the slice runs through its **highest** member: each
 * matched member is removed from `To`, and the walk stops only once none is
 * left. Stopping at the first match would type `atMost(value: Rank)` as just
 * the lowest member while the runtime returns more — a narrowing lie.
 *
 * An empty `To` yields `[]` (collapsed to `never` by {@link AsNonEmpty}); this
 * is how an inverted `range` is typed. Every branch recurses in tail position,
 * so the compiler's tail-call elimination applies.
 */
type SliceThrough<
  T extends readonly LiteralUnionMemberBase[],
  To,
  Acc extends LiteralUnionMemberBase[] = [],
> = [To] extends [never]
  ? Acc
  : T extends readonly [
        infer H extends LiteralUnionMemberBase,
        ...infer R extends LiteralUnionMemberBase[],
      ]
    ? H extends To
      ? SliceThrough<R, Exclude<To, H>, [...Acc, H]>
      : SliceThrough<R, To, [...Acc, H]>
    : Acc;

/**
 * The inclusive slice `[From, To]`. `To` is first restricted to the members at
 * or above `From`, so bounds that lie entirely below `From` (an inverted range,
 * which panics at runtime) produce an empty slice rather than the whole suffix.
 */
type SliceRange<
  T extends readonly LiteralUnionMemberBase[],
  From,
  To,
> = SliceThrough<SliceFrom<T, From>, Extract<To, SliceFrom<T, From>[number]>>;

/**
 * The message a duplicated member is replaced by in {@link CheckedTuple}. It is
 * a string literal type so the compiler prints it verbatim — the error reads as
 * a sentence rather than as a structural mismatch.
 */
type DuplicateMember<M extends LiteralUnionMemberBase> =
  `duplicate member "${M}": each member of an ordinal union holds exactly one rank`;

/**
 * The member names the descriptor's own keys already occupy — every string key
 * of {@link LiteralUnionMethods} (`size`, `parse`, `pick`, …) and of
 * {@link OrdinalUnionMethods} (`rank`, `next`, `range`, …). Derived from the
 * method types rather than listed, so a method added to either surface is
 * reserved here without a second edit.
 */
type ReservedKey = Extract<
  | keyof LiteralUnionMethods<LiteralUnionMemberBase>
  | keyof OrdinalUnionMethods<NonEmptyReadonlyArray<LiteralUnionMemberBase>>,
  string
>;

/**
 * The message a reserved member is replaced by in {@link CheckedTuple}; a
 * sentence for the same reason as {@link DuplicateMember}.
 */
type ReservedMember<M extends LiteralUnionMemberBase> =
  `reserved member "${M}": the name is taken by a method of the ordinal union descriptor`;

/**
 * The message a union-typed member is replaced by in {@link CheckedTuple}. It
 * does not interpolate the member: a template literal over a union yields one
 * message per branch, and the error would print that union instead of a
 * sentence. The compiler names the offending type on its own anyway.
 */
type AmbiguousMember =
  'ambiguous member: a union-typed element has no single rank; pass each member as its own literal';

/**
 * `true` if `U` is a union of two or more types. Each branch of the
 * distribution compares the whole union `C` against that one branch, which
 * only matches when there is a single branch.
 */
type IsUnion<U, C = U> = U extends unknown
  ? [C] extends [U]
    ? false
    : true
  : never;

/**
 * `T` with every member that is a {@link ReservedKey}, or that already
 * appeared earlier, replaced by a {@link ReservedMember} or
 * {@link DuplicateMember} message. A valid tuple maps to itself, so the
 * argument only fails to assign at the offending member's own position — the
 * editor underlines the second `'a'` or the `'next'`, not the whole call.
 *
 * Without the reserved check, a member named after a method would compile —
 * its property typed as a meaningless intersection of the literal and the
 * method — and only panic when the module loads.
 *
 * A union-typed member (a variable typed `'a' | 'b'`) is replaced by the
 * {@link AmbiguousMember} message: it has no single rank to hold. The check
 * runs first because `H` is an `infer` type parameter, so the conditionals
 * after it distribute over a union `H` — the walk would fork into one tuple
 * per branch, and the error would read as a mismatch against that union of
 * tuples. It is not added to `Seen`: which member it stands for is unknown,
 * so a later literal cannot be called its duplicate.
 *
 * `Seen` collects the members walked so far. It is kept separate from the
 * output accumulator `Acc` so a non-literal member (a `string`-typed variable,
 * skipped by the `string extends H` guard because nothing can be decided about
 * it) never lands in the set that later members are tested against — otherwise
 * every literal after it would match `string` and be reported as a duplicate.
 *
 * The terminal branch appends `T` rather than closing with `Acc` alone: when
 * the input is a non-tuple array (`derive` re-invoking the factory on a runtime
 * slice), the walk stops at the first element and the rest must be carried
 * through, or the call would be typed as a one-element tuple.
 */
type CheckedTuple<
  T extends readonly LiteralUnionMemberBase[],
  Acc extends LiteralUnionMemberBase[] = [],
  Seen = never,
> = T extends readonly [
  infer H extends LiteralUnionMemberBase,
  ...infer R extends LiteralUnionMemberBase[],
]
  ? string extends H
    ? CheckedTuple<R, [...Acc, H], Seen>
    : IsUnion<H> extends true
      ? CheckedTuple<R, [...Acc, AmbiguousMember], Seen>
      : H extends ReservedKey
        ? CheckedTuple<R, [...Acc, ReservedMember<H>], Seen | H>
        : H extends Seen
          ? CheckedTuple<R, [...Acc, DuplicateMember<H>], Seen>
          : CheckedTuple<R, [...Acc, H], Seen | H>
  : readonly [...Acc, ...T];

/**
 * The parameter type of {@link OrdinalUnion}: `T` itself when its members are
 * distinct and unreserved, and the annotated {@link CheckedTuple} when they
 * are not.
 *
 * Written as a conditional rather than as `T & CheckedTuple<T>` because an
 * intersection with a conflicting element reduces to `never`, and the compiler
 * then reports "not assignable to `never`" for *every* element instead of
 * naming the repeated one.
 *
 * Both branches are spread into a fresh `readonly` tuple so that inference
 * through the conditional keeps `T` readonly (and so a `readonly` argument
 * assigns), which the derived slice types depend on.
 */
type CheckedMembers<T extends NonEmptyReadonlyArray<LiteralUnionMemberBase>> =
  CheckedTuple<T> extends readonly [...T] ? readonly [...T] : CheckedTuple<T>;

/**
 * The member tuple an inferred `T` stands for. Inference through
 * {@link CheckedMembers} can hand back a mutable tuple (an array literal at the
 * call site), so every use of `T` — the descriptor's parameter and the slice
 * types derived from it — goes through this alias to keep the member tuple
 * `readonly`, as it was when the parameter was plain `T`.
 */
type Members<T extends NonEmptyReadonlyArray<LiteralUnionMemberBase>> =
  readonly [...T];

/**
 * Re-assert non-emptiness for a derived tuple. The tuple helpers cannot prove
 * their result is non-empty, but every public entry point guarantees it (the
 * keys are constrained to members, and the runtime panics on an empty result),
 * so an empty tuple here collapses to `never` rather than widening the type.
 */
type AsNonEmpty<T> =
  T extends NonEmptyReadonlyArray<LiteralUnionMemberBase> ? T : never;

// ─────────────────────────────────────────────────────────────────────────────
// MARK: Types
// ─────────────────────────────────────────────────────────────────────────────

/** How {@link OrdinalUnionMethods.compare} reports the relative order. */
export type OrdinalComparison = -1 | 0 | 1;

/**
 * The ordering methods an {@link OrdinalUnion} adds on top of the
 * {@link LiteralUnion} descriptor. Order is **ascending in declaration order**:
 * the first member is the lowest, the last is the highest.
 *
 * Every method is a closure over the descriptor's own state (no `this`), so
 * they can be passed around unbound — `ranks.sort(Rank.compare)` works.
 *
 * The derivations (`range`, `atLeast`, `atMost`, `pick`, `omit`) are
 * **memoized per descriptor**: asking for the same members again returns the
 * same descriptor, whichever method produced it, so
 * `Rank.atLeast('vp') === Rank.range('vp', 'c_suite')` holds and a derivation
 * is cheap in hot code and stable as a React dependency or `Map` key. A
 * derivation that keeps every member returns the descriptor itself. Identity
 * is per parent: `Rank.atLeast('manager').atMost('vp')` and
 * `Rank.range('manager', 'vp')` have the same members but are distinct
 * descriptors.
 */
export type OrdinalUnionMethods<
  T extends NonEmptyReadonlyArray<LiteralUnionMemberBase>,
> = {
  /**
   * The zero-based position of `value` in the declared order.
   *
   * The rank is a **derived, in-memory** value. Persist and transmit the
   * member string, never the rank: inserting a member mid-list (a new
   * `principal` between `senior_manager` and `director`) shifts every rank
   * after it, silently corrupting stored integers.
   *
   * @throws {PanicException} If `value` is not a member (only reachable when
   *   the type system is bypassed).
   */
  rank(value: T[number]): number;

  /**
   * Compare two members by their declared position: `-1` if `a` is lower, `0`
   * if equal, `1` if higher. Shaped as an `Array.prototype.sort` comparator.
   *
   * @example Sort ascending, or descending
   *
   * ```ts
   * ranks.sort(Rank.compare);
   * ranks.sort((a, b) => Rank.compare(b, a));
   * ```
   */
  compare(a: T[number], b: T[number]): OrdinalComparison;

  /** `true` if `a` is strictly lower than `b`. */
  lt(a: T[number], b: T[number]): boolean;
  /** `true` if `a` is lower than or equal to `b`. */
  lte(a: T[number], b: T[number]): boolean;
  /** `true` if `a` is strictly higher than `b`. */
  gt(a: T[number], b: T[number]): boolean;
  /** `true` if `a` is higher than or equal to `b`. */
  gte(a: T[number], b: T[number]): boolean;

  /** The lowest of the given members. */
  min<const V extends T[number]>(...values: NonEmptyReadonlyArray<V>): V;
  /** The highest of the given members. */
  max<const V extends T[number]>(...values: NonEmptyReadonlyArray<V>): V;

  /**
   * Bound `value` to the inclusive range `[lo, hi]`.
   *
   * @throws {PanicException} If `lo` is higher than `hi`.
   */
  clamp(value: T[number], lo: T[number], hi: T[number]): T[number];

  /** The member directly above `value`, or `undefined` if it is the highest. */
  next(value: T[number]): T[number] | undefined;
  /** The member directly below `value`, or `undefined` if it is the lowest. */
  prev(value: T[number]): T[number] | undefined;

  /**
   * Derive an ordinal over the inclusive slice `[from, to]`. The result's
   * member type is exactly that slice.
   *
   * With literal bounds the type is exact. With union-typed bounds (variables)
   * it is the widest slice the call can return — from the lowest possible
   * `from` through the highest possible `to`. An inverted literal range is
   * typed `never`, matching the runtime panic.
   *
   * @throws {PanicException} If `from` is higher than `to`.
   *
   * @example
   *
   * ```ts
   * const Management = Rank.range('manager', 'director');
   * // OrdinalUnionDescriptor<readonly ['manager', 'senior_manager', 'director']>
   * ```
   */
  range<const From extends T[number], const To extends T[number]>(
    from: From,
    to: To,
  ): OrdinalUnionDescriptor<AsNonEmpty<SliceRange<T, From, To>>>;

  /**
   * Derive an ordinal over `value` and every member above it.
   *
   * With a union-typed `value` (a variable), the type starts at the union's
   * lowest member — the widest result the call can return.
   *
   * @example Gate on "director and above"
   *
   * ```ts
   * const Executive = Rank.atLeast('director');
   * if (Executive.isOfType(user.rank)) {
   *   // user.rank: 'director' | 'vp' | 'c_suite'
   * }
   * ```
   */
  atLeast<const V extends T[number]>(
    value: V,
  ): OrdinalUnionDescriptor<AsNonEmpty<SliceFrom<T, V>>>;

  /**
   * Derive an ordinal over `value` and every member below it.
   *
   * With a union-typed `value` (a variable), the type runs through the
   * union's highest member — the widest result the call can return.
   */
  atMost<const V extends T[number]>(
    value: V,
  ): OrdinalUnionDescriptor<AsNonEmpty<SliceThrough<T, V>>>;

  /**
   * Derive an ordinal over a subset of members.
   *
   * **Unlike {@link LiteralUnion}'s `pick`, this never reorders.** The picked
   * members keep *this* ordinal's order regardless of the order of `keys`,
   * because order is the meaning of an ordinal: a pick that reordered would
   * yield a union where `vp < manager`, contradicting its parent.
   *
   * @throws {PanicException} If `keys` contains a non-member (only reachable
   *   when the type system is bypassed).
   */
  pick<const K extends T[number]>(
    keys: NonEmptyReadonlyArray<K>,
  ): OrdinalUnionDescriptor<AsNonEmpty<FilterTuple<T, K>>>;

  /**
   * Derive an ordinal over every member except `keys`, keeping this ordinal's
   * order.
   *
   * @throws {PanicException} If removing `keys` would leave no members.
   */
  omit<const K extends T[number]>(
    keys: NonEmptyReadonlyArray<K>,
  ): OrdinalUnionDescriptor<AsNonEmpty<FilterTuple<T, Exclude<T[number], K>>>>;

  /** The string tag for the ordinal union. */
  [Symbol.toStringTag]: 'OrdinalUnion';
};

/**
 * The descriptor returned by {@link OrdinalUnion}.
 *
 * Parameterized by the **tuple** of members rather than their union (as
 * {@link LiteralUnionDescriptor} is), because the order is the point: carrying
 * the tuple lets `range`, `atLeast`, `atMost`, `pick` and `omit` compute their
 * exact member types at compile time.
 *
 * It is a {@link LiteralUnionLike} — the common supertype both descriptors
 * satisfy — so every helper written against that type (`assertLiteralUnionMember`,
 * `Dictionary.fromLiteralUnion`, `InferLiteralUnion`, …) accepts an ordinal
 * unchanged. On top of it, the ordinal adds its comparison and slicing methods
 * and its own `pick`/`omit`, which preserve this ordinal's order and return
 * ordinals rather than plain literal unions.
 */
export type OrdinalUnionDescriptor<
  T extends NonEmptyReadonlyArray<LiteralUnionMemberBase>,
> = LiteralUnionLike<T[number]> & OrdinalUnionMethods<T>;

/** Extract the member union from an {@link OrdinalUnionDescriptor}. */
export type InferOrdinalUnion<T> =
  T extends OrdinalUnionDescriptor<infer U> ? U[number] : never;

// ─────────────────────────────────────────────────────────────────────────────
// MARK: Factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Descriptor keys an ordinal adds beyond {@link LiteralUnion}'s own reserved
 * keys (which `LiteralUnion` checks itself when it is delegated to).
 */
const ordinalReservedKeys = new Set([
  'rank',
  'compare',
  'lt',
  'lte',
  'gt',
  'gte',
  'min',
  'max',
  'clamp',
  'next',
  'prev',
  'range',
  'atLeast',
  'atMost',
]);

/**
 * Create an **ordinal union**: a closed set of string members whose
 * declaration order is meaningful, ascending from lowest to highest.
 *
 * Use it when members are nominal identities that also rank against each other
 * — career levels, severities, priorities, subscription tiers. When the order is
 * incidental (countries, payment methods), use {@link LiteralUnion} instead.
 *
 * The descriptor has everything a {@link LiteralUnion} has (`isOfType`,
 * `parse`, `match`, member access, …) plus comparison and slicing, derived from
 * each member's position. Serialization is unchanged: values are the member
 * strings, never their ranks.
 *
 * Members must be **distinct** — a member cannot hold two ranks. Unlike
 * {@link LiteralUnion}, which silently deduplicates, a repeat is rejected by
 * the compiler at the duplicate's own position:
 *
 * ```ts
 * OrdinalUnion(['low', 'high', 'low']);
 * //                           ~~~~~
 * // Type '"low"' is not assignable to type 'duplicate member "low": each
 * // member of an ordinal union holds exactly one rank'.
 * ```
 *
 * A member named after a descriptor method (`next`, `size`, `pick`, …) would
 * shadow it, so it is rejected the same way:
 *
 * ```ts
 * OrdinalUnion(['low', 'next']);
 * //                   ~~~~~~
 * // Type '"next"' is not assignable to type 'reserved member "next": the
 * // name is taken by a method of the ordinal union descriptor'.
 * ```
 *
 * @throws {PanicException} If `literals` is empty, contains a duplicate, or
 *   contains a reserved descriptor key (the last two only reachable when the
 *   members are not literal types — a widened array, or a JavaScript caller).
 *
 * @example Career ranks
 *
 * ```ts
 * const Rank = OrdinalUnion([
 *   'team_lead',
 *   'manager',
 *   'senior_manager',
 *   'director',
 *   'vp',
 *   'c_suite',
 * ]);
 * type Rank = InferOrdinalUnion<typeof Rank>;
 *
 * Rank.gte('director', Rank.manager); // true
 * Rank.max('manager', 'vp', 'team_lead'); // 'vp'
 * Rank.next('vp'); // 'c_suite'
 * Rank.atLeast('director').toArray(); // ['director', 'vp', 'c_suite']
 * ```
 */
export function OrdinalUnion<
  const T extends NonEmptyReadonlyArray<LiteralUnionMemberBase>,
>(literals: CheckedMembers<T>): OrdinalUnionDescriptor<Members<T>> {
  // The parameter is typed through `CheckedMembers`, a conditional the compiler
  // cannot resolve while `T` is still generic, so it cannot see that the
  // argument is a non-empty array of members. The cast restores what the
  // constraint on `T` already guarantees; the runtime checks below and inside
  // `LiteralUnion` are unchanged.
  const literalsIn = literals as unknown as Members<T>;

  // Delegating first reuses LiteralUnion's empty-input and reserved-key checks.
  // The descriptor name makes those panics, and the ones raised later by
  // inherited methods (`ofUnsafe`, `match`, …), read `OrdinalUnion`.
  const base = createLiteralUnion(literalsIn, 'OrdinalUnion');
  const members = base.toArray() as unknown as Members<T>;

  // Walks the caller's input, not `members`: `LiteralUnion` deduplicates, so a
  // repeat would already be gone from `members` and pass unnoticed. Once the
  // walk finds none, the two agree position for position, so the index is the
  // member's rank in `members` as well.
  const ranks = new Map<LiteralUnionMemberBase, number>();
  for (const [index, lit] of literalsIn.entries()) {
    if (ranks.has(lit)) {
      throw new PanicException(
        `OrdinalUnion: duplicate member ${JSON.stringify(lit)}; each member ` +
          `must hold exactly one rank`,
      );
    }
    if (ordinalReservedKeys.has(lit)) {
      throw new PanicException(
        `OrdinalUnion: member name "${lit}" collides with a reserved ` +
          `descriptor key`,
      );
    }
    ranks.set(lit, index);
  }

  type M = Members<T>[number];

  function rank(value: M): number {
    const index = ranks.get(value);
    if (index === undefined) {
      throw new PanicException(
        `OrdinalUnion.rank: ${JSON.stringify(value)} is not a member of the ` +
          `union`,
      );
    }
    return index;
  }

  function compare(a: M, b: M): OrdinalComparison {
    return Math.sign(rank(a) - rank(b)) as OrdinalComparison;
  }

  function lt(a: M, b: M): boolean {
    return rank(a) < rank(b);
  }

  function lte(a: M, b: M): boolean {
    return rank(a) <= rank(b);
  }

  function gt(a: M, b: M): boolean {
    return rank(a) > rank(b);
  }

  function gte(a: M, b: M): boolean {
    return rank(a) >= rank(b);
  }

  function min<const V extends M>(...values: NonEmptyReadonlyArray<V>): V {
    return values.reduce((acc, value) => (lt(value, acc) ? value : acc));
  }

  function max<const V extends M>(...values: NonEmptyReadonlyArray<V>): V {
    return values.reduce((acc, value) => (gt(value, acc) ? value : acc));
  }

  function clamp(value: M, lo: M, hi: M): M {
    if (gt(lo, hi)) {
      throw new PanicException(
        `OrdinalUnion.clamp: lower bound ${JSON.stringify(lo)} is above ` +
          `upper bound ${JSON.stringify(hi)}`,
      );
    }
    if (lt(value, lo)) return lo;
    if (gt(value, hi)) return hi;
    return value;
  }

  function next(value: M): M | undefined {
    return members[rank(value) + 1];
  }

  function prev(value: M): M | undefined {
    const index = rank(value);
    return index === 0 ? undefined : members[index - 1];
  }

  // Every derivation funnels through here: slices and filters of `members` are
  // already in ascending order, so re-running the factory yields a sub-ordinal
  // that agrees with this one on every comparison. `R` is the tuple the
  // calling method's signature computes (inferred from its return type); the
  // compiler cannot follow a runtime slice to that tuple, so this cast is the
  // one unchecked step in the derivations.
  //
  // Derivations are memoized: a subset is built once and handed back on every
  // later request for the same members, by whichever method asks — so
  // `Rank.atLeast(x)` in per-request code costs a lookup, not a descriptor
  // build, and is stable as a React dependency or `Map` key. The key is the
  // subset's ranks, which identify it exactly (it is always in ascending
  // order). The cache lives as long as this descriptor and holds at most one
  // entry per distinct subset actually requested. The full member list is
  // this descriptor itself.
  const derived = new Map<string, OrdinalUnionDescriptor<Members<T>>>();

  function derive<R extends NonEmptyReadonlyArray<LiteralUnionMemberBase>>(
    subset: readonly LiteralUnionMemberBase[],
    method: string,
  ): OrdinalUnionDescriptor<R> {
    if (subset.length === 0) {
      throw new PanicException(
        `OrdinalUnion.${method}: the resulting union would be empty`,
      );
    }
    if (subset.length === members.length) {
      return self as unknown as OrdinalUnionDescriptor<R>;
    }

    const key = subset.map((lit) => ranks.get(lit)).join(',');
    let result = derived.get(key);
    if (result === undefined) {
      result = OrdinalUnion(
        subset as NonEmptyReadonlyArray<LiteralUnionMemberBase>,
      ) as unknown as OrdinalUnionDescriptor<Members<T>>;
      derived.set(key, result);
    }
    return result as unknown as OrdinalUnionDescriptor<R>;
  }

  function range<const From extends M, const To extends M>(
    from: From,
    to: To,
  ): OrdinalUnionDescriptor<AsNonEmpty<SliceRange<Members<T>, From, To>>> {
    if (gt(from, to)) {
      throw new PanicException(
        `OrdinalUnion.range: ${JSON.stringify(from)} is above ` +
          `${JSON.stringify(to)}`,
      );
    }
    return derive(members.slice(rank(from), rank(to) + 1), 'range');
  }

  function atLeast<const V extends M>(
    value: V,
  ): OrdinalUnionDescriptor<AsNonEmpty<SliceFrom<Members<T>, V>>> {
    return derive(members.slice(rank(value)), 'atLeast');
  }

  function atMost<const V extends M>(
    value: V,
  ): OrdinalUnionDescriptor<AsNonEmpty<SliceThrough<Members<T>, V>>> {
    return derive(members.slice(0, rank(value) + 1), 'atMost');
  }

  function pick<const K extends M>(
    keys: NonEmptyReadonlyArray<K>,
  ): OrdinalUnionDescriptor<AsNonEmpty<FilterTuple<Members<T>, K>>> {
    for (const key of keys) rank(key); // panics on a non-member
    const picked = new Set<LiteralUnionMemberBase>(keys);
    return derive(
      members.filter((lit) => picked.has(lit)),
      'pick',
    );
  }

  function omit<const K extends M>(
    keys: NonEmptyReadonlyArray<K>,
  ): OrdinalUnionDescriptor<
    AsNonEmpty<FilterTuple<Members<T>, Exclude<M, K>>>
  > {
    const removed = new Set<LiteralUnionMemberBase>(keys);
    return derive(
      members.filter((lit) => !removed.has(lit)),
      'omit',
    );
  }

  // `satisfies` checks every method against its declared signature (a
  // misspelled or mistyped method is a compile error), while keeping the
  // literal type of the string tag.
  const methods = {
    [Symbol.toStringTag]: 'OrdinalUnion',
    rank,
    compare,
    lt,
    lte,
    gt,
    gte,
    min,
    max,
    clamp,
    next,
    prev,
    range,
    atLeast,
    atMost,
    pick,
    omit,
  } satisfies OrdinalUnionMethods<Members<T>>;

  // `Object.assign` copies `base`'s own enumerable members and methods, then
  // the ordinal methods overwrite `pick`, `omit` and the string tag. The null-
  // prototype target is cast to `object` so the result is typed from `base`
  // and `methods` rather than collapsing to `any`.
  //
  // `base.size` is non-enumerable, so it is *not* copied — it is redefined
  // below on the same terms, keeping the ordinal's cardinality out of
  // `JSON.stringify(descriptor)` just as the literal union keeps it out.
  const descriptor = Object.assign(
    Object.create(null) as object,
    base,
    methods,
  );

  Object.defineProperty(descriptor, 'size', {
    value: members.length,
    enumerable: false,
    writable: false,
    configurable: false,
  });

  // Frozen for the same reason as a `LiteralUnion` descriptor: the member set
  // and its order are the union's identity, so `Rank.vp = 'hacked'` throws in
  // strict mode rather than silently rewriting a member. Named so `derive` can
  // return it for a derivation that keeps every member; it only reads `self`
  // when a method runs, after this line.
  const self = Object.freeze(descriptor) as unknown as OrdinalUnionDescriptor<
    Members<T>
  >;
  return self;
}
