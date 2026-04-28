/**
 * The identity function: returns its argument unchanged.
 *
 * Although trivially simple, `identity` is a useful building block in
 * pipelines and higher-order code. It is itself a
 * {@link FlowOperator}<T, T> for every `T`, so it can be passed
 * directly to `flow`, `struct`, or `tuple` without further wrapping.
 *
 * Common uses:
 *
 * - As a **no-op step** inside a conditional flow:
 *   `flow(parse, debug ? log : identity, render)`.
 * - As a **default** for an optional transform:
 *   `config.map ?? identity`.
 * - As an **"as-is" mapper** for APIs that take a callback.
 *
 * Reference identity is preserved: `identity(obj) === obj`. The
 * function never copies, freezes, or otherwise modifies its input.
 *
 * @example
 *
 * ```ts
 * identity(42); // 42
 * identity({ a: 1 }); // { a: 1 } (same reference)
 * ```
 *
 * @example
 *
 * ```ts
 * // No-op slot in a conditional pipeline
 * const transform = (debug: boolean) =>
 *   flow(
 *     (s: string) => s.trim(),
 *     debug ? (s: string) => (console.log(s), s) : identity,
 *     (s: string) => s.toUpperCase(),
 *   );
 * ```
 */
export function identity<T>(value: T): T {
  return value;
}
