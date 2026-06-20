import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  Kind,
  type InferTypeDescriptorName,
  type InferTypeDescriptorType,
} from '@typemint/core';
import {
  BigIntDescriptor,
  isBigInt,
  unknownToBigIntDecoder,
  type UnknownToBigIntDecoder,
} from './bigint.js';
import type { TypeMismatchError } from './type-mismatch.js';

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

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: unknownToBigIntDecoder - success
  // ─────────────────────────────────────────────────────────────────────────────
  describe('unknownToBigIntDecoder (success)', () => {
    it('should return an Ok for a bigint value', () => {
      // Act
      const result = unknownToBigIntDecoder(BigInt(42));

      // Assert
      expect(result.isOk()).toBe(true);
    });

    it('should preserve the decoded bigint value unchanged', () => {
      // Act
      const result = unknownToBigIntDecoder(BigInt(42));

      // Assert
      expect(result.unsafeUnwrap()).toBe(BigInt(42));
    });

    it('should decode zero bigint', () => {
      // Act
      const result = unknownToBigIntDecoder(BigInt(0));

      // Assert
      expect(result.isOk()).toBe(true);
      expect(result.unsafeUnwrap()).toBe(BigInt(0));
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: unknownToBigIntDecoder - failure
  // ─────────────────────────────────────────────────────────────────────────────
  describe('unknownToBigIntDecoder (failure)', () => {
    it('should return an Err for a non-bigint value', () => {
      // Act
      const result = unknownToBigIntDecoder(42);

      // Assert
      expect(result.isErr()).toBe(true);
    });

    it('should fail with a TypeMismatchError', () => {
      // Act
      const result = unknownToBigIntDecoder(42);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(Kind.isOf(result.unwrapErr(), 'TypeMismatchError')).toBe(true);
      }
    });

    it('should expect the BigIntDescriptor in the error details', () => {
      // Act
      const result = unknownToBigIntDecoder(42);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.unwrapErr().details.expected).toBe(BigIntDescriptor);
      }
    });

    it('should preserve the received value in the error details', () => {
      // Arrange
      const value = { id: 1 };

      // Act
      const result = unknownToBigIntDecoder(value);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.unwrapErr().details.received).toBe(value);
      }
    });

    it.each([
      [42, 'Expected bigint but got number'],
      [true, 'Expected bigint but got boolean'],
      [null, 'Expected bigint but got null'],
      [[1, 2], 'Expected bigint but got Array'],
    ])(
      'should derive the message from the received runtime type for %s',
      (value, message) => {
        // Act
        const result = unknownToBigIntDecoder(value);

        // Assert
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.unwrapErr().message).toBe(message);
        }
      },
    );
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: UnknownToBigIntDecoder type
  // ─────────────────────────────────────────────────────────────────────────────
  describe('UnknownToBigIntDecoder type', () => {
    it('should type the canonical decoder as an UnknownToBigIntDecoder', () => {
      // Assert
      expectTypeOf(
        unknownToBigIntDecoder,
      ).toEqualTypeOf<UnknownToBigIntDecoder>();
    });

    it('should produce a bigint success channel and a TypeMismatchError failure channel', () => {
      // Act
      const result = unknownToBigIntDecoder(BigInt(42));

      // Assert
      if (result.isOk()) {
        expectTypeOf(result.value).toEqualTypeOf<bigint>();
      } else {
        expectTypeOf(result.error).toEqualTypeOf<
          TypeMismatchError<bigint, unknown>
        >();
      }
    });
  });
});
