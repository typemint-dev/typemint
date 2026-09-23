import { PanicException, type NonEmptyReadonlyArray } from '@typemint/core';
import {
  createLiteralUnion,
  type LiteralUnionLike,
  type LiteralUnionMemberBase,
  type LiteralUnionMethods,
} from './literal-union.js';

// ─────────────────────────────────────────────────────────────────────────────
// MARK: Tuple helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `true` if `T` has no fixed length — a widened array such as
 * `readonly [string, ...string[]]`, which is what the factory sees when
 * `derive` re-invokes it on a runtime slice, or when a JavaScript caller passes
 * an array the compiler never read as literals.
 *
 * The slice helpers below walk `T` position by position, so they are only exact
 * while there are positions to walk. On a widened `T` they stop and carry the
 * remainder through untouched, which types the derivation as the parent's whole
 * member tuple: the widest result the call can return, and never a narrower one
 * than the runtime produces. Without it the walk consumes the single leading
 * element and closes on it, typing every derivation of a widened union as the
 * one-element tuple `[string]`. {@link CheckedTuple} carries the remainder
 * through for the same reason.
 *
 * The consequence for a partially widened tuple (a literal prefix and a rest
 * element) is that the walk is exact up to the rest element and widens from
 * there; only a fixed-length tuple derives an exact slice.
 */
type IsWidened<T extends readonly LiteralUnionMemberBase[]> =
  number extends T['length'] ? true : false;

/**
 * Keep the members of `T` that extend `K`, preserving `T`'s order. Written
 * tail-recursively (accumulator) so long rank lists stay within the compiler's
 * recursion budget.
 *
 * The `H extends K` test must branch *around* the recursive call, not sit
 * inside its accumulator argument: a conditional in argument position defeats
 * tail-call elimination, and the pick/omit types then collapse to `never`
 * (TS2589) at around 100 members.
 *
 * A widened `T` yields the members walked so far plus the rest of `T`; see
 * {@link IsWidened}.
 */
type FilterTuple<
  T extends readonly LiteralUnionMemberBase[],
  K,
  Acc extends LiteralUnionMemberBase[] = [],
> =
  IsWidened<T> extends true
    ? readonly [...Acc, ...T]
    : T extends readonly [
          infer H extends LiteralUnionMemberBase,
          ...infer R extends LiteralUnionMemberBase[],
        ]
      ? H extends K
        ? FilterTuple<R, K, [...Acc, H]>
        : FilterTuple<R, K, Acc>
      : readonly [...Acc];

/**
 * Drop the members of `T` before `From`; `From` itself is kept.
 *
 * When `From` is a union (the argument is a variable, not a literal), the
 * slice starts at its **lowest** member — the widest suffix any runtime value
 * of `From` can produce, which is the union of all of them.
 *
 * A widened `T` is returned as it is — every member is a candidate for the
 * slice; see {@link IsWidened}.
 */
type SliceFrom<T extends readonly LiteralUnionMemberBase[], From> =
  IsWidened<T> extends true
    ? readonly [...T]
    : T extends readonly [
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
 *
 * The {@link IsWidened} test runs *before* the empty-`To` one, not after it: on
 * a widened `T` the bound is `string`, which the first member removes from `To`
 * entirely, so the walk would stop one position in and report that position as
 * the whole slice rather than reaching the rest element.
 */
type SliceThrough<
  T extends readonly LiteralUnionMemberBase[],
  To,
  Acc extends LiteralUnionMemberBase[] = [],
> =
  IsWidened<T> extends true
    ? readonly [...Acc, ...T]
    : [To] extends [never]
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
 * `true` if `S` is a single string literal type; `false` for `string` itself
 * and for a pattern type such as `` `x-${string}` ``.
 *
 * `string extends S` alone does not answer this: a pattern type is narrower
 * than `string`, so it passes that test while still standing for infinitely
 * many values. Mapping over the key instead separates the two — `Record<S, 1>`
 * is a required property for a literal, which the empty object type does not
 * satisfy, and an index signature for anything wider, which it does.
 */
type IsStringLiteral<S extends LiteralUnionMemberBase> =
  {} extends Record<S, 1> ? false : true;

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
 * runs before the `extends` tests below because `H` is an `infer` type
 * parameter, so those conditionals distribute over a union `H` — the walk
 * would fork into one tuple per branch, and the error would read as a mismatch
 * against that union of tuples. It is not added to `Seen`: which member it stands for is unknown,
 * so a later literal cannot be called its duplicate.
 *
 * `Seen` collects the members walked so far. It is kept separate from the
 * output accumulator `Acc` so a non-literal member never lands in the set that
 * later members are tested against — otherwise every literal after it would
 * match it and be reported as a duplicate. A member is non-literal when it is
 * `string` itself or a pattern type such as `` `x-${string}` ``: both stand for
 * a single runtime value whose identity is unknown, so nothing can be decided
 * about it and it is let through untouched. {@link IsStringLiteral} covers both
 * — testing only `string extends H` would let a pattern type into `Seen` and
 * report every later literal matching the pattern as its duplicate.
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
  ? IsStringLiteral<H> extends false
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
 * Every member is declared as a **property holding a function**, never with
 * method shorthand: TypeScript checks method parameters bivariantly even under
 * `strictFunctionTypes`, so `rank(value: T[number]): number` would let a
 * derived ordinal stand in for its parent wherever a partial shape is expected
 * (`Pick<OrdinalUnionMethods<Rank>, 'gte'>`, a hand-written `Comparator<Rank>`)
 * — and the narrower descriptor then panics on a member it does not hold.
 * Property syntax makes the parameters contravariant, so the compiler rejects
 * the substitution.
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
 *
 * `next`, `prev` and `clamp` are typed with the **whole member union**, not
 * the exact member the call returns: `Rank.next('vp')` is `Rank | undefined`,
 * not `'c_suite' | undefined`. Naming the exact member means indexing the
 * member tuple at `rank(value) + 1` at the type level — a walk the compiler
 * repeats at every call site, paid by every consumer of the union, for a value
 * that is nearly always assigned back to something of the member type anyway.
 * This is a deliberate trade, not an oversight; a call site that needs the
 * literal can narrow it with a comparison or a derived ordinal's `isOfType`.
 * `min` and `max` narrow as far as the arguments they were given, never to the
 * one they pick, for the same reason.
 *
 * The derivations are the exception: there the member tuple *is* the result,
 * so the walk earns its cost and `range`, `atLeast`, `atMost`, `pick` and
 * `omit` all carry exact slices.
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
   * Ranks are also relative to **this** descriptor: a derived ordinal
   * renumbers its members from `0`, so a rank means nothing outside the
   * descriptor that produced it. Two ranks are only comparable when they come
   * from the same descriptor — order members with {@link compare} (or
   * `lt`/`gte`), which take member strings and cannot be mixed up this way.
   *
   * ```ts
   * Rank.rank('director'); // 3
   * Rank.atLeast('director').rank('director'); // 0 — same member, new scale
   * ```
   *
   * @throws {PanicException} If `value` is not a member (only reachable when
   *   the type system is bypassed).
   */
  rank: (value: T[number]) => number;

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
  compare: (a: T[number], b: T[number]) => OrdinalComparison;

  /** `true` if `a` is strictly lower than `b`. */
  lt: (a: T[number], b: T[number]) => boolean;
  /** `true` if `a` is lower than or equal to `b`. */
  lte: (a: T[number], b: T[number]) => boolean;
  /** `true` if `a` is strictly higher than `b`. */
  gt: (a: T[number], b: T[number]) => boolean;
  /** `true` if `a` is higher than or equal to `b`. */
  gte: (a: T[number], b: T[number]) => boolean;

  /**
   * The lowest of the given members.
   *
   * Ties keep the **earliest** argument: the scan replaces its candidate only
   * on a strictly lower member, never on an equal one. Nothing observable
   * hangs on that today — equal rank means the identical member string, so
   * both candidates are the same value — but the rule is fixed, so a caller
   * reasoning about the scan (or a later implementation) cannot quietly flip
   * it.
   */
  min: <const V extends T[number]>(...values: NonEmptyReadonlyArray<V>) => V;
  /**
   * The highest of the given members. Ties keep the earliest argument, as in
   * {@link min}.
   */
  max: <const V extends T[number]>(...values: NonEmptyReadonlyArray<V>) => V;

  /**
   * Bound `value` to the inclusive range `[lo, hi]`.
   *
   * Typed as the member union rather than as `value | lo | hi`; see the note
   * on stepping and bounding types above.
   *
   * @throws {PanicException} If `lo` is higher than `hi`.
   */
  clamp: (value: T[number], lo: T[number], hi: T[number]) => T[number];

  /**
   * The member directly above `value`, or `undefined` if it is the highest.
   *
   * Typed as the member union, not as the exact successor — `Rank.next('vp')`
   * is `Rank | undefined`, not `'c_suite' | undefined`; see the note on
   * stepping and bounding types above.
   */
  next: (value: T[number]) => T[number] | undefined;

  /**
   * The member directly below `value`, or `undefined` if it is the lowest.
   *
   * Typed as the member union, not as the exact predecessor; see {@link next}.
   */
  prev: (value: T[number]) => T[number] | undefined;

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
  range: <const From extends T[number], const To extends T[number]>(
    from: From,
    to: To,
  ) => OrdinalUnionDescriptor<AsNonEmpty<SliceRange<T, From, To>>>;

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
  atLeast: <const V extends T[number]>(
    value: V,
  ) => OrdinalUnionDescriptor<AsNonEmpty<SliceFrom<T, V>>>;

  /**
   * Derive an ordinal over `value` and every member below it.
   *
   * With a union-typed `value` (a variable), the type runs through the
   * union's highest member — the widest result the call can return.
   */
  atMost: <const V extends T[number]>(
    value: V,
  ) => OrdinalUnionDescriptor<AsNonEmpty<SliceThrough<T, V>>>;

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
  pick: <const K extends T[number]>(
    keys: NonEmptyReadonlyArray<K>,
  ) => OrdinalUnionDescriptor<AsNonEmpty<FilterTuple<T, K>>>;

  /**
   * Derive an ordinal over every member except `keys`, keeping this ordinal's
   * order.
   *
   * This is a **set difference**, as {@link LiteralUnion}'s `omit` is: a key
   * that is not a member removes nothing and is otherwise ignored, so the only
   * failure is an empty result. {@link pick}, which selects rather than
   * subtracts, panics on a non-member instead — there the key names a member
   * the result was supposed to contain. Neither case is reachable while the
   * type system is honoured; `keys` is constrained to members of this ordinal.
   *
   * @throws {PanicException} If removing `keys` would leave no members.
   */
  omit: <const K extends T[number]>(
    keys: NonEmptyReadonlyArray<K>,
  ) => OrdinalUnionDescriptor<
    AsNonEmpty<FilterTuple<T, Exclude<T[number], K>>>
  >;

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

/**
 * Extract the member union from an {@link OrdinalUnionDescriptor}.
 *
 * Matched against {@link OrdinalUnionMethods} rather than the whole
 * {@link OrdinalUnionDescriptor}: the methods are the half that carries the
 * member tuple, and the {@link LiteralUnionLike} half only restates it as a
 * union. Inferring through the intersection costs the compiler that second
 * half at every use and ties this alias to how `LiteralUnionLike` happens to
 * be built today. A plain literal union still yields `never` — it has none of
 * these methods.
 */
export type InferOrdinalUnion<T> =
  T extends OrdinalUnionMethods<infer U> ? U[number] : never;

// ─────────────────────────────────────────────────────────────────────────────
// MARK: Factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The descriptor keys a member cannot take, checked at runtime for the inputs
 * {@link ReservedKey} cannot see: a widened array, or a JavaScript caller.
 * Handed to the `LiteralUnion` factory as its `reserved` option, which checks
 * these names together with its own in a single pass — so the overlap here
 * (`pick`, `omit`) is redundant but harmless.
 *
 * Spelled as an object literal checked against the method surface rather than
 * as a free-standing list, so the two cannot drift: `satisfies` reports a
 * missing key, and — the value being a literal — a stray one as well. A method
 * added to {@link OrdinalUnionMethods} is a compile error here until it is
 * listed, which is what {@link ReservedKey} already gives the type level.
 */
const ordinalReservedKeys = new Set(
  Object.keys({
    rank: 1,
    compare: 1,
    lt: 1,
    lte: 1,
    gt: 1,
    gte: 1,
    min: 1,
    max: 1,
    clamp: 1,
    next: 1,
    prev: 1,
    range: 1,
    atLeast: 1,
    atMost: 1,
    pick: 1,
    omit: 1,
  } satisfies Record<
    Exclude<
      keyof OrdinalUnionMethods<NonEmptyReadonlyArray<LiteralUnionMemberBase>>,
      symbol
    >,
    1
  >),
);

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

  type M = Members<T>[number];

  // The ordinal is not composed from a finished `LiteralUnion` — it *is* one,
  // extended in place through the factory's hook. `LiteralUnion` runs the
  // empty-input and reserved-key checks (the ordinal's own reserved names ride
  // along in `reserved`, so there is one check over one member list), installs
  // the members and the inherited methods, calls `extend` for the ordering
  // half, defines `size` and freezes the result. Nothing is copied, so nothing
  // can be lost in the copying.
  //
  // The descriptor name makes the checks' panics, and the ones raised later by
  // inherited methods (`ofUnsafe`, `match`, …), read `OrdinalUnion`.
  //
  // The cast on the way out is the one composing needed too: the hook's return
  // type is opaque to `createLiteralUnion`, which goes on reporting the
  // literal union half it builds.
  return createLiteralUnion(literalsIn, 'OrdinalUnion', {
    reserved: ordinalReservedKeys,

    extend: ({ members, self }) => {
      // Walks the caller's input, not `members`: `LiteralUnion` deduplicates,
      // so a repeat would already be gone from `members` and pass unnoticed.
      // Once the walk finds none, the two agree position for position, so the
      // index is the member's rank in `members` as well — and `size`, which
      // counts `members`, is the ordinal's cardinality too.
      const ranks = new Map<LiteralUnionMemberBase, number>();
      for (const [index, lit] of literalsIn.entries()) {
        if (ranks.has(lit)) {
          throw new PanicException(
            `OrdinalUnion: duplicate member ${JSON.stringify(lit)}; each ` +
              `member must hold exactly one rank`,
          );
        }
        ranks.set(lit, index);
      }

      function rank(value: M): number {
        const index = ranks.get(value);
        if (index === undefined) {
          throw new PanicException(
            `OrdinalUnion.rank: ${JSON.stringify(value)} is not a member of ` +
              `the union`,
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

      // Both scans compare strictly, so an equal member leaves the accumulator
      // alone and the earliest argument wins a tie — the rule the method docs
      // state. `reduce` without a seed starts from the first argument, which
      // the non-empty parameter type guarantees exists.
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

      // Every derivation funnels through here: slices and filters of `members`
      // are already in ascending order, so re-running the factory yields a
      // sub-ordinal that agrees with this one on every comparison. `R` is the
      // tuple the calling method's signature computes (inferred from its
      // return type); the compiler cannot follow a runtime slice to that
      // tuple, so this cast is the one unchecked step in the derivations.
      //
      // Derivations are memoized: a subset is built once and handed back on
      // every later request for the same members, by whichever method asks —
      // so `Rank.atLeast(x)` in per-request code costs a lookup, not a
      // descriptor build, and is stable as a React dependency or `Map` key.
      // The key is the subset's ranks, which identify it exactly (it is always
      // in ascending order). The cache lives as long as this descriptor and
      // holds at most one entry per distinct subset actually requested. The
      // full member list is this descriptor itself.
      //
      // Its value type is `unknown`: every entry is a descriptor over a
      // *different* member tuple, so no parameterization describes them all —
      // not even the widened `OrdinalUnionDescriptor<NonEmptyReadonlyArray<…>>`,
      // which the contravariant method parameters (see
      // {@link OrdinalUnionMethods}) reject each entry against. Naming any of
      // them would be a claim about the entries that is false for all of them;
      // the one honest assertion is the `R` cast on the way out, which is the
      // documented unchecked step above.
      const derived = new Map<string, unknown>();

      function derive<R extends NonEmptyReadonlyArray<LiteralUnionMemberBase>>(
        subset: readonly LiteralUnionMemberBase[],
        method: string,
      ): OrdinalUnionDescriptor<R> {
        if (subset.length === 0) {
          throw new PanicException(
            `OrdinalUnion.${method}: the resulting union would be empty`,
          );
        }
        // `self` is the descriptor this hook is extending — captured here, and
        // complete by the time any derivation runs.
        if (subset.length === members.length) {
          return self as unknown as OrdinalUnionDescriptor<R>;
        }

        const key = subset.map((lit) => ranks.get(lit)).join(',');
        let result = derived.get(key);
        if (result === undefined) {
          result = OrdinalUnion(
            subset as NonEmptyReadonlyArray<LiteralUnionMemberBase>,
          );
          derived.set(key, result);
        }
        return result as OrdinalUnionDescriptor<R>;
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
      // literal type of the string tag. `pick`, `omit` and the tag are
      // declared by both surfaces, so the pair the descriptor ends up holding
      // is checked on the way in here as well as on the way out.
      return {
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
    },
  }) as unknown as OrdinalUnionDescriptor<Members<T>>;
}
