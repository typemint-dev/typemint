/**
 * Thrown when an assertion made via {@link assert} fails. Can be used
 * with `instanceof` to distinguish assertion failures from other errors.
 */
export class AssertException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssertException';
  }
}

/**
 *
 * @param condition - The condition to assert.
 * @param message - The message to throw if the condition is false. Can be a
 *    string or a function that returns a string. Use a lazy message when the
 *    message is expensive to compute. (Like with JSON.stringify). Do not use
 *    a lazy message when it the message is just a simple string or a string
 *    literal with a few variables.
 * @returns - The condition if it is true.
 * @throws - An AssertException if the condition is false.
 */
export function assert(
  condition: boolean,
  message: string | (() => string),
): asserts condition {
  if (!condition) {
    const resolvedMessage = typeof message === 'function' ? message() : message;
    throw new AssertException(resolvedMessage);
  }
}

/**
 * Asserts that `value` is neither `null` nor `undefined`. After a successful
 * call, the compiler narrows `value` to `NonNullable<T>` in the surrounding
 * scope.
 *
 * @param value - The value to check.
 * @param message - The message to throw if the value is nullish. Can be a
 *    string or a function that returns a string. Use a lazy message when the
 *    message is expensive to compute.
 * @throws {AssertException} If `value` is `null` or `undefined`.
 */
export function assertDefined<T>(
  value: T,
  message: string | (() => string) = 'Expected a defined value',
): asserts value is NonNullable<T> {
  assert(value !== null && value !== undefined, message);
}

/**
 * Asserts that `value` is callable (i.e. `typeof value === 'function'`).
 * After a successful call, the compiler narrows `value` to a function type
 * in the surrounding scope, so it can be invoked or passed to higher-order
 * APIs without further casting.
 *
 * Use this when bridging a value of type `unknown` (or a wide union that
 * includes a function) into a position that expects something callable —
 * dynamic dispatch tables, plugin registries, JSON-loaded handlers, optional
 * lifecycle hooks, dependency-injection containers, etc.
 *
 * The narrowed signature is `(...args: unknown[]) => unknown`, the *most
 * permissive* function type. This proves only that the value is callable,
 * not that it accepts a particular argument shape or returns a particular
 * type. If you need a tighter signature, follow the assert with a manual
 * cast at the call site, or use a domain-specific guard.
 *
 * @param value - The value to check. Accepts `unknown` so it can sit at the
 *   trust boundary without forcing the caller to pre-cast.
 * @param message - The message to throw if the value is not callable. Can be
 *   a string or a function returning a string. Prefer the lazy form when the
 *   message is expensive to compute (e.g. interpolating a `JSON.stringify`
 *   of the offending value); use the eager form for plain strings.
 * @throws {AssertException} If `typeof value !== 'function'`.
 *
 * @example Narrow an unknown to a callable
 *
 * ```ts
 * function invoke(handler: unknown, arg: string): unknown {
 *   assertFunction(handler, 'handler must be a function');
 *   // handler is now (...args: unknown[]) => unknown
 *   return handler(arg);
 * }
 * ```
 *
 * @example Validate a dynamically-loaded plugin entry point
 *
 * ```ts
 * const mod = await import(pluginPath);
 * assertFunction(
 *   mod.activate,
 *   () => `Plugin "${pluginPath}" must export an "activate" function`,
 * );
 * mod.activate(context);
 * ```
 *
 * @example Guard an optional lifecycle hook
 *
 * ```ts
 * type Config = { onReady?: unknown };
 *
 * function start(config: Config) {
 *   if (config.onReady !== undefined) {
 *     assertFunction(config.onReady, 'config.onReady must be a function');
 *     config.onReady();
 *   }
 * }
 * ```
 *
 * @example Tighten the signature with a follow-up cast
 *
 * ```ts
 * type Reducer = (acc: number, n: number) => number;
 *
 * function applyReducer(fn: unknown, values: number[]): number {
 *   assertFunction(fn, 'reducer must be a function');
 *   // The assert proved callability; the cast asserts the concrete shape.
 *   return values.reduce(fn as Reducer, 0);
 * }
 * ```
 *
 * @example What it does NOT check
 *
 * ```ts
 * // Both pass — assertFunction only checks `typeof === 'function'`.
 * assertFunction(class Foo {});         // ok — classes are functions
 * assertFunction(async () => {});       // ok — async functions are functions
 * assertFunction(function* () {});      // ok — generators are functions
 *
 * // To distinguish, follow up with the appropriate check:
 * if (fn.constructor.name === 'AsyncFunction') { ... }
 * ```
 */
export function assertFunction(
  value: unknown,
  message: string | (() => string) = 'Expected a function',
): asserts value is (...args: unknown[]) => unknown {
  assert(typeof value === 'function', message);
}
