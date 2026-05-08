import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  LiteralUnion,
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
  });
});
