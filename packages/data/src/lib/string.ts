import { Result } from '@typemint/result';
import type { Decoder } from './decoder.js';
import { TypeMismatchError } from './type-mismatch.js';
import { TypeDescriptor, witness } from '@typemint/core';

/**
 * The canonical {@link TypeDescriptor} for the `string` primitive.
 *
 * It carries the literal name `'string'` for runtime reporting (used, for
 * example, as the `expected` side of a {@link TypeMismatchError}) and the
 * `string` type as its phantom witness for compile-time inference.
 *
 * @example
 *
 * ```ts
 * StringDescriptor.name; // 'string'
 * ```
 */
export const StringDescriptor = TypeDescriptor('string', witness<string>());

/**
 * Type guard that narrows an `unknown` value to `string`.
 *
 * @param value - The value to test.
 * @returns `true` (narrowing to `string`) when `value` is a primitive string.
 *
 * @example
 *
 * ```ts
 * const value: unknown = 'hello';
 *
 * if (isString(value)) {
 *   value.toUpperCase(); // value is narrowed to string
 * }
 * ```
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * The type of a {@link Decoder} that turns an `unknown` value into a `string`,
 * failing with a {@link TypeMismatchError} when the value is not a string.
 *
 * @see unknownToStringDecoder for the canonical implementation.
 */
export type UnknownToStringDecoder = Decoder<
  unknown,
  string,
  TypeMismatchError<string, unknown>
>;

/**
 * Decodes an `unknown` value into a `string`.
 *
 * On success the value is returned unchanged inside an `Ok`. On failure the
 * decoder yields an `Err` holding a {@link TypeMismatchError} whose `expected`
 * side is the {@link StringDescriptor} and whose `received` side is the original
 * offending value (so its runtime type drives the error message).
 *
 * @param value - The value to decode.
 * @returns An `Ok<string>` when `value` is a string, otherwise an
 * `Err<TypeMismatchError<string, unknown>>`.
 *
 * @example
 *
 * ```ts
 * unknownToStringDecoder('hello'); // Ok('hello')
 *
 * const result = unknownToStringDecoder(42);
 * result.isErr();                       // true
 * result.unwrapErr().message;           // 'Expected string but got number'
 * ```
 */
export const unknownToStringDecoder: UnknownToStringDecoder = (value) => {
  return Result.fromPredicate(value, isString, () =>
    TypeMismatchError(StringDescriptor, value),
  );
};
