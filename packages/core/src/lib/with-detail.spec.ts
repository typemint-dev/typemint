import { describe, expect, expectTypeOf, it } from 'vitest';
import { WithDetail } from './with-detail.js';

describe('(unit) WithDetails', () => {
  // ---------------------------------------------------------------------------
  // MARK: isOfType
  // ---------------------------------------------------------------------------
  describe('isOfType', () => {
    it('should return true if the value is a WithDetails', () => {
      // Arrange
      const value = WithDetail.from({});
      // Act
      const result = WithDetail.isOfType(value);
      // Assert
      expect(result).toBe(true);
    });

    it('should return false if the value is not a WithDetails', () => {
      // Arrange
      const value = {};
      // Act
      const result = WithDetail.isOfType(value);
      // Assert
      expect(result).toBe(false);
    });

    it('should narrow the type to the WithDetails type if the value is a WithDetails', () => {
      // Arrange
      const value: unknown | WithDetail<Record<string, unknown>> =
        WithDetail.from({});
      // Act
      if (WithDetail.isOfType(value)) {
        // Assert
        expectTypeOf(value).toEqualTypeOf<
          WithDetail<Record<string, unknown>>
        >();
      } else {
        expectTypeOf(value).toBeUnknown();
      }
    });
  });
});
