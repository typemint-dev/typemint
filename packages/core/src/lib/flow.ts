import { PanicException } from './panic-exception.js';

/**
 * A single unary step inside a {@link flow} pipeline. It receives the
 * previous operator's output and produces the next operator's input.
 *
 * The `in` / `out` modifiers make the parameter contravariant and the
 * return covariant, which is the correct variance for a function type
 * and enables safer assignability in generic positions.
 */
export type FlowOperator<in TInput, out TOutput> = (value: TInput) => TOutput;

/**
 * Internal alias used only inside this module to keep the runtime
 * implementation loosely typed without leaking `any` into the public API.
 */
type AnyFlowOperator = FlowOperator<any, any>;

/**
 * A {@link FlowOperator} whose output is an object — i.e. an
 * operator that produces a record-shaped value. Inputs are
 * deliberately unconstrained so that combinators which build on
 * this category (e.g. `struct.merge`) can intersect the input
 * types of multiple contributors.
 *
 * This is the type-level "category of record-producing operators."
 * It is the right constraint for any combinator that spread-merges
 * operator outputs, builds a record-shaped result, or otherwise
 * relies on the output being a non-primitive value.
 */
export type RecordFlowOperator = FlowOperator<any, object>;

/**
 * Recursively walks the operator tuple and extracts the return type of
 * the last operator — i.e. the final output of the pipeline.
 */
export type FlowOutput<TFns extends readonly AnyFlowOperator[]> =
  TFns extends readonly [FlowOperator<any, infer TOut>]
    ? TOut
    : TFns extends readonly [
          AnyFlowOperator,
          ...infer TRest extends readonly AnyFlowOperator[],
        ]
      ? FlowOutput<TRest>
      : never;

/**
 * Extracts the input type of the pipeline from the first operator's
 * parameter type.
 */
export type FlowInput<TFns extends readonly AnyFlowOperator[]> =
  TFns extends readonly [FlowOperator<infer TIn, any>, ...AnyFlowOperator[]]
    ? TIn
    : never;

/**
 * Compose a pipeline of unary operators into a single function that,
 * when invoked with an input, applies each operator left-to-right.
 *
 * Unlike `pipe`, `flow` does **not** take a value; it returns a new
 * reusable function. The relationship is:
 *
 * ```
 * flow(f, g, h)(x) === pipe(x, f, g, h)
 * ```
 *
 * ### Type inference
 *
 * Overloads are provided for arities 1..12 so that arrow function
 * parameters do not need explicit type annotations. Longer pipelines are
 * best expressed by composing two flows together (a `flow` result is
 * itself a `FlowOperator` and can be passed as a step into another
 * `flow`). For the rare case of a single flat call with more than 12
 * operators a generic fallback is used; there you may need to annotate
 * the parameter of the first operator to anchor inference.
 *
 * ### Runtime guarantees
 *
 * At least one operator is required. Calling `flow()` with no operators
 * raises a {@link PanicException} because an empty pipeline has no
 * inferrable input or output type and almost always indicates a bug.
 *
 * @example
 *
 * ```ts
 * const toSlug = flow(
 *   (s: string) => s.toLowerCase(),
 *   (s) => s.trim(),
 *   (s) => s.replace(/\s+/g, '-'),
 * );
 *
 * toSlug('  Hello World  '); // 'hello-world'
 * ```
 *
 * @example
 *
 * ```ts
 * // Flows compose: the result of flow() is itself a FlowOperator.
 * const parse = flow(
 *   (s: string) => s.trim(),
 *   (s) => Number(s),
 * );
 * const render = flow(
 *   (n: number) => n * 2,
 *   (n) => `= ${n}`,
 * );
 * const pipeline = flow(parse, render); // (s: string) => string
 * ```
 *
 * @throws {PanicException} If called with zero operators.
 */
export function flow<T0, T1>(op1: FlowOperator<T0, T1>): FlowOperator<T0, T1>;
export function flow<T0, T1, T2>(
  op1: FlowOperator<T0, T1>,
  op2: FlowOperator<T1, T2>,
): FlowOperator<T0, T2>;
export function flow<T0, T1, T2, T3>(
  op1: FlowOperator<T0, T1>,
  op2: FlowOperator<T1, T2>,
  op3: FlowOperator<T2, T3>,
): FlowOperator<T0, T3>;
export function flow<T0, T1, T2, T3, T4>(
  op1: FlowOperator<T0, T1>,
  op2: FlowOperator<T1, T2>,
  op3: FlowOperator<T2, T3>,
  op4: FlowOperator<T3, T4>,
): FlowOperator<T0, T4>;
export function flow<T0, T1, T2, T3, T4, T5>(
  op1: FlowOperator<T0, T1>,
  op2: FlowOperator<T1, T2>,
  op3: FlowOperator<T2, T3>,
  op4: FlowOperator<T3, T4>,
  op5: FlowOperator<T4, T5>,
): FlowOperator<T0, T5>;
export function flow<T0, T1, T2, T3, T4, T5, T6>(
  op1: FlowOperator<T0, T1>,
  op2: FlowOperator<T1, T2>,
  op3: FlowOperator<T2, T3>,
  op4: FlowOperator<T3, T4>,
  op5: FlowOperator<T4, T5>,
  op6: FlowOperator<T5, T6>,
): FlowOperator<T0, T6>;
export function flow<T0, T1, T2, T3, T4, T5, T6, T7>(
  op1: FlowOperator<T0, T1>,
  op2: FlowOperator<T1, T2>,
  op3: FlowOperator<T2, T3>,
  op4: FlowOperator<T3, T4>,
  op5: FlowOperator<T4, T5>,
  op6: FlowOperator<T5, T6>,
  op7: FlowOperator<T6, T7>,
): FlowOperator<T0, T7>;
export function flow<T0, T1, T2, T3, T4, T5, T6, T7, T8>(
  op1: FlowOperator<T0, T1>,
  op2: FlowOperator<T1, T2>,
  op3: FlowOperator<T2, T3>,
  op4: FlowOperator<T3, T4>,
  op5: FlowOperator<T4, T5>,
  op6: FlowOperator<T5, T6>,
  op7: FlowOperator<T6, T7>,
  op8: FlowOperator<T7, T8>,
): FlowOperator<T0, T8>;
export function flow<T0, T1, T2, T3, T4, T5, T6, T7, T8, T9>(
  op1: FlowOperator<T0, T1>,
  op2: FlowOperator<T1, T2>,
  op3: FlowOperator<T2, T3>,
  op4: FlowOperator<T3, T4>,
  op5: FlowOperator<T4, T5>,
  op6: FlowOperator<T5, T6>,
  op7: FlowOperator<T6, T7>,
  op8: FlowOperator<T7, T8>,
  op9: FlowOperator<T8, T9>,
): FlowOperator<T0, T9>;
export function flow<T0, T1, T2, T3, T4, T5, T6, T7, T8, T9, T10>(
  op1: FlowOperator<T0, T1>,
  op2: FlowOperator<T1, T2>,
  op3: FlowOperator<T2, T3>,
  op4: FlowOperator<T3, T4>,
  op5: FlowOperator<T4, T5>,
  op6: FlowOperator<T5, T6>,
  op7: FlowOperator<T6, T7>,
  op8: FlowOperator<T7, T8>,
  op9: FlowOperator<T8, T9>,
  op10: FlowOperator<T9, T10>,
): FlowOperator<T0, T10>;
export function flow<T0, T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11>(
  op1: FlowOperator<T0, T1>,
  op2: FlowOperator<T1, T2>,
  op3: FlowOperator<T2, T3>,
  op4: FlowOperator<T3, T4>,
  op5: FlowOperator<T4, T5>,
  op6: FlowOperator<T5, T6>,
  op7: FlowOperator<T6, T7>,
  op8: FlowOperator<T7, T8>,
  op9: FlowOperator<T8, T9>,
  op10: FlowOperator<T9, T10>,
  op11: FlowOperator<T10, T11>,
): FlowOperator<T0, T11>;
export function flow<T0, T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12>(
  op1: FlowOperator<T0, T1>,
  op2: FlowOperator<T1, T2>,
  op3: FlowOperator<T2, T3>,
  op4: FlowOperator<T3, T4>,
  op5: FlowOperator<T4, T5>,
  op6: FlowOperator<T5, T6>,
  op7: FlowOperator<T6, T7>,
  op8: FlowOperator<T7, T8>,
  op9: FlowOperator<T8, T9>,
  op10: FlowOperator<T9, T10>,
  op11: FlowOperator<T10, T11>,
  op12: FlowOperator<T11, T12>,
): FlowOperator<T0, T12>;
export function flow<
  TFns extends readonly [AnyFlowOperator, ...AnyFlowOperator[]],
>(...fns: TFns): FlowOperator<FlowInput<TFns>, FlowOutput<TFns>>;
export function flow(...fns: readonly AnyFlowOperator[]): AnyFlowOperator {
  if (fns.length === 0) {
    // The no operator is a BUG because it should be impossible to call flow
    // with no operators for typescript code.
    throw new PanicException(
      'flow() requires at least one operator to build a pipeline.',
    );
  }

  if (fns.length === 1) {
    return fns[0]!;
  }

  return (input: unknown): unknown => {
    let acc: unknown = input;
    for (let i = 0; i < fns.length; i++) {
      acc = fns[i]!(acc);
    }
    return acc;
  };
}
