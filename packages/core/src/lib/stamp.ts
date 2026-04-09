/**
 * A Stamp provides runtime proof-of-construction for objects. Each call to
 * {@link Stamp} creates a unique, closure-scoped symbol that is invisible
 * and unreachable from the outside. Factories like `Struct` or `Opaque` use
 * a Stamp to tag every object they produce, so that later code can verify
 * an object was genuinely constructed by that factory — not just structurally
 * similar.
 *
 * Stamps are intentionally **runtime-only**. They do not participate in the
 * type system; the symbol is never exposed and cannot be referenced by
 * external code. Two stamps created by separate {@link Stamp} calls are
 * guaranteed to be distinct.
 *
 * @example
 *
 * ```ts
 * const MyStamp = Stamp();
 *
 * const obj = MyStamp.stamp({ name: "Alice" });
 *
 * MyStamp.isStamped(obj); // true
 * MyStamp.isStamped({ name: "Alice" }); // false
 * ```
 */
export type StampDescriptor = {
  /**
   * Check if the given value is stamped.
   *
   * @param value - The value to check.
   * @returns - True if the value is stamped, false otherwise.
   * @example
   *
   * ```ts
   * const MyStamp = Stamp();
   *
   * const obj = MyStamp.stamp({ name: "Alice" });
   *
   * MyStamp.isStamped(obj); // true
   * ```
   */
  isStamped(value: object): boolean;

  /**
   * Stamp the given value.
   * @param value - The value to stamp.
   * @returns - The stamped value.
   * @example
   *
   * ```ts
   * const MyStamp = Stamp();
   *
   * const obj = MyStamp.stamp({ name: "Alice" });
   * ```
   */
  stamp<TRecord extends Record<PropertyKey, unknown>>(value: TRecord): TRecord;
};

/**
 * Create a new {@link StampDescriptor} backed by a fresh unique symbol.
 * Each descriptor is independent — stamping with one descriptor cannot be
 * detected by another.
 */
export function Stamp(): StampDescriptor {
  const stamp: unique symbol = Symbol('Stamp');

  const descriptor: StampDescriptor = {
    isStamped(value: object): boolean {
      return stamp in value && value[stamp] === true;
    },
    stamp<TRecord extends Record<PropertyKey, unknown>>(
      value: TRecord,
    ): TRecord {
      // Prevent a creation and throw-away of a new object.
      (value as any)[stamp] = true;
      return value;
    },
  };

  return descriptor;
}
