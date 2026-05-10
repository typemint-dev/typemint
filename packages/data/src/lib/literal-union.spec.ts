import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import {
  LiteralUnion,
  type InferLiteralUnion,
  type LiteralUnionDescriptor,
  type LiteralUnionFrom,
  type LiteralUnionMembers,
} from './literal-union.js';
import { PanicException } from '@typemint/core';
import { assertErr, assertOk, Result } from '@typemint/result';

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
});
