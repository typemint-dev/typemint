import { assert } from './assert.js';

/**
 * Check if the value is any type of record. Function is a type guard and
 * narrows the type of the value to the type of the record.
 *
 * @param value - The value to check.
 * @returns - True if the value is a record, false otherwise.
 */
export function isRecord(
  value: unknown,
): value is Record<PropertyKey, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function assertRecord<T extends Record<string, unknown>>(
  value: unknown,
  message: string | (() => string) = 'Expected a record',
): asserts value is T {
  assert(isRecord(value), message);
}
