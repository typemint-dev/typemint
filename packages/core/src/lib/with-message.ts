import { assert } from './assert.js';
import { assertRecord, isRecord } from './record.js';
/**
 * Represents an object with message
 */
export type WithMessage = {
  message: string;
};
/**
 * Describes a share which has a message and provides an utility to check it
 * and to get that message out.
 */
export const WithMessage = {
  from(message: string): WithMessage {
    return { message };
  },

  /**
   * Check if the value match the WithMessage type. (Structural type guard)
   */
  isOfType(value: unknown): value is WithMessage {
    return (
      isRecord(value) &&
      'message' in value &&
      typeof value['message'] === 'string'
    );
  },

  /**
   * Get the message from the value or return the default value if the value is
   * not a WithMessage object.
   *
   * @example
   *
   * ```typescript
   * try {
   *   //...
   * } catch (error) {
   *   // error is of type unknown in TypeScript
   *   const errorMessage = WithMessage.getMessageOrElse(error, 'Unknown error.');
   * }
   * ```
   */
  getOr(value: unknown, defaultValue: string | (() => string)): string {
    if (WithMessage.isOfType(value)) {
      return value.message;
    }
    return typeof defaultValue === 'function' ? defaultValue() : defaultValue;
  },
} as const;

/**
 * Asserts that the value is a WithMessage object.
 */
export function assertWithMessage(
  value: unknown,
  message: string | (() => string) = 'Value is not a WithMessage object',
): asserts value is WithMessage {
  assertRecord(value, 'Expected a record with message property');
  assert(WithMessage.isOfType(value), message);
}
