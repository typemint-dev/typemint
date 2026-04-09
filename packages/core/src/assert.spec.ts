import { describe, expect, it } from 'vitest';
import { assert, AssertException } from './assert.js';

describe('(unit) AssertException', () => {
  // ---------------------------------------------------------------------------
  // MARK: constructor
  // ---------------------------------------------------------------------------
  describe('constructor', () => {
    it('should create an instance of Error', () => {
      // Arrange
      const exception = new AssertException('test');

      // Act
      // Assert
      expect(exception).toBeInstanceOf(Error);
    });

    it('should set the name to AssertException', () => {
      // Arrange
      const exception = new AssertException('test');

      // Act
      const result = exception.name;

      // Assert
      expect(result).toBe('AssertException');
    });

    it('should set the message to the provided string', () => {
      // Arrange
      const message = 'something went wrong';

      // Act
      const exception = new AssertException(message);

      // Assert
      expect(exception.message).toBe('something went wrong');
    });
  });
});

// ---------------------------------------------------------------------------
// MARK: assert
// ---------------------------------------------------------------------------
describe('(unit) assert', () => {
  describe('when the condition is true', () => {
    it('should not throw', () => {
      // Arrange
      const condition = true;

      // Act
      const act = () => assert(condition, 'should not throw');

      // Assert
      expect(act).not.toThrow();
    });
  });

  describe('when the condition is false', () => {
    it('should throw an AssertException', () => {
      // Arrange
      const condition = false;

      // Act
      const act = () => assert(condition, 'assertion failed');

      // Assert
      expect(act).toThrow(AssertException);
    });

    it('should include the provided message in the thrown error', () => {
      // Arrange
      const condition = false;
      const message = 'value must be positive';

      // Act
      const act = () => assert(condition, message);

      // Assert
      expect(act).toThrow('value must be positive');
    });
  });
});
