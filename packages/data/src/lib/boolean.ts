import { TypeDescriptor, witness } from '@typemint/core';
import type { Decoder } from './decoder.js';
import { TypeMismatchError } from './type-mismatch.js';
import { Result } from '@typemint/result';

export const BooleanDescriptor = TypeDescriptor('boolean', witness<boolean>());

export type BooleanDescriptor = typeof BooleanDescriptor;

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export type UnknownToBooleanDecoder = Decoder<
  unknown,
  boolean,
  TypeMismatchError<boolean, unknown>
>;

export const unknownToBooleanDecoder: UnknownToBooleanDecoder = (
  value: unknown,
) => {
  return Result.fromPredicate(value, isBoolean, () =>
    TypeMismatchError(BooleanDescriptor, value),
  );
};
