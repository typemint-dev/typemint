import {
  PanicException,
  isNonEmptyArray,
  NonEmptyReadonlyArray,
} from '@typemint/core';
import {
  type LiteralUnionDescriptor,
  type LiteralUnionMemberBase,
} from './literal-union.js';

export type DictionaryKeyBase = string;

export type DictionarySource<T> = Readonly<Record<DictionaryKeyBase, T>>;

// A `DictionaryDescriptor` cannot be named in the conditionals below without
// creating a circular type reference — the descriptor is itself defined in terms
// of these inference helpers (via `DictionaryMembers`/`DictionaryMethods`), and
// `InferDictionaryKeys` is consumed as a mapped-type key, which forces eager
// resolution. Instead we detect a descriptor structurally through its accessor
// methods and recover the keys/values from their return types. A plain
// `DictionarySource` has no such methods and falls through to the direct lookup.

export type InferDictionaryKeys<
  T extends
    | DictionarySource<unknown>
    | { keys(): NonEmptyReadonlyArray<DictionaryKeyBase> },
> = T extends {
  keys(): NonEmptyReadonlyArray<infer K extends DictionaryKeyBase>;
}
  ? K
  : keyof T & string;

export type InferDictionaryValues<
  T extends
    | DictionarySource<unknown>
    | { values(): NonEmptyReadonlyArray<unknown> },
> = T extends { values(): NonEmptyReadonlyArray<infer V> }
  ? V
  : T[keyof T & string];

export type DictionaryEntry<T extends DictionarySource<unknown>> = {
  [K in InferDictionaryKeys<T>]: readonly [K, T[K]];
}[InferDictionaryKeys<T>];

export type DictionaryMembers<T extends DictionarySource<unknown>> = {
  readonly [K in InferDictionaryKeys<T>]: T[K];
};

export type DictionaryMethods<T extends DictionarySource<unknown>> = {
  keys(): NonEmptyReadonlyArray<InferDictionaryKeys<T>>;
  values(): NonEmptyReadonlyArray<InferDictionaryValues<T>>;
  entries(): NonEmptyReadonlyArray<DictionaryEntry<T>>;
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

function memoizeKeys<T extends DictionarySource<unknown>>(
  source: T,
): NonEmptyReadonlyArray<InferDictionaryKeys<T>> {
  const memoKeys: readonly InferDictionaryKeys<T>[] = Object.freeze(
    Object.keys(source),
  ) as readonly InferDictionaryKeys<T>[];

  if (!isNonEmptyArray(memoKeys)) {
    throw new PanicException('Dictionary requires at least one key');
  }

  for (const key of memoKeys) {
    if (reservedKeys.has(key)) {
      throw new PanicException(
        `Dictionary: key "${key}" collides with a reserved descriptor key`,
      );
    }
  }

  return memoKeys;
}

export function Dictionary<const T extends DictionarySource<unknown>>(
  source: T,
): DictionaryDescriptor<T> {
  const memoKeys = memoizeKeys(source);

  function keys(): NonEmptyReadonlyArray<InferDictionaryKeys<T>> {
    return memoKeys;
  }

  const memoValues: NonEmptyReadonlyArray<InferDictionaryValues<T>> =
    Object.freeze(memoKeys.map((key) => source[key])) as NonEmptyReadonlyArray<
      InferDictionaryValues<T>
    >;

  function values(): NonEmptyReadonlyArray<InferDictionaryValues<T>> {
    return memoValues;
  }

  const memoEntries: NonEmptyReadonlyArray<DictionaryEntry<T>> = Object.freeze(
    memoKeys.map(
      (key) => Object.freeze([key, source[key]]) as DictionaryEntry<T>,
    ),
  ) as NonEmptyReadonlyArray<DictionaryEntry<T>>;
  function entries(): NonEmptyReadonlyArray<DictionaryEntry<T>> {
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

Dictionary.fromLiteralUnion = <
  T extends LiteralUnionMemberBase,
  const S extends Record<T, unknown>,
>(
  _union: LiteralUnionDescriptor<T>,
  source: S,
) => {
  return Dictionary(source);
};
