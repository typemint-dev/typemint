import { TypeDescriptor, witness } from '@typemint/core';

export const BigIntDescriptor = TypeDescriptor('bigint', witness<bigint>());

export type BigIntDescriptor = typeof BigIntDescriptor;
