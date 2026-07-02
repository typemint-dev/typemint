import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  InferTypeDescriptorName,
  InferTypeDescriptorType,
  Kind,
} from '@typemint/core';
import {
  IsIntegerInvariant,
  IsLowerThanNumberInvariant,
  NumberDescriptor,
  isNumber,
  unknownToNumberDecoder,
  type UnknownToNumberDecoder,
} from './number.js';
import type { TypeMismatchError } from './type-mismatch.js';
import { assertErr } from '@typemint/result';
describe('(unit) number', () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: NumberDescriptor
  // ─────────────────────────────────────────────────────────────────────────────
  describe('NumberDescriptor', () => {
    it('should carry the literal name "number"', () => {
      // Assert
      expect(NumberDescriptor.name).toBe('number');
    });
    it('should infer the literal name "number"', () => {
      // Act
      type Name = InferTypeDescriptorName<typeof NumberDescriptor>;
      // Assert
      expectTypeOf<Name>().toEqualTypeOf<'number'>();
    });
    it('should describe the number type via its witness', () => {
      // Act
      type Described = InferTypeDescriptorType<typeof NumberDescriptor>;
      // Assert
      expectTypeOf<Described>().toEqualTypeOf<number>();
    });
  });
  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: isNumber
  // ─────────────────────────────────────────────────────────────────────────────
  describe('isNumber', () => {
    it('should return true for a primitive number', () => {
      // Assert
      expect(isNumber(42)).toBe(true);
    });
    it('should return true for zero', () => {
      // Assert
      expect(isNumber(0)).toBe(true);
    });
    it('should return true for NaN (typeof NaN is "number")', () => {
      // Assert
      expect(isNumber(NaN)).toBe(true);
    });
    it('should return true for Infinity', () => {
      // Assert
      expect(isNumber(Infinity)).toBe(true);
    });
    it.each([
      ['a string', '42'],
      ['a boolean', true],
      ['a bigint', 42n],
      ['null', null],
      ['undefined', undefined],
      ['an object', {}],
      ['an array', []],
      ['a Number wrapper object', new Number(42)],
    ])('should return false for %s', (_label, value) => {
      // Assert
      expect(isNumber(value)).toBe(false);
    });
    it('should narrow the value to number when it returns true', () => {
      // Arrange
      const value: unknown = 42;
      // Act & Assert
      if (isNumber(value)) {
        expectTypeOf<typeof value>().toEqualTypeOf<number>();
      } else {
        expectTypeOf<typeof value>().toBeUnknown();
      }
    });
  });
  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: unknownToNumberDecoder — success
  // ─────────────────────────────────────────────────────────────────────────────
  describe('unknownToNumberDecoder (success)', () => {
    it('should return an Ok for a number value', () => {
      // Act
      const result = unknownToNumberDecoder(42);
      // Assert
      expect(result.isOk()).toBe(true);
    });
    it('should preserve the decoded number value unchanged', () => {
      // Act
      const result = unknownToNumberDecoder(42);
      // Assert
      expect(result.unsafeUnwrap()).toBe(42);
    });
    it('should decode zero', () => {
      // Act
      const result = unknownToNumberDecoder(0);
      // Assert
      expect(result.isOk()).toBe(true);
      expect(result.unsafeUnwrap()).toBe(0);
    });
  });
  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: unknownToNumberDecoder — failure
  // ─────────────────────────────────────────────────────────────────────────────
  describe('unknownToNumberDecoder (failure)', () => {
    it('should return an Err for a non-number value', () => {
      // Act
      const result = unknownToNumberDecoder('42');
      // Assert
      expect(result.isErr()).toBe(true);
    });
    it('should fail with a TypeMismatchError', () => {
      // Act
      const result = unknownToNumberDecoder('42');
      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(Kind.isOf(result.unwrapErr(), 'TypeMismatchError')).toBe(true);
      }
    });
    it('should expect the NumberDescriptor in the error details', () => {
      // Act
      const result = unknownToNumberDecoder('42');
      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.unwrapErr().details.expected).toBe(NumberDescriptor);
      }
    });
    it('should preserve the received value in the error details', () => {
      // Arrange
      const value = { id: 1 };
      // Act
      const result = unknownToNumberDecoder(value);
      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.unwrapErr().details.received).toBe(value);
      }
    });
    it.each([
      ['42', 'Expected number but got string'],
      [true, 'Expected number but got boolean'],
      [null, 'Expected number but got null'],
      [[1, 2], 'Expected number but got Array'],
    ])(
      'should derive the message from the received runtime type for %s',
      (value, message) => {
        // Act
        const result = unknownToNumberDecoder(value);
        // Assert
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.unwrapErr().message).toBe(message);
        }
      },
    );
  });
  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: UnknownToNumberDecoder type
  // ─────────────────────────────────────────────────────────────────────────────
  describe('UnknownToNumberDecoder type', () => {
    it('should type the canonical decoder as an UnknownToNumberDecoder', () => {
      // Assert
      expectTypeOf(
        unknownToNumberDecoder,
      ).toEqualTypeOf<UnknownToNumberDecoder>();
    });
    it('should produce a number success channel and a TypeMismatchError failure channel', () => {
      // Act
      const result = unknownToNumberDecoder(42);
      // Assert
      if (result.isOk()) {
        expectTypeOf(result.value).toEqualTypeOf<number>();
      } else {
        expectTypeOf(result.error).toEqualTypeOf<
          TypeMismatchError<number, unknown>
        >();
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: IsIntegerInvariant
  // ─────────────────────────────────────────────────────────────────────────────
  describe('IsIntegerInvariant', () => {
    it('should return an Ok for an integer value', () => {
      // Arrange
      const invariant = IsIntegerInvariant();
      // Act
      const result = invariant(42);
      // Assert
      expect(result.isOk()).toBe(true);
    });

    it('should return an Err for a non-integer value', () => {
      // Arrange
      const invariant = IsIntegerInvariant();
      // Act
      const result = invariant(42.5);
      // Assert
      expect(result.isErr()).toBe(true);
    });

    it('should fail with an IsIntegerInvariantError', () => {
      // Arrange
      const invariant = IsIntegerInvariant();
      // Act
      const result = invariant(42.5);
      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(Kind.isOf(result.unwrapErr(), 'IsIntegerInvariantError')).toBe(
          true,
        );
      }
    });

    it('should use the default message', () => {
      // Arrange
      const invariant = IsIntegerInvariant();
      // Act
      const result = invariant(42.5);
      // Assert
      assertErr(result);
      expect(result.error.message).toBe('Value must be an integer');
    });

    it('should use the provided message', () => {
      // Arrange
      const invariant = IsIntegerInvariant({
        message: 'My Value must be an integer',
      });
      // Act
      const result = invariant(42.5);
      // Assert
      assertErr(result);
      expect(result.error.message).toBe('My Value must be an integer');
    });

    it('should use the provided message function', () => {
      // Arrange
      const invariant = IsIntegerInvariant({
        message: (value) => `My Value ${value} must be an integer`,
      });
      // Act
      const result = invariant(42.5);
      // Assert
      assertErr(result);
      expect(result.error.message).toBe('My Value 42.5 must be an integer');
    });

    it('should preserve the received value in the error details', () => {
      // Arrange
      const invariant = IsIntegerInvariant();
      // Act
      const result = invariant(42.5);
      // Assert
      assertErr(result);
      expect(result.error.details.received).toBe(42.5);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: IsLowerThanNumberInvariant
  // ─────────────────────────────────────────────────────────────────────────────
  describe('IsLowerThanNumberInvariant', () => {
    it('should return an Ok for a value less than the lower bound', () => {
      // Arrange
      const invariant = IsLowerThanNumberInvariant({ lowerBound: 42 });

      // Act
      const result = invariant(41);
      // Assert
      expect(result.isOk()).toBe(true);
    });

    it('should return an Err for a value greater than the lower bound', () => {
      // Arrange
      const invariant = IsLowerThanNumberInvariant({ lowerBound: 42 });
      // Act
      const result = invariant(43);
      // Assert
      assertErr(result);
    });

    it('should fail with an IsLowerThanNumberInvariantError', () => {
      // Arrange
      const invariant = IsLowerThanNumberInvariant({ lowerBound: 42 });
      // Act
      const result = invariant(43);
      // Assert
      assertErr(result);
      expect(
        Kind.isOf(result.unwrapErr(), 'IsLowerThanNumberInvariantError'),
      ).toBe(true);
    });

    it('should use the default message', () => {
      // Arrange
      const invariant = IsLowerThanNumberInvariant({ lowerBound: 42 });
      // Act
      const result = invariant(43);
      // Assert
      assertErr(result);
      expect(result.error.message).toBe('Value must be less than 42. Got 43.');
    });

    it('should use the provided message', () => {
      // Arrange
      const invariant = IsLowerThanNumberInvariant({
        lowerBound: 42,
        message: 'My Value must be less than 42',
      });
      // Act
      const result = invariant(43);
      // Assert
      assertErr(result);
      expect(result.error.message).toBe('My Value must be less than 42');
    });
  });
});
