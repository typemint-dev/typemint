import { describe, expect, expectTypeOf, it } from 'vitest';
import { Kind, TypeDescriptor, witness } from '@typemint/core';
import {
  TypeMismatchError,
  type InferTypeMismatchErrorExpected,
  type InferTypeMismatchErrorReceived,
} from './type-mismatch.js';

describe('(unit) TypeMismatchError', () => {
  const numberDescriptor = TypeDescriptor('Number', witness<number>());
  const stringDescriptor = TypeDescriptor('String', witness<string>());

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: Construction
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Construction', () => {
    it('should tag the error with the TypeMismatchError kind', () => {
      // Arrange & Act
      const error = TypeMismatchError(numberDescriptor, stringDescriptor);

      // Assert
      expect(error.kind).toBe('TypeMismatchError');
    });

    it('should derive the message from the descriptor names', () => {
      // Arrange & Act
      const error = TypeMismatchError(numberDescriptor, stringDescriptor);

      // Assert
      expect(error.message).toBe('Expected Number but got String');
    });

    it('should preserve the expected and received descriptors in details', () => {
      // Arrange & Act
      const error = TypeMismatchError(numberDescriptor, stringDescriptor);

      // Assert
      expect(error.details.expected).toBe(numberDescriptor);
      expect(error.details.received).toBe(stringDescriptor);
    });

    it('should be narrowable via the Kind discriminant', () => {
      // Arrange
      const error: unknown = TypeMismatchError(
        numberDescriptor,
        stringDescriptor,
      );

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
      const error = TypeMismatchError(numberDescriptor, stringDescriptor);

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
      const error = TypeMismatchError(numberDescriptor, stringDescriptor);

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
