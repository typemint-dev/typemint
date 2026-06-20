import { describe, expect, expectTypeOf, it } from 'vitest';
import { BigIntDescriptor } from './bigint.js';
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
});
