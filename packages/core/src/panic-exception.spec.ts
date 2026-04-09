import { describe, expect, it } from 'vitest';
import { PanicException } from './panic-exception.js';

describe('(Unit) PanicException', () => {
  // ---------------------------------------------------------------------------
  // MARK: constructor
  describe('when creating PanicException directly', () => {
    it('should set the message and name', () => {
      // Arrange
      const message = 'panic happened';

      // Act
      const exception = new PanicException(message);

      // Assert
      expect(exception.message).toBe(message);
      expect(exception.name).toBe('PanicException');
      expect(exception).toBeInstanceOf(Error);
    });

    it('should set the cause when provided', () => {
      // Arrange
      const cause = { code: 'E_PANIC' };

      // Act
      const exception = new PanicException('panic', cause);

      // Assert
      expect(exception.cause).toBe(cause);
    });
  });

  // ---------------------------------------------------------------------------
  // MARK: panic
  describe('when creating a PanicException with panic()', () => {
    it('should throw a PanicException', () => {
      // Arrange
      const message = 'panic happened';
      // Act
      const throwPanicFn = PanicException.panic(message);
      const cause = { code: 'E_PANIC' };
      const act = () => throwPanicFn(cause);
      // Assert
      expect(act).toThrow(PanicException);
    });
  });
});
