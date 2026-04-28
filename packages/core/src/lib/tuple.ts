import { type FlowOperator } from './flow.js';
import { PanicException } from './panic-exception.js';

/**
 * Internal alias used only inside this module to keep the runtime
 * implementation loosely typed without leaking `any` into the public API.
 *
 * Mirrors the same alias in `flow.ts` and `struct.ts`; we deliberately
 * re-declare it here so that `flow.ts` does not have to widen its
 * public surface to support sibling combinator modules.
 */
type AnyFlowOperator = FlowOperator<any, any>;

/**
 * A non-empty tuple of {@link FlowOperator}s, used as the input shape
 * for {@link tuple}.
 */
export type FlowOperatorTuple = readonly [
  AnyFlowOperator,
  ...AnyFlowOperator[],
];

/**
 * Given a tuple of operators, the input tuple type the resulting
 * {@link tuple} operator expects: each position maps to the
 * corresponding operator's input.
 */
export type TupleInput<TOps extends FlowOperatorTuple> = {
  [K in keyof TOps]: TOps[K] extends FlowOperator<infer TIn, any> ? TIn : never;
};

/**
 * Given a tuple of operators, the output tuple type the resulting
 * {@link tuple} operator produces: each position maps to the
 * corresponding operator's output.
 */
export type TupleOutput<TOps extends FlowOperatorTuple> = {
  [K in keyof TOps]: TOps[K] extends FlowOperator<any, infer TOut>
    ? TOut
    : never;
};

/**
 * Lift a tuple of unary operators into a single operator that works on
 * tuples position-wise. Each element of the input tuple is passed
 * through the operator at the same index, and the results are
 * reassembled into a tuple of the same arity.
 *
 * This is the tuple-shaped sibling of {@link FlowOperator}/`flow` and
 * the positional counterpart of `struct`: where `flow` composes
 * operators **sequentially** along a single value, `tuple` applies
 * operators **in parallel** across the positions of a tuple. It is
 * the "applicative tuple" / `sequenceT` pattern from functional
 * programming, expressed for plain TypeScript tuples.
 *
 * Operators are passed as a single array argument (not rest args) to
 * keep call-sites visually distinct from {@link FlowOperator}/`flow`,
 * which uses rest args for sequential composition.
 *
 * The returned operator is itself a {@link FlowOperator} and can be
 * used as a step inside `flow`.
 *
 * ### Runtime guarantees
 *
 * At least one operator is required. Calling `tuple([])` raises a
 * {@link PanicException} because an empty tuple has no inferrable
 * input or output and almost always indicates a bug.
 *
 * The output array is fresh on every invocation and built positionally
 * from the operator tuple. Iteration is driven by `ops.length`, so
 * extra elements on the input are dropped and missing elements are
 * passed through to their operator as `undefined`.
 *
 * @example
 *
 * ```ts
 * const measure = tuple([
 *   (s: string) => s.length,
 *   (n: number) => `${n}`,
 * ]);
 *
 * measure(['hello', 42]); // [5, '42']
 * ```
 *
 * @example
 *
 * ```ts
 * // Composes with flow: split a tuple, run each branch in parallel,
 * // then merge the results.
 * const summarize = flow(
 *   tuple([
 *     (s: string) => s.trim(),
 *     (n: number) => Math.max(0, n),
 *   ]),
 *   ([name, age]) => `${name} (${age})`,
 * );
 *
 * summarize(['  Ada ', -3]); // 'Ada (0)'
 * ```
 *
 * @throws {PanicException} If called with an empty tuple.
 */
export function tuple<TOps extends FlowOperatorTuple>(
  ops: TOps,
): FlowOperator<TupleInput<TOps>, TupleOutput<TOps>> {
  const length = ops.length;

  if (length === 0) {
    // The empty tuple case is a BUG because it should be impossible
    // to call tuple with no operators for typescript code that respects
    // the public type -- `TOps` would be the empty tuple and the
    // resulting operator would have no inferrable input or output.
    throw new PanicException(
      'tuple() requires at least one operator to build a tuple-shaped operator.',
    );
  }

  return (input: TupleInput<TOps>): TupleOutput<TOps> => {
    const source = input as readonly unknown[];
    const out = Array.from({ length }, (_, i) =>
      (ops[i] as AnyFlowOperator)(source[i]),
    );
    return out as unknown as TupleOutput<TOps>;
  };
}
