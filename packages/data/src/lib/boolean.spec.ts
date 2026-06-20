import { expect, it, describe, expectTypeOf } from 'vitest';
import { BooleanDescriptor } from './boolean.js';
import type {
  InferTypeDescriptorName,
  InferTypeDescriptorType,
} from '@typemint/core';

describe('(unit) boolean', () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: BooleanDescriptor
  // ─────────────────────────────────────────────────────────────────────────────
  describe('BooleanDescriptor', () => {
    it('should carry the literal name "boolean"', () => {
      // Assert
      expect(BooleanDescriptor.name).toBe('boolean');
    });

    it('should infer the literal name "boolean"', () => {
      // Act
      type Name = InferTypeDescriptorName<typeof BooleanDescriptor>;

      // Assert
      expectTypeOf<Name>().toEqualTypeOf<'boolean'>();
    });

    it('should describe the boolean type via its witness', () => {
      // Act
      type Described = InferTypeDescriptorType<typeof BooleanDescriptor>;

      // Assert
      expectTypeOf<Described>().toEqualTypeOf<boolean>();
    });
  });
});
