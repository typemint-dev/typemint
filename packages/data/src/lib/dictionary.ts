export type DictionaryKeyBase = string;

export type DictionarySource<T> = Readonly<Record<DictionaryKeyBase, T>>;

export type InferDictionaryKeys<T extends DictionarySource<unknown>> = keyof T &
  string;

export type InferDictionaryValues<T extends DictionarySource<unknown>> =
  T[keyof T & string];

export type DictionaryMembers<T extends DictionarySource<unknown>> = {
  readonly [K in InferDictionaryKeys<T>]: T[K];
};

export type DictionaryDescriptor<T extends DictionarySource<unknown>> =
  DictionaryMembers<T>;

export function Dictionary<T extends DictionarySource<unknown>>(
  source: T,
): DictionaryDescriptor<T> {
  return source as DictionaryDescriptor<T>;
}
