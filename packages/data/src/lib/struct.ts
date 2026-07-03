import type { Kind } from '@typemint/core';
import type { Result } from '@typemint/result';

export type Struct<
  TName extends string,
  TAttrs extends Record<PropertyKey, unknown>,
> = Kind<TName> & TAttrs;

export type StructDescriptor<
  TName extends string,
  TAttrs extends Record<PropertyKey, unknown>,
  TInvariantError = never,
> = {
  readonly name: TName;

  of(attrs: TAttrs): Result<Struct<TName, TAttrs>, TInvariantError>;

  isOfType(value: unknown): value is Struct<TName, TAttrs>;
};
