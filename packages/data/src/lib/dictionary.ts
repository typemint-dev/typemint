export type DictionaryKeyBase = string;

export type DictionarySource<T> = Readonly<Record<DictionaryKeyBase, T>>;

export type InferDictionaryKeys<T extends DictionarySource<unknown>> = keyof T &
  string;

export type InferDictionaryValues<T extends DictionarySource<unknown>> =
  T[keyof T & string];
