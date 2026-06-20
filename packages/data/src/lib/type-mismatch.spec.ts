import { describe, expect, expectTypeOf, it } from 'vitest';
import { Kind, TypeDescriptor, witness } from '@typemint/core';
import {
  TypeMismatchError,
  type InferTypeMismatchErrorExpected,
  type InferTypeMismatchErrorReceived,
} from './type-mismatch.js';

describe('(unit) TypeMismatchError', () => {
  const numberDescriptor = TypeDescriptor('Number', witness<number>());

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: Construction
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Construction', () => {
    it('should tag the error with the TypeMismatchError kind', () => {
      // Arrange & Act
      const error = TypeMismatchError(numberDescriptor, 'hello');

      // Assert
      expect(error.kind).toBe('TypeMismatchError');
    });

    it('should derive the message from the expected name and received value', () => {
      // Arrange & Act
      const error = TypeMismatchError(numberDescriptor, 'hello');

      // Assert
      expect(error.message).toBe('Expected Number but got string');
    });

    it('should describe the runtime type of common received values', () => {
      // Arrange & Act & Assert
      expect(TypeMismatchError(numberDescriptor, null).message).toBe(
        'Expected Number but got null',
      );
      expect(TypeMismatchError(numberDescriptor, [1, 2]).message).toBe(
        'Expected Number but got Array',
      );
      expect(TypeMismatchError(numberDescriptor, true).message).toBe(
        'Expected Number but got boolean',
      );
    });

    it('should preserve the expected descriptor and received value in details', () => {
      // Arrange & Act
      const error = TypeMismatchError(numberDescriptor, 'hello');

      // Assert
      expect(error.details.expected).toBe(numberDescriptor);
      expect(error.details.received).toBe('hello');
    });

    it('should be narrowable via the Kind discriminant', () => {
      // Arrange
      const error: unknown = TypeMismatchError(numberDescriptor, 'hello');

      // Act & Assert
      expect(Kind.isOf(error, 'TypeMismatchError')).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: Infer expected type
  // ─────────────────────────────────────────────────────────────────────────────
  describe('InferTypeMismatchErrorExpected', () => {
    it('should infer the expected type from the error type', () => {
      // Arrange
      type Err = TypeMismatchError<number, string>;

      // Act
      type Expected = InferTypeMismatchErrorExpected<Err>;

      // Assert
      expectTypeOf<Expected>().toEqualTypeOf<number>();
    });

    it('should infer the expected type from a constructed error', () => {
      // Arrange
      const error = TypeMismatchError(numberDescriptor, 'hello');

      // Act
      type Expected = InferTypeMismatchErrorExpected<typeof error>;

      // Assert
      expectTypeOf<Expected>().toEqualTypeOf<number>();
    });

    it('should not allow inferring from a non-error type', () => {
      // Arrange
      type NotAnError = number;

      // Act
      // @ts-expect-error - number does not satisfy the TypeMismatchError constraint
      type Expected = InferTypeMismatchErrorExpected<NotAnError>;
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: Infer received type
  // ─────────────────────────────────────────────────────────────────────────────
  describe('InferTypeMismatchErrorReceived', () => {
    it('should infer the received type from the error type', () => {
      // Arrange
      type Err = TypeMismatchError<number, string>;

      // Act
      type Received = InferTypeMismatchErrorReceived<Err>;

      // Assert
      expectTypeOf<Received>().toEqualTypeOf<string>();
    });

    it('should infer the received type from a constructed error', () => {
      // Arrange
      const error = TypeMismatchError(numberDescriptor, 'hello');

      // Act
      type Received = InferTypeMismatchErrorReceived<typeof error>;

      // Assert
      expectTypeOf<Received>().toEqualTypeOf<string>();
    });

    it('should not allow inferring from a non-error type', () => {
      // Arrange
      type NotAnError = string;

      // Act
      // @ts-expect-error - string does not satisfy the TypeMismatchError constraint
      type Received = InferTypeMismatchErrorReceived<NotAnError>;
    });
  });
});
