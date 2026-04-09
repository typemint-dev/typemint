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
