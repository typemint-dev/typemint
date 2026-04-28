import { type FlowOperator, type RecordFlowOperator } from './flow.js';
import { PanicException } from './panic-exception.js';

/**
 * Internal alias used only inside this module to keep the runtime
 * implementation loosely typed without leaking `any` into the public API.
 *
 * Mirrors the same alias in `flow.ts`; we deliberately re-declare it
 * here so that `flow.ts` does not have to widen its public surface to
 * support sibling combinator modules.
 */
type AnyFlowOperator = FlowOperator<any, any>;

/**
 * A record whose values are {@link FlowOperator}s, used as the input
 * shape for {@link struct}.
 */
export type FlowOperatorRecord = Readonly<Record<string, AnyFlowOperator>>;

/**
 * Given a record of operators, the input record type the resulting
 * {@link struct} operator expects: each key maps to the corresponding
 * operator's input.
 */
export type StructInput<TOps extends FlowOperatorRecord> = {
  [K in keyof TOps]: TOps[K] extends FlowOperator<infer TIn, any> ? TIn : never;
};

/**
 * Given a record of operators, the output record type the resulting
 * {@link struct} operator produces: each key maps to the corresponding
 * operator's output.
 */
export type StructOutput<TOps extends FlowOperatorRecord> = {
  [K in keyof TOps]: TOps[K] extends FlowOperator<any, infer TOut>
    ? TOut
    : never;
};

/**
 * Lift a record of unary operators into a single operator that works on
 * records key-wise. Each field of the input is passed through the
 * operator stored under the same key, and the results are reassembled
 * into a record of the same shape.
 *
 * This is the record-shaped sibling of {@link FlowOperator}/`flow`:
 * where `flow` composes operators **sequentially** along a single
 * value, `struct` applies operators **in parallel** across the fields
 * of a record. It is the "applicative struct" / `sequenceS` pattern
 * from functional programming, expressed for plain TypeScript records.
 *
 * The returned operator is itself a {@link FlowOperator} and can be
 * used as a step inside `flow`.
 *
 * ### Runtime guarantees
 *
 * - At least one key is required. Calling `struct({})` raises a
 *   {@link PanicException} because an empty struct has no inferrable
 *   input or output and almost always indicates a bug.
 * - Every key declared on `ops` must be present on the input. If a
 *   declared key is missing, `struct` raises a {@link PanicException}.
 *   The check uses `Object.hasOwn`, so a key is "present" if and only
 *   if it is an own enumerable property — explicitly setting a field
 *   to `undefined` (e.g. `{ name: undefined }`) counts as present and
 *   is forwarded to the operator. Use {@link struct.partial} if you
 *   want missing keys to be skipped instead of panicking.
 * - The output record is created with `Object.create(null)` and only
 *   the own enumerable keys of `ops` drive iteration, so the result
 *   has no prototype and contains exactly the fields named on the
 *   operator record. Keys present on the input but absent on `ops`
 *   are dropped.
 *
 * @example
 *
 * ```ts
 * const normalize = struct({
 *   name: (s: string) => s.trim(),
 *   age: (n: number) => Math.max(0, n),
 * });
 *
 * normalize({ name: '  Ada ', age: -3 });
 * // { name: 'Ada', age: 0 }
 * ```
 *
 * @example
 *
 * ```ts
 * // Composes with flow: build per-field pipelines, then plug the whole
 * // record-shaped step into a larger flow.
 * const pipeline = flow(
 *   struct({
 *     a: flow((a: string) => a.toUpperCase()),
 *     b: flow((b: string) => b.toLowerCase()),
 *     c: flow((c: number) => c * 2),
 *   }),
 *   (r) => `${r.a}/${r.b}/${r.c}`,
 * );
 * ```
 *
 * @throws {PanicException} If called with an empty record, or when the
 *   produced operator is invoked with an input that is missing a key
 *   declared on `ops`.
 */
export function struct<TOps extends FlowOperatorRecord>(
  ops: TOps,
): FlowOperator<StructInput<TOps>, StructOutput<TOps>> {
  const keys = Object.keys(ops);

  if (keys.length === 0) {
    // The empty record case is a BUG because it should be impossible
    // to call struct with no fields for typescript code that respects
    // the public type -- `TOps` would have no keys and the resulting
    // operator would have no inferrable input or output.
    throw new PanicException(
      'struct() requires at least one field to build a record-shaped operator.',
    );
  }

  return (input: StructInput<TOps>): StructOutput<TOps> => {
    const out = Object.create(null) as Record<string, unknown>;
    const source = input as Record<string, unknown>;
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]!;
      if (!Object.hasOwn(source, key)) {
        // Missing key is a BUG: `StructInput<TOps>` requires every
        // declared key to be present, so reaching this branch means
        // the input was constructed via a type-system bypass (`as
        // any`, untrusted JSON, etc.). Fail loudly at the boundary
        // rather than letting the operator throw a confusing
        // `TypeError` deeper in the stack.
        throw new PanicException(
          `struct() input is missing required key '${key}'.`,
        );
      }
      out[key] = (ops[key] as AnyFlowOperator)(source[key]);
    }
    return out as StructOutput<TOps>;
  };
}

/**
 * Lenient sibling of {@link struct}: build a record-shaped operator
 * where every field is **optional** on both input and output.
 *
 * Where {@link struct} panics on missing input keys, `struct.partial`
 * **skips** them: the operator under that key is not invoked and the
 * key is omitted from the output record. Keys that are present on the
 * input — including those explicitly set to `undefined` — drive their
 * operator as usual.
 *
 * Use `struct.partial` when modelling truly optional fields (e.g.
 * decoding wire payloads where a field may legitimately not exist),
 * and prefer plain {@link struct} otherwise so that contract
 * violations surface at the boundary.
 *
 * The returned operator is itself a {@link FlowOperator} and can be
 * used as a step inside `flow`.
 *
 * ### Runtime guarantees
 *
 * - At least one key is required. Calling `struct.partial({})` raises
 *   a {@link PanicException} for the same reason as {@link struct}.
 * - The output record is created with `Object.create(null)`, has no
 *   prototype, and contains only the keys for which the input had a
 *   matching own enumerable property at call time.
 *
 * @example
 *
 * ```ts
 * const update = struct.partial({
 *   name: (s: string) => s.trim(),
 *   age: (n: number) => Math.max(0, n),
 * });
 *
 * update({ name: '  Ada ' });        // { name: 'Ada' }
 * update({ age: -3 });               // { age: 0 }
 * update({ name: '  Ada ', age: 4 }); // { name: 'Ada', age: 4 }
 * update({});                         // {}
 * ```
 *
 * @throws {PanicException} If called with an empty record.
 */
function structPartial<TOps extends FlowOperatorRecord>(
  ops: TOps,
): FlowOperator<Partial<StructInput<TOps>>, Partial<StructOutput<TOps>>> {
  const keys = Object.keys(ops);

  if (keys.length === 0) {
    throw new PanicException(
      'struct.partial() requires at least one field to build a record-shaped operator.',
    );
  }

  return (input: Partial<StructInput<TOps>>): Partial<StructOutput<TOps>> => {
    const out = Object.create(null) as Record<string, unknown>;
    const source = input as Record<string, unknown>;
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]!;
      if (Object.hasOwn(source, key)) {
        out[key] = (ops[key] as AnyFlowOperator)(source[key]);
      }
    }
    return out as Partial<StructOutput<TOps>>;
  };
}

struct.partial = structPartial;

/**
 * Helper: turn a union of types into their intersection. Used to
 * combine the input/output types of every operator passed to
 * {@link struct.merge} into a single record type.
 *
 * `(U extends any ? (k: U) => void : never)` distributes over the
 * union, producing a union of contravariant function positions; TS
 * then resolves that to the intersection on the parameter side.
 */
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I,
) => void
  ? I
  : never;

/**
 * A non-empty tuple of {@link RecordFlowOperator}s, used as the
 * argument shape for {@link struct.merge}. The tuple constraint
 * enforces at least one operator at the type level.
 *
 * Internal: this list type is specific to merge-style APIs and is
 * not exported. Future combinators that need a similar shape
 * should declare their own list type on top of
 * {@link RecordFlowOperator}.
 */
type FlowOperatorList = readonly [RecordFlowOperator, ...RecordFlowOperator[]];

/**
 * Given a list of operators, the input record type the {@link struct.merge}
 * operator expects: the intersection of every contributor's input.
 * Each contributor only reads its own declared keys, so the
 * intersection captures the "union of declared keys" precisely.
 */
export type StructMergeInput<TOps extends FlowOperatorList> =
  UnionToIntersection<
    {
      [K in keyof TOps]: TOps[K] extends FlowOperator<infer TIn, any>
        ? TIn
        : never;
    }[number]
  >;

/**
 * Given a list of operators, the output record type the {@link struct.merge}
 * operator produces: the intersection of every contributor's
 * output. For disjoint key sets this collapses to a single record
 * with all keys; for overlapping keys with conflicting types the
 * intersection narrows (and may collapse to `never` for that key,
 * which serves as a compile-time hint that the merge is suspect).
 */
export type StructMergeOutput<TOps extends FlowOperatorList> =
  UnionToIntersection<
    {
      [K in keyof TOps]: TOps[K] extends FlowOperator<any, infer TOut>
        ? TOut
        : never;
    }[number]
  >;

/**
 * Merge multiple record-shaped operators into a single operator
 * that runs each one against the same input and spread-merges the
 * results into one record.
 *
 * This is the natural way to compose {@link struct} (strict) with
 * one or more {@link struct.partial} (lenient) operators when an
 * object has both required and optional fields — declare each
 * portion separately, then `struct.merge` them. Each contributor
 * only reads the keys it declares, so the strictness contract of
 * every contributor is preserved at the boundary.
 *
 * The returned operator is itself a {@link FlowOperator} and can
 * be plugged into a `flow` as a step.
 *
 * ### Runtime guarantees
 *
 * - At least one operator is required. The type-level constraint
 *   enforces this; calling through a type-system bypass with no
 *   operators raises a {@link PanicException}.
 * - Operators are applied **left-to-right**. If an earlier
 *   operator throws, later operators are not invoked.
 * - Overlapping output keys follow standard spread semantics:
 *   the **rightmost** operator wins.
 * - The output record is created with `Object.create(null)` and
 *   has no prototype, matching the convention of {@link struct}.
 *
 * @example
 *
 * ```ts
 * const required = struct({
 *   id: (n: number) => n,
 *   name: (s: string) => s.trim(),
 * });
 *
 * const optional = struct.partial({
 *   nickname: (s: string) => s.trim(),
 *   age: (n: number) => Math.max(0, n),
 * });
 *
 * const normalize = struct.merge(required, optional);
 *
 * normalize({ id: 1, name: '  Ada ' });
 * // { id: 1, name: 'Ada' }
 *
 * normalize({ id: 1, name: '  Ada ', nickname: '  Adita ', age: -3 });
 * // { id: 1, name: 'Ada', nickname: 'Adita', age: 0 }
 * ```
 *
 * @throws {PanicException} If called with no operators.
 */
function structMerge<TOps extends FlowOperatorList>(
  ...ops: TOps
): FlowOperator<StructMergeInput<TOps>, StructMergeOutput<TOps>> {
  if (ops.length === 0) {
    // The empty case is a BUG: the public type already requires
    // at least one operator, so reaching this branch means the
    // call was made via a type-system bypass.
    throw new PanicException('struct.merge() requires at least one operator.');
  }

  const length = ops.length;

  return (input: StructMergeInput<TOps>): StructMergeOutput<TOps> => {
    const out = Object.create(null) as Record<string, unknown>;
    for (let i = 0; i < length; i++) {
      Object.assign(out, (ops[i] as RecordFlowOperator)(input));
    }
    return out as StructMergeOutput<TOps>;
  };
}

struct.merge = structMerge;
