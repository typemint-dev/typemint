import { PanicException } from '@typemint/core';

export type DictionaryKeyBase = string;

export type DictionarySource<T> = Readonly<Record<DictionaryKeyBase, T>>;

export type InferDictionaryKeys<T extends DictionarySource<unknown>> = keyof T &
  string;

export type InferDictionaryValues<T extends DictionarySource<unknown>> =
  T[keyof T & string];

export type DictionaryEntry<T extends DictionarySource<unknown>> = {
  [K in InferDictionaryKeys<T>]: readonly [K, T[K]];
}[InferDictionaryKeys<T>];

export type DictionaryMembers<T extends DictionarySource<unknown>> = {
  readonly [K in InferDictionaryKeys<T>]: T[K];
};

export type DictionaryMethods<T extends DictionarySource<unknown>> = {
  keys(): readonly InferDictionaryKeys<T>[];
  values(): readonly InferDictionaryValues<T>[];
  entries(): readonly DictionaryEntry<T>[];
  isOfType(value: unknown): value is T[keyof T & string];
  [Symbol.iterator](): IterableIterator<DictionaryEntry<T>>;
  [Symbol.toStringTag]: 'Dictionary';
  size: number;
};

/**
 * ## Composition and Matching
 *
 * Use LiteralUnion to handle the dispatch of keys and matching them.
 *
 * @example
 *
 * ```ts
 * const codes = Dictionary({ germany: 'DE', france: 'FR', usa: 'US' });
 * const Country = LiteralUnion(codes.keys());
 *
 * // Pure data lookup
 * codes.germany;                           // 'DE'
 * // Pure dispatch
 * Country.match(c, {
 *   germany: () => '🇩🇪',
 *   france:  () => '🇫🇷',
 *   usa:     () => '🇺🇸',
 * });
 *
 * // Dispatch that uses the projected value
 * Country.match(c, {
 *   germany: (k) => `${k}: ${codes[k]}`,   // closes over codes
 *   france:  (k) => `${k}: ${codes[k]}`,
 *   usa:     (k) => `${k}: ${codes[k]}`,
 * });
 * ```
 */
export type DictionaryDescriptor<T extends DictionarySource<unknown>> =
  DictionaryMembers<T> & DictionaryMethods<T>;

const reservedKeys = new Set(['isOfType', 'keys', 'values', 'entries', 'size']);

export function Dictionary<T extends DictionarySource<unknown>>(
  source: T,
): DictionaryDescriptor<T> {
  const memoKeys: readonly InferDictionaryKeys<T>[] = Object.freeze(
    Object.keys(source),
  );
  if (memoKeys.length === 0) {
    throw new PanicException('Dictionary requires at least one key');
  }

  for (const key of memoKeys) {
    if (reservedKeys.has(key)) {
      throw new PanicException(
        `Dictionary: key "${key}" collides with a reserved descriptor key`,
      );
    }
  }

  function keys(): readonly InferDictionaryKeys<T>[] {
    return memoKeys;
  }

  const memoValues: readonly InferDictionaryValues<T>[] = Object.freeze(
    Object.freeze(memoKeys.map((key) => source[key])),
  );
  function values(): readonly InferDictionaryValues<T>[] {
    return memoValues;
  }

  const memoEntries: readonly DictionaryEntry<T>[] = Object.freeze(
    memoKeys.map(
      (key) => Object.freeze([key, source[key]]) as DictionaryEntry<T>,
    ),
  );
  function entries(): readonly DictionaryEntry<T>[] {
    return memoEntries;
  }

  function isOfType(value: unknown): value is T[keyof T] {
    return memoValues.includes(value as InferDictionaryValues<T>);
  }

  const descriptor: DictionaryDescriptor<T> = Object.assign(
    Object.create(null),
    source,
    {
      keys,
      values,
      entries,
      isOfType,

      get size(): number {
        return memoKeys.length;
      },

      [Symbol.iterator](): IterableIterator<DictionaryEntry<T>> {
        return memoEntries[Symbol.iterator]();
      },
      [Symbol.toStringTag]: 'Dictionary',
    } as DictionaryMethods<T>,
  );

  return descriptor;
}
