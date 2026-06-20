import type { Witness } from './witness.js';

/**
 * A {@link Witness} that additionally carries a runtime `name` for the type
 * it represents.
 *
 * A bare `Witness<T>` is pure phantom — it has no runtime payload. A
 * `TypeDescriptor` augments it with exactly one real, inspectable field,
 * `name`, so the type can be referred to at runtime (error reporting,
 * registries, discriminants) while still driving compile-time inference like
 * any other witness.
 *
 * Because it intersects `Witness<TType>`, a `TypeDescriptor` satisfies the
 * `Witness<unknown>` constraint, so `InferWitnessType` recovers `TType` from
 * it just as it would from a bare witness.
 *
 * @typeParam TType - The type being described (phantom; never exists at runtime).
 * @typeParam TName - The literal name of the type.
 *
 * @example
 *
 * ```ts
 * const Url = TypeDescriptor('Url', witness<URL>());
 * //    ^? TypeDescriptor<URL, 'Url'>
 *
 * Url.name; // 'Url' — a real, readonly runtime value typed as the literal 'Url'
 * ```
 */
export type TypeDescriptor<TType, TName extends string> = {
  readonly name: TName;
} & Witness<TType>;

/**
 * Creates a {@link TypeDescriptor} for a type.
 *
 * Both parameters are inferred from values: the literal `name` via `const`,
 * and the described type from the {@link Witness} argument. Passing the type
 * as a witness value (rather than an explicit type argument) sidesteps
 * TypeScript's all-or-nothing type-argument rule, so neither parameter needs
 * to be written out at the call site.
 *
 * The `_type` argument exists solely to drive inference of `TType` — it has no
 * runtime payload and is never read. The returned object is frozen and carries
 * only the `name`; the described type lives purely in the type system.
 *
 * @param name - The literal name of the type.
 * @param _type - A witness for the type being described (inference only).
 *
 * @example
 *
 * ```ts
 * import { witness } from './witness.js';
 *
 * const Email = TypeDescriptor('Email', witness<string>());
 *
 * Email.name; // 'Email'
 * type T = InferTypeDescriptorType<typeof Email>; // string
 * type N = InferTypeDescriptorName<typeof Email>; // 'Email'
 * ```
 *
 * @example The descriptor is also a witness, so `InferWitnessType` works on it
 *
 * ```ts
 * const User = TypeDescriptor('User', witness<{ id: string }>());
 * type U = InferWitnessType<typeof User>; // { id: string }
 * ```
 */
export function TypeDescriptor<TType, const TName extends string>(
  name: TName,
  _type: Witness<TType>,
): TypeDescriptor<TType, TName> {
  return Object.freeze({ name }) as TypeDescriptor<TType, TName>;
}

/**
 * Extracts the literal name carried by a {@link TypeDescriptor}.
 *
 * @example
 *
 * ```ts
 * type D = TypeDescriptor<URL, 'Url'>;
 * type N = InferTypeDescriptorName<D>; // 'Url'
 * ```
 */
export type InferTypeDescriptorName<
  TDescriptor extends TypeDescriptor<unknown, string>,
> = TDescriptor extends TypeDescriptor<unknown, infer TName> ? TName : never;

/**
 * Extracts the described type carried by a {@link TypeDescriptor}.
 *
 * @example
 *
 * ```ts
 * type D = TypeDescriptor<URL, 'Url'>;
 * type T = InferTypeDescriptorType<D>; // URL
 * ```
 */
export type InferTypeDescriptorType<
  TDescriptor extends TypeDescriptor<unknown, string>,
> = TDescriptor extends TypeDescriptor<infer TType, string> ? TType : never;
