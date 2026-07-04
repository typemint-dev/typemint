import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import {
  LiteralUnion,
  LiteralUnionMismatchError,
  type InferLiteralUnion,
  type LiteralUnionDescriptor,
  type LiteralUnionFrom,
  type LiteralUnionMembers,
} from './literal-union.js';
import {
  Kind,
  PanicException,
  type NonEmptyReadonlyArray,
} from '@typemint/core';
import { assertErr, assertOk, Result } from '@typemint/result';
import { TypeMismatchError } from './type-mismatch.js';

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

    it('should throw a PanicException if the member name collides with a reserved descriptor key "isOfType"', () => {
      // Arrange
      const literals = ['a', 'b', 'c', 'isOfType'] as const;
      // Act
      const act = () => LiteralUnion(literals);
      // Assert
      expect(act).toThrow(PanicException);
    });

    it('should throw a PanicException if the member name collides with a reserved descriptor key "toArray"', () => {
      // Arrange
      const literals = ['a', 'b', 'c', 'toArray'] as const;
      // Act
      const act = () => LiteralUnion(literals);
      // Assert
      expect(act).toThrow(PanicException);
    });

    it('should throw a PanicException if the member name collides with a reserved descriptor key "size"', () => {
      // Arrange
      const literals = ['a', 'b', 'c', 'size'] as const;
      // Act
      const act = () => LiteralUnion(literals);
      // Assert
      expect(act).toThrow(PanicException);
    });

    it('should throw a PanicException if the member name collides with a reserved descriptor key "match"', () => {
      // Arrange
      const literals = ['a', 'b', 'c', 'match'] as const;
      // Act
      const act = () => LiteralUnion(literals);
      // Assert
      expect(act).toThrow(PanicException);
    });

    it('should throw a PanicException if the member name collides with a reserved descriptor key "matchResult"', () => {
      // Arrange
      const literals = ['a', 'b', 'c', 'matchResult'] as const;
      // Act
      const act = () => LiteralUnion(literals);
      // Assert
      expect(act).toThrow(PanicException);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: Reserved descriptor key collisions (type-level)
  // ─────────────────────────────────────────────────────────────────────────────
  // The descriptor type is the intersection of LiteralUnionMembers (string
  // values keyed by member name) and LiteralUnionMethods (functions, getter,
  // symbol keys, …). When a member name collides with a reserved method,
  // what TypeScript does at the type level depends on the *kind* of the
  // colliding method:
  //
  // - `size` (typed as `number`) — `'size' & number` reduces to `never`. The
  //   type system catches the collision on its own; any access to
  //   `descriptor.size` becomes statically uncallable.
  // - `isOfType`, `toArray`, `match`, `matchResult` (function-typed) — the
  //   intersection `'<name>' & (...) => ...` does *not* collapse. TypeScript
  //   keeps the hybrid alive: the key is simultaneously assignable to the
  //   string literal *and* callable as the function. No value can satisfy
  //   both at runtime, but the type system happily permits both usages.
  //
  // The asymmetry is the reason the factory needs an explicit runtime guard:
  // for function-typed methods, the type system alone does not catch the
  // collision. These tests pin both behaviors so a future TS change (or a
  // method-type change in `LiteralUnionMethods`) cannot drift silently.
  describe('Reserved descriptor key collisions (type-level)', () => {
    it('should collapse the descriptor key to never when "size" collides', () => {
      // Arrange — primitive-vs-primitive intersection collapses to `never`.
      type Descriptor = LiteralUnionDescriptor<'a' | 'size'>;
      // Act + Assert
      expectTypeOf<Descriptor['size']>().toBeNever();
    });

    it('should keep the descriptor key as a hybrid (NOT never) when "isOfType" collides', () => {
      // Arrange — string-literal-vs-function intersection survives. The
      // runtime guard is what protects users here, not the type system.
      type Descriptor = LiteralUnionDescriptor<'a' | 'isOfType'>;
      // Act + Assert
      expectTypeOf<Descriptor['isOfType']>().not.toBeNever();
    });

    it('should keep the descriptor key as a hybrid (NOT never) when "toArray" collides', () => {
      // Arrange
      type Descriptor = LiteralUnionDescriptor<'a' | 'toArray'>;
      // Act + Assert
      expectTypeOf<Descriptor['toArray']>().not.toBeNever();
    });

    it('should keep the descriptor key as a hybrid (NOT never) when "match" collides', () => {
      // Arrange
      type Descriptor = LiteralUnionDescriptor<'a' | 'match'>;
      // Act + Assert
      expectTypeOf<Descriptor['match']>().not.toBeNever();
    });

    it('should keep the descriptor key as a hybrid (NOT never) when "matchResult" collides', () => {
      // Arrange
      type Descriptor = LiteralUnionDescriptor<'a' | 'matchResult'>;
      // Act + Assert
      expectTypeOf<Descriptor['matchResult']>().not.toBeNever();
    });

    it('should keep non-colliding members usable as their literal string value', () => {
      // Arrange
      type Descriptor = LiteralUnionDescriptor<'a' | 'isOfType'>;
      // Act + Assert
      expectTypeOf<Descriptor['a']>().toEqualTypeOf<'a'>();
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

    it('returns the same reference on every call', () => {
      // Arrange
      const union = LiteralUnion(['a', 'b', 'c'] as const);

      // Act
      const result1 = union.toArray();
      const result2 = union.toArray();

      // Assert
      expect(result1).toBe(result2);
    });

    it('returns a frozen array', () => {
      // Arrange
      const union = LiteralUnion(['a', 'b', 'c'] as const);

      // Act
      const result = union.toArray();

      // Assert
      expect(Object.isFrozen(result)).toBe(true);
    });
    it('rejects mutation attempts at runtime', () => {
      // Arrange
      const union = LiteralUnion(['a', 'b', 'c'] as const);

      // Act
      const arr = union.toArray() as unknown as string[];

      // Assert
      // Strict mode (ESM, which vitest uses) throws on mutation of frozen arrays.
      expect(() => arr.push('d')).toThrow(TypeError);
      expect(() => arr.sort()).toThrow(TypeError);
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

    it('should keep the type of the literals', () => {
      // Arrange
      const union = LiteralUnion(['a', 'b', 'c'] as const);
      // Act
      for (const literal of union) {
        // Assert
        expectTypeOf(literal).toEqualTypeOf<'a' | 'b' | 'c'>();
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

    it('should return a fresh, independent iterator on every call', () => {
      // Arrange
      const union = LiteralUnion(['a', 'b', 'c'] as const);
      // Act
      const iter1 = union[Symbol.iterator]();
      const iter2 = union[Symbol.iterator]();
      // Capture identity check + next() results into primitives BEFORE
      // calling expect() — passing raw iterators to vitest's `expect`
      // triggers its diff-prep inspector, which silently consumes them.
      const distinct = iter1 !== iter2;
      const r1a = iter1.next();
      const r2a = iter2.next();
      const r1b = iter1.next();
      const r2b = iter2.next();
      // Assert
      // Each call yields a distinct iterator object — not a shared cursor.
      expect(distinct).toBe(true);
      // Advancing one iterator must not advance the other; both restart
      // from the beginning of the declaration order.
      expect(r1a).toEqual({ value: 'a', done: false });
      expect(r2a).toEqual({ value: 'a', done: false });
      expect(r1b).toEqual({ value: 'b', done: false });
      expect(r2b).toEqual({ value: 'b', done: false });
    });

    it('should yield every member from the start on each independent for...of loop', () => {
      // Arrange
      const union = LiteralUnion(['a', 'b', 'c'] as const);
      const first: string[] = [];
      const second: string[] = [];
      // Act
      for (const literal of union) first.push(literal);
      for (const literal of union) second.push(literal);
      // Assert
      // A second for...of must restart from 'a' — not pick up where the
      // first loop left off. This pins iterator independence at the
      // descriptor level, not just the underlying tuple.
      expect(first).toEqual(['a', 'b', 'c']);
      expect(second).toEqual(['a', 'b', 'c']);
    });

    it('should support mixing spread and for...of without state pollution', () => {
      // Arrange
      const union = LiteralUnion(['a', 'b', 'c'] as const);
      // Act
      const spread = [...union];
      const collected: string[] = [];
      for (const literal of union) collected.push(literal);
      // Assert
      expect(spread).toEqual(['a', 'b', 'c']);
      expect(collected).toEqual(['a', 'b', 'c']);
    });

    it('should support nested for...of loops over the same descriptor', () => {
      // Arrange
      const union = LiteralUnion(['a', 'b', 'c'] as const);
      const pairs: [string, string][] = [];
      // Act
      for (const outer of union) {
        for (const inner of union) {
          pairs.push([outer, inner]);
        }
      }
      // Assert — 3 × 3 cartesian product proves the inner loop is not
      // sharing state with the outer loop.
      expect(pairs).toHaveLength(9);
      expect(pairs).toEqual([
        ['a', 'a'],
        ['a', 'b'],
        ['a', 'c'],
        ['b', 'a'],
        ['b', 'b'],
        ['b', 'c'],
        ['c', 'a'],
        ['c', 'b'],
        ['c', 'c'],
      ]);
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

      it('should throw a runtime error if the handlers object is empty.', () => {
        // Arrange
        const union = LiteralUnion(['a', 'b', 'c'] as const);
        // Act
        // @ts-expect-error - forcing an empty handlers object to get a PanicException
        //
        const act = () => union.match({})(union.a);
        // Assert
        expect(act).toThrow(PanicException);
      });

      it('should throw a runtime error if the handlers object is not an object.', () => {
        // Arrange
        const union = LiteralUnion(['a', 'b', 'c'] as const);
        // Act
        const act = () => union.match(union.a, null as any);
        // Assert
        expect(act).toThrow(PanicException);
      });

      it('should narrow each handler to the member type', () => {
        // Arrange
        const union = LiteralUnion(['a', 'b', 'c'] as const);
        // Act
        const result = union.match(union.a, {
          a: (v) => {
            expectTypeOf(v).toEqualTypeOf<'a'>();
            return 'A' as const;
          },
          b: (v) => {
            expectTypeOf(v).toEqualTypeOf<'b'>();
            return 'B' as const;
          },
          c: (v) => {
            expectTypeOf(v).toEqualTypeOf<'c'>();
            return 'C' as const;
          },
        });
        // Assert
        expect(result).toBe('A');
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

      it('should throw a runtime error if the handlers object is empty.', () => {
        // Arrange
        const union = LiteralUnion(['a', 'b', 'c'] as const);
        // Act
        // @ts-expect-error - forcing an empty handlers object to get a PanicException
        //
        const act = () => union.match({})(union.a);
        // Assert
        expect(act).toThrow(PanicException);
      });

      it('should throw a runtime error if the handlers object is not an object.', () => {
        // Arrange
        const union = LiteralUnion(['a', 'b', 'c'] as const);
        // Act
        const act = () => union.match(null as any)(union.a);
        // Assert
        expect(act).toThrow(PanicException);
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: matchResult
  // ─────────────────────────────────────────────────────────────────────────────
  describe('matchResult', () => {
    // MARK: Data-first overload
    describe('data-first overload', () => {
      it('should return the result of the handler that matches the value.', () => {
        // Arrange
        const union = LiteralUnion(['a', 'b', 'c'] as const);
        const result = Result.Ok('a' as const);
        // Act
        const matchedResult = union.matchResult(result, {
          a: () => Result.Ok('A'),
          b: () => Result.Ok('B'),
          c: () => Result.Ok('C'),
        });
        // Assert
        assertOk(matchedResult);
        expect(matchedResult.value).toEqual('A');
      });

      it('should infer the return type from the handlers.', () => {
        // Arrange
        const union = LiteralUnion(['a', 'b', 'c'] as const);
        const result = Result.Ok('a' as const);
        // Act
        const matchedResult = union.matchResult(result, {
          a: () => Result.Ok('A' as const),
          b: () => Result.Ok('B' as const),
          c: () => Result.Ok('C' as const),
        });

        // Assert
        expectTypeOf(matchedResult).toEqualTypeOf<
          Result<'A' | 'B' | 'C', never>
        >();
      });

      it('should return an error if the handler returns an error.', () => {
        // Arrange
        const union = LiteralUnion(['a', 'b', 'c'] as const);
        const result = Result.Ok('a' as const);
        // Act
        const matchedResult = union.matchResult(result, {
          a: () => Result.Err('Error'),
          b: () => Result.Ok('B'),
          c: () => Result.Ok('C'),
        });
        // Assert
        assertErr(matchedResult);
        expect(matchedResult.error).toEqual('Error');
      });

      it('should return an error if the result is an error.', () => {
        // Arrange
        const union = LiteralUnion(['a', 'b', 'c'] as const);
        const result = Result.Err('Error');
        // Act
        const matchedResult = union.matchResult(result, {
          a: () => Result.Ok('A'),
          b: () => Result.Ok('B'),
          c: () => Result.Ok('C'),
        });
        // Assert
        assertErr(matchedResult);
        expect(matchedResult.error).toEqual('Error');
      });

      it('should accumulate the error types if the handlers return different error types.', () => {
        // Arrange
        const union = LiteralUnion(['a', 'b', 'c'] as const);
        const result = Result.Ok('a' as const);
        // Act
        const matchedResult = union.matchResult(result, {
          a: () => Result.Err('ErrorA' as const),
          b: () => Result.Err('ErrorB' as const),
          c: () => Result.Err('ErrorC' as const),
        });

        // Assert
        expectTypeOf(matchedResult).toEqualTypeOf<
          Result<never, 'ErrorA' | 'ErrorB' | 'ErrorC'>
        >();
      });

      it('should throw a runtime error if the handlers object is empty.', () => {
        // Arrange
        const union = LiteralUnion(['a', 'b', 'c'] as const);
        const result = Result.Ok('a' as const);
        // Act
        // @ts-expect-error - forcing an empty handlers object to get a PanicException
        //
        const act = () => union.matchResult(result, {});
        // Assert
        expect(act).toThrow(PanicException);
      });

      it('does not invoke any handler when the input is Err', () => {
        const union = LiteralUnion(['a', 'b', 'c'] as const);
        const a = vi.fn<() => Result<'A', never>>(() => Result.Ok('A'));
        const b = vi.fn<() => Result<'B', never>>(() => Result.Ok('B'));
        const c = vi.fn<() => Result<'C', never>>(() => Result.Ok('C'));
        union.matchResult(Result.Err('boom'), { a, b, c });
        expect(a).not.toHaveBeenCalled();
        expect(b).not.toHaveBeenCalled();
        expect(c).not.toHaveBeenCalled();
      });
    });

    // MARK: Data-last overload
    describe('data-last overload', () => {
      it('should return the result of the handler that matches the value.', () => {
        // Arrange
        const union = LiteralUnion(['a', 'b', 'c'] as const);
        const result = Result.Ok('a' as const);
        // Act
        const matchedResult = union.matchResult({
          a: () => Result.Ok('A'),
          b: () => Result.Ok('B'),
          c: () => Result.Ok('C'),
        })(result);
        // Assert
        assertOk(matchedResult);
        expect(matchedResult.value).toEqual('A');
      });

      it('should infer the return type from the handlers.', () => {
        // Arrange
        const union = LiteralUnion(['a', 'b', 'c'] as const);
        const result = Result.Ok('a' as const);
        // Act
        const matchedResult = union.matchResult({
          a: () => Result.Ok('A' as const),
          b: () => Result.Ok('B' as const),
          c: () => Result.Ok('C' as const),
        })(result);

        // Assert
        expectTypeOf(matchedResult).toEqualTypeOf<
          Result<'A' | 'B' | 'C', never>
        >();
      });

      it('should return an error if the handler returns an error.', () => {
        // Arrange
        const union = LiteralUnion(['a', 'b', 'c'] as const);
        const result = Result.Ok('a' as const);
        // Act
        const matchedResult = union.matchResult({
          a: () => Result.Err('Error'),
          b: () => Result.Ok('B'),
          c: () => Result.Ok('C'),
        })(result);

        // Assert
        assertErr(matchedResult);
        expect(matchedResult.error).toEqual('Error');
      });

      it('should return an error if the result is an error.', () => {
        // Arrange
        const union = LiteralUnion(['a', 'b', 'c'] as const);
        const result = Result.Err('Error');
        // Act
        const matchedResult = union.matchResult({
          a: () => Result.Ok('A'),
          b: () => Result.Ok('B'),
          c: () => Result.Ok('C'),
        })(result);

        // Assert
        assertErr(matchedResult);
        expect(matchedResult.error).toEqual('Error');
      });

      it('should accumulate the error types if the handlers return different error types.', () => {
        // Arrange
        const union = LiteralUnion(['a', 'b', 'c'] as const);
        const result = Result.Ok('a' as const);
        // Act
        const matchedResult = union.matchResult({
          a: () => Result.Err('ErrorA' as const),
          b: () => Result.Err('ErrorB' as const),
          c: () => Result.Err('ErrorC' as const),
        })(result);

        // Assert
        expectTypeOf(matchedResult).toEqualTypeOf<
          Result<never, 'ErrorA' | 'ErrorB' | 'ErrorC'>
        >();
      });

      it('should throw a runtime error if the handlers object is empty.', () => {
        // Arrange
        const union = LiteralUnion(['a', 'b', 'c'] as const);
        const result = Result.Ok('a' as const);
        // Act
        // @ts-expect-error - forcing an empty handlers object to get a PanicException
        //
        const act = () => union.matchResult({})(result);
        // Assert
        expect(act).toThrow(PanicException);
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: of
  // ─────────────────────────────────────────────────────────────────────────────
  describe('of', () => {
    it('should return Ok with the value when it is a member', () => {
      // Arrange
      const union = LiteralUnion(['germany', 'france', 'usa'] as const);
      // Act
      const result = union.of('france');
      // Assert
      assertOk(result);
      expect(result.value).toBe('france');
    });

    it('should narrow the Ok value to the union member type', () => {
      // Arrange
      const union = LiteralUnion(['germany', 'france', 'usa'] as const);
      // Act
      const result = union.of('france');
      // Assert
      assertOk(result);
      expectTypeOf(result.value).toEqualTypeOf<'germany' | 'france' | 'usa'>();
    });

    it('should return Err with a LiteralUnionMismatchError when the value is not a member', () => {
      // Arrange
      const union = LiteralUnion(['germany', 'france', 'usa'] as const);
      // Act
      const result = union.of('belgium');
      // Assert
      assertErr(result);
      expect(result.error.kind).toBe('LiteralUnionMismatchError');
      expect(result.error.details.received).toBe('belgium');
      expect(result.error.details.expected).toEqual([
        'germany',
        'france',
        'usa',
      ]);
    });

    it('should type the Err channel as LiteralUnionMismatchError of the members', () => {
      // Arrange
      const union = LiteralUnion(['germany', 'france', 'usa'] as const);
      // Act
      const result = union.of('belgium');
      // Assert
      assertErr(result);
      expectTypeOf(result.error).toEqualTypeOf<
        LiteralUnionMismatchError<'germany' | 'france' | 'usa'>
      >();
    });

    it('should reject an empty string when it is not a member', () => {
      // Arrange
      const union = LiteralUnion(['a', 'b'] as const);
      // Act
      const result = union.of('');
      // Assert
      assertErr(result);
      expect(result.error.details.received).toBe('');
    });

    it('should reuse the same declared members array in the error', () => {
      // Arrange
      const union = LiteralUnion(['a', 'b'] as const);
      // Act — the same reference backs both toArray() and the error's expected
      const result = union.of('z');
      // Assert
      assertErr(result);
      expect(result.error.details.expected).toBe(union.toArray());
    });

    it('should throw a PanicException if the member name collides with the reserved key "of"', () => {
      // Arrange
      const literals = ['a', 'b', 'c', 'of'] as const;
      // Act
      const act = () => LiteralUnion(literals);
      // Assert
      expect(act).toThrow(PanicException);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: ofUnsafe
  // ─────────────────────────────────────────────────────────────────────────────
  describe('ofUnsafe', () => {
    it('should return the value directly when it is a member', () => {
      // Arrange
      const union = LiteralUnion(['germany', 'france', 'usa'] as const);
      // Act
      const value = union.ofUnsafe('france');
      // Assert
      expect(value).toBe('france');
    });

    it('should narrow the returned value to the union member type', () => {
      // Arrange
      const union = LiteralUnion(['germany', 'france', 'usa'] as const);
      // Act
      const value = union.ofUnsafe('france');
      // Assert
      expectTypeOf(value).toEqualTypeOf<'germany' | 'france' | 'usa'>();
    });

    it('should throw a PanicException when the value is not a member', () => {
      // Arrange
      const union = LiteralUnion(['germany', 'france', 'usa'] as const);
      // Act
      const act = () => union.ofUnsafe('belgium');
      // Assert
      expect(act).toThrow(PanicException);
    });

    it('should attach the LiteralUnionMismatchError as the exception cause', () => {
      // Arrange
      const union = LiteralUnion(['germany', 'france', 'usa'] as const);
      // Act
      let caught: unknown;
      try {
        union.ofUnsafe('belgium');
      } catch (error) {
        caught = error;
      }
      // Assert
      expect(caught).toBeInstanceOf(PanicException);
      const cause = (caught as PanicException).cause;
      expect(Kind.isOf(cause, 'LiteralUnionMismatchError')).toBe(true);
      expect((cause as LiteralUnionMismatchError).details.received).toBe(
        'belgium',
      );
    });

    it('should throw a PanicException if the member name collides with the reserved key "ofUnsafe"', () => {
      // Arrange
      const literals = ['a', 'b', 'c', 'ofUnsafe'] as const;
      // Act
      const act = () => LiteralUnion(literals);
      // Assert
      expect(act).toThrow(PanicException);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: parse
  // ─────────────────────────────────────────────────────────────────────────────
  describe('parse', () => {
    it('should return Ok with the value when it is a member', () => {
      // Arrange
      const union = LiteralUnion(['germany', 'france', 'usa'] as const);
      // Act
      const result = union.parse('france');
      // Assert
      assertOk(result);
      expect(result.value).toBe('france');
    });

    it('should narrow the Ok value to the union member type', () => {
      // Arrange
      const union = LiteralUnion(['germany', 'france', 'usa'] as const);
      // Act
      const result = union.parse('france');
      // Assert
      assertOk(result);
      expectTypeOf(result.value).toEqualTypeOf<'germany' | 'france' | 'usa'>();
    });

    it('should return Err with a LiteralUnionMismatchError when the value is a non-member string', () => {
      // Arrange
      const union = LiteralUnion(['germany', 'france', 'usa'] as const);
      // Act
      const result = union.parse('belgium');
      // Assert
      assertErr(result);
      expect(result.error.kind).toBe('LiteralUnionMismatchError');
      expect(result.error.details.received).toBe('belgium');
    });

    it('should return Err with a TypeMismatchError when the value is not a string', () => {
      // Arrange
      const union = LiteralUnion(['germany', 'france', 'usa'] as const);
      // Act
      const result = union.parse(42);
      // Assert
      assertErr(result);
      expect(result.error.kind).toBe('TypeMismatchError');
      expect(result.error.message).toBe('Expected string but got number');
    });

    it('should report a TypeMismatchError for common non-string inputs', () => {
      // Arrange
      const union = LiteralUnion(['a', 'b'] as const);
      // Act & Assert — null, arrays, and objects are all type mismatches
      for (const input of [null, undefined, [1, 2], { a: 1 }, true]) {
        const result = union.parse(input);
        assertErr(result);
        expect(result.error.kind).toBe('TypeMismatchError');
      }
    });

    it('should preserve the received value in the TypeMismatchError details', () => {
      // Arrange
      const union = LiteralUnion(['a', 'b'] as const);
      // Act
      const result = union.parse(42);
      // Assert
      assertErr(result);
      expect(result.error.details.received).toBe(42);
    });

    it('should type the Err channel as TypeMismatchError | LiteralUnionMismatchError', () => {
      // Arrange
      const union = LiteralUnion(['germany', 'france', 'usa'] as const);
      // Act
      const result = union.parse('belgium');
      // Assert
      assertErr(result);
      expectTypeOf(result.error).toEqualTypeOf<
        | TypeMismatchError<string, unknown>
        | LiteralUnionMismatchError<'germany' | 'france' | 'usa'>
      >();
    });

    it('should throw a PanicException if the member name collides with the reserved key "parse"', () => {
      // Arrange
      const literals = ['a', 'b', 'c', 'parse'] as const;
      // Act
      const act = () => LiteralUnion(literals);
      // Assert
      expect(act).toThrow(PanicException);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: parseUnsafe
  // ─────────────────────────────────────────────────────────────────────────────
  describe('parseUnsafe', () => {
    it('should return the value directly when it is a member', () => {
      // Arrange
      const union = LiteralUnion(['germany', 'france', 'usa'] as const);
      // Act
      const value = union.parseUnsafe('france');
      // Assert
      expect(value).toBe('france');
    });

    it('should narrow the returned value to the union member type', () => {
      // Arrange
      const union = LiteralUnion(['germany', 'france', 'usa'] as const);
      // Act
      const value = union.parseUnsafe('france');
      // Assert
      expectTypeOf(value).toEqualTypeOf<'germany' | 'france' | 'usa'>();
    });

    it('should throw a PanicException when the value is a non-member string', () => {
      // Arrange
      const union = LiteralUnion(['germany', 'france', 'usa'] as const);
      // Act
      const act = () => union.parseUnsafe('belgium');
      // Assert
      expect(act).toThrow(PanicException);
    });

    it('should throw a PanicException when the value is not a string', () => {
      // Arrange
      const union = LiteralUnion(['germany', 'france', 'usa'] as const);
      // Act
      const act = () => union.parseUnsafe(42);
      // Assert
      expect(act).toThrow(PanicException);
    });

    it('should attach a LiteralUnionMismatchError as the cause for a non-member string', () => {
      // Arrange
      const union = LiteralUnion(['germany', 'france', 'usa'] as const);
      // Act
      let caught: unknown;
      try {
        union.parseUnsafe('belgium');
      } catch (error) {
        caught = error;
      }
      // Assert
      expect(caught).toBeInstanceOf(PanicException);
      const cause = (caught as PanicException).cause;
      expect(Kind.isOf(cause, 'LiteralUnionMismatchError')).toBe(true);
    });

    it('should attach a TypeMismatchError as the cause for a non-string', () => {
      // Arrange
      const union = LiteralUnion(['germany', 'france', 'usa'] as const);
      // Act
      let caught: unknown;
      try {
        union.parseUnsafe(42);
      } catch (error) {
        caught = error;
      }
      // Assert
      expect(caught).toBeInstanceOf(PanicException);
      const cause = (caught as PanicException).cause;
      expect(Kind.isOf(cause, 'TypeMismatchError')).toBe(true);
    });

    it('should throw a PanicException if the member name collides with the reserved key "parseUnsafe"', () => {
      // Arrange
      const literals = ['a', 'b', 'c', 'parseUnsafe'] as const;
      // Act
      const act = () => LiteralUnion(literals);
      // Assert
      expect(act).toThrow(PanicException);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: toSet
  // ─────────────────────────────────────────────────────────────────────────────
  describe('toSet', () => {
    it('should return a set containing every declared member', () => {
      // Arrange
      const union = LiteralUnion(['germany', 'france', 'usa'] as const);
      // Act
      const set = union.toSet();
      // Assert
      expect([...set]).toEqual(['germany', 'france', 'usa']);
      expect(set.has('france')).toBe(true);
    });

    it('should report false for a non-member', () => {
      // Arrange
      const union = LiteralUnion(['germany', 'france', 'usa'] as const);
      // Act — widen to string so a non-member can be probed at all
      const set: ReadonlySet<string> = union.toSet();
      // Assert
      expect(set.has('belgium')).toBe(false);
    });

    it('should return a fresh, independent copy on every call', () => {
      // Arrange
      const union = LiteralUnion(['a', 'b', 'c'] as const);
      // Act & Assert — a new set each time, unlike toArray's cached reference
      expect(union.toSet()).not.toBe(union.toSet());
    });

    it('should not affect the union when the returned set is mutated', () => {
      // Arrange
      const union = LiteralUnion(['a', 'b', 'c'] as const);
      // Act — mutate the returned copy (a Set cannot be frozen)
      const set = union.toSet() as Set<string>;
      set.add('z');
      // Assert — the guard and a fresh set are untouched by the mutation
      expect(union.isOfType('z')).toBe(false);
      expect(union.toSet().has('z' as never)).toBe(false);
    });

    it('should have the same size as the union', () => {
      // Arrange
      const union = LiteralUnion(['a', 'b', 'c'] as const);
      // Act & Assert
      expect(union.toSet().size).toBe(union.size);
    });

    it('should type the set members as the union', () => {
      // Arrange
      const union = LiteralUnion(['germany', 'france', 'usa'] as const);
      // Act & Assert
      expectTypeOf(union.toSet()).toEqualTypeOf<
        ReadonlySet<'germany' | 'france' | 'usa'>
      >();
    });

    it('should throw a PanicException if the member name collides with the reserved key "toSet"', () => {
      // Arrange
      const literals = ['a', 'b', 'c', 'toSet'] as const;
      // Act
      const act = () => LiteralUnion(literals);
      // Assert
      expect(act).toThrow(PanicException);
    });
  });
});

describe('(unit) LiteralUnionMismatchError', () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: Construction
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Construction', () => {
    it('should tag the error with the LiteralUnionMismatchError kind', () => {
      // Arrange & Act
      const error = LiteralUnionMismatchError(
        ['germany', 'france', 'usa'],
        'belgium',
      );

      // Assert
      expect(error.kind).toBe('LiteralUnionMismatchError');
    });

    it('should derive the message from the members and the received value', () => {
      // Arrange & Act
      const error = LiteralUnionMismatchError(
        ['germany', 'france', 'usa'],
        'belgium',
      );

      // Assert
      expect(error.message).toBe(
        'Expected one of "germany", "france", "usa" but got "belgium"',
      );
    });

    it('should preserve the expected members and received value in details', () => {
      // Arrange
      const expected = ['germany', 'france', 'usa'] as const;

      // Act
      const error = LiteralUnionMismatchError(expected, 'belgium');

      // Assert — the exact input tuple is carried through, not a copy
      expect(error.details.expected).toBe(expected);
      expect(error.details.received).toBe('belgium');
    });

    it('should be narrowable via the Kind discriminant', () => {
      // Arrange
      const error: unknown = LiteralUnionMismatchError(['germany'], 'belgium');

      // Act & Assert
      expect(Kind.isOf(error, 'LiteralUnionMismatchError')).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: Message formatting
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Message formatting', () => {
    it('should list every member when the count is at the preview limit', () => {
      // Arrange & Act — five members is exactly the preview limit
      const error = LiteralUnionMismatchError(['a', 'b', 'c', 'd', 'e'], 'z');

      // Assert — no truncation, no "more" suffix
      expect(error.message).toBe(
        'Expected one of "a", "b", "c", "d", "e" but got "z"',
      );
    });

    it('should truncate the member list beyond the preview limit', () => {
      // Arrange & Act — seven members, two past the limit of five
      const error = LiteralUnionMismatchError(
        ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
        'z',
      );

      // Assert — only the first five are listed, the rest summarised
      expect(error.message).toBe(
        'Expected one of "a", "b", "c", "d", "e", … (+2 more) but got "z"',
      );
    });

    it('should keep the full member list in details even when the message truncates', () => {
      // Arrange
      const expected = ['a', 'b', 'c', 'd', 'e', 'f', 'g'] as const;

      // Act
      const error = LiteralUnionMismatchError(expected, 'z');

      // Assert — truncation only affects the human-readable string
      expect(error.message).toContain('… (+2 more)');
      expect(error.details.expected).toEqual([
        'a',
        'b',
        'c',
        'd',
        'e',
        'f',
        'g',
      ]);
    });

    it('should summarise a single overflowing member as "(+1 more)"', () => {
      // Arrange & Act — six members, one past the limit
      const error = LiteralUnionMismatchError(
        ['a', 'b', 'c', 'd', 'e', 'f'],
        'z',
      );

      // Assert
      expect(error.message).toBe(
        'Expected one of "a", "b", "c", "d", "e", … (+1 more) but got "z"',
      );
    });

    it('should quote members and the received value so special characters stay unambiguous', () => {
      // Arrange & Act — values containing quotes must be escaped, not raw
      const error = LiteralUnionMismatchError(['wei"rd'], 'ha"ck');

      // Assert — matches JSON.stringify escaping rather than naive interpolation
      expect(error.message).toContain(JSON.stringify('wei"rd'));
      expect(error.message).toContain(JSON.stringify('ha"ck'));
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: Type-level
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Type-level', () => {
    it('should carry the precise member union in details.expected', () => {
      // Arrange & Act
      const error = LiteralUnionMismatchError(
        ['germany', 'france', 'usa'] as const,
        'belgium',
      );

      // Assert
      expectTypeOf(error.details.expected).toEqualTypeOf<
        NonEmptyReadonlyArray<'germany' | 'france' | 'usa'>
      >();
    });

    it('should default the member type to the wide LiteralUnionMemberBase', () => {
      // Arrange
      type Default = LiteralUnionMismatchError;

      // Act & Assert — an unparameterised reference widens to string members
      expectTypeOf<Default['details']['expected']>().toEqualTypeOf<
        NonEmptyReadonlyArray<string>
      >();
    });
  });
});
