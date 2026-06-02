import { assert } from './assert.js';

/**
 * Asserts that `arr` contains at least one element. After a successful call,
 * the compiler narrows `arr` to a non-empty tuple, so positional access such
 * as `arr[0]` is known to be present and APIs that require a non-empty array
 * accept it without further casting.
 *
 * The narrowed type preserves the mutability of the input: a mutable `T[]`
 * narrows to `[T, ...T[]]`, while a `readonly T[]` narrows to
 * `readonly [T, ...T[]]`.
 *
 * Use this when an array's non-emptiness is an invariant the type system
 * cannot prove on its own — values parsed from JSON, results of a `filter`
 * that you know cannot be empty in context, or the head of a list you are
 * about to reduce.
 *
 * @param arr - The array to check.
 * @param message - The message to throw if the array is empty. Can be a
 *   string or a function returning a string. Prefer the lazy form when the
 *   message is expensive to compute.
 * @throws {AssertException} If `arr` has no elements.
 *
 * @example Safely read the head of an array
 *
 * ```ts
 * function first<T>(items: T[]): T {
 *   assertNonEmptyArray(items, 'items must not be empty');
 *   // items is now [T, ...T[]]
 *   return items[0];
 * }
 * ```
 *
 * @example Works on readonly arrays
 *
 * ```ts
 * function head<T>(items: readonly T[]): T {
 *   assertNonEmptyArray(items);
 *   // items is now readonly [T, ...T[]]
 *   return items[0];
 * }
 * ```
 */
export function assertNonEmptyArray<T>(
  arr: T[],
  message?: string | (() => string),
): asserts arr is [T, ...T[]];
export function assertNonEmptyArray<T>(
  arr: readonly T[],
  message?: string | (() => string),
): asserts arr is readonly [T, ...T[]];
export function assertNonEmptyArray<T>(
  arr: readonly T[],
  message: string | (() => string) = 'Expected a non-empty array',
): asserts arr is readonly [T, ...T[]] {
  assert(arr.length > 0, message);
}
