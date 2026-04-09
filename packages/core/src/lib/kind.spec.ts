import { describe, expect, expectTypeOf, it } from 'vitest';
import { AssertException } from './assert.js';
import { assertKind, Kind, type KindDescriptor } from './kind.js';

describe('(unit) Kind', () => {
  // ---------------------------------------------------------------------------
  // MARK: descriptor
  // ---------------------------------------------------------------------------
  describe('descriptor', () => {
    it('should be a DiscriminantDescriptor keyed by "kind"', () => {
      // Arrange
      // Act
      // Assert
      expectTypeOf(Kind).toEqualTypeOf<KindDescriptor>();
    });

    it('should expose "kind" as its key', () => {
      // Arrange
      // Act
      const result = Kind.key;

      // Assert
      expect(result).toBe('kind');
    });
  });

  // ---------------------------------------------------------------------------
  // MARK: of
  // ---------------------------------------------------------------------------
  describe('of', () => {
    it('should create an object with the "kind" key', () => {
      // Arrange
      // Act
      const result = Kind.of('user');

      // Assert
      expect(result).toEqual({ kind: 'user' });
    });
  });
});

// ---------------------------------------------------------------------------
// MARK: assertKind
// ---------------------------------------------------------------------------
describe('(unit) assertKind', () => {
  describe('when the value matches the expected kind', () => {
    it('should not throw', () => {
      // Arrange
      const value = { kind: 'user', name: 'Alice' };

      // Act
      const act = () => assertKind(value, 'user');

      // Assert
      expect(act).not.toThrow();
    });

    it('should narrow the type to Kind<TKind>', () => {
      // Arrange
      const value: unknown = { kind: 'admin' };

      // Act
      assertKind(value, 'admin');

      // Assert
      expectTypeOf(value).toEqualTypeOf<{ kind: 'admin' }>();
    });
  });

  describe('when the value has a different kind', () => {
    it('should throw an AssertException', () => {
      // Arrange
      const value = { kind: 'admin' };

      // Act
      const act = () => assertKind(value, 'user');

      // Assert
      expect(act).toThrow(AssertException);
    });
  });

  describe('when the value is not an object with a kind key', () => {
    it('should throw for a primitive value', () => {
      // Arrange
      const value = 'not-an-object';

      // Act
      const act = () => assertKind(value, 'user');

      // Assert
      expect(act).toThrow(AssertException);
    });

    it('should throw for null', () => {
      // Arrange
      const value = null;

      // Act
      const act = () => assertKind(value, 'user');

      // Assert
      expect(act).toThrow(AssertException);
    });

    it('should throw for an object missing the kind key', () => {
      // Arrange
      const value = { other: 'field' };

      // Act
      const act = () => assertKind(value, 'user');

      // Assert
      expect(act).toThrow(AssertException);
    });
  });

  describe('when a custom message is provided', () => {
    it('should use the custom message in the thrown error', () => {
      // Arrange
      const value = { kind: 'admin' };
      const message = 'Expected a user entity';

      // Act
      const act = () => assertKind(value, 'user', message);

      // Assert
      expect(act).toThrow('Expected a user entity');
    });
  });

  describe('when no custom message is provided', () => {
    it('should include the expected kind in the default message', () => {
      // Arrange
      const value = { kind: 'admin' };

      // Act
      const act = () => assertKind(value, 'user');

      // Assert
      expect(act).toThrow(/user/);
    });
  });
});
