import { describe, expect, it } from 'vitest';
import {
  assert,
  AssertException,
  assertDefined,
  assertFunction,
  assertNonEmptyArray,
} from './assert.js';

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

  // ---------------------------------------------------------------------------
  // MARK: assertDefined
  // ---------------------------------------------------------------------------
  describe('assertDefined', () => {
    it('should not throw if the value is not nullish', () => {
      // Arrange
      const value = 'defined';

      // Act
      const act = () => assertDefined(value);

      // Assert
      expect(act).not.toThrow();
    });

    it('should not throw for falsy but defined values', () => {
      // Arrange / Act / Assert
      expect(() => assertDefined(0)).not.toThrow();
      expect(() => assertDefined('')).not.toThrow();
      expect(() => assertDefined(false)).not.toThrow();
    });

    it('should throw an AssertException if the value is null', () => {
      // Arrange
      const value = null;

      // Act
      const act = () => assertDefined(value);

      // Assert
      expect(act).toThrow(AssertException);
    });

    it('should throw an AssertException if the value is undefined', () => {
      // Arrange
      const value = undefined;

      // Act
      const act = () => assertDefined(value);

      // Assert
      expect(act).toThrow(AssertException);
    });

    it('should include the provided message in the thrown error', () => {
      // Arrange
      const message = 'value must be defined';

      // Act
      const act = () => assertDefined(null, message);

      // Assert
      expect(act).toThrow('value must be defined');
    });

    it('should support a lazy message', () => {
      // Arrange
      const message = () => 'lazy message';

      // Act
      const act = () => assertDefined(undefined, message);

      // Assert
      expect(act).toThrow('lazy message');
    });
  });

  // ---------------------------------------------------------------------------
  // MARK: assertFunction
  // ---------------------------------------------------------------------------
  describe('assertFunction', () => {
    it('should not throw if the value is a function', () => {
      // Arrange
      const value = () => {};
      // Act
      const act = () => assertFunction(value);
      // Assert
      expect(act).not.toThrow();
    });

    it('should throw an AssertException if the value is not a function', () => {
      // Arrange
      const value = 'not a function';
      // Act
      const act = () => assertFunction(value);
      // Assert
      expect(act).toThrow(AssertException);
    });

    it('should include the provided message in the thrown error', () => {
      // Arrange
      const message = 'value must be a function';
      // Act
      const act = () => assertFunction(null, message);
      // Assert
      expect(act).toThrow('value must be a function');
    });
  });

  // ---------------------------------------------------------------------------
  // MARK: assertNonEmptyArray
  // ---------------------------------------------------------------------------
  describe('assertNonEmptyArray', () => {
    it('should not throw if the array has one element', () => {
      // Arrange
      const arr = [1];
      // Act
      const act = () => assertNonEmptyArray(arr);
      // Assert
      expect(act).not.toThrow();
    });

    it('should not throw if the array has many elements', () => {
      // Arrange
      const arr = [1, 2, 3];
      // Act
      const act = () => assertNonEmptyArray(arr);
      // Assert
      expect(act).not.toThrow();
    });

    it('should not throw for a non-empty readonly array', () => {
      // Arrange
      const arr: readonly number[] = [1];
      // Act
      const act = () => assertNonEmptyArray(arr);
      // Assert
      expect(act).not.toThrow();
    });

    it('should throw an AssertException if the array is empty', () => {
      // Arrange
      const arr: number[] = [];
      // Act
      const act = () => assertNonEmptyArray(arr);
      // Assert
      expect(act).toThrow(AssertException);
    });

    it('should include the provided message in the thrown error', () => {
      // Arrange
      const message = 'array must not be empty';
      // Act
      const act = () => assertNonEmptyArray([], message);
      // Assert
      expect(act).toThrow('array must not be empty');
    });

    it('should support a lazy message', () => {
      // Arrange
      const message = () => 'lazy message';
      // Act
      const act = () => assertNonEmptyArray([], message);
      // Assert
      expect(act).toThrow('lazy message');
    });
  });
});
