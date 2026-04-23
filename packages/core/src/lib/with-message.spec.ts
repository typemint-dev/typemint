import { describe, expect, expectTypeOf, it } from 'vitest';
import { assertWithMessage, WithMessage } from './with-message.js';
import { AssertException } from '../index.js';

describe('(unit) WithMessage', () => {
  // ---------------------------------------------------------------------------
  // MARK: from
  describe('from', () => {
    it('should create a WithMessage instance with the given message', () => {
      // Arrange
      const message = 'This is a message';
      // Act
      const result = WithMessage.from(message);
      // Assert
      expect(result).toEqual({ message: 'This is a message' });
    });

    it('should preserve the literal type of the message', () => {
      // Arrange
      const message = 'This is a message';
      // Act
      const result = WithMessage.from(message);
      // Assert
      expectTypeOf(result).toEqualTypeOf<WithMessage>();
    });
  });

  // ---------------------------------------------------------------------------
  // MARK: isOfType
  // ---------------------------------------------------------------------------
  describe('isOfType', () => {
    it('should return true if the value is a WithMessage', () => {
      // Arrange
      const value = WithMessage.from('This is a message');
      // Act
      const result = WithMessage.isOfType(value);
      // Assert
      expect(result).toBe(true);
    });

    it('should return false if the value is not a WithMessage', () => {
      // Arrange
      const value = 'not a WithMessage';
      // Act
      const result = WithMessage.isOfType(value);
      // Assert
      expect(result).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // MARK: getOr
  // ---------------------------------------------------------------------------
  describe('getOr', () => {
    it('should return the message if the value is a WithMessage', () => {
      // Arrange
      const value = WithMessage.from('This is a message');
      // Act
      const result = WithMessage.getOr(value, 'Default message');
      // Assert
      expect(result).toBe('This is a message');
    });

    it('should return the default value if the value is not a WithMessage', () => {
      // Arrange
      const value = 'not a WithMessage';
      // Act
      const result = WithMessage.getOr(value, 'Default message');
      // Assert
      expect(result).toBe('Default message');
    });

    it('should return a lazy default value if the value is not a WithMessage', () => {
      // Arrange
      const value = 'not a WithMessage';
      // Act
      const result = WithMessage.getOr(value, () => 'Default message');
      // Assert
      expect(result).toBe('Default message');
    });

    it('should return a message if the value has it', () => {
      // Arrange
      const value = WithMessage.from('This is a message');
      // Act
      const result = WithMessage.getOr(value, 'Default message');
      // Assert
      expect(result).toBe('This is a message');
    });
  });

  // ---------------------------------------------------------------------------
  // MARK: assertWithMessage
  // ---------------------------------------------------------------------------
  describe('assertWithMessage', () => {
    it('should not throw if the value is a WithMessage', () => {
      // Arrange
      const value = WithMessage.from('This is a message');
      // Act
      const act = () => assertWithMessage(value);

      // Assert
      expect(act).not.toThrow();
    });

    it('should throw an AssertException if the value is not a WithMessage', () => {
      // Arrange
      const value = 'not a WithMessage';
      // Act
      const act = () => assertWithMessage(value);
      // Assert
      expect(act).toThrow(AssertException);
    });

    it('should throw with the default message if the value is not a WithMessage', () => {
      // Arrange
      const value = 'not a WithMessage';
      // Act
      const act = () => assertWithMessage(value);
      // Assert
      expect(act).toThrow('Expected a record with message property');
    });

    it('should throw with a custom message if provided', () => {
      // Arrange
      const value = { otherProp: 'not a WithMessage' };
      const message = 'Value is not a WithMessage object';
      // Act
      const act = () => assertWithMessage(value, message);
      // Assert
      expect(act).toThrow(message);
    });

    it('should throw with a lazy message if provided', () => {
      // Arrange
      const value = { otherProp: 'not a WithMessage' };
      const message = () => 'Value is not a WithMessage object';
      // Act
      const act = () => assertWithMessage(value, message);
      // Assert
      expect(act).toThrow('Value is not a WithMessage object');
    });

    it('should narrow the type to the WithMessage type if the value is a WithMessage', () => {
      // Arrange
      const value: unknown | WithMessage =
        WithMessage.from('This is a message');
      // Act
      assertWithMessage(value);
      // Assert
      expectTypeOf(value).toEqualTypeOf<WithMessage>();
    });
  });
});
