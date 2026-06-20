import { expect, it, describe, expectTypeOf } from 'vitest';
import { BooleanDescriptor, isBoolean } from './boolean.js';
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

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: isBoolean
  // ─────────────────────────────────────────────────────────────────────────────
  describe('isBoolean', () => {
    it('should return true for a primitive boolean', () => {
      // Assert
      expect(isBoolean(true)).toBe(true);
    });

    it.each([
      ['a number', 42],
      ['a string', 'hello'],
      ['a bigint', BigInt(1)],
      ['null', null],
      ['undefined', undefined],
      ['an object', {}],
      ['an array', []],
    ])('should return false for %s', (_label, value) => {
      // Assert
      expect(isBoolean(value)).toBe(false);
    });

    it('should narrow the value to boolean when it returns true', () => {
      // Arrange
      const value: unknown = true;
      // Act & Assert
      if (isBoolean(value)) {
        expectTypeOf<typeof value>().toEqualTypeOf<boolean>();
      } else {
        expectTypeOf<typeof value>().toBeUnknown();
      }
    });
  });
});
