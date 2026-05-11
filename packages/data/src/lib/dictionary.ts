import { PanicException } from '@typemint/core';

export type DictionaryKeyBase = string;

export type DictionarySource<T> = Readonly<Record<DictionaryKeyBase, T>>;

export type InferDictionaryKeys<T extends DictionarySource<unknown>> = keyof T &
  string;

export type InferDictionaryValues<T extends DictionarySource<unknown>> =
  T[keyof T & string];

export type DictionaryMembers<T extends DictionarySource<unknown>> = {
  readonly [K in InferDictionaryKeys<T>]: T[K];
};

export type DictionaryMethods<T extends DictionarySource<unknown>> = {
  keys(): readonly InferDictionaryKeys<T>[];
  values(): readonly InferDictionaryValues<T>[];
  size: number;
};

export type DictionaryDescriptor<T extends DictionarySource<unknown>> =
  DictionaryMembers<T> & DictionaryMethods<T>;

export function Dictionary<T extends DictionarySource<unknown>>(
  source: T,
): DictionaryDescriptor<T> {
  const memoKeys: readonly InferDictionaryKeys<T>[] = Object.freeze(
    Object.keys(source),
  );
  if (memoKeys.length === 0) {
    throw new PanicException('Dictionary requires at least one key');
  }
  const memoValues: readonly InferDictionaryValues<T>[] = Object.freeze(
    Object.freeze(memoKeys.map((key) => source[key])),
  );

  function keys(): readonly InferDictionaryKeys<T>[] {
    return memoKeys;
  }

  function values(): readonly InferDictionaryValues<T>[] {
    return memoValues;
  }

  const descriptor: DictionaryDescriptor<T> = Object.assign(
    Object.create(null),
    source,
    {
      keys,
      values,

      get size(): number {
        return memoKeys.length;
      },
    } as DictionaryMethods<T>,
  );

  return descriptor;
}
