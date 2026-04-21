import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { AssertException, PanicException, flow } from '@typemint/core';
import { Result } from './result.js';
import {
  assertNone,
  assertSome,
  NoneLike,
  OptionLike,
  ParseOptionError,
  SomeLike,
  Option,
  type None,
  type Some,
} from './option.js';

describe('(Unit) Option', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // MARK: SomeLike
  // ───────────────────────────────────────────────────────────────────────────
  describe('SomeLike.isOfType - when checking if a plain value is a SomeLike', () => {
    it('should return true for a valid SomeLike shape', () => {
      // Arrange
      const value = { kind: 'Some', value: 42 };

      // Act
      const result = SomeLike.isOfType(value);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for a NoneLike shape', () => {
      // Arrange
      const value = { kind: 'None' };

      // Act
      const result = SomeLike.isOfType(value);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for an object missing the value key', () => {
      // Arrange
      const value = { kind: 'Some' };

      // Act
      const result = SomeLike.isOfType(value);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for null', () => {
      // Arrange
      const value = null;

      // Act
      const result = SomeLike.isOfType(value);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for a primitive', () => {
      // Arrange
      const value = 42;

      // Act
      const result = SomeLike.isOfType(value);

      // Assert
      expect(result).toBe(false);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: NoneLike
  // ───────────────────────────────────────────────────────────────────────────
  describe('NoneLike.isOfType - when checking if a plain value is a NoneLike', () => {
    it('should return true for a valid NoneLike shape', () => {
      // Arrange
      const value = { kind: 'None' };

      // Act
      const result = NoneLike.isOfType(value);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for a SomeLike shape', () => {
      // Arrange
      const value = { kind: 'Some', value: 42 };

      // Act
      const result = NoneLike.isOfType(value);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for null', () => {
      // Arrange
      const value = null;

      // Act
      const result = NoneLike.isOfType(value);

      // Assert
      expect(result).toBe(false);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: OptionLike
  // ───────────────────────────────────────────────────────────────────────────
  describe('OptionLike.isOfType - when checking if a plain value is an OptionLike', () => {
    it('should return true for a SomeLike shape', () => {
      expect(OptionLike.isOfType({ kind: 'Some', value: 1 })).toBe(true);
    });

    it('should return true for a NoneLike shape', () => {
      expect(OptionLike.isOfType({ kind: 'None' })).toBe(true);
    });

    it('should return false for an unrelated kind', () => {
      expect(OptionLike.isOfType({ kind: 'Ok', value: 1 })).toBe(false);
    });

    it('should return false for null', () => {
      expect(OptionLike.isOfType(null)).toBe(false);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: Some — isSome / isNone
  // ───────────────────────────────────────────────────────────────────────────
  describe('Some.isSome - when called on a Some', () => {
    it('should return true', () => {
      expect(Option.Some(1).isSome()).toBe(true);
    });

    it('should narrow the type to Some<T>', () => {
      const o = Option.Some(42) as Option<number>;
      if (o.isSome()) {
        expectTypeOf(o).toEqualTypeOf<Some<number>>();
      }
    });
  });

  describe('Some.isNone - when called on a Some', () => {
    it('should return false', () => {
      expect(Option.Some(1).isNone()).toBe(false);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: None — isSome / isNone
  // ───────────────────────────────────────────────────────────────────────────
  describe('None.isSome - when called on a None', () => {
    it('should return false', () => {
      expect(Option.None().isSome()).toBe(false);
    });
  });

  describe('None.isNone - when called on a None', () => {
    it('should return true', () => {
      expect(Option.None().isNone()).toBe(true);
    });

    it('should narrow the type to None<T>', () => {
      const o = Option.None<number>() as Option<number>;
      if (o.isNone()) {
        expectTypeOf(o).toEqualTypeOf<None<number>>();
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: map
  // ───────────────────────────────────────────────────────────────────────────
  describe('Some.map - when transforming a present value', () => {
    it('should apply the function to the value', () => {
      // Arrange
      const o = Option.Some(2);

      // Act
      const result = o.map((n) => n * 10);

      // Assert
      expect(result.isSome()).toBe(true);
      assertSome(result);
      expect(result.value).toBe(20);
    });

    it('should return a Some with the transformed type', () => {
      const result = Option.Some(2).map((n) => String(n));
      expectTypeOf(result).toEqualTypeOf<Some<string>>();
    });
  });

  describe('None.map - when transforming an absent value', () => {
    it('should not call the function', () => {
      // Arrange
      const fn = vi.fn<(value: number) => unknown>();

      // Act
      Option.None<number>().map(fn);

      // Assert
      expect(fn).not.toHaveBeenCalled();
    });

    it('should return a None', () => {
      // Arrange
      const o = Option.None<number>();

      // Act
      const result = o.map((n) => n * 10);

      // Assert
      expect(result.isNone()).toBe(true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: mapOr
  // ───────────────────────────────────────────────────────────────────────────
  describe('Some.mapOr - when a value is present', () => {
    it('should apply the function and return its result', () => {
      expect(Option.Some(3).mapOr(0, (n) => n * 2)).toBe(6);
    });
  });

  describe('None.mapOr - when absent', () => {
    it('should return the default value without calling the function', () => {
      // Arrange
      const fn = vi.fn<(value: number) => unknown>();

      // Act
      const result = Option.None<number>().mapOr(99, fn);

      // Assert
      expect(result).toBe(99);
      expect(fn).not.toHaveBeenCalled();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: mapOrElse
  // ───────────────────────────────────────────────────────────────────────────
  describe('Some.mapOrElse - when a value is present', () => {
    it('should apply the transform function', () => {
      const result = Option.Some(3).mapOrElse(
        () => 'nothing',
        (n) => `value:${n}`,
      );
      expect(result).toBe('value:3');
    });

    it('should not call the default function', () => {
      // Arrange
      const defaultFn = vi.fn<() => string>().mockReturnValue('nothing');

      // Act
      Option.Some(3).mapOrElse(defaultFn, (n) => `value:${n}`);

      // Assert
      expect(defaultFn).not.toHaveBeenCalled();
    });
  });

  describe('None.mapOrElse - when absent', () => {
    it('should call the default function and return its result', () => {
      const result = Option.None<number>().mapOrElse(
        () => 'nothing',
        (n) => `value:${n}`,
      );
      expect(result).toBe('nothing');
    });

    it('should not call the transform function', () => {
      // Arrange
      const fn = vi.fn<(value: number) => unknown>();

      // Act
      Option.None<number>().mapOrElse(() => 'nothing', fn);

      // Assert
      expect(fn).not.toHaveBeenCalled();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: andThen
  // ───────────────────────────────────────────────────────────────────────────
  describe('Some.andThen - when chaining a fallible step', () => {
    it('should return the result of the function when the inner option is Some', () => {
      // Arrange
      const parse = (s: string): Option<number> =>
        Number.isNaN(Number(s)) ? Option.None() : Option.Some(Number(s));

      // Act
      const result = Option.Some('42').andThen(parse);

      // Assert
      assertSome(result);
      expect(result.value).toBe(42);
    });

    it('should propagate None when the function returns None', () => {
      // Arrange
      const parse = (_s: string): Option<number> => Option.None();

      // Act
      const result = Option.Some('bad').andThen(parse);

      // Assert
      expect(result.isNone()).toBe(true);
    });
  });

  describe('None.andThen - when chaining on an absent value', () => {
    it('should not call the function', () => {
      // Arrange
      const fn = vi.fn<(value: string) => Option<unknown>>();

      // Act
      Option.None<string>().andThen(fn);

      // Assert
      expect(fn).not.toHaveBeenCalled();
    });

    it('should return None', () => {
      const result = Option.None<string>().andThen((s) =>
        Option.Some(s.length),
      );
      expect(result.isNone()).toBe(true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: orElse
  // ───────────────────────────────────────────────────────────────────────────
  describe('Some.orElse - when a value is present', () => {
    it('should not call the fallback and return self', () => {
      // Arrange
      const fn = vi.fn<() => Option<number>>().mockReturnValue(Option.Some(99));

      // Act
      const result = Option.Some(1).orElse(fn);

      // Assert
      assertSome(result);
      expect(result.value).toBe(1);
      expect(fn).not.toHaveBeenCalled();
    });
  });

  describe('None.orElse - when absent', () => {
    it('should call the fallback and return its result', () => {
      // Arrange
      const result = Option.None<number>().orElse(() => Option.Some(0));

      // Assert
      assertSome(result);
      expect(result.value).toBe(0);
    });

    it('should propagate None if fallback also returns None', () => {
      const result = Option.None<number>().orElse(() => Option.None());
      expect(result.isNone()).toBe(true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: filter
  // ───────────────────────────────────────────────────────────────────────────
  describe('Some.filter - when applying a predicate to a present value', () => {
    it('should return Some when the predicate passes', () => {
      const result = Option.Some(4).filter((n) => n % 2 === 0);
      assertSome(result);
      expect(result.value).toBe(4);
    });

    it('should return None when the predicate fails', () => {
      const result = Option.Some(3).filter((n) => n % 2 === 0);
      expect(result.isNone()).toBe(true);
    });
  });

  describe('None.filter - when filtering an absent value', () => {
    it('should return None without calling the predicate', () => {
      // Arrange
      const predicate = vi
        .fn<(value: number) => boolean>()
        .mockReturnValue(true);

      // Act
      const result = Option.None<number>().filter(predicate);

      // Assert
      expect(result.isNone()).toBe(true);
      expect(predicate).not.toHaveBeenCalled();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: zip
  // ───────────────────────────────────────────────────────────────────────────
  describe('Some.zip - when pairing two present values', () => {
    it('should return Some of a tuple when both are Some', () => {
      const result = Option.Some(1).zip(Option.Some('a'));
      assertSome(result);
      expect(result.value).toStrictEqual([1, 'a']);
    });

    it('should return None when the other option is None', () => {
      const result = Option.Some(1).zip(Option.None<string>());
      expect(result.isNone()).toBe(true);
    });
  });

  describe('None.zip - when the first option is None', () => {
    it('should always return None', () => {
      const result = Option.None<number>().zip(Option.Some('a'));
      expect(result.isNone()).toBe(true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: unwrap
  // ───────────────────────────────────────────────────────────────────────────
  describe('Some.unwrap - when extracting the present value', () => {
    it('should return the value after narrowing with isSome', () => {
      // Arrange
      const o = Option.Some(42) as Option<number>;

      // Assert
      if (o.isSome()) {
        expect(o.unwrap()).toBe(42);
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: unwrapOr
  // ───────────────────────────────────────────────────────────────────────────
  describe('Some.unwrapOr - when a value is present', () => {
    it('should return the value and ignore the default', () => {
      expect(Option.Some(1).unwrapOr(0)).toBe(1);
    });
  });

  describe('None.unwrapOr - when absent', () => {
    it('should return the default value', () => {
      expect(Option.None<number>().unwrapOr(0)).toBe(0);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: unwrapOrElse
  // ───────────────────────────────────────────────────────────────────────────
  describe('Some.unwrapOrElse - when a value is present', () => {
    it('should return the value without calling the fallback', () => {
      // Arrange
      const fn = vi.fn<() => number>().mockReturnValue(99);

      // Act
      const result = Option.Some(1).unwrapOrElse(fn);

      // Assert
      expect(result).toBe(1);
      expect(fn).not.toHaveBeenCalled();
    });
  });

  describe('None.unwrapOrElse - when absent', () => {
    it('should call the fallback and return its value', () => {
      const result = Option.None<number>().unwrapOrElse(() => 42);
      expect(result).toBe(42);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: unsafeUnwrap
  // ───────────────────────────────────────────────────────────────────────────
  describe('Some.unsafeUnwrap - when extracting without narrowing', () => {
    it('should return the value', () => {
      expect(Option.Some(1).unsafeUnwrap()).toBe(1);
    });
  });

  describe('None.unsafeUnwrap - when called on an absent value', () => {
    it('should throw a PanicException', () => {
      expect(() => Option.None().unsafeUnwrap()).toThrowError(PanicException);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: tap
  // ───────────────────────────────────────────────────────────────────────────
  describe('Some.tap - when running a side effect on the present value', () => {
    it('should call the function with the value and return self', () => {
      // Arrange
      const fn = vi.fn<(value: number) => void>();
      const o = Option.Some(1);

      // Act
      const result = o.tap(fn);

      // Assert
      expect(fn).toHaveBeenCalledWith(1);
      expect(result).toBe(o);
    });
  });

  describe('None.tap - when running a side effect on an absent value', () => {
    it('should not call the function and return self', () => {
      // Arrange
      const fn = vi.fn<(value: number) => void>();
      const o = Option.None<number>();

      // Act
      const result = o.tap(fn);

      // Assert
      expect(fn).not.toHaveBeenCalled();
      expect(result).toBe(o);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: tapNone
  // ───────────────────────────────────────────────────────────────────────────
  describe('None.tapNone - when running a side effect on absence', () => {
    it('should call the function and return self', () => {
      // Arrange
      const fn = vi.fn<() => void>();
      const o = Option.None();

      // Act
      const result = o.tapNone(fn);

      // Assert
      expect(fn).toHaveBeenCalledOnce();
      expect(result).toBe(o);
    });
  });

  describe('Some.tapNone - when a value is present', () => {
    it('should not call the function and return self', () => {
      // Arrange
      const fn = vi.fn<() => void>();
      const o = Option.Some(1);

      // Act
      const result = o.tapNone(fn);

      // Assert
      expect(fn).not.toHaveBeenCalled();
      expect(result).toBe(o);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: match
  // ───────────────────────────────────────────────────────────────────────────
  describe('Some.match - when pattern matching a present value', () => {
    it('should call the Some handler with the value', () => {
      const result = Option.Some(1).match({
        Some: (n) => `some:${n}`,
        None: () => 'none',
      });
      expect(result).toBe('some:1');
    });

    it('should not call the None handler', () => {
      // Arrange
      const noneFn = vi.fn<() => string>().mockReturnValue('none');

      // Act
      Option.Some(1).match({ Some: (n) => `some:${n}`, None: noneFn });

      // Assert
      expect(noneFn).not.toHaveBeenCalled();
    });
  });

  describe('None.match - when pattern matching an absent value', () => {
    it('should call the None handler', () => {
      const result = Option.None<number>().match({
        Some: (n) => `some:${n}`,
        None: () => 'none',
      });
      expect(result).toBe('none');
    });

    it('should not call the Some handler', () => {
      // Arrange
      const someFn = vi.fn<(value: number) => string>().mockReturnValue('some');

      // Act
      Option.None<number>().match({ Some: someFn, None: () => 'none' });

      // Assert
      expect(someFn).not.toHaveBeenCalled();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: toJSON
  // ───────────────────────────────────────────────────────────────────────────
  describe('Some.toJSON - when serializing a Some', () => {
    it('should return the SomeLike shape', () => {
      expect(Option.Some(42).toJSON()).toStrictEqual({
        kind: 'Some',
        value: 42,
      });
    });

    it('should produce valid JSON via JSON.stringify', () => {
      expect(JSON.stringify(Option.Some(42))).toBe(
        '{"kind":"Some","value":42}',
      );
    });
  });

  describe('None.toJSON - when serializing a None', () => {
    it('should return the NoneLike shape', () => {
      expect(Option.None().toJSON()).toStrictEqual({ kind: 'None' });
    });

    it('should produce valid JSON via JSON.stringify', () => {
      expect(JSON.stringify(Option.None())).toBe('{"kind":"None"}');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: toResult
  // ───────────────────────────────────────────────────────────────────────────
  describe('Some.toResult - when converting a Some to a Result', () => {
    it('should return an Ok carrying the present value', () => {
      const result = Option.Some(42).toResult('NOT_FOUND');
      expect(result.isOk()).toBe(true);
      expect(result.unsafeUnwrap()).toBe(42);
    });

    it('should have the correct type', () => {
      const result = Option.Some(42).toResult('NOT_FOUND');
      expectTypeOf(result).toEqualTypeOf<
        import('./result.js').Ok<number, string>
      >();
    });
  });

  describe('None.toResult - when converting a None to a Result', () => {
    it('should return an Err carrying the provided error', () => {
      const result = Option.None<number>().toResult('NOT_FOUND');
      expect(result.isErr()).toBe(true);
      expect(result.unsafeUnwrapErr()).toBe('NOT_FOUND');
    });

    it('should have the correct type', () => {
      const result = Option.None<number>().toResult('NOT_FOUND');
      expectTypeOf(result).toEqualTypeOf<
        import('./result.js').Err<number, string>
      >();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: Option.fromNullable
  // ───────────────────────────────────────────────────────────────────────────
  describe('Option.fromNullable - when wrapping a nullable value', () => {
    it('should return Some for a non-null value', () => {
      const o = Option.fromNullable('hello');
      assertSome(o);
      expect(o.value).toBe('hello');
    });

    it('should return None for null', () => {
      expect(Option.fromNullable(null).isNone()).toBe(true);
    });

    it('should return None for undefined', () => {
      expect(Option.fromNullable(undefined).isNone()).toBe(true);
    });

    it('should return Some for 0', () => {
      const o = Option.fromNullable(0);
      assertSome(o);
      expect(o.value).toBe(0);
    });

    it('should return Some for an empty string', () => {
      const o = Option.fromNullable('');
      assertSome(o);
      expect(o.value).toBe('');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: Option.fromResult
  // ───────────────────────────────────────────────────────────────────────────
  describe('Option.fromResult - when converting a Result to an Option', () => {
    it('should return Some for an Ok', () => {
      const o = Option.fromResult(Result.Ok(42));
      assertSome(o);
      expect(o.value).toBe(42);
    });

    it('should return None for an Err', () => {
      const o = Option.fromResult(Result.Err('boom'));
      expect(o.isNone()).toBe(true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: Option.fromJSON
  // ───────────────────────────────────────────────────────────────────────────
  describe('Option.fromJSON - when deserializing an Option from JSON', () => {
    it('should parse a valid SomeLike shape', () => {
      const json = JSON.parse(JSON.stringify(Option.Some(42)));
      const parsed = Option.fromJSON<number>(json);
      expect(parsed.isOk()).toBe(true);
      const inner = parsed.unsafeUnwrap();
      assertSome(inner);
      expect(inner.value).toBe(42);
    });

    it('should parse a valid NoneLike shape', () => {
      const json = JSON.parse(JSON.stringify(Option.None()));
      const parsed = Option.fromJSON(json);
      expect(parsed.isOk()).toBe(true);
      const inner = parsed.unsafeUnwrap();
      expect(inner.isNone()).toBe(true);
    });

    it('should return an Err for a non-object input', () => {
      const parsed = Option.fromJSON('not an object');
      expect(parsed.isErr()).toBe(true);
    });

    it('should return an Err for an unrecognized kind', () => {
      const parsed = Option.fromJSON({ kind: 'Ok', value: 1 });
      expect(parsed.isErr()).toBe(true);
      if (parsed.isErr()) {
        expect(ParseOptionError.isOfType(parsed.error)).toBe(true);
      }
    });

    it('should return an Err for null input', () => {
      const parsed = Option.fromJSON(null);
      expect(parsed.isErr()).toBe(true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: Option.isOption
  // ───────────────────────────────────────────────────────────────────────────
  describe('Option.isOption - when checking if a value is an Option instance', () => {
    it('should return true for a Some instance', () => {
      expect(Option.isOption(Option.Some(1))).toBe(true);
    });

    it('should return true for a None instance', () => {
      expect(Option.isOption(Option.None())).toBe(true);
    });

    it('should return false for a plain SomeLike object', () => {
      expect(Option.isOption({ kind: 'Some', value: 1 })).toBe(false);
    });

    it('should return false for null', () => {
      expect(Option.isOption(null)).toBe(false);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: Option.isSome / Option.isNone
  // ───────────────────────────────────────────────────────────────────────────
  describe('Option.isSome - data-first type guard', () => {
    it('should return true for a Some', () => {
      expect(Option.isSome(Option.Some(1))).toBe(true);
    });

    it('should return false for a None', () => {
      expect(Option.isSome(Option.None<number>())).toBe(false);
    });
  });

  describe('Option.isNone - data-first type guard', () => {
    it('should return true for a None', () => {
      expect(Option.isNone(Option.None())).toBe(true);
    });

    it('should return false for a Some', () => {
      expect(Option.isNone(Option.Some(1))).toBe(false);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: Option.unsafeUnwrap
  // ───────────────────────────────────────────────────────────────────────────
  describe('Option.unsafeUnwrap - when unwrapping without narrowing', () => {
    it('should return the value for a Some', () => {
      expect(Option.unsafeUnwrap(Option.Some(1))).toBe(1);
    });

    it('should throw PanicException for a None', () => {
      expect(() => Option.unsafeUnwrap(Option.None())).toThrowError(
        PanicException,
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: Option.all
  // ───────────────────────────────────────────────────────────────────────────
  describe('Option.all - when combining multiple Options', () => {
    it('should return Some of a tuple when all are Some', () => {
      const result = Option.all(
        Option.Some(1),
        Option.Some('hello'),
        Option.Some(true),
      );
      assertSome(result);
      expect(result.value).toStrictEqual([1, 'hello', true]);
    });

    it('should return None on the first None encountered', () => {
      const result = Option.all(
        Option.Some(1),
        Option.None<string>(),
        Option.Some(true),
      );
      expect(result.isNone()).toBe(true);
    });

    it('should return Some of empty tuple for zero arguments', () => {
      const result = Option.all();
      assertSome(result);
      expect(result.value).toStrictEqual([]);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: Option.allRecord
  // ───────────────────────────────────────────────────────────────────────────
  describe('Option.allRecord - when combining a record of Options', () => {
    it('should return Some of a record when all are Some', () => {
      const result = Option.allRecord({
        name: Option.Some('Alice'),
        age: Option.Some(30),
      });
      assertSome(result);
      expect(result.value).toStrictEqual({ name: 'Alice', age: 30 });
    });

    it('should return None if any value is None', () => {
      const result = Option.allRecord({
        name: Option.Some('Alice'),
        age: Option.None<number>(),
      });
      expect(result.isNone()).toBe(true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: ParseOptionError
  // ───────────────────────────────────────────────────────────────────────────
  describe('ParseOptionError.of - when constructing a ParseOptionError', () => {
    it('should have kind ParseOptionError', () => {
      const error = ParseOptionError.of('reason', null);
      expect(error.kind).toBe('ParseOptionError');
      expect(error.reason).toBe('reason');
      expect(error.received).toBeNull();
    });
  });

  describe('ParseOptionError.isOfType - when checking for a ParseOptionError', () => {
    it('should return true for a ParseOptionError', () => {
      const error = ParseOptionError.of('reason', null);
      expect(ParseOptionError.isOfType(error)).toBe(true);
    });

    it('should return false for an unrelated object', () => {
      expect(ParseOptionError.isOfType({ kind: 'Other' })).toBe(false);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: Data-last namespace operators
  // ───────────────────────────────────────────────────────────────────────────
  describe('Option.map - data-last via flow', () => {
    it('should transform the value in a pipeline', () => {
      const pipeline = flow(
        Option.map((n: number) => n * 2),
        Option.map((n) => String(n)),
      );
      const result = pipeline(Option.Some(5));
      assertSome(result);
      expect(result.value).toBe('10');
    });

    it('should pass None through unchanged', () => {
      const pipeline = flow(Option.map((n: number) => n * 2));
      expect(pipeline(Option.None<number>()).isNone()).toBe(true);
    });
  });

  describe('Option.mapOr - data-last', () => {
    it('should fold Some to the transformed value', () => {
      const fold = Option.mapOr(0, (n: number) => n * 2);
      expect(fold(Option.Some(3))).toBe(6);
    });

    it('should fold None to the default', () => {
      const fold = Option.mapOr(0, (n: number) => n * 2);
      expect(fold(Option.None<number>())).toBe(0);
    });
  });

  describe('Option.mapOrElse - data-last', () => {
    it('should apply the transform function for Some and return its result', () => {
      // Arrange
      const fold = Option.mapOrElse(
        () => 'nothing',
        (n: number) => `value:${n}`,
      );

      // Act
      const result = fold(Option.Some(3));

      // Assert
      expect(result).toBe('value:3');
    });

    it('should call the default function for None and return its result', () => {
      // Arrange
      const fold = Option.mapOrElse(
        () => 'nothing',
        (n: number) => `value:${n}`,
      );

      // Act
      const result = fold(Option.None<number>());

      // Assert
      expect(result).toBe('nothing');
    });

    it('should not call the default function when the option is Some', () => {
      // Arrange
      const defaultFn = vi.fn<() => string>().mockReturnValue('nothing');
      const fold = Option.mapOrElse(defaultFn, (n: number) => `value:${n}`);

      // Act
      fold(Option.Some(3));

      // Assert
      expect(defaultFn).not.toHaveBeenCalled();
    });

    it('should not call the transform function when the option is None', () => {
      // Arrange
      const transformFn = vi
        .fn<(value: number) => string>()
        .mockReturnValue('value');
      const fold = Option.mapOrElse(() => 'nothing', transformFn);

      // Act
      fold(Option.None<number>());

      // Assert
      expect(transformFn).not.toHaveBeenCalled();
    });

    it('should work in a flow pipeline', () => {
      // Arrange
      const pipeline = flow(
        Option.mapOrElse(
          () => 0,
          (n: number) => n * 2,
        ),
      );

      // Assert
      expect(pipeline(Option.Some(5))).toBe(10);
      expect(pipeline(Option.None<number>())).toBe(0);
    });
  });

  describe('Option.andThen - data-last', () => {
    it('should chain the step on Some', () => {
      const parse = (s: string): Option<number> =>
        Number.isNaN(Number(s)) ? Option.None() : Option.Some(Number(s));

      const pipeline = flow(Option.andThen(parse));
      const result = pipeline(Option.Some('42'));
      assertSome(result);
      expect(result.value).toBe(42);
    });
  });

  describe('Option.orElse - data-last', () => {
    it('should recover from None', () => {
      const pipeline = flow(Option.orElse(() => Option.Some(0)));
      const result = pipeline(Option.None<number>());
      assertSome(result);
      expect(result.value).toBe(0);
    });
  });

  describe('Option.filter - data-last', () => {
    it('should keep Some values that pass the predicate', () => {
      const pipeline = flow(Option.filter((n: number) => n > 0));
      assertSome(pipeline(Option.Some(1)));
      expect(pipeline(Option.Some(-1)).isNone()).toBe(true);
    });
  });

  describe('Option.unwrapOr - data-last', () => {
    it('should return the value for Some', () => {
      expect(Option.unwrapOr(0)(Option.Some(5))).toBe(5);
    });

    it('should return the default for None', () => {
      expect(Option.unwrapOr(0)(Option.None<number>())).toBe(0);
    });
  });

  describe('Option.unwrapOrElse - data-last', () => {
    it('should compute the fallback for None', () => {
      expect(Option.unwrapOrElse(() => 99)(Option.None<number>())).toBe(99);
    });
  });

  describe('Option.tap - data-last', () => {
    it('should call the side effect for Some', () => {
      const fn = vi.fn<(value: number) => void>();
      const pipeline = flow(Option.tap<number>(fn));
      const o = Option.Some(1);
      pipeline(o);
      expect(fn).toHaveBeenCalledWith(1);
    });

    it('should not call the side effect for None', () => {
      const fn = vi.fn<(value: number) => void>();
      const pipeline = flow(Option.tap<number>(fn));
      pipeline(Option.None<number>());
      expect(fn).not.toHaveBeenCalled();
    });
  });

  describe('Option.tapNone - data-last', () => {
    it('should call the side effect for None', () => {
      const fn = vi.fn<() => void>();
      const pipeline = flow(Option.tapNone<number>(fn));
      pipeline(Option.None<number>());
      expect(fn).toHaveBeenCalledOnce();
    });
  });

  describe('Option.match - data-last', () => {
    it('should exhaustively match in a pipeline', () => {
      const pipeline = flow(
        Option.match({
          Some: (n: number) => `some:${n}`,
          None: () => 'none',
        }),
      );
      expect(pipeline(Option.Some(1))).toBe('some:1');
      expect(pipeline(Option.None<number>())).toBe('none');
    });
  });

  describe('Option.toResult - data-last', () => {
    it('should convert Some to Ok', () => {
      const convert = Option.toResult('NOT_FOUND');
      const result = convert(Option.Some(1));
      expect(result.isOk()).toBe(true);
      expect(result.unsafeUnwrap()).toBe(1);
    });

    it('should convert None to Err', () => {
      const convert = Option.toResult('NOT_FOUND');
      const result = convert(Option.None<number>());
      expect(result.isErr()).toBe(true);
      expect(result.unsafeUnwrapErr()).toBe('NOT_FOUND');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: assertSome
  // ───────────────────────────────────────────────────────────────────────────
  describe('assertSome - when asserting that a value is a Some', () => {
    it('should not throw for a Some', () => {
      const o: Option<number> = Option.Some(1);
      expect(() => assertSome(o)).not.toThrow();
    });

    it('should throw AssertException for a None', () => {
      const o: Option<number> = Option.None();
      expect(() => assertSome(o)).toThrowError(AssertException);
    });

    it('should throw AssertException for null', () => {
      expect(() => assertSome(null as unknown as Option<number>)).toThrowError(
        AssertException,
      );
    });

    it('should narrow the type to Some<T> after the call', () => {
      const o: Option<number> = Option.Some(42);
      assertSome(o);
      expectTypeOf(o).toEqualTypeOf<Some<number>>();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: assertNone
  // ───────────────────────────────────────────────────────────────────────────
  describe('assertNone - when asserting that a value is a None', () => {
    it('should not throw for a None', () => {
      const o: Option<number> = Option.None();
      expect(() => assertNone(o)).not.toThrow();
    });

    it('should throw AssertException for a Some', () => {
      const o: Option<number> = Option.Some(1);
      expect(() => assertNone(o)).toThrowError(AssertException);
    });

    it('should throw AssertException for null', () => {
      expect(() => assertNone(null as unknown as Option<number>)).toThrowError(
        AssertException,
      );
    });

    it('should narrow the type to None<T> after the call', () => {
      const o: Option<number> = Option.None();
      assertNone(o);
      expectTypeOf(o).toEqualTypeOf<None<number>>();
    });
  });
});
