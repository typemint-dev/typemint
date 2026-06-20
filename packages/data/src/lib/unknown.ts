import { TypeDescriptor, witness } from '@typemint/core';

export const UnknownDescriptor = TypeDescriptor('unknown', witness<unknown>());

export type UnknownDescriptor = typeof UnknownDescriptor;
