import { describe, expect, it } from 'vitest';
import { assertNonEmptyArray, isNonEmptyArray } from './array.js';
import { AssertException } from './assert.js';

describe('(unit) array', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // MARK: assertNonEmptyArray
  // ───────────────────────────────────────────────────────────────────────────
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

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: isNonEmptyArray
  // ───────────────────────────────────────────────────────────────────────────
  describe('isNonEmptyArray', () => {
    it('should return true if the array has one element', () => {
      // Arrange
      const arr = [1];
      // Assert
      expect(isNonEmptyArray(arr)).toBe(true);
    });

    it('should return true if the array has many elements', () => {
      // Arrange
      const arr = [1, 2, 3];
      // Assert
      expect(isNonEmptyArray(arr)).toBe(true);
    });

    it('should return true for a non-empty readonly array', () => {
      // Arrange
      const arr: readonly number[] = [1];
      // Assert
      expect(isNonEmptyArray(arr)).toBe(true);
    });

    it('should return false if the array is empty', () => {
      // Arrange
      const arr: number[] = [];
      // Assert
      expect(isNonEmptyArray(arr)).toBe(false);
    });

    it('should return false if the array is undefined', () => {
      // Arrange
      const arr: undefined[] = [];
      // Assert
      expect(isNonEmptyArray(arr)).toBe(false);
    });

    it('should return false if the array is null', () => {
      // Arrange
      const arr: null[] = [];
      // Assert
      expect(isNonEmptyArray(arr)).toBe(false);
    });
  });
});
