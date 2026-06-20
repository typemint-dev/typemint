import { describe, expect, expectTypeOf, it } from 'vitest';
import { BigIntDescriptor, isBigInt } from './bigint.js';
import type {
  InferTypeDescriptorName,
  InferTypeDescriptorType,
} from '@typemint/core';

describe('(unit) bigint', () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: BigIntDescriptor
  // ─────────────────────────────────────────────────────────────────────────────
  describe('BigIntDescriptor', () => {
    it('should carry the literal name "bigint"', () => {
      // Assert
      expect(BigIntDescriptor.name).toBe('bigint');
    });

    it('should infer the literal name "bigint"', () => {
      // Act
      type Name = InferTypeDescriptorName<typeof BigIntDescriptor>;

      // Assert
      expectTypeOf<Name>().toEqualTypeOf<'bigint'>();
    });

    it('should describe the bigint type via its witness', () => {
      // Act
      type Described = InferTypeDescriptorType<typeof BigIntDescriptor>;

      // Assert
      expectTypeOf<Described>().toEqualTypeOf<bigint>();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: isBigInt
  // ─────────────────────────────────────────────────────────────────────────────
  describe('isBigInt', () => {
    it('should return true for a primitive bigint', () => {
      // Assert
      expect(isBigInt(BigInt(1))).toBe(true);
    });

    it.each([
      ['a number', 42],
      ['a boolean', true],
      ['null', null],
      ['undefined', undefined],
      ['an object', {}],
      ['an array', []],
    ])('should return false for %s', (_label, value) => {
      // Assert
      expect(isBigInt(value)).toBe(false);
    });

    it('should narrow the value to bigint when it returns true', () => {
      // Arrange
      const value: unknown = BigInt(1);

      // Act & Assert
      if (isBigInt(value)) {
        expectTypeOf<typeof value>().toEqualTypeOf<bigint>();
      } else {
        expectTypeOf<typeof value>().toBeUnknown();
      }
    });
  });
});
