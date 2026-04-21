import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { AssertException, PanicException, flow } from '@typemint/core';
import {
  assertErr,
  assertOk,
  ErrLike,
  OkLike,
  ParseResultError,
  Result,
  ResultLike,
  type Err,
  type Ok,
} from './result.js';

describe('(Unit) Result', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // MARK: OkLike
  // ───────────────────────────────────────────────────────────────────────────
  describe('OkLike.isOfType - when checking if a plain value is an OkLike', () => {
    it('should return true for a valid OkLike shape', () => {
      // Arrange
      const value = { kind: 'Ok', value: 42 };

      // Act
      const result = OkLike.isOfType(value);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for an ErrLike shape', () => {
      // Arrange
      const value = { kind: 'Err', error: 'boom' };

      // Act
      const result = OkLike.isOfType(value);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for an object missing the value key', () => {
      // Arrange
      const value = { kind: 'Ok' };

      // Act
      const result = OkLike.isOfType(value);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for null', () => {
      // Arrange
      const value = null;

      // Act
      const result = OkLike.isOfType(value);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for a primitive', () => {
      // Arrange
      const value = 42;

      // Act
      const result = OkLike.isOfType(value);

      // Assert
      expect(result).toBe(false);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: ErrLike
  // ───────────────────────────────────────────────────────────────────────────
  describe('ErrLike.isOfType - when checking if a plain value is an ErrLike', () => {
    it('should return true for a valid ErrLike shape', () => {
      // Arrange
      const value = { kind: 'Err', error: 'boom' };

      // Act
      const result = ErrLike.isOfType(value);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for an OkLike shape', () => {
      // Arrange
      const value = { kind: 'Ok', value: 1 };

      // Act
      const result = ErrLike.isOfType(value);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for an object missing the error key', () => {
      // Arrange
      const value = { kind: 'Err' };

      // Act
      const result = ErrLike.isOfType(value);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for null', () => {
      // Arrange
      const value = null;

      // Act
      const result = ErrLike.isOfType(value);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for a primitive', () => {
      // Arrange
      const value = 'not an object';

      // Act
      const result = ErrLike.isOfType(value);

      // Assert
      expect(result).toBe(false);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: ResultLike
  // ───────────────────────────────────────────────────────────────────────────
  describe('ResultLike.isOfType - when checking if a plain value is a ResultLike', () => {
    it('should return true for an OkLike shape', () => {
      // Arrange
      const value = { kind: 'Ok', value: 1 };

      // Act
      const result = ResultLike.isOfType(value);

      // Assert
      expect(result).toBe(true);
    });

    it('should return true for an ErrLike shape', () => {
      // Arrange
      const value = { kind: 'Err', error: 'boom' };

      // Act
      const result = ResultLike.isOfType(value);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for an unrelated object', () => {
      // Arrange
      const value = { kind: 'Maybe' };

      // Act
      const result = ResultLike.isOfType(value);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for null', () => {
      // Arrange
      const value = null;

      // Act
      const result = ResultLike.isOfType(value);

      // Assert
      expect(result).toBe(false);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: ParseResultError
  // ───────────────────────────────────────────────────────────────────────────
  describe('ParseResultError.of - when constructing a structured parse error', () => {
    it('should produce an object with kind ParseResultError', () => {
      // Arrange
      const reason = 'bad input';
      const received = null;

      // Act
      const error = ParseResultError.of(reason, received);

      // Assert
      expect(error.kind).toBe('ParseResultError');
    });

    it('should carry the provided reason', () => {
      // Arrange
      const reason = 'Expected an object';
      const received = 42;

      // Act
      const error = ParseResultError.of(reason, received);

      // Assert
      expect(error.reason).toBe(reason);
    });

    it('should carry the original received value', () => {
      // Arrange
      const reason = 'Invalid shape';
      const received = [1, 2, 3];

      // Act
      const error = ParseResultError.of(reason, received);

      // Assert
      expect(error.received).toBe(received);
    });
  });

  describe('ParseResultError.isOfType - when type-guarding a ParseResultError', () => {
    it('should return true for a value constructed by ParseResultError.of', () => {
      // Arrange
      const error = ParseResultError.of('reason', null);

      // Act
      const result = ParseResultError.isOfType(error);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for an unrelated object', () => {
      // Arrange
      const value = { kind: 'OtherError' };

      // Act
      const result = ParseResultError.isOfType(value);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for null', () => {
      // Arrange
      const value = null;

      // Act
      const result = ParseResultError.isOfType(value);

      // Assert
      expect(result).toBe(false);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: Ok factory
  // ───────────────────────────────────────────────────────────────────────────
  describe('Ok - when constructing a successful Result', () => {
    it('should produce a result with kind Ok', () => {
      // Arrange & Act
      const result = Result.Ok(42);

      // Assert
      expect(result.kind).toBe('Ok');
    });

    it('should expose the provided value', () => {
      // Arrange & Act
      const result = Result.Ok(42);

      // Assert
      expect(result.value).toBe(42);
    });

    it('should accept any value type including objects', () => {
      // Arrange
      const payload = { id: 1 };

      // Act
      const result = Result.Ok(payload);

      // Assert
      expect(result.value).toBe(payload);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: Err factory
  // ───────────────────────────────────────────────────────────────────────────
  describe('Err - when constructing a failed Result', () => {
    it('should produce a result with kind Err', () => {
      // Arrange & Act
      const result = Result.Err('boom');

      // Assert
      expect(result.kind).toBe('Err');
    });

    it('should expose the provided error', () => {
      // Arrange & Act
      const result = Result.Err('boom');

      // Assert
      expect(result.error).toBe('boom');
    });

    it('should accept any error type including objects', () => {
      // Arrange
      const payload = { code: 'NOT_FOUND' };

      // Act
      const result = Result.Err(payload);

      // Assert
      expect(result.error).toBe(payload);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: isOk
  // ───────────────────────────────────────────────────────────────────────────
  describe('isOk - when checking the Ok variant', () => {
    it('should return true on an Ok', () => {
      // Arrange
      const result = Result.Ok(1);

      // Act
      const isOk = result.isOk();

      // Assert
      expect(isOk).toBe(true);
    });

    it('should return false on an Err', () => {
      // Arrange
      const result = Result.Err('x');

      // Act
      const isOk = result.isOk();

      // Assert
      expect(isOk).toBe(false);
    });

    it('should narrow the type to Ok inside the branch', () => {
      // Arrange
      const result: Result<number, string> = Result.Ok(1);

      // Act & Assert (type-level)
      if (result.isOk()) {
        expectTypeOf<typeof result>().toEqualTypeOf<Ok<number, string>>();
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: isErr
  // ───────────────────────────────────────────────────────────────────────────
  describe('isErr - when checking the Err variant', () => {
    it('should return true on an Err', () => {
      // Arrange
      const result = Result.Err('x');

      // Act
      const isErr = result.isErr();

      // Assert
      expect(isErr).toBe(true);
    });

    it('should return false on an Ok', () => {
      // Arrange
      const result = Result.Ok(1);

      // Act
      const isErr = result.isErr();

      // Assert
      expect(isErr).toBe(false);
    });

    it('should narrow the type to Err inside the branch', () => {
      // Arrange
      const result: Result<number, string> = Result.Err('x');

      // Act & Assert (type-level)
      if (result.isErr()) {
        expectTypeOf<typeof result>().toEqualTypeOf<Err<number, string>>();
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: map
  // ───────────────────────────────────────────────────────────────────────────
  describe('map - when transforming the success value', () => {
    it('should return an Ok with the mapped value on Ok', () => {
      // Arrange
      const result = Result.Ok(2);

      // Act
      const mapped = result.map((n) => n * 10);

      // Assert
      assertOk(mapped);
      expect(mapped.value).toBe(20);
    });

    it('should pass the current value to the mapping function on Ok', () => {
      // Arrange
      const result = Result.Ok(5);
      const fn = vi.fn<(n: number) => number>((n) => n + 1);

      // Act
      result.map(fn);

      // Assert
      expect(fn).toHaveBeenCalledWith(5);
    });

    it('should return the same Err without calling the function on Err', () => {
      // Arrange
      const result = Result.Err('boom');
      const fn = vi.fn<(value: never) => unknown>();

      // Act
      const mapped = result.map(fn);

      // Assert
      expect(fn).not.toHaveBeenCalled();
      assertErr(mapped);
      expect(mapped.error).toBe('boom');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: mapErr
  // ───────────────────────────────────────────────────────────────────────────
  describe('mapErr - when transforming the error value', () => {
    it('should return an Err with the mapped error on Err', () => {
      // Arrange
      const result = Result.Err('NOT_FOUND');

      // Act
      const mapped = result.mapErr((code) => ({ code }));

      // Assert
      assertErr(mapped);
      expect(mapped.error).toEqual({ code: 'NOT_FOUND' });
    });

    it('should pass the current error to the mapping function on Err', () => {
      // Arrange
      const result = Result.Err('boom');
      const fn = vi.fn<(e: string) => string>((e) => e.toUpperCase());

      // Act
      result.mapErr(fn);

      // Assert
      expect(fn).toHaveBeenCalledWith('boom');
    });

    it('should return the same Ok without calling the function on Ok', () => {
      // Arrange
      const result = Result.Ok(42);
      const fn = vi.fn<(error: never) => unknown>();

      // Act
      const mapped = result.mapErr(fn);

      // Assert
      expect(fn).not.toHaveBeenCalled();
      assertOk(mapped);
      expect(mapped.value).toBe(42);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: mapOr
  // ───────────────────────────────────────────────────────────────────────────
  describe('mapOr - when folding a Result to a plain value with a default', () => {
    it('should apply the function and ignore the default on Ok', () => {
      // Arrange
      const result = Result.Ok(3);

      // Act
      const value = result.mapOr(0, (n) => n * 2);

      // Assert
      expect(value).toBe(6);
    });

    it('should not call the success function on Err and return the default', () => {
      // Arrange
      const result = Result.Err('x');
      const fn = vi.fn<(n: number) => number>((n) => n * 2);

      // Act
      const value = result.mapOr(0, fn);

      // Assert
      expect(fn).not.toHaveBeenCalled();
      expect(value).toBe(0);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: mapOrElse
  // ───────────────────────────────────────────────────────────────────────────
  describe('mapOrElse - when folding a Result to a plain value via handlers', () => {
    it('should apply the success function and not call the default function on Ok', () => {
      // Arrange
      const result = Result.Ok(3);
      const defaultFn = vi.fn<(error: never) => string>(() => 'fallback');

      // Act
      const value = result.mapOrElse(defaultFn, (n) => `value:${n}`);

      // Assert
      expect(defaultFn).not.toHaveBeenCalled();
      expect(value).toBe('value:3');
    });

    it('should apply the default function to the error and not call the success function on Err', () => {
      // Arrange
      const result = Result.Err('boom');
      const successFn = vi.fn<(n: number) => string>((n) => `value:${n}`);

      // Act
      const value = result.mapOrElse((e) => `fallback:${e}`, successFn);

      // Assert
      expect(successFn).not.toHaveBeenCalled();
      expect(value).toBe('fallback:boom');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: andThen
  // ───────────────────────────────────────────────────────────────────────────
  describe('andThen - when chaining a fallible step onto the success value', () => {
    it('should call the function with the value and return its result on Ok', () => {
      // Arrange
      const result = Result.Ok('42');
      const parse = (s: string): Result<number, 'NaN'> =>
        Number.isNaN(Number(s)) ? Result.Err('NaN') : Result.Ok(Number(s));

      // Act
      const chained = result.andThen(parse);

      // Assert
      assertOk(chained);
      expect(chained.value).toBe(42);
    });

    it('should propagate an Err returned by the function on Ok', () => {
      // Arrange
      const result = Result.Ok('not-a-number');
      const parse = (s: string): Result<number, 'NaN'> =>
        Number.isNaN(Number(s)) ? Result.Err('NaN') : Result.Ok(Number(s));

      // Act
      const chained = result.andThen(parse);

      // Assert
      assertErr(chained);
      expect(chained.error).toBe('NaN');
    });

    it('should return the original Err without calling the function on Err', () => {
      // Arrange
      const result = Result.Err('original');
      const fn = vi.fn<(value: never) => Result<number, never>>(() =>
        Result.Ok(99),
      );

      // Act
      const chained = result.andThen(fn);

      // Assert
      expect(fn).not.toHaveBeenCalled();
      assertErr(chained);
      expect(chained.error).toBe('original');
    });

    it('should accumulate error types as a union across chained calls', () => {
      // Arrange
      const errOne = { kind: 'ErrOne' as const };
      const errTwo = { kind: 'ErrTwo' as const };
      const errThree = { kind: 'ErrThree' as const };
      const okOne = { kind: 'OkOne' as const };

      type ErrOne = typeof errOne;
      type ErrTwo = typeof errTwo;
      type ErrThree = typeof errThree;
      type OkOne = typeof okOne;

      function first(): Result<OkOne, ErrOne> {
        return Result.Err(errOne);
      }
      function second(): Result<OkOne, ErrTwo> {
        return Result.Err(errTwo);
      }
      function third(): Result<OkOne, ErrThree> {
        return Result.Err(errThree);
      }

      // Act
      const chained = first().andThen(second).andThen(third);

      // Assert (type-level)
      expectTypeOf<typeof chained>().toEqualTypeOf<
        Result<OkOne, ErrOne | ErrTwo | ErrThree>
      >();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: orElse
  // ───────────────────────────────────────────────────────────────────────────
  describe('orElse - when recovering from an Err', () => {
    it('should return self without calling the fallback on Ok', () => {
      // Arrange
      const result = Result.Ok(1);
      const fn = vi.fn<(error: never) => Result<number, never>>(() =>
        Result.Ok(99),
      );

      // Act
      const recovered = result.orElse(fn);

      // Assert
      expect(fn).not.toHaveBeenCalled();
      assertOk(recovered);
      expect(recovered.value).toBe(1);
    });

    it('should call the fallback with the error and return its result on Err', () => {
      // Arrange
      const result = Result.Err<number, string>('boom');
      const fn = vi.fn<(e: string) => Result<number, never>>((_e) =>
        Result.Ok(0),
      );

      // Act
      const recovered = result.orElse(fn);

      // Assert
      expect(fn).toHaveBeenCalledWith('boom');
      assertOk(recovered);
      expect(recovered.value).toBe(0);
    });

    it('should propagate a new Err if the fallback returns Err on Err', () => {
      // Arrange
      const result = Result.Err('original');

      // Act
      const recovered = result.orElse(() => Result.Err('recovered'));

      // Assert
      assertErr(recovered);
      expect(recovered.error).toBe('recovered');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: unwrap
  // ───────────────────────────────────────────────────────────────────────────
  describe('unwrap - when extracting the success value after narrowing to Ok', () => {
    it('should return the success value', () => {
      // Arrange
      const result: Result<number, string> = Result.Ok(42);

      // Act & Assert
      if (result.isOk()) {
        expect(result.unwrap()).toBe(42);
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: unwrapOr
  // ───────────────────────────────────────────────────────────────────────────
  describe('unwrapOr - when extracting with a fallback value', () => {
    it('should return the success value and ignore the default on Ok', () => {
      // Arrange
      const result = Result.Ok(1);

      // Act
      const value = result.unwrapOr(0);

      // Assert
      expect(value).toBe(1);
    });

    it('should return the default value on Err', () => {
      // Arrange
      const result = Result.Err('x');

      // Act
      const value = result.unwrapOr(0);

      // Assert
      expect(value).toBe(0);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: unwrapOrElse
  // ───────────────────────────────────────────────────────────────────────────
  describe('unwrapOrElse - when extracting with a lazy fallback', () => {
    it('should return the success value without calling the fallback on Ok', () => {
      // Arrange
      const result = Result.Ok(1);
      const fn = vi.fn<(error: never) => number>(() => 0);

      // Act
      const value = result.unwrapOrElse(fn);

      // Assert
      expect(fn).not.toHaveBeenCalled();
      expect(value).toBe(1);
    });

    it('should call the fallback with the error and return its result on Err', () => {
      // Arrange
      const result = Result.Err('boom');
      const fn = vi.fn<(e: string) => string>((e) => `recovered:${e}`);

      // Act
      const value = result.unwrapOrElse(fn);

      // Assert
      expect(fn).toHaveBeenCalledWith('boom');
      expect(value).toBe('recovered:boom');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: unwrapErr
  // ───────────────────────────────────────────────────────────────────────────
  describe('unwrapErr - when extracting the error value after narrowing to Err', () => {
    it('should return the error value', () => {
      // Arrange
      const result: Result<number, string> = Result.Err('boom');

      // Act & Assert
      if (result.isErr()) {
        expect(result.unwrapErr()).toBe('boom');
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: unsafeUnwrap
  // ───────────────────────────────────────────────────────────────────────────
  describe('unsafeUnwrap - when extracting without prior narrowing', () => {
    it('should return the success value on Ok', () => {
      // Arrange
      const result = Result.Ok(99);

      // Act
      const value = result.unsafeUnwrap();

      // Assert
      expect(value).toBe(99);
    });

    it('should throw a PanicException on Err', () => {
      // Arrange
      const result = Result.Err('x');

      // Act
      const act = () => result.unsafeUnwrap();

      // Assert
      expect(act).toThrow(PanicException);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: unsafeUnwrapErr
  // ───────────────────────────────────────────────────────────────────────────
  describe('unsafeUnwrapErr - when extracting the error without prior narrowing', () => {
    it('should return the error value on Err', () => {
      // Arrange
      const result = Result.Err('boom');

      // Act
      const error = result.unsafeUnwrapErr();

      // Assert
      expect(error).toBe('boom');
    });

    it('should throw a PanicException on Ok', () => {
      // Arrange
      const result = Result.Ok(1);

      // Act
      const act = () => result.unsafeUnwrapErr();

      // Assert
      expect(act).toThrow(PanicException);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: tap
  // ───────────────────────────────────────────────────────────────────────────
  describe('tap - when observing the success value for a side effect', () => {
    it('should call the function with the value and return the same instance on Ok', () => {
      // Arrange
      const result = Result.Ok(7);
      const fn = vi.fn<(value: number) => void>();

      // Act
      const returned = result.tap(fn);

      // Assert
      expect(fn).toHaveBeenCalledWith(7);
      expect(returned).toBe(result);
    });

    it('should not call the function and return the same instance on Err', () => {
      // Arrange
      const result = Result.Err('x');
      const fn = vi.fn<(value: never) => void>();

      // Act
      const returned = result.tap(fn);

      // Assert
      expect(fn).not.toHaveBeenCalled();
      expect(returned).toBe(result);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: tapErr
  // ───────────────────────────────────────────────────────────────────────────
  describe('tapErr - when observing the error value for a side effect', () => {
    it('should call the function with the error and return the same instance on Err', () => {
      // Arrange
      const result = Result.Err('boom');
      const fn = vi.fn<(error: string) => void>();

      // Act
      const returned = result.tapErr(fn);

      // Assert
      expect(fn).toHaveBeenCalledWith('boom');
      expect(returned).toBe(result);
    });

    it('should not call the function and return the same instance on Ok', () => {
      // Arrange
      const result = Result.Ok(1);
      const fn = vi.fn<(error: never) => void>();

      // Act
      const returned = result.tapErr(fn);

      // Assert
      expect(fn).not.toHaveBeenCalled();
      expect(returned).toBe(result);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: match
  // ───────────────────────────────────────────────────────────────────────────
  describe('match - when exhaustively pattern-matching a Result', () => {
    it('should call the Ok handler and not the Err handler on Ok', () => {
      // Arrange
      const result = Result.Ok(1);
      const okHandler = vi.fn<(n: number) => string>((n) => `ok:${n}`);
      const errHandler = vi.fn<(e: string) => string>((e) => `err:${e}`);

      // Act
      const matched = result.match({ Ok: okHandler, Err: errHandler });

      // Assert
      expect(errHandler).not.toHaveBeenCalled();
      expect(okHandler).toHaveBeenCalledWith(1);
      expect(matched).toBe('ok:1');
    });

    it('should call the Err handler and not the Ok handler on Err', () => {
      // Arrange
      const result = Result.Err('x');
      const okHandler = vi.fn<(n: number) => string>((n) => `ok:${n}`);
      const errHandler = vi.fn<(e: string) => string>((e) => `err:${e}`);

      // Act
      const matched = result.match({ Ok: okHandler, Err: errHandler });

      // Assert
      expect(okHandler).not.toHaveBeenCalled();
      expect(errHandler).toHaveBeenCalledWith('x');
      expect(matched).toBe('err:x');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: toJSON
  // ───────────────────────────────────────────────────────────────────────────
  describe('toJSON - when serializing a Result to a plain object', () => {
    it('should return an OkLike plain object for an Ok', () => {
      // Arrange
      const result = Result.Ok(42);

      // Act
      const json = result.toJSON();

      // Assert
      expect(json).toEqual({ kind: 'Ok', value: 42 });
    });

    it('should produce the correct JSON string via JSON.stringify for an Ok', () => {
      // Arrange
      const result = Result.Ok(42);

      // Act
      const str = JSON.stringify(result);

      // Assert
      expect(str).toBe('{"kind":"Ok","value":42}');
    });

    it('should return an ErrLike plain object for an Err', () => {
      // Arrange
      const result = Result.Err({ code: 'NOT_FOUND' });

      // Act
      const json = result.toJSON();

      // Assert
      expect(json).toEqual({ kind: 'Err', error: { code: 'NOT_FOUND' } });
    });

    it('should produce the correct JSON string via JSON.stringify for an Err', () => {
      // Arrange
      const result = Result.Err('boom');

      // Act
      const str = JSON.stringify(result);

      // Assert
      expect(str).toBe('{"kind":"Err","error":"boom"}');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: Result.fromNullable
  // ───────────────────────────────────────────────────────────────────────────
  describe('Result.fromNullable - when lifting a nullable value into a Result', () => {
    it('should return Ok with the value when the input is non-null and non-undefined', () => {
      // Arrange
      const value = 'hello';

      // Act
      const result = Result.fromNullable(value, 'MISSING');

      // Assert
      assertOk(result);
      expect(result.value).toBe('hello');
    });

    it('should return Err with the provided error when the input is null', () => {
      // Arrange
      const value = null;

      // Act
      const result = Result.fromNullable(value, 'MISSING');

      // Assert
      assertErr(result);
      expect(result.error).toBe('MISSING');
    });

    it('should return Err with the provided error when the input is undefined', () => {
      // Arrange
      const value = undefined;

      // Act
      const result = Result.fromNullable(value, 'MISSING');

      // Assert
      assertErr(result);
      expect(result.error).toBe('MISSING');
    });

    it('should strip null from the Ok value type', () => {
      // Arrange
      const value: string | null = 'hello';

      // Act
      const result = Result.fromNullable(value, 'MISSING');

      // Assert (type-level)
      expectTypeOf<typeof result>().toEqualTypeOf<Result<string, string>>();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: Result.fromThrowable
  // ───────────────────────────────────────────────────────────────────────────
  describe('Result.fromThrowable - when capturing throws as Err', () => {
    it('should return Ok with the return value when the function does not throw', () => {
      // Arrange
      const fn = () => 42;

      // Act
      const result = Result.fromThrowable(fn);

      // Assert
      assertOk(result);
      expect(result.value).toBe(42);
    });

    it('should return Err with the thrown value when the function throws', () => {
      // Arrange
      const error = new Error('parse failed');
      const fn = () => {
        throw error;
      };

      // Act
      const result = Result.fromThrowable(fn);

      // Assert
      assertErr(result);
      expect(result.error).toBe(error);
    });

    it('should apply mapError to the thrown value when a mapper is provided', () => {
      // Arrange
      const fn = () => {
        throw new Error('raw');
      };
      const mapError = (e: unknown) => ({ message: (e as Error).message });

      // Act
      const result = Result.fromThrowable(fn, mapError);

      // Assert
      assertErr(result);
      expect(result.error).toEqual({ message: 'raw' });
    });

    it('should re-throw a PanicException without capturing it', () => {
      // Arrange
      const fn = () => {
        throw new PanicException('programmer error');
      };

      // Act
      const act = () => Result.fromThrowable(fn);

      // Assert
      expect(act).toThrow(PanicException);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: Result.fromPromise
  // ───────────────────────────────────────────────────────────────────────────
  describe('Result.fromPromise - when capturing promise rejections as Err', () => {
    it('should return Ok when the promise resolves', async () => {
      // Arrange
      const promise = Promise.resolve(42);

      // Act
      const result = await Result.fromPromise(promise);

      // Assert
      assertOk(result);
      expect(result.value).toBe(42);
    });

    it('should return Err with the rejection reason when the promise rejects', async () => {
      // Arrange
      const error = new Error('network');
      const promise = Promise.reject(error);

      // Act
      const result = await Result.fromPromise(promise);

      // Assert
      assertErr(result);
      expect(result.error).toBe(error);
    });

    it('should apply mapError to the rejection reason when a mapper is provided', async () => {
      // Arrange
      const promise = Promise.reject(new Error('raw'));
      const mapError = (e: unknown) => ({ message: (e as Error).message });

      // Act
      const result = await Result.fromPromise(promise, mapError);

      // Assert
      assertErr(result);
      expect(result.error).toEqual({ message: 'raw' });
    });

    it('should accept a thunk returning a promise and return Ok on resolve', async () => {
      // Arrange
      const thunk = () => Promise.resolve('hello');

      // Act
      const result = await Result.fromPromise(thunk);

      // Assert
      assertOk(result);
      expect(result.value).toBe('hello');
    });

    it('should re-throw a PanicException emitted by the promise', async () => {
      // Arrange
      const promise = Promise.reject(new PanicException('panic'));

      // Act & Assert
      await expect(Result.fromPromise(promise)).rejects.toBeInstanceOf(
        PanicException,
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: Result.fromJSON
  // ───────────────────────────────────────────────────────────────────────────
  describe('Result.fromJSON - when deserializing a plain object into a Result', () => {
    it('should return Ok(Ok(value)) when the input is a valid OkLike', () => {
      // Arrange
      const input = { kind: 'Ok', value: 42 };

      // Act
      const result = Result.fromJSON<number, string>(input);

      // Assert
      assertOk(result);
      assertOk(result.value);
      expect(result.value.value).toBe(42);
    });

    it('should return Ok(Err(error)) when the input is a valid ErrLike', () => {
      // Arrange
      const input = { kind: 'Err', error: 'boom' };

      // Act
      const result = Result.fromJSON<number, string>(input);

      // Assert
      assertOk(result);
      assertErr(result.value);
      expect(result.value.error).toBe('boom');
    });

    it('should return Err(ParseResultError) when the input is not a record', () => {
      // Arrange
      const input = 'not an object';

      // Act
      const result = Result.fromJSON(input);

      // Assert
      assertErr(result);
      expect(ParseResultError.isOfType(result.error)).toBe(true);
    });

    it('should return Err(ParseResultError) when the input has an unknown kind', () => {
      // Arrange
      const input = { kind: 'Maybe', value: 1 };

      // Act
      const result = Result.fromJSON(input);

      // Assert
      assertErr(result);
      expect(ParseResultError.isOfType(result.error)).toBe(true);
    });

    it('should include the received value in the ParseResultError for a primitive', () => {
      // Arrange
      const input = null;

      // Act
      const result = Result.fromJSON(input);

      // Assert
      assertErr(result);
      expect((result.error as ParseResultError).received).toBe(null);
    });

    it('should include the received value in the ParseResultError for a bad shape', () => {
      // Arrange
      const input = { kind: 'Unknown' };

      // Act
      const result = Result.fromJSON(input);

      // Assert
      assertErr(result);
      expect((result.error as ParseResultError).received).toBe(input);
    });

    it('should round-trip an Ok through JSON.stringify and JSON.parse', () => {
      // Arrange
      const original = Result.Ok(42);
      const json = JSON.parse(JSON.stringify(original));

      // Act
      const parsed = Result.fromJSON<number, never>(json);

      // Assert
      assertOk(parsed);
      assertOk(parsed.value);
      expect(parsed.value.value).toBe(42);
    });

    it('should round-trip an Err through JSON.stringify and JSON.parse', () => {
      // Arrange
      const original = Result.Err('boom');
      const json = JSON.parse(JSON.stringify(original));

      // Act
      const parsed = Result.fromJSON<never, string>(json);

      // Assert
      assertOk(parsed);
      assertErr(parsed.value);
      expect(parsed.value.error).toBe('boom');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: Result.all
  // ───────────────────────────────────────────────────────────────────────────
  describe('Result.all - when combining multiple Results into a tuple', () => {
    it('should return Ok of the values tuple when all inputs are Ok', () => {
      // Arrange
      const results = [
        Result.Ok(1),
        Result.Ok('hello'),
        Result.Ok(true),
      ] as const;

      // Act
      const combined = Result.all(...results);

      // Assert
      assertOk(combined);
      expect(combined.value).toEqual([1, 'hello', true]);
    });

    it('should short-circuit on the first Err and return it', () => {
      // Arrange
      const results = [Result.Err('first' as const), Result.Ok(99)] as const;

      // Act
      const combined = Result.all(...results);

      // Assert
      assertErr(combined);
      expect(combined.error).toBe('first');
    });

    it('should preserve the element order of Ok values in the tuple', () => {
      // Arrange
      const combined = Result.all(Result.Ok(3), Result.Ok(1), Result.Ok(2));

      // Act
      assertOk(combined);

      // Assert
      expect(combined.value).toEqual([3, 1, 2]);
    });

    it('should return Ok of an empty array when called with no arguments', () => {
      // Arrange & Act
      const combined = Result.all();

      // Assert
      assertOk(combined);
      expect(combined.value).toEqual([]);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: Result.allSettled
  // ───────────────────────────────────────────────────────────────────────────
  describe('Result.allSettled - when collecting all errors without short-circuiting', () => {
    it('should return Ok of all values when all inputs are Ok', () => {
      // Arrange
      const combined = Result.allSettled(Result.Ok(1), Result.Ok(2));

      // Assert
      assertOk(combined);
      expect(combined.value).toEqual([1, 2]);
    });

    it('should return Err containing all errors when some inputs are Err', () => {
      // Arrange
      const combined = Result.allSettled(
        Result.Err('A' as const),
        Result.Ok(1),
        Result.Err('B' as const),
      );

      // Assert
      assertErr(combined);
      expect(combined.error).toEqual(['A', 'B']);
    });

    it('should return Err containing all errors when all inputs are Err', () => {
      // Arrange
      const combined = Result.allSettled(Result.Err('X'), Result.Err('Y'));

      // Assert
      assertErr(combined);
      expect(combined.error).toEqual(['X', 'Y']);
    });

    it('should collect errors in input order', () => {
      // Arrange
      const combined = Result.allSettled(
        Result.Err(1),
        Result.Err(2),
        Result.Err(3),
      );

      // Assert
      assertErr(combined);
      expect(combined.error).toEqual([1, 2, 3]);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: Result.allRecord
  // ───────────────────────────────────────────────────────────────────────────
  describe('Result.allRecord - when combining a record of named Results', () => {
    it('should return Ok of a record when all values are Ok', () => {
      // Arrange
      const combined = Result.allRecord({
        name: Result.Ok('Alice'),
        age: Result.Ok(30),
      });

      // Assert
      assertOk(combined);
      expect(combined.value).toEqual({ name: 'Alice', age: 30 });
    });

    it('should short-circuit on the first Err and return it', () => {
      // Arrange
      const combined = Result.allRecord({
        name: Result.Err('NAME_MISSING' as const),
        age: Result.Ok(30),
      });

      // Assert
      assertErr(combined);
      expect(combined.error).toBe('NAME_MISSING');
    });

    it('should return Ok of an empty record when given an empty record', () => {
      // Arrange
      const combined = Result.allRecord({});

      // Assert
      assertOk(combined);
      expect(combined.value).toEqual({});
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: Result.isResult
  // ───────────────────────────────────────────────────────────────────────────
  describe('Result.isResult - when checking if a value is a Result instance', () => {
    it('should return true for an Ok instance', () => {
      // Arrange
      const value = Result.Ok(1);

      // Act
      const result = Result.isResult(value);

      // Assert
      expect(result).toBe(true);
    });

    it('should return true for an Err instance', () => {
      // Arrange
      const value = Result.Err('x');

      // Act
      const result = Result.isResult(value);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for a plain OkLike object', () => {
      // Arrange
      const value = { kind: 'Ok', value: 1 };

      // Act
      const result = Result.isResult(value);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for null', () => {
      // Arrange
      const value = null;

      // Act
      const result = Result.isResult(value);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for a primitive', () => {
      // Arrange
      const value = 42;

      // Act
      const result = Result.isResult(value);

      // Assert
      expect(result).toBe(false);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: Result.isOk / Result.isErr
  // ───────────────────────────────────────────────────────────────────────────
  describe('Result.isOk - data-first type-guard for Ok', () => {
    it('should return true for an Ok', () => {
      // Arrange
      const result: Result<number, string> = Result.Ok(1);

      // Act & Assert
      expect(Result.isOk(result)).toBe(true);
    });

    it('should return false for an Err', () => {
      // Arrange
      const result: Result<number, string> = Result.Err('x');

      // Act & Assert
      expect(Result.isOk(result)).toBe(false);
    });
  });

  describe('Result.isErr - data-first type-guard for Err', () => {
    it('should return true for an Err', () => {
      // Arrange
      const result: Result<number, string> = Result.Err('x');

      // Act & Assert
      expect(Result.isErr(result)).toBe(true);
    });

    it('should return false for an Ok', () => {
      // Arrange
      const result: Result<number, string> = Result.Ok(1);

      // Act & Assert
      expect(Result.isErr(result)).toBe(false);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: Result.unsafeUnwrap / Result.unsafeUnwrapErr
  // ───────────────────────────────────────────────────────────────────────────
  describe('Result.unsafeUnwrap - data-first unwrap without narrowing', () => {
    it('should return the value for an Ok', () => {
      // Arrange
      const result: Result<number, string> = Result.Ok(42);

      // Act
      const value = Result.unsafeUnwrap(result);

      // Assert
      expect(value).toBe(42);
    });

    it('should throw a PanicException for an Err', () => {
      // Arrange
      const result: Result<number, string> = Result.Err('x');

      // Act
      const act = () => Result.unsafeUnwrap(result);

      // Assert
      expect(act).toThrow(PanicException);
    });
  });

  describe('Result.unsafeUnwrapErr - data-first unwrap error without narrowing', () => {
    it('should return the error for an Err', () => {
      // Arrange
      const result: Result<number, string> = Result.Err('boom');

      // Act
      const error = Result.unsafeUnwrapErr(result);

      // Assert
      expect(error).toBe('boom');
    });

    it('should throw a PanicException for an Ok', () => {
      // Arrange
      const result: Result<number, string> = Result.Ok(1);

      // Act
      const act = () => Result.unsafeUnwrapErr(result);

      // Assert
      expect(act).toThrow(PanicException);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: Result.map (data-last)
  // ───────────────────────────────────────────────────────────────────────────
  describe('Result.map - data-last transform of the success value', () => {
    it('should transform the value for an Ok', () => {
      // Arrange
      const result = Result.Ok(2);

      // Act
      const mapped = Result.map((n: number) => n * 10)(result);

      // Assert
      assertOk(mapped);
      expect(mapped.value).toBe(20);
    });

    it('should pass through an Err unchanged without calling the function', () => {
      // Arrange
      const result = Result.Err('x');
      const fn = vi.fn<(n: number) => number>((n) => n);

      // Act
      const mapped = Result.map(fn)(result);

      // Assert
      expect(fn).not.toHaveBeenCalled();
      assertErr(mapped);
      expect(mapped.error).toBe('x');
    });

    it('should compose in a flow pipeline', () => {
      // Arrange
      const pipeline = flow(
        Result.map((n: number) => n + 1),
        Result.map((n: number) => n * 2),
      );

      // Act
      const result = pipeline(Result.Ok(4));

      // Assert
      assertOk(result);
      expect(result.value).toBe(10);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: Result.mapErr (data-last)
  // ───────────────────────────────────────────────────────────────────────────
  describe('Result.mapErr - data-last transform of the error value', () => {
    it('should transform the error for an Err', () => {
      // Arrange
      const result = Result.Err('NOT_FOUND');

      // Act
      const mapped = Result.mapErr((code: string) => ({ code }))(result);

      // Assert
      assertErr(mapped);
      expect(mapped.error).toEqual({ code: 'NOT_FOUND' });
    });

    it('should pass through an Ok unchanged without calling the function', () => {
      // Arrange
      const result = Result.Ok(1);
      const fn = vi.fn<(error: never) => unknown>();

      // Act
      const mapped = Result.mapErr(fn)(result);

      // Assert
      expect(fn).not.toHaveBeenCalled();
      assertOk(mapped);
      expect(mapped.value).toBe(1);
    });

    it('should compose in a flow pipeline', () => {
      // Arrange
      const pipeline = flow(
        Result.mapErr((e: string) => `${e}-1`),
        Result.mapErr((e: string) => `${e}-2`),
      );

      // Act
      const result = pipeline(Result.Err('err'));

      // Assert
      assertErr(result);
      expect(result.error).toBe('err-1-2');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: Result.mapOr (data-last)
  // ───────────────────────────────────────────────────────────────────────────
  describe('Result.mapOr - data-last fold with a static default', () => {
    it('should apply the function for an Ok', () => {
      // Arrange
      const result = Result.Ok(3);

      // Act
      const value = Result.mapOr(0, (n: number) => n * 2)(result);

      // Assert
      expect(value).toBe(6);
    });

    it('should return the default for an Err', () => {
      // Arrange
      const result = Result.Err('x');

      // Act
      const value = Result.mapOr(0, (n: number) => n * 2)(result);

      // Assert
      expect(value).toBe(0);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: Result.mapOrElse (data-last)
  // ───────────────────────────────────────────────────────────────────────────
  describe('Result.mapOrElse - data-last fold via two handler functions', () => {
    it('should apply the success function for an Ok', () => {
      // Arrange
      const result = Result.Ok(3);

      // Act
      const value = Result.mapOrElse(
        (e: string) => `err:${e}`,
        (n: number) => `ok:${n}`,
      )(result);

      // Assert
      expect(value).toBe('ok:3');
    });

    it('should apply the error function for an Err', () => {
      // Arrange
      const result = Result.Err('boom');

      // Act
      const value = Result.mapOrElse(
        (e: string) => `err:${e}`,
        (n: number) => `ok:${n}`,
      )(result);

      // Assert
      expect(value).toBe('err:boom');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: Result.andThen (data-last)
  // ───────────────────────────────────────────────────────────────────────────
  describe('Result.andThen - data-last chain of a fallible step', () => {
    it('should apply the chained function for an Ok', () => {
      // Arrange
      const result = Result.Ok('42');

      // Act
      const chained = Result.andThen((s: string) => Result.Ok(Number(s)))(
        result,
      );

      // Assert
      assertOk(chained);
      expect(chained.value).toBe(42);
    });

    it('should short-circuit on an Err without calling the function', () => {
      // Arrange
      const result = Result.Err('original');
      const fn = vi.fn<(value: never) => Result<number, never>>(() =>
        Result.Ok(99),
      );

      // Act
      const chained = Result.andThen(fn)(result);

      // Assert
      expect(fn).not.toHaveBeenCalled();
      assertErr(chained);
      expect(chained.error).toBe('original');
    });

    it('should compose in a flow pipeline', () => {
      // Arrange
      const pipeline = flow(
        Result.andThen((n: number) => Result.Ok(n + 1)),
        Result.andThen((n: number) => Result.Ok(n * 2)),
      );

      // Act
      const result = pipeline(Result.Ok(4));

      // Assert
      assertOk(result);
      expect(result.value).toBe(10);
    });

    it('should accumulate error types across multiple chained steps', () => {
      // Arrange
      const errOne = { kind: 'ErrOne' as const };
      const errTwo = { kind: 'ErrTwo' as const };
      const errThree = { kind: 'ErrThree' as const };
      const okOne = { kind: 'OkOne' as const };

      type ErrOne = typeof errOne;
      type ErrTwo = typeof errTwo;
      type ErrThree = typeof errThree;
      type OkOne = typeof okOne;

      function first(): Result<OkOne, ErrOne> {
        return Result.Err(errOne);
      }
      function second(): Result<OkOne, ErrTwo> {
        return Result.Err(errTwo);
      }
      function third(): Result<OkOne, ErrThree> {
        return Result.Err(errThree);
      }

      // Act
      const chained = first().andThen(second).andThen(third);

      // Assert (type-level)
      expectTypeOf<typeof chained>().toEqualTypeOf<
        Result<OkOne, ErrOne | ErrTwo | ErrThree>
      >();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: Result.orElse (data-last)
  // ───────────────────────────────────────────────────────────────────────────
  describe('Result.orElse - data-last error recovery', () => {
    it('should apply the fallback for an Err', () => {
      // Arrange
      const result = Result.Err('boom');

      // Act
      const recovered = Result.orElse((_e: string) => Result.Ok(0))(result);

      // Assert
      assertOk(recovered);
      expect(recovered.value).toBe(0);
    });

    it('should pass through an Ok without calling the fallback', () => {
      // Arrange
      const result = Result.Ok(1);
      const fn = vi.fn<(error: never) => Result<number, never>>(() =>
        Result.Ok(99),
      );

      // Act
      const recovered = Result.orElse(fn)(result);

      // Assert
      expect(fn).not.toHaveBeenCalled();
      assertOk(recovered);
      expect(recovered.value).toBe(1);
    });

    it('should compose in a flow pipeline when chaining recovery steps', () => {
      // Arrange
      const errOne = { kind: 'ErrOne' as const };
      const errTwo = { kind: 'ErrTwo' as const };
      const errThree = { kind: 'ErrThree' as const };
      const okOne = { kind: 'OkOne' as const };

      type ErrOne = typeof errOne;
      type ErrTwo = typeof errTwo;
      type ErrThree = typeof errThree;
      type OkOne = typeof okOne;

      function first(): Result<OkOne, ErrOne> {
        return Result.Err(errOne);
      }

      function second(): Result<OkOne, ErrTwo> {
        return Result.Err(errTwo);
      }

      function third(): Result<OkOne, ErrThree> {
        return Result.Err(errThree);
      }

      const pipeline = flow(Result.orElse(second), Result.orElse(third));

      // Act
      const result = pipeline(first());

      // Assert
      assertErr(result);
      expect(result.error).toEqual(errThree);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: Result.unwrapOr (data-last)
  // ───────────────────────────────────────────────────────────────────────────
  describe('Result.unwrapOr - data-last unwrap with a static default', () => {
    it('should return the value for an Ok', () => {
      // Arrange
      const result = Result.Ok(1);

      // Act
      const value = Result.unwrapOr(0)(result);

      // Assert
      expect(value).toBe(1);
    });

    it('should return the default for an Err', () => {
      // Arrange
      const result = Result.Err('x');

      // Act
      const value = Result.unwrapOr(0)(result);

      // Assert
      expect(value).toBe(0);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: Result.unwrapOrElse (data-last)
  // ───────────────────────────────────────────────────────────────────────────
  describe('Result.unwrapOrElse - data-last lazy fallback', () => {
    it('should return the value without calling the fallback for an Ok', () => {
      // Arrange
      const result = Result.Ok(1);
      const fn = vi.fn<(e: string) => number>((_e) => 0);

      // Act
      const value = Result.unwrapOrElse(fn)(result);

      // Assert
      expect(fn).not.toHaveBeenCalled();
      expect(value).toBe(1);
    });

    it('should compute the fallback from the error for an Err', () => {
      // Arrange
      const result = Result.Err('boom');

      // Act
      const value = Result.unwrapOrElse((e: string) => `recovered:${e}`)(
        result,
      );

      // Assert
      expect(value).toBe('recovered:boom');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: Result.tap (data-last)
  // ───────────────────────────────────────────────────────────────────────────
  describe('Result.tap - data-last side-effect on the success value', () => {
    it('should call the function with the value and return the same instance for an Ok', () => {
      // Arrange
      const result = Result.Ok(7);
      const fn = vi.fn<(value: number) => void>();

      // Act
      const returned = Result.tap(fn)(result);

      // Assert
      expect(fn).toHaveBeenCalledWith(7);
      expect(returned).toBe(result);
    });

    it('should not call the function and return the same instance for an Err', () => {
      // Arrange
      const result = Result.Err('x');
      const fn = vi.fn<(value: never) => void>();

      // Act
      const returned = Result.tap(fn)(result);

      // Assert
      expect(fn).not.toHaveBeenCalled();
      expect(returned).toBe(result);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: Result.tapErr (data-last)
  // ───────────────────────────────────────────────────────────────────────────
  describe('Result.tapErr - data-last side-effect on the error value', () => {
    it('should call the function with the error and return the same instance for an Err', () => {
      // Arrange
      const result = Result.Err('boom');
      const fn = vi.fn<(error: string) => void>();

      // Act
      const returned = Result.tapErr(fn)(result);

      // Assert
      expect(fn).toHaveBeenCalledWith('boom');
      expect(returned).toBe(result);
    });

    it('should not call the function and return the same instance for an Ok', () => {
      // Arrange
      const result = Result.Ok(1);
      const fn = vi.fn<(error: never) => void>();

      // Act
      const returned = Result.tapErr(fn)(result);

      // Assert
      expect(fn).not.toHaveBeenCalled();
      expect(returned).toBe(result);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: Result.match (data-last)
  // ───────────────────────────────────────────────────────────────────────────
  describe('Result.match - data-last exhaustive pattern match', () => {
    it('should call the Ok handler for an Ok and return its result', () => {
      // Arrange
      const result = Result.Ok(1);
      const handlers = {
        Ok: vi.fn<(n: number) => string>((n) => `ok:${n}`),
        Err: vi.fn<(e: string) => string>((e) => `err:${e}`),
      } as const;

      // Act
      const matched = Result.match(handlers)(result);

      // Assert
      expect(handlers.Err).not.toHaveBeenCalled();
      expect(handlers.Ok).toHaveBeenCalledWith(1);
      expect(matched).toBe('ok:1');
    });

    it('should call the Err handler for an Err and return its result', () => {
      // Arrange
      const result = Result.Err('x');
      const handlers = {
        Ok: vi.fn<(n: number) => string>((n) => `ok:${n}`),
        Err: vi.fn<(e: string) => string>((e) => `err:${e}`),
      };

      // Act
      const matched = Result.match(handlers)(result);

      // Assert
      expect(handlers.Ok).not.toHaveBeenCalled();
      expect(handlers.Err).toHaveBeenCalledWith('x');
      expect(matched).toBe('err:x');
    });

    it('should compose in a flow pipeline as the terminal step', () => {
      // Arrange
      const pipeline = flow(
        Result.map((n: number) => n * 2),
        Result.match({
          Ok: (n: number) => `ok:${n}`,
          Err: (e: string) => `err:${e}`,
        }),
      );

      // Act
      const value = pipeline(Result.Ok(5));

      // Assert
      expect(value).toBe('ok:10');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: assertOk
  // ───────────────────────────────────────────────────────────────────────────
  describe('assertOk - when asserting that a Result is Ok', () => {
    it('should not throw when the Result is Ok', () => {
      // Arrange
      const result = Result.Ok(42);

      // Act & Assert
      expect(() => assertOk(result)).not.toThrow();
    });

    it('should throw an AssertException when the Result is Err', () => {
      // Arrange
      const result = Result.Err('boom');

      // Act
      const act = () => assertOk(result);

      // Assert
      expect(act).toThrow(AssertException);
    });

    it('should throw with the default message when the Result is Err', () => {
      // Arrange
      const result = Result.Err('boom');

      // Act
      const act = () => assertOk(result);

      // Assert
      expect(act).toThrow('Expected an Ok result but got an Err result.');
    });

    it('should throw with a custom message when provided', () => {
      // Arrange
      const result = Result.Err('boom');

      // Act
      const act = () => assertOk(result, 'Custom message');

      // Assert
      expect(act).toThrow('Custom message');
    });

    it('should throw when the Result is null', () => {
      // Arrange
      const result = null;

      // Act
      const act = () => assertOk(result as unknown as Result<unknown, unknown>);

      // Assert
      expect(act).toThrow(AssertException);
    });

    it('should throw when the Result is undefined', () => {
      // Arrange
      const result = undefined;

      // Act
      const act = () => assertOk(result as unknown as Result<unknown, unknown>);

      // Assert
      expect(act).toThrow(AssertException);
    });

    it('should narrow the type to Ok after a successful assertion', () => {
      // Arrange
      const result: Result<number, string> = Result.Ok(42);

      // Act
      assertOk(result);

      // Assert (type-level)
      expectTypeOf<typeof result>().toEqualTypeOf<Ok<number, string>>();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: assertErr
  // ───────────────────────────────────────────────────────────────────────────
  describe('assertErr - when asserting that a Result is Err', () => {
    it('should not throw when the Result is Err', () => {
      // Arrange
      const result = Result.Err('boom');

      // Act & Assert
      expect(() => assertErr(result)).not.toThrow();
    });

    it('should throw an AssertException when the Result is Ok', () => {
      // Arrange
      const result = Result.Ok(42);

      // Act
      const act = () => assertErr(result);

      // Assert
      expect(act).toThrow(AssertException);
    });

    it('should throw with the default message when the Result is Ok', () => {
      // Arrange
      const result = Result.Ok(42);

      // Act
      const act = () => assertErr(result);

      // Assert
      expect(act).toThrow('Expected an Err result but got an Ok result.');
    });

    it('should throw with a custom message when provided', () => {
      // Arrange
      const result = Result.Ok(42);

      // Act
      const act = () => assertErr(result, 'Custom message');

      // Assert
      expect(act).toThrow('Custom message');
    });

    it('should throw when the Result is null', () => {
      // Arrange
      const result = null;

      // Act
      const act = () =>
        assertErr(result as unknown as Result<unknown, unknown>);

      // Assert
      expect(act).toThrow(AssertException);
    });

    it('should throw when the Result is undefined', () => {
      // Arrange
      const result = undefined;

      // Act
      const act = () =>
        assertErr(result as unknown as Result<unknown, unknown>);

      // Assert
      expect(act).toThrow(AssertException);
    });

    it('should narrow the type to Err after a successful assertion', () => {
      // Arrange
      const result: Result<number, string> = Result.Err('boom');

      // Act
      assertErr(result);

      // Assert (type-level)
      expectTypeOf<typeof result>().toEqualTypeOf<Err<number, string>>();
    });
  });
});
