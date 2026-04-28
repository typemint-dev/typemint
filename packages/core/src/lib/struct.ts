import { type FlowOperator } from './flow.js';
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
 * At least one key is required. Calling `struct({})` raises a
 * {@link PanicException} because an empty struct has no inferrable
 * input or output and almost always indicates a bug.
 *
 * The output record is created with `Object.create(null)` and only
 * the own enumerable keys of `ops` drive iteration, so the result has
 * no prototype and contains exactly the fields named on the operator
 * record. Keys present on the input but absent on `ops` are dropped;
 * keys present on `ops` but absent on the input are passed through as
 * `undefined` to the corresponding operator.
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
 * @throws {PanicException} If called with an empty record.
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
      out[key] = (ops[key] as AnyFlowOperator)(source[key]);
    }
    return out as StructOutput<TOps>;
  };
}
