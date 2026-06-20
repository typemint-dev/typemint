import { TypeDescriptor, witness } from '@typemint/core';

export const BigIntDescriptor = TypeDescriptor('bigint', witness<bigint>());

export type BigIntDescriptor = typeof BigIntDescriptor;

export function isBigInt(value: unknown): value is bigint {
  return typeof value === 'bigint';
}
