import { describe, expectTypeOf, it } from 'vitest';
import { type LiteralUnionFrom } from './literal-union.js';

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

    it('should build from a tuple of numbers', () => {
      // Arrange
      const tuple = [1, 2, 3] as const;

      // Act
      type Union = LiteralUnionFrom<typeof tuple>;
      // Assert
      expectTypeOf<Union>().toEqualTypeOf<1 | 2 | 3>();
    });

    it('should build from a tuple of booleans', () => {
      // Arrange
      const tuple = [true, false] as const;

      // Act
      type Tuple = LiteralUnionFrom<typeof tuple>;
      // Assert
      expectTypeOf<Tuple>().toEqualTypeOf<true | false>();
    });

    it('should build from a tuple of symbols', () => {
      // Arrange
      const symbolA: unique symbol = Symbol('a');
      const symbolB: unique symbol = Symbol('b');
      const symbolC: unique symbol = Symbol('c');
      const tuple = [symbolA, symbolB, symbolC] as const;

      // Act
      type Union = LiteralUnionFrom<typeof tuple>;
      // Assert
      expectTypeOf<Union>().toEqualTypeOf<
        typeof symbolA | typeof symbolB | typeof symbolC
      >();
    });

    it('should build from a tuple of bigints', () => {
      // Arrange
      const bigintA = BigInt(1);
      const bigintB = BigInt(2);
      const bigintC = BigInt(3);
      const tuple = [bigintA, bigintB, bigintC] as const;

      // Act
      type Union = LiteralUnionFrom<typeof tuple>;
      // Assert
      expectTypeOf<Union>().toEqualTypeOf<
        typeof bigintA | typeof bigintB | typeof bigintC
      >();
    });

    it('should build from a tuple of mixed types', () => {
      // Arrange
      const symbolB: unique symbol = Symbol('b');
      const tuple = [1, true, 'a', symbolB, 3n] as const;

      // Act
      type Union = LiteralUnionFrom<typeof tuple>;
      // Assert
      expectTypeOf<Union>().toEqualTypeOf<
        1 | true | 'a' | typeof symbolB | 3n
      >();
    });

    it('should build from a tuple of tagged primitives', () => {
      // Arrange
      type WithTag<T> = T & { __tag: string };
      const symbolB: unique symbol = Symbol('b');

      type Tuple = readonly [
        WithTag<1>,
        WithTag<true>,
        WithTag<'a'>,
        WithTag<typeof symbolB>,
        WithTag<3n>,
      ];

      // Act
      type Union = LiteralUnionFrom<Tuple>;
      // Assert
      expectTypeOf<Union>().toEqualTypeOf<
        | WithTag<1>
        | WithTag<true>
        | WithTag<'a'>
        | WithTag<typeof symbolB>
        | WithTag<3n>
      >();
    });
  });
});
