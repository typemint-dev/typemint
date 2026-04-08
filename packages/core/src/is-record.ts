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
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
