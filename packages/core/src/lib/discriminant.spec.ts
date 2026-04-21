import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { Discriminant, type DiscriminantDescriptor } from './discriminant.js';
import { PanicException } from './panic-exception.js';

const TestDisc = Discriminant('__test');

type User = { __test: 'user'; name: string };
type Admin = { __test: 'admin'; level: number };
type Entity = User | Admin;

describe('(unit) Discriminant', () => {
  // ---------------------------------------------------------------------------
  // MARK: factory
  // ---------------------------------------------------------------------------
  describe('factory', () => {
    it('should return a DiscriminantDescriptor', () => {
      // Arrange
      const descriptor = Discriminant('__kind');

      // Act
      // Assert
      expectTypeOf(descriptor).toEqualTypeOf<
        DiscriminantDescriptor<'__kind'>
      >();
    });

    it('should expose the key used to create it', () => {
      // Arrange
      const descriptor = Discriminant('__kind');

      // Act
      const result = descriptor.key;

      // Assert
      expect(result).toBe('__kind');
    });
  });

  // ---------------------------------------------------------------------------
  // MARK: of
  // ---------------------------------------------------------------------------
  describe('of', () => {
    it('should create an object with the discriminant key and value', () => {
      // Arrange
      const result = TestDisc.of('user');

      // Assert
      expect(result).toEqual({ __test: 'user' });
    });

    it('should preserve the literal type of the discriminant value', () => {
      // Arrange
      const result = TestDisc.of('user');

      // Act
      // Assert
      expectTypeOf(result).toEqualTypeOf<{ __test: 'user' }>();
    });
  });

  // ---------------------------------------------------------------------------
  // MARK: isOfType
  // ---------------------------------------------------------------------------
  describe('isOfType', () => {
    describe('when given an object with the discriminant key', () => {
      it('should return true', () => {
        // Arrange
        const value = { __test: 'user', name: 'Alice' };

        // Act
        const result = TestDisc.isOfType(value);

        // Assert
        expect(result).toBe(true);
      });

      it('should narrow the type to Discriminant with string value', () => {
        const value: unknown = { __test: 'user' };

        if (TestDisc.isOfType(value)) {
          expectTypeOf(value).toEqualTypeOf<{ __test: string }>();
        }
      });
    });

    describe('when given an object without the discriminant key', () => {
      it('should return false', () => {
        // Arrange
        const value = { other: 'value' };

        // Act
        const result = TestDisc.isOfType(value);

        // Assert
        expect(result).toBe(false);
      });
    });

    describe('when given a non-object value', () => {
      it('should return false for null', () => {
        // Arrange
        // Act
        const result = TestDisc.isOfType(null);

        // Assert
        expect(result).toBe(false);
      });

      it('should return false for a primitive', () => {
        // Arrange
        // Act
        const result = TestDisc.isOfType('string');

        // Assert
        expect(result).toBe(false);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // MARK: isOf
  // ---------------------------------------------------------------------------
  describe('isOf', () => {
    describe('when the value matches the key and discriminant', () => {
      it('should return true', () => {
        // Arrange
        const value = { __test: 'user', name: 'Alice' };

        // Act
        const result = TestDisc.isOf(value, 'user');

        // Assert
        expect(result).toBe(true);
      });

      it('should narrow the type to the specific discriminant', () => {
        // Arrange
        const value: unknown = { __test: 'admin' };

        // Act
        const isAdmin = TestDisc.isOf(value, 'admin');
        // Assert
        if (isAdmin) {
          expectTypeOf(value).toEqualTypeOf<{ __test: 'admin' }>();
        } else {
          expectTypeOf(value).toBeUnknown();
        }
      });
    });

    describe('when the key exists but the value does not match', () => {
      it('should return false', () => {
        // Arrange
        const value = { __test: 'admin', level: 5 };

        // Act
        const result = TestDisc.isOf(value, 'user');

        // Assert
        expect(result).toBe(false);
      });
    });

    describe('when the key does not exist', () => {
      it('should return false', () => {
        // Arrange
        const value = { other: 'value' };

        // Act
        const result = TestDisc.isOf(value, 'user');

        // Assert
        expect(result).toBe(false);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // MARK: getKey
  // ---------------------------------------------------------------------------
  describe('getKey', () => {
    it('should return the discriminant value', () => {
      // Arrange
      const value = TestDisc.of('user');

      // Act
      const result = TestDisc.getKey(value);

      // Assert
      expect(result).toBe('user');
    });

    it('should preserve the literal type of the discriminant value', () => {
      // Arrange
      const value = TestDisc.of('admin');

      // Act
      const result = TestDisc.getKey(value);

      // Assert
      expectTypeOf(result).toEqualTypeOf<'admin'>();
    });
  });

  // ---------------------------------------------------------------------------
  // MARK: getValue
  // ---------------------------------------------------------------------------
  describe('getValue', () => {
    it('should return the discriminant value', () => {
      // Arrange
      const value = TestDisc.of('user');

      // Act
      const result = TestDisc.getValue(value);

      // Assert
      expect(result).toBe('user');
    });

    it('should preserve the literal type of the discriminant value', () => {
      // Arrange
      const value = TestDisc.of('admin');

      // Act
      const result = TestDisc.getValue(value);

      // Assert
      expectTypeOf(result).toEqualTypeOf<'admin'>();
    });
  });

  // ---------------------------------------------------------------------------
  // MARK: match
  // ---------------------------------------------------------------------------
  describe('match', () => {
    describe('when a matching handler exists', () => {
      it('should call the correct handler for a user', () => {
        // Arrange
        const value: Entity = { __test: 'user', name: 'Alice' } as Entity;

        // Act
        const result = TestDisc.match(value, {
          user: (v) => v.name,
          admin: (v) => v.level,
        });

        // Assert
        expect(result).toBe('Alice');
      });

      it('should call the correct handler for an admin', () => {
        // Arrange
        const value: Entity = { __test: 'admin', level: 5 } as Entity;

        // Act
        const result = TestDisc.match(value, {
          user: (v) => v.name,
          admin: (v) => v.level,
        });

        // Assert
        expect(result).toBe(5);
      });
    });

    describe('when inferring return types', () => {
      it('should infer the union of all handler return types', () => {
        // Arrange
        const value: Entity = { __test: 'user', name: 'Alice' } as Entity;

        // Act
        const result = TestDisc.match(value, {
          user: (v) => v.name,
          admin: (v) => v.level,
        });

        // Assert
        expectTypeOf(result).toEqualTypeOf<string | number>();
      });

      it('should infer literal types when handlers return constants', () => {
        // Arrange
        const value: Entity = { __test: 'user', name: 'Alice' } as Entity;

        // Act
        const result = TestDisc.match(value, {
          user: () => 'is-user' as const,
          admin: () => 'is-admin' as const,
        });

        // Assert
        expectTypeOf(result).toEqualTypeOf<'is-user' | 'is-admin'>();
      });
    });

    describe('when handler narrows the value type', () => {
      it('should pass the narrowed User type to the user handler', () => {
        // Arrange
        const value: Entity = { __test: 'user', name: 'Alice' } as Entity;

        // Act
        TestDisc.match(value, {
          user: (v) => {
            // Assert
            expectTypeOf(v).toEqualTypeOf<User>();
            return v;
          },
          admin: (v) => {
            // Assert
            expectTypeOf(v).toEqualTypeOf<Admin>();
            return v;
          },
        });
      });
    });

    describe('when no matching handler exists', () => {
      it('should throw a PanicException', () => {
        // Arrange
        const value = { __test: 'unknown' } as unknown as Entity;

        // Act
        const act = () =>
          TestDisc.match(value, {
            user: (v) => v.name,
            admin: (v) => v.level,
          });

        // Assert
        expect(act).toThrow(PanicException);
      });

      it('should include the unmatched discriminant in the error message', () => {
        // Arrange
        const value = { __test: 'unknown' } as unknown as Entity;

        // Act
        const act = () =>
          TestDisc.match(value, {
            user: (v) => v.name,
            admin: (v) => v.level,
          });

        // Assert
        expect(act).toThrow(/unknown/);
      });
    });

    describe('when matching value of two ad hoc created objects', () => {
      it('should match one of them', () => {
        // Arrange
        const KindDiscriminant = Discriminant('__kind');

        const raccoon = {
          ...KindDiscriminant.of('raccoon'),
          growl: () => 'growl',
        } as const;

        const dog = {
          ...KindDiscriminant.of('dog'),
          bark: () => 'bark',
        } as const;

        type Animal = typeof raccoon | typeof dog;
        const input: Animal = raccoon as Animal;

        // Act
        const result = KindDiscriminant.match(input, {
          raccoon: (v) => v.growl(),
          dog: (v) => v.bark(),
        });

        // Assert
        expect(result).toBe('growl');
      });
    });
  });

  // ---------------------------------------------------------------------------
  // MARK: matchOr
  // ---------------------------------------------------------------------------
  describe('matchOr', () => {
    describe('when a matching handler exists', () => {
      it('should call the correct handler and return its result', () => {
        // Arrange
        const value: Entity = { __test: 'user', name: 'Alice' } as Entity;

        // Act
        const result = TestDisc.matchOr(
          value,
          { user: (v) => v.name },
          () => 'fallback',
        );

        // Assert
        expect(result).toBe('Alice');
      });

      it('should not call the fallback when a handler matches', () => {
        // Arrange
        const value: Entity = { __test: 'admin', level: 7 } as Entity;
        const fallback = vi.fn<() => string>(() => 'fallback');

        // Act
        TestDisc.matchOr(value, { admin: (v) => String(v.level) }, fallback);

        // Assert
        expect(fallback).not.toHaveBeenCalled();
      });
    });

    describe('when no matching handler exists', () => {
      it('should call the fallback and return its result', () => {
        // Arrange
        const value = { __test: 'unknown' } as unknown as Entity;

        // Act
        const result = TestDisc.matchOr(
          value,
          { user: (v) => v.name },
          () => 'fallback-value',
        );

        // Assert
        expect(result).toBe('fallback-value');
      });

      it('should pass the original value to the fallback', () => {
        // Arrange
        const value = { __test: 'unknown' } as unknown as Entity;

        // Act
        const result = TestDisc.matchOr(
          value,
          { user: (v) => v.name },
          (v) => v,
        );

        // Assert
        expect(result).toEqual({ __test: 'unknown' });
      });

      it('should call the fallback when the handler record is empty', () => {
        // Arrange
        const value: Entity = { __test: 'user', name: 'Alice' } as Entity;

        // Act
        const result = TestDisc.matchOr(value, {}, () => 'no-handlers');

        // Assert
        expect(result).toBe('no-handlers');
      });
    });

    describe('when inferring return types', () => {
      it('should infer the union of matched handler and fallback return types', () => {
        // Arrange
        const value: Entity = { __test: 'user', name: 'Alice' } as Entity;

        // Act
        const result = TestDisc.matchOr(
          value,
          { user: (v) => v.name },
          () => 0,
        );

        // Assert
        expectTypeOf(result).toEqualTypeOf<string | number>();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // MARK: tryMatch
  // ---------------------------------------------------------------------------
  describe('tryMatch', () => {
    describe('when a matching handler exists', () => {
      it('should call the correct handler for a user', () => {
        // Arrange
        const value: Entity = { __test: 'user', name: 'Alice' } as Entity;

        // Act
        const result = TestDisc.tryMatch(
          value,
          {
            user: (v) => v.name,
            admin: (v) => v.level,
          },
          () => 'fallback',
        );

        // Assert
        expect(result).toBe('Alice');
      });

      it('should call the correct handler for an admin', () => {
        // Arrange
        const value: Entity = { __test: 'admin', level: 5 } as Entity;

        // Act
        const result = TestDisc.tryMatch(
          value,
          {
            user: (v) => v.name,
            admin: (v) => v.level,
          },
          () => 'fallback',
        );

        // Assert
        expect(result).toBe(5);
      });
    });

    describe('when no matching handler exists', () => {
      it('should call the fallback instead of throwing', () => {
        // Arrange
        const value = { __test: 'unknown' } as unknown as Entity;

        // Act
        const result = TestDisc.tryMatch(
          value,
          {
            user: (v) => v.name,
            admin: (v) => v.level,
          },
          () => 'fallback-value',
        );

        // Assert
        expect(result).toBe('fallback-value');
      });

      it('should pass the original value to the fallback', () => {
        // Arrange
        const value = { __test: 'unknown' } as unknown as Entity;

        // Act
        const result = TestDisc.tryMatch(
          value,
          {
            user: (v) => v.name,
            admin: (v) => v.level,
          },
          (v) => v,
        );

        // Assert
        expect(result).toEqual({ __test: 'unknown' });
      });
    });

    describe('when inferring return types', () => {
      it('should infer the union of handler return types and fallback return type', () => {
        // Arrange
        const value: Entity = { __test: 'user', name: 'Alice' } as Entity;

        // Act
        const result = TestDisc.tryMatch(
          value,
          {
            user: (v) => v.name,
            admin: (v) => v.level,
          },
          () => null,
        );

        // Assert
        expectTypeOf(result).toEqualTypeOf<string | number | null>();
      });
    });

    describe('when handler narrows the value type', () => {
      it('should pass the narrowed type to each handler', () => {
        // Arrange
        const value: Entity = { __test: 'user', name: 'Alice' } as Entity;

        // Act
        TestDisc.tryMatch(
          value,
          {
            user: (v) => {
              // Assert
              expectTypeOf(v).toEqualTypeOf<User>();
              return v;
            },
            admin: (v) => {
              // Assert
              expectTypeOf(v).toEqualTypeOf<Admin>();
              return v;
            },
          },
          () => null,
        );
      });
    });
  });
});
