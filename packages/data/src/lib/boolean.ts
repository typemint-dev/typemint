import { TypeDescriptor, witness } from '@typemint/core';

export const BooleanDescriptor = TypeDescriptor('boolean', witness<boolean>());

export type BooleanDescriptor = typeof BooleanDescriptor;
