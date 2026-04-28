import { describe, expect, it } from 'vitest';
import { flow } from './flow.js';
import { identity } from './identity.js';
import { struct } from './struct.js';
import { tuple } from './tuple.js';

describe('(unit) identity', () => {
  // ---------------------------------------------------------------------------
  // MARK: invocation shape
  // ---------------------------------------------------------------------------
  describe('invocation shape', () => {
    it('should be a function', () => {
      // Arrange / Act / Assert
      expect(typeof identity).toBe('function');
    });
  });

  // ---------------------------------------------------------------------------
  // MARK: identity behavior
  // ---------------------------------------------------------------------------
  describe('identity behavior', () => {
    it('should return a number argument unchanged', () => {
      // Arrange
      const value = 42;

      // Act
      const result = identity(value);

      // Assert
      expect(result).toBe(42);
    });

    it('should return a string argument unchanged', () => {
      // Arrange
      const value = 'hello';

      // Act
      const result = identity(value);

      // Assert
      expect(result).toBe('hello');
    });

    it('should return a boolean argument unchanged', () => {
      // Arrange
      const value = true;

      // Act
      const result = identity(value);

      // Assert
      expect(result).toBe(true);
    });

    it('should return null unchanged', () => {
      // Arrange / Act
      const result = identity(null);

      // Assert
      expect(result).toBeNull();
    });

    it('should return undefined unchanged', () => {
      // Arrange / Act
      const result = identity(undefined);

      // Assert
      expect(result).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // MARK: reference preservation
  // ---------------------------------------------------------------------------
  describe('reference preservation', () => {
    it('should return the same object reference for object inputs', () => {
      // Arrange
      const value = { a: 1 };

      // Act
      const result = identity(value);

      // Assert
      expect(result).toBe(value);
    });

    it('should return the same array reference for array inputs', () => {
      // Arrange
      const value = [1, 2, 3];

      // Act
      const result = identity(value);

      // Assert
      expect(result).toBe(value);
    });

    it('should return the same function reference for function inputs', () => {
      // Arrange
      const value = () => 1;

      // Act
      const result = identity(value);

      // Assert
      expect(result).toBe(value);
    });

    it('should not freeze or otherwise mutate the input', () => {
      // Arrange
      const value: { a: number } = { a: 1 };

      // Act
      identity(value);
      value.a = 2;

      // Assert
      expect(value.a).toBe(2);
      expect(Object.isFrozen(value)).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // MARK: composition
  // ---------------------------------------------------------------------------
  describe('composition', () => {
    it('should be usable as an operator inside a flow', () => {
      // Arrange
      const pipeline = flow(
        (s: string) => s.trim(),
        identity,
        (s) => s.toUpperCase(),
      );

      // Act
      const result = pipeline('  hi  ');

      // Assert
      expect(result).toBe('HI');
    });

    it('should produce the same flow output as omitting identity', () => {
      // Arrange
      const a = (n: number) => n + 1;
      const b = (n: number) => n * 2;
      const withIdentity = flow(a, identity, b);
      const withoutIdentity = flow(a, b);

      // Act
      const viaIdentity = withIdentity(3);
      const viaPlain = withoutIdentity(3);

      // Assert
      expect(viaIdentity).toBe(viaPlain);
    });

    it('should be usable as a field operator inside a struct', () => {
      // Arrange
      const op = struct({
        a: identity,
        b: (s: string) => s.toUpperCase(),
      });

      // Act
      const result = op({ a: 1, b: 'x' });

      // Assert
      expect(result).toEqual({ a: 1, b: 'X' });
    });

    it('should be usable as a position operator inside a tuple', () => {
      // Arrange
      const op = tuple([identity, (s: string) => s.toUpperCase()]);

      // Act
      const result = op([1, 'x']);

      // Assert
      expect(result).toEqual([1, 'X']);
    });

    it('should serve as a default for an optional transform', () => {
      // Arrange
      const apply = <T>(value: T, map?: (v: T) => T): T =>
        (map ?? identity)(value);

      // Act
      const withMap = apply(3, (n) => n * 2);
      const withoutMap = apply(3);

      // Assert
      expect([withMap, withoutMap]).toEqual([6, 3]);
    });
  });
});
