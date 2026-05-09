import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  LiteralUnion,
  type InferLiteralUnion,
  type LiteralUnionFrom,
  type LiteralUnionMembers,
} from './literal-union.js';
import { PanicException } from '@typemint/core';

describe('(unit) LiteralUnion', () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: Infer literal union
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Infer literal union from a tuple', () => {
    it('should infer the literal union of the given tuple', () => {
      // Arrange
      const tuple = ['a', 'b', 'c'] as const;

      // Act
      type Union = LiteralUnionFrom<typeof tuple>;
      // Assert
      expectTypeOf<Union>().toEqualTypeOf<'a' | 'b' | 'c'>();
    });

    it('should deduplicate the tuple', () => {
      // Arrange
      const tuple = ['a', 'b', 'c', 'a'] as const;

      // Act
      type Union = LiteralUnionFrom<typeof tuple>;
      // Assert
      expectTypeOf<Union>().toEqualTypeOf<'a' | 'b' | 'c'>();
    });

    it('should not accept an empty tuple', () => {
      // Arrange
      const tuple = [] as const;

      // Act
      // @ts-expect-error - empty tuple is not a valid literal union
      type Tuple = LiteralUnionFrom<typeof tuple>;
      // Assert
      expectTypeOf<Tuple>().toEqualTypeOf<never>();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: Infer literal union
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Infer literal union from a literal union', () => {
    it('should infer the literal union of the given literal union', () => {
      // Arrange
      const union = LiteralUnion(['a', 'b', 'c'] as const);
      // Act
      type Union = InferLiteralUnion<typeof union>;
      // Assert
      expectTypeOf<Union>().toEqualTypeOf<'a' | 'b' | 'c'>();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: Convert literal union to members
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Convert literal union to members', () => {
    it('should convert the literal union to a record of its members', () => {
      // Arrange

      // Act
      type Members = LiteralUnionMembers<'a' | 'b' | 'c'>;
      // Assert
      expectTypeOf<Members>().toEqualTypeOf<{
        a: 'a';
        b: 'b';
        c: 'c';
      }>();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: Create literal union
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Create literal union', () => {
    it('should create a literal union from a tuple of strings', () => {
      // Arrange
      const literals = ['a', 'b', 'c'] as const;

      // Act
      const union = LiteralUnion(literals);
      // Assert
      expect(union).toMatchObject({
        a: 'a',
        b: 'b',
        c: 'c',
      });
    });

    it('should throw a PanicException if the tuple is empty', () => {
      // Arrange
      const literals = [] as const;

      // Act
      // @ts-expect-error - empty tuple is not a valid literal union
      const act = () => LiteralUnion(literals);

      // Assert
      expect(act).toThrow(PanicException);
    });

    it('should keep the type of the literals when spreading them as members', () => {
      // Arrange
      const literals = ['a', 'b', 'c'] as const;

      // Act
      const union = LiteralUnion(literals);
      // Assert
      expectTypeOf(union.a).toEqualTypeOf<'a'>();
      expectTypeOf(union.b).toEqualTypeOf<'b'>();
      expectTypeOf(union.c).toEqualTypeOf<'c'>();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: Literal Union Descriptor methods
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Literal Union Descriptor methods', () => {
    it('should have the isOfType method', () => {
      // Arrange
      const union = LiteralUnion(['a', 'b', 'c'] as const);
      // Act
      // Assert
      expect(union.isOfType).toBeTypeOf('function');
      expectTypeOf(union.isOfType).toEqualTypeOf<
        (value: unknown) => value is 'a' | 'b' | 'c'
      >();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: isOfType
  // ─────────────────────────────────────────────────────────────────────────────
  describe('isOfType', () => {
    it('should return true if the value is a member of the literal union', () => {
      // Arrange
      const union = LiteralUnion(['a', 'b', 'c']);
      // Act
      const result = union.isOfType('a');
      // Assert
      expect(result).toBe(true);
    });

    it('should return false if the value is not a member of the literal union', () => {
      // Arrange
      const union = LiteralUnion(['a', 'b', 'c']);
      // Act
      const result = union.isOfType('d');
      // Assert
      expect(result).toBe(false);
    });

    it('should return false if the value is not a string', () => {
      // Arrange
      const union = LiteralUnion(['a', 'b', 'c']);
      // Act
      const result = union.isOfType(1);
      // Assert
      expect(result).toBe(false);
    });

    it('should narrow the type to the member if the value is a member of the literal union', () => {
      // Arrange
      const union = LiteralUnion(['a', 'b', 'c'] as const);

      const value: unknown = 'a' as unknown;
      // Act
      if (union.isOfType(value)) {
        // Assert
        expectTypeOf(value).toEqualTypeOf<'a' | 'b' | 'c'>();
      } else {
        expectTypeOf(value).toBeUnknown();
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: toArray
  // ─────────────────────────────────────────────────────────────────────────────
  describe('toArray', () => {
    it('should return the literals as an array', () => {
      // Arrange
      const union = LiteralUnion(['a', 'b', 'c'] as const);
      // Act
      const result = union.toArray();
      // Assert
      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('should be immune to unintentional mutation', () => {
      // Arrange
      const origValues = ['a', 'b', 'c'] as const;
      const union = LiteralUnion(origValues);
      // Act
      // @ts-expect-error - we're intentionally mutating the original values
      origValues.push('d');

      const result = union.toArray();
      // Assert
      expect(result).toEqual(['a', 'b', 'c']);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: Symbol.iterator
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Symbol.iterator', () => {
    it('should iterate over the literals', () => {
      // Arrange
      const union = LiteralUnion(['a', 'b', 'c'] as const);
      // Act
      for (const literal of union) {
        // Assert
        expect(literal).toBeOneOf(['a', 'b', 'c']);
      }
    });

    it('should spread the literals', () => {
      // Arrange
      const union = LiteralUnion(['a', 'b', 'c'] as const);
      // Act
      const result = [...union];
      // Assert
      expect(result).toEqual(['a', 'b', 'c']);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: Symbol.toStringTag
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Symbol.toStringTag', () => {
    it('should return the string tag "LiteralUnion" when the union is converted to a string', () => {
      // Arrange
      const union = LiteralUnion(['a', 'b', 'c'] as const);
      // Act
      const result = Object.prototype.toString.call(union);
      // Assert
      expect(result).toBe('[object LiteralUnion]');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: size
  // ─────────────────────────────────────────────────────────────────────────────
  describe('size', () => {
    it('should return the number of members in the union', () => {
      // Arrange
      const union = LiteralUnion(['a', 'b', 'c'] as const);
      // Act
      const result = union.size;

      // Assert
      expect(result).toBe(3);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: match
  // ─────────────────────────────────────────────────────────────────────────────
  describe('match', () => {
    // MARK: Data-first overload
    describe('data-first overload', () => {
      it('should derive the return type from the handlers.', () => {
        // Arrange
        const union = LiteralUnion(['a', 'b', 'c'] as const);
        const value = union.a;
        // Act
        const result = union.match(value, {
          a: () => 'A' as const,
          b: () => 'B' as const,
          c: () => 'C' as const,
        });
        // Assert
        expectTypeOf(result).toEqualTypeOf<'A' | 'B' | 'C'>();
      });

      it('should return the result of the handler that matches the value.', () => {
        // Arrange
        const union = LiteralUnion(['a', 'b', 'c'] as const);
        const value = union.a;
        // Act
        const result = union.match(value, {
          a: () => 'A' as const,
          b: () => 'B' as const,
          c: () => 'C' as const,
        });
        // Assert
        expect(result).toBe('A');
      });

      it('should throw a runtime error if the value is not a member of the literal union.', () => {
        // Arrange
        const union = LiteralUnion(['a', 'b', 'c'] as const);
        const value = 'd' as unknown;
        // Act
        const act = () =>
          union.match(value as any, {
            a: () => 'A' as const,
            b: () => 'B' as const,
            c: () => 'C' as const,
          });

        // Assert
        expect(act).toThrow(PanicException);
      });

      it('should throw a compilation error if the handlers are not exhaustive', () => {
        // Arrange
        const union = LiteralUnion(['a', 'b', 'c'] as const);
        const value = union.a;
        // Assert
        // @ts-expect-error - missing handler for 'c'
        union.match(value, {
          a: () => 'A' as const,
          b: () => 'B' as const,
        });
      });

      it('should throw a runtime error if the handlers are not a function.', () => {
        // Arrange
        const union = LiteralUnion(['a', 'b', 'c'] as const);
        const value = union.a;
        // Act
        const act = () =>
          union.match(value, {
            a: 42 as any,
            b: () => 'B' as const,
            c: () => 'C' as const,
          });

        // Assert
        expect(act).toThrow(PanicException);
      });

      it('should throw a runtime error if the handler is undefined.', () => {
        // Arrange
        const union = LiteralUnion(['a', 'b', 'c'] as const);
        const value = union.a;
        // Act
        const act = () =>
          union.match(value, {
            a: undefined as any,
            b: () => 'B' as const,
            c: () => 'C' as const,
          });
        // Assert
        expect(act).toThrow(PanicException);
      });

      it('should throw a runtime error if the first argument is not a string.', () => {
        // Arrange
        const union = LiteralUnion(['a', 'b', 'c'] as const);
        // Act
        const act = () =>
          union.match(null as any, {
            a: () => 'A' as const,
            b: () => 'B' as const,
            c: () => 'C' as const,
          });

        // Assert
        expect(act).toThrow(PanicException);
      });
    });

    // MARK: Data-last overload
    describe('data-last overload', () => {
      it('should derive the return type from the handlers.', () => {
        // Arrange
        const union = LiteralUnion(['a', 'b', 'c'] as const);
        const value = union.a;
        // Act
        const result = union.match({
          a: () => 'A' as const,
          b: () => 'B' as const,
          c: () => 'C' as const,
        })(value);
        // Assert
        expectTypeOf(result).toEqualTypeOf<'A' | 'B' | 'C'>();
      });

      it('should return the result of the handler that matches the value.', () => {
        // Arrange
        const union = LiteralUnion(['a', 'b', 'c'] as const);
        const value = union.a;
        // Act
        const result = union.match({
          a: () => 'A' as const,
          b: () => 'B' as const,
          c: () => 'C' as const,
        })(value);

        // Assert
        expect(result).toBe('A');
      });

      it('should throw a runtime error if the value is not a member of the literal union.', () => {
        // Arrange
        const union = LiteralUnion(['a', 'b', 'c'] as const);
        const value = 'd' as unknown;
        // Act
        const act = () =>
          union.match({
            a: () => 'A' as const,
            b: () => 'B' as const,
            c: () => 'C' as const,
          })(value as any);

        // Assert
        expect(act).toThrow(PanicException);
      });

      it('should throw a runtime error if the handlers are not a function.', () => {
        // Arrange
        const union = LiteralUnion(['a', 'b', 'c'] as const);

        const act = () =>
          union.match({
            a: 42 as any,
            b: () => 'B' as const,
            c: () => 'C' as const,
          })(union.a as any);

        // Assert
        expect(act).toThrow(PanicException);
      });

      it('should throw a runtime error if the handler is undefined.', () => {
        // Arrange
        const union = LiteralUnion(['a', 'b', 'c'] as const);
        // Act
        const act = () =>
          union.match({
            a: undefined as any,
            b: () => 'B' as const,
            c: () => 'C' as const,
          })(union.a as any);
        // Assert
        expect(act).toThrow(PanicException);
      });

      it('should throw a runtime error if the first argument is not a non-null object.', () => {
        // Arrange
        const union = LiteralUnion(['a', 'b', 'c'] as const);
        // Act
        const act = () => union.match(null as any)(union.a);

        // Assert
        expect(act).toThrow(PanicException);
      });
    });
  });
});
