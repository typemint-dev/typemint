import { TypeDescriptor, witness } from '@typemint/core';
import { Result } from '@typemint/result';
import { TypeMismatchError } from './type-mismatch.js';
import type { Decoder } from './decoder.js';

export const NumberDescriptor = TypeDescriptor('number', witness<number>());

export type NumberDescriptor = typeof NumberDescriptor;

export function isNumber(value: unknown): value is number {
  return typeof value === 'number';
}

export type UnknownToNumberDecoder = Decoder<
  unknown,
  number,
  TypeMismatchError<number, unknown>
>;

export const unknownToNumberDecoder: UnknownToNumberDecoder = (
  value: unknown,
) => {
  return Result.fromPredicate(value, isNumber, () =>
    TypeMismatchError(NumberDescriptor, value),
  );
};
