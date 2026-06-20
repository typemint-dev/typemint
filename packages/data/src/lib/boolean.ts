import { TypeDescriptor, witness } from '@typemint/core';

export const BooleanDescriptor = TypeDescriptor('boolean', witness<boolean>());

export type BooleanDescriptor = typeof BooleanDescriptor;

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}
