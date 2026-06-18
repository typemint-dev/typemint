/**
 * Internal symbol used to carry compile-time type information.
 */
declare const typeOf: unique symbol;

/**
 * A compile-time only "witness" that carries a type `T`.
 *
 * A `Witness<T>` has no runtime payload: the {@link typeOf} property is a
 * phantom field that never exists at runtime. Its sole purpose is to let a
 * type travel as a *value*, so callers can drive type inference where
 * explicit type arguments would otherwise be required.
 */
export type Witness<T> = {
  readonly [typeOf]: T;
};

/**
 * Extracts the type carried by a {@link Witness}.
 */
export type InferWitnessType<T extends Witness<unknown>> =
  T extends Witness<infer U> ? U : never;

/**
 * Creates a {@link Witness} for a type `T`.
 *
 * Because TypeScript resolves type arguments all-or-nothing, a constructor
 * that needs both an inferred name and an inferred type cannot take the type
 * as an explicit type argument. Passing a witness value sidesteps this: the
 * type rides in as a value and is inferred alongside everything else.
 *
 * The returned object is empty at runtime; the type parameter exists only at
 * compile time.
 *
 * @example
 *
 * ```ts
 * // The type is inferred from the witness, the name from the string.
 * Scalar('MyCustomName', witness<Url>());
 * ```
 */
export function witness<T>(): Witness<T> {
  return {} as Witness<T>;
}
