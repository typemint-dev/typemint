import { isRecord } from './record.js';
import { PanicException } from './panic-exception.js';

/**
 * @example
 *
 * User is a product of the `__kind` discriminant and the `name` property.
 *
 * ```ts
 * const User = {
 *   __kind: 'user',
 *   name: 'John Doe',
 * } as const;
 *
 * type User = Discriminant<'__kind', 'user'> & { name: string };
 * ```
 */
export type Discriminant<TKey extends PropertyKey, TVal extends string> = {
  [K in TKey]: TVal;
};

/**
 * @example
 *
 * ```ts
 * const KindDiscriminant = Discriminant('__kind');
 *
 * const raccoonDiscriminant = KindDiscriminant.of('raccoon');
 * const dogDiscriminant = KindDiscriminant.of('dog');
 *
 * const raccoon = {
 *   ...raccoonDiscriminant,
 *   name: 'Bob',
 * } as const;
 *
 * const dog = {
 *   ...dogDiscriminant,
 *   name: 'Rex',
 * } as const;
 *
 * const animal = KindDiscriminant.match(raccoon, {
 *   raccoon: (v) => v.name,
 *   dog: (v) => v.name,
 * });
 *
 * console.log(animal); // 'Bob'
 * ```
 */
export type DiscriminantDescriptor<TKey extends PropertyKey> = {
  /**
   * The key of the discriminant.
   */
  readonly key: TKey;
  /**
   * We reserve the usage of the `of` method for a construction of a type from
   * a matching shape. Like Dog.of(dogAttrs). The `from` hints more towards some
   * kind of transformation or extraction. Like KindDiscriminant.from('user').
   * transform a string into an object with property.
   *
   * @deprecated Use `from` instead. The method `of` will be removed in the future.
   */
  of<TVal extends string>(discriminant: TVal): Discriminant<TKey, TVal>;
  /**
   * Create a new discriminant instance with the given discriminant value
   * under the given key.
   *
   * @param discriminant - The discriminant value to create the discriminant
   *    instance with.
   * @returns - The discriminant instance with the given discriminant value
   *    under the given key.
   * @example
   *
   * ```ts
   * const KindDiscriminant = Discriminant('__kind');
   * const userDiscriminant = KindDiscriminant.from('user');
   * const user = {
   *   ...userDiscriminant,
   *   name: 'John Doe',
   * } as const;
   *
   * ```
   */
  from<TVal extends string>(discriminant: TVal): Discriminant<TKey, TVal>;
  /**
   * Check if the value is of the given discriminant key without checking the
   * value of the discriminant. The value is thus any instance of the
   * discriminant type.
   *
   * @param value - The value to check.
   * @returns - True if the value is of the given discriminant key without
   *    checking the value of the discriminant, false otherwise.
   */
  isOfType(value: unknown): value is Discriminant<TKey, string>;
  /**
   * Check if the value is of the given discriminant key and value.
   *
   * @param value - The value to check.
   * @param discriminant - The discriminant value to check.
   * @returns - True if the value is of the given discriminant key and value,
   *    false otherwise.
   */
  isOf<TVal extends string>(
    value: unknown,
    discriminant: TVal,
  ): value is Discriminant<TKey, TVal>;

  /**
   * Get the value of the discriminant.
   *
   * @param value - The discriminant instance to get the value of.
   * @returns - The value of the discriminant.
   * @example
   *
   * ```ts
   * const KindDiscriminant = Discriminant('__kind');
   * const User = {
   *   ...KindDiscriminant.of('user'),
   *   name: 'John Doe',
   * } as const;
   *
   * const userDiscriminantValue = KindDiscriminant.getValue(User); // 'user'
   * ```
   */
  getValue<TVal extends string>(value: Discriminant<TKey, TVal>): TVal;

  /**
   * Match on the value of the discriminant and return the result of the
   * handler that matches the value of the discriminant.
   *
   * The `match` function needs to know what are the possible members of
   * the discriminated union which goes into the `match` function. Thus the
   * input has to be typed as the discriminated union. Not as just a member.
   * (e.g. `Animal`, not `raccoon`);
   *
   * @param value - The discriminant instance to match on.
   * @param handlers - The handlers to match the value against.
   * @returns - The result of the handler that matches the value of the
   *    discriminant.
   * @throws - A PanicException if no handler is found for the value of the
   *    discriminant.
   *
   * @example
   *
   * ```ts
   * const KindDiscriminant = Discriminant('__kind');
   *
   * const raccoon = {
   *   ...KindDiscriminant.of('raccoon'),
   *   growl: () => 'growl',
   * } as const;
   *
   * const dog = {
   *   ...KindDiscriminant.of('dog'),
   *   bark: () => 'bark',
   * } as const;
   *
   * type Animal = typeof raccoon | typeof dog;
   * const input: Animal = raccoon as Animal;
   *
   * const sound = KindDiscriminant.match(raccoon, {
   *   raccoon: (v) => v.growl(),
   *   dog: (v) => v.bark(),
   * });
   *
   * console.log(sound); // 'growl'
   * ```
   */
  match<
    TRecord extends Discriminant<TKey, string>,
    THandlers extends {
      [K in TRecord[TKey]]: (
        value: Extract<TRecord, Discriminant<TKey, K>>,
      ) => unknown;
    },
  >(
    value: TRecord,
    handlers: THandlers,
  ): ReturnType<THandlers[TRecord[TKey]]>;

  /**
   * Like `match`, but handlers are partial and a `fallback` is invoked
   * for any variant without a matching handler.
   *
   * Use at trust boundaries (decoding wire/DB payloads, forward
   * compatibility with producers that may introduce new variants, or
   * when you intentionally only care about a subset of variants).
   * Prefer `match` whenever exhaustiveness is possible so the compiler
   * catches new variants.
   *
   * @param value - The discriminant instance to match on.
   * @param handlers - A partial set of handlers keyed by discriminant value.
   * @param fallback - Called when no handler matches the value's discriminant.
   * @returns - The result of the matched handler or the fallback.
   */
  matchOr<
    TRecord extends Discriminant<TKey, string>,
    THandlers extends Partial<{
      [K in TRecord[TKey]]: (
        value: Extract<TRecord, Discriminant<TKey, K>>,
      ) => unknown;
    }>,
    TFallback,
  >(
    value: TRecord,
    handlers: THandlers,
    fallback: (value: TRecord) => TFallback,
  ): ReturnType<NonNullable<THandlers[keyof THandlers]>> | TFallback;

  /**
   * Like `match`, but instead of throwing when no handler matches, the
   * `fallback` is invoked. Unlike `matchOr`, handlers are **exhaustive** --
   * you must provide a handler for every known variant.
   *
   * Use when the input is untrusted (e.g. HTTP request payload) but the set
   * of valid discriminants is known and you want the compiler to enforce
   * coverage of all known variants while still handling unknown values
   * gracefully.
   *
   * @param value - The discriminant instance to match on.
   * @param handlers - Exhaustive handlers keyed by discriminant value.
   * @param fallback - Called when the runtime discriminant does not match any
   *    known handler.
   * @returns - The result of the matched handler or the fallback.
   *
   * @example
   *
   * ```ts
   * const KindDiscriminant = Discriminant('__kind');
   *
   * type Cat = { __kind: 'cat'; meow: () => string };
   * type Dog = { __kind: 'dog'; bark: () => string };
   * type Animal = Cat | Dog;
   *
   * const input: Animal = JSON.parse(payload);
   *
   * const sound = KindDiscriminant.tryMatch(
   *   input,
   *   {
   *     cat: (v) => v.meow(),
   *     dog: (v) => v.bark(),
   *   },
   *   (v) => `unknown animal: ${v.__kind}`,
   * );
   * ```
   */
  tryMatch<
    TRecord extends Discriminant<TKey, string>,
    THandlers extends {
      [K in TRecord[TKey]]: (
        value: Extract<TRecord, Discriminant<TKey, K>>,
      ) => unknown;
    },
    TFallback,
  >(
    value: TRecord,
    handlers: THandlers,
    fallback: (value: TRecord) => TFallback,
  ): ReturnType<THandlers[TRecord[TKey]]> | TFallback;
};

/**
 * Create a new discriminant descriptor for the given key. The discriminant is
 * not meant to be used directly in the code, but rather serves as a building
 * block for modeling a type system. The consumer of the discriminant is
 * tools like `Struct` or `Opaque` which defines object based data types.
 *
 * @param key - The key to create the discriminant descriptor for.
 * @returns - The discriminant descriptor for the given key.
 *
 * @example
 *
 * ```ts
 * const KindDiscriminant = Discriminant('__kind');
 *
 * const raccoonDiscriminant = KindDiscriminant.of('raccoon');
 * const dogDiscriminant = KindDiscriminant.of('dog');
 *
 * const raccoon = {
 *   ...raccoonDiscriminant,
 *   name: 'Bob',
 * } as const;
 *
 * const dog = {
 *   ...dogDiscriminant,
 *   name: 'Rex',
 * } as const;
 *
 * const animal = KindDiscriminant.match(raccoon, {
 *   raccoon: (v) => v.name,
 *   dog: (v) => v.name,
 * });
 *
 * console.log(animal); // 'Bob'
 * ```
 */
export function Discriminant<TKey extends PropertyKey>(
  key: TKey,
): DiscriminantDescriptor<TKey> {
  return {
    key,

    of<TVal extends string>(discriminant: TVal): Discriminant<TKey, TVal> {
      return { [key]: discriminant } as Discriminant<TKey, TVal>;
    },

    from<TVal extends string>(discriminant: TVal): Discriminant<TKey, TVal> {
      return { [key]: discriminant } as Discriminant<TKey, TVal>;
    },

    isOfType(value: unknown): value is Discriminant<TKey, string> {
      return isRecord(value) && key in value;
    },

    isOf<TVal extends string>(
      value: unknown,
      discriminant: TVal,
    ): value is Discriminant<TKey, TVal> {
      return isRecord(value) && key in value && value[key] === discriminant;
    },

    getValue<TVal extends string>(value: Discriminant<TKey, TVal>): TVal {
      return value[key];
    },

    match(
      value: Record<PropertyKey, string>,
      handlers: Record<string, (value: any) => any>,
    ) {
      const handler = handlers[value[key]];

      if (!handler) {
        throw new PanicException(
          `Discriminant match failed: No handler found for discriminant: ` +
            `${String(value[key])}`,
        );
      }

      return handler(value);
    },

    matchOr(
      value: Record<PropertyKey, string>,
      handlers: Record<string, ((value: any) => any) | undefined>,
      fallback: (value: any) => any,
    ) {
      const handler = handlers[value[key]];

      if (!handler) {
        return fallback(value);
      }

      return handler(value);
    },

    tryMatch(
      value: Record<PropertyKey, string>,
      handlers: Record<string, (value: any) => any>,
      fallback: (value: any) => any,
    ) {
      const handler = handlers[value[key]];

      if (!handler) {
        return fallback(value);
      }

      return handler(value);
    },
  };
}
