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
