import { expect, it, describe, expectTypeOf } from 'vitest';
import {
  Kind,
  type InferTypeDescriptorName,
  type InferTypeDescriptorType,
} from '@typemint/core';
import {
  BooleanDescriptor,
  isBoolean,
  unknownToBooleanDecoder,
  type UnknownToBooleanDecoder,
} from './boolean.js';
import type { TypeMismatchError } from './type-mismatch.js';

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

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: unknownToBooleanDecoder - success
  // ─────────────────────────────────────────────────────────────────────────────
  describe('unknownToBooleanDecoder (success)', () => {
    it('should return an Ok for a boolean value', () => {
      // Act
      const result = unknownToBooleanDecoder(true);

      // Assert
      expect(result.isOk()).toBe(true);
    });

    it('should preserve the decoded boolean value unchanged', () => {
      // Act
      const result = unknownToBooleanDecoder(true);

      // Assert
      expect(result.unsafeUnwrap()).toBe(true);
    });

    it('should decode false', () => {
      // Act
      const result = unknownToBooleanDecoder(false);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(result.unsafeUnwrap()).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: unknownToBooleanDecoder - failure
  // ─────────────────────────────────────────────────────────────────────────────
  describe('unknownToBooleanDecoder (failure)', () => {
    it('should return an Err for a non-boolean value', () => {
      // Act
      const result = unknownToBooleanDecoder(42);

      // Assert
      expect(result.isErr()).toBe(true);
    });

    it('should fail with a TypeMismatchError', () => {
      // Act
      const result = unknownToBooleanDecoder(42);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(Kind.isOf(result.unwrapErr(), 'TypeMismatchError')).toBe(true);
      }
    });

    it('should expect the BooleanDescriptor in the error details', () => {
      // Act
      const result = unknownToBooleanDecoder(42);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.unwrapErr().details.expected).toBe(BooleanDescriptor);
      }
    });

    it('should preserve the received value in the error details', () => {
      // Arrange
      const value = { id: 1 };

      // Act
      const result = unknownToBooleanDecoder(value);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.unwrapErr().details.received).toBe(value);
      }
    });

    it.each([
      [42, 'Expected boolean but got number'],
      ['hello', 'Expected boolean but got string'],
      [null, 'Expected boolean but got null'],
      [[1, 2], 'Expected boolean but got Array'],
    ])(
      'should derive the message from the received runtime type for %s',
      (value, message) => {
        // Act
        const result = unknownToBooleanDecoder(value);

        // Assert
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.unwrapErr().message).toBe(message);
        }
      },
    );
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: UnknownToBooleanDecoder type
  // ─────────────────────────────────────────────────────────────────────────────
  describe('UnknownToBooleanDecoder type', () => {
    it('should type the canonical decoder as an UnknownToBooleanDecoder', () => {
      // Assert
      expectTypeOf(
        unknownToBooleanDecoder,
      ).toEqualTypeOf<UnknownToBooleanDecoder>();
    });

    it('should produce a boolean success channel and a TypeMismatchError failure channel', () => {
      // Act
      const result = unknownToBooleanDecoder(true);

      // Assert
      if (result.isOk()) {
        expectTypeOf(result.value).toEqualTypeOf<boolean>();
      } else {
        expectTypeOf(result.error).toEqualTypeOf<
          TypeMismatchError<boolean, unknown>
        >();
      }
    });
  });
});
