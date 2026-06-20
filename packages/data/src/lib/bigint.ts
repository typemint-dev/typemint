import { TypeDescriptor, witness } from '@typemint/core';
import { Result } from '@typemint/result';
import { TypeMismatchError } from './type-mismatch.js';
import type { Decoder } from './decoder.js';

export const BigIntDescriptor = TypeDescriptor('bigint', witness<bigint>());

export type BigIntDescriptor = typeof BigIntDescriptor;

export function isBigInt(value: unknown): value is bigint {
  return typeof value === 'bigint';
}

export type UnknownToBigIntDecoder = Decoder<
  unknown,
  bigint,
  TypeMismatchError<bigint, unknown>
>;

export const unknownToBigIntDecoder: UnknownToBigIntDecoder = (
  value: unknown,
) => {
  return Result.fromPredicate(value, isBigInt, () =>
    TypeMismatchError(BigIntDescriptor, value),
  );
};
