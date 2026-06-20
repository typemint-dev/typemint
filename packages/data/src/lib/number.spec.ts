import { describe, expect, it } from 'vitest';
import { isNumber } from './number.js';

describe('(unit) number', () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: isNumber
  // ─────────────────────────────────────────────────────────────────────────────
  describe('isString', () => {
    it('should return true for a primitive number', () => {
      // Assert
      expect(isNumber(42)).toBe(true);
    });

    it('should return true for a negative number', () => {
      // Assert
      expect(isNumber(-42)).toBe(true);
    });

    it('should return true for a positive number', () => {
      // Assert
      expect(isNumber(42)).toBe(true);
    });

    it('should return true for a zero', () => {
      // Assert
      expect(isNumber(0)).toBe(true);
    });

    it('should return true for a floating point number', () => {
      // Assert
      expect(isNumber(3.14)).toBe(true);
    });

    it('should return true for a scientific notation number', () => {
      // Assert
      expect(isNumber(1e10)).toBe(true);
    });

    it('should return true for a binary number', () => {
      // Assert
      expect(isNumber(0b1010)).toBe(true);
    });

    it('should return true for an octal number', () => {
      // Assert
      expect(isNumber(0o10)).toBe(true);
    });

    it('should return true for a hexadecimal number', () => {
      // Assert
      expect(isNumber(0x10)).toBe(true);
    });

    it('should return true for a NaN', () => {
      // Assert
      expect(isNumber(NaN)).toBe(true);
    });

    it('should return true for a Infinity', () => {
      // Assert
      expect(isNumber(Infinity)).toBe(true);
    });

    it('should return false for a non-number', () => {
      // Assert
      expect(isNumber('42')).toBe(false);
    });
  });
});
