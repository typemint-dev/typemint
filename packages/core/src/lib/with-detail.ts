import { isRecord } from "./record.js";

/**
 * Represents an object that carries structured contextual metadata under a
 * `details` property. Intended for attaching named, flat-ish context to errors,
 * results, or any discriminated-union variant — for example field-level
 * validation failures or retry hints.
 *
 * The type parameter is constrained to `Record<string, unknown>` (plain
 * objects, no arrays or primitives) so that the payload is always inspectable
 * by key and serialisable without ambiguity. For a single string payload use
 * {@link WithMessage}; for a string discriminant use {@link WithCode}.
 *
 * @typeParam TDetail - The shape of the detail payload.
 *
 * @example
 * ```typescript
 * type ValidationError = WithCode<"VALIDATION_ERROR"> & WithDetail<{ field: string; constraint: string }>;
 * ```
 */
export type WithDetail<TDetail extends Record<string, unknown>> = {
  details: TDetail;
};

/**
 * Namespace of utilities for constructing and narrowing {@link WithDetail}
 * values.
 */
export const WithDetail = {
  /**
   * Wraps a detail payload in a {@link WithDetail} object.
   *
   * @param details - The structured metadata to attach.
   * @returns A `WithDetail` object whose `details` property holds the payload.
   */
  from<TDetail extends Record<string, unknown>>(
    details: TDetail,
  ): WithDetail<TDetail> {
    return { details };
  },

  /**
   * Structural type guard. Returns `true` when `value` is a plain object that
   * contains a `details` key whose value is itself a plain object (not an array
   * or primitive).
   */
  isOfType(value: unknown): value is WithDetail<Record<string, unknown>> {
    return isRecord(value) && "details" in value && isRecord(value.details);
  },
};
