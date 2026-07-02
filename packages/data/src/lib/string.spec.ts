import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  InferTypeDescriptorName,
  InferTypeDescriptorType,
  Kind,
} from '@typemint/core';
import {
  NonEmptyStringInvariant,
  StringDescriptor,
  StringMaxLengthInvariant,
  StringMinLengthInvariant,
  StringPatternInvariant,
  isString,
  unknownToStringDecoder,
  type UnknownToStringDecoder,
} from './string.js';
import type { TypeMismatchError } from './type-mismatch.js';
import { assertErr, assertOk } from '@typemint/result';

describe('(unit) string', () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: StringDescriptor
  // ─────────────────────────────────────────────────────────────────────────────
  describe('StringDescriptor', () => {
    it('should carry the literal name "string"', () => {
      // Assert
      expect(StringDescriptor.name).toBe('string');
    });

    it('should infer the literal name "string"', () => {
      // Act
      type Name = InferTypeDescriptorName<typeof StringDescriptor>;

      // Assert
      expectTypeOf<Name>().toEqualTypeOf<'string'>();
    });

    it('should describe the string type via its witness', () => {
      // Act
      type Described = InferTypeDescriptorType<typeof StringDescriptor>;

      // Assert
      expectTypeOf<Described>().toEqualTypeOf<string>();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: isString
  // ─────────────────────────────────────────────────────────────────────────────
  describe('isString', () => {
    it('should return true for a primitive string', () => {
      // Assert
      expect(isString('hello')).toBe(true);
    });

    it('should return true for an empty string', () => {
      // Assert
      expect(isString('')).toBe(true);
    });

    it.each([
      ['a number', 42],
      ['a boolean', true],
      ['null', null],
      ['undefined', undefined],
      ['an object', {}],
      ['an array', []],
      ['a String wrapper object', new String('hello')],
    ])('should return false for %s', (_label, value) => {
      // Assert
      expect(isString(value)).toBe(false);
    });

    it('should narrow the value to string when it returns true', () => {
      // Arrange
      const value: unknown = 'hello';

      // Act & Assert
      if (isString(value)) {
        expectTypeOf<typeof value>().toEqualTypeOf<string>();
      } else {
        expectTypeOf<typeof value>().toBeUnknown();
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: unknownToStringDecoder — success
  // ─────────────────────────────────────────────────────────────────────────────
  describe('unknownToStringDecoder (success)', () => {
    it('should return an Ok for a string value', () => {
      // Act
      const result = unknownToStringDecoder('hello');

      // Assert
      expect(result.isOk()).toBe(true);
    });

    it('should preserve the decoded string value unchanged', () => {
      // Act
      const result = unknownToStringDecoder('hello');

      // Assert
      expect(result.unsafeUnwrap()).toBe('hello');
    });

    it('should decode an empty string', () => {
      // Act
      const result = unknownToStringDecoder('');

      // Assert
      expect(result.isOk()).toBe(true);
      expect(result.unsafeUnwrap()).toBe('');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: unknownToStringDecoder — failure
  // ─────────────────────────────────────────────────────────────────────────────
  describe('unknownToStringDecoder (failure)', () => {
    it('should return an Err for a non-string value', () => {
      // Act
      const result = unknownToStringDecoder(42);

      // Assert
      expect(result.isErr()).toBe(true);
    });

    it('should fail with a TypeMismatchError', () => {
      // Act
      const result = unknownToStringDecoder(42);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(Kind.isOf(result.unwrapErr(), 'TypeMismatchError')).toBe(true);
      }
    });

    it('should expect the StringDescriptor in the error details', () => {
      // Act
      const result = unknownToStringDecoder(42);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.unwrapErr().details.expected).toBe(StringDescriptor);
      }
    });

    it('should preserve the received value in the error details', () => {
      // Arrange
      const value = { id: 1 };

      // Act
      const result = unknownToStringDecoder(value);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.unwrapErr().details.received).toBe(value);
      }
    });

    it.each([
      [42, 'Expected string but got number'],
      [true, 'Expected string but got boolean'],
      [null, 'Expected string but got null'],
      [[1, 2], 'Expected string but got Array'],
    ])(
      'should derive the message from the received runtime type for %s',
      (value, message) => {
        // Act
        const result = unknownToStringDecoder(value);

        // Assert
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.unwrapErr().message).toBe(message);
        }
      },
    );
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: UnknownToStringDecoder type
  // ─────────────────────────────────────────────────────────────────────────────
  describe('UnknownToStringDecoder type', () => {
    it('should type the canonical decoder as an UnknownToStringDecoder', () => {
      // Assert
      expectTypeOf(
        unknownToStringDecoder,
      ).toEqualTypeOf<UnknownToStringDecoder>();
    });

    it('should produce a string success channel and a TypeMismatchError failure channel', () => {
      // Act
      const result = unknownToStringDecoder('hello');

      // Assert
      if (result.isOk()) {
        expectTypeOf(result.value).toEqualTypeOf<string>();
      } else {
        expectTypeOf(result.error).toEqualTypeOf<
          TypeMismatchError<string, unknown>
        >();
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: StringMinLengthInvariant
  // ─────────────────────────────────────────────────────────────────────────────
  describe('StringMinLengthInvariant', () => {
    it('should return an Ok for a string value that is at least the minimum length', () => {
      // Arrange
      const invariant = StringMinLengthInvariant({ minLength: 3 });
      // Act
      const result = invariant('hello');

      // Assert
      expect(result.isOk()).toBe(true);
    });

    it('should return an Err for a string value that is less than the minimum length', () => {
      // Arrange
      const invariant = StringMinLengthInvariant({ minLength: 3 });
      // Act
      const result = invariant('hi');

      // Assert
      assertErr(result);
    });

    it('should return the correct error for a string value that is less than the minimum length', () => {
      // Arrange
      const invariant = StringMinLengthInvariant({ minLength: 3 });
      // Act
      const result = invariant('hi');

      // Assert
      assertErr(result);
      expect(result.error.details.minLength).toBe(3);
    });

    it('should preserve the received value in the error details', () => {
      // Arrange
      const invariant = StringMinLengthInvariant({ minLength: 3 });
      // Act
      const result = invariant('hi');

      // Assert
      assertErr(result);
      expect(result.error.details.received).toBe('hi');
    });

    it('should use the provided message for the error', () => {
      // Arrange
      const invariant = StringMinLengthInvariant({
        minLength: 3,
        message: 'My String must be at least 3 characters long.',
      });
      // Act
      const result = invariant('hi');

      // Assert
      assertErr(result);
      expect(result.error.message).toBe(
        'My String must be at least 3 characters long.',
      );
    });

    it('should use the provided message function for the error', () => {
      // Arrange
      const invariant = StringMinLengthInvariant({
        minLength: 3,
        message: (value) =>
          `My String must be at least 3 characters long. Got ${value.length}.`,
      });
      // Act
      const result = invariant('hi');

      // Assert
      assertErr(result);
      expect(result.error.message).toBe(
        'My String must be at least 3 characters long. Got 2.',
      );
    });

    it('should measure length in UTF-16 code units', () => {
      // Arrange — '👍' is a single astral character but two UTF-16 code units.
      const invariant = StringMinLengthInvariant({ minLength: 2 });

      // Act
      const result = invariant('👍');

      // Assert
      assertOk(result);
    });

    it.each([-1, 1.5, NaN, Infinity])(
      'should throw a RangeError when minLength is %s',
      (minLength) => {
        // Act / Assert
        expect(() => StringMinLengthInvariant({ minLength })).toThrow(
          RangeError,
        );
      },
    );
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: StringMaxLengthInvariant
  // ─────────────────────────────────────────────────────────────────────────────
  describe('StringMaxLengthInvariant', () => {
    it('should return an Ok for a string value that is at most the maximum length', () => {
      // Arrange
      const invariant = StringMaxLengthInvariant({ maxLength: 3 });

      // Act
      const result = invariant('abc');

      // Assert
      expect(result.isOk()).toBe(true);
    });

    it('should return an Err for a string value that is greater than the maximum length', () => {
      // Arrange
      const invariant = StringMaxLengthInvariant({ maxLength: 3 });
      // Act
      const result = invariant('hello world');

      // Assert
      assertErr(result);

      expect(result.error.details.maxLength).toBe(3);
    });

    it('should preserve the received value in the error details', () => {
      // Arrange
      const invariant = StringMaxLengthInvariant({ maxLength: 3 });
      // Act
      const result = invariant('hello world');

      // Assert
      assertErr(result);
      expect(result.error.details.received).toBe('hello world');
    });

    it('should use the provided message for the error', () => {
      // Arrange
      const invariant = StringMaxLengthInvariant({
        maxLength: 3,
        message: 'My String must be at most 3 characters long.',
      });
      // Act
      const result = invariant('hello world');

      // Assert
      assertErr(result);
      expect(result.error.message).toBe(
        'My String must be at most 3 characters long.',
      );
    });

    it('should use the provided message function for the error', () => {
      // Arrange
      const invariant = StringMaxLengthInvariant({
        maxLength: 3,
        message: (value) =>
          `My String must be at most 3 characters long. Got ${value.length}.`,
      });
      // Act
      const result = invariant('hello world');

      // Assert
      assertErr(result);
      expect(result.error.message).toBe(
        'My String must be at most 3 characters long. Got 11.',
      );
    });

    it('should allow the maximum length to be 0', () => {
      // Arrange
      const invariant = StringMaxLengthInvariant({ maxLength: 0 });
      // Act
      const result = invariant('');

      // Assert
      assertOk(result);
    });

    it.each([-1, 1.5, NaN, Infinity])(
      'should throw a RangeError when maxLength is %s',
      (maxLength) => {
        // Act / Assert
        expect(() => StringMaxLengthInvariant({ maxLength })).toThrow(
          RangeError,
        );
      },
    );
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: NonEmptyStringInvariant
  // ─────────────────────────────────────────────────────────────────────────────
  describe('NonEmptyStringInvariant', () => {
    it('should return an Ok for a non-empty string value', () => {
      // Arrange
      const invariant = NonEmptyStringInvariant();

      // Act
      const result = invariant('hello');

      // Assert
      expect(result.isOk()).toBe(true);
    });

    it('should return an Err for an empty string value', () => {
      // Arrange
      const invariant = NonEmptyStringInvariant();
      // Act
      const result = invariant('');

      // Assert
      assertErr(result);
      expect(result.error.kind).toBe('NonEmptyStringInvariantError');
    });

    it('should preserve the received value in the error details', () => {
      // Arrange
      const invariant = NonEmptyStringInvariant();
      // Act
      const result = invariant('');

      // Assert
      assertErr(result);
      expect(result.error.details.received).toBe('');
    });

    it('should use the provided message for the error', () => {
      // Arrange
      const invariant = NonEmptyStringInvariant({
        message: 'My String must not be empty.',
      });
      // Act
      const result = invariant('');

      // Assert
      assertErr(result);
      expect(result.error.message).toBe('My String must not be empty.');
    });

    it('should use the provided message function for the error', () => {
      // Arrange
      const invariant = NonEmptyStringInvariant({
        message: (value) => `My String must not be empty. Got ${value.length}.`,
      });
      // Act
      const result = invariant('');

      // Assert
      assertErr(result);
      expect(result.error.message).toBe('My String must not be empty. Got 0.');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: StringPatternInvariant
  // ─────────────────────────────────────────────────────────────────────────────
  describe('StringPatternInvariant', () => {
    it('should return an Ok for a string value that matches the pattern', () => {
      // Arrange
      const invariant = StringPatternInvariant({ pattern: /^[a-z]+$/ });
      // Act
      const result = invariant('hello');

      // Assert
      expect(result.isOk()).toBe(true);
    });

    it('should return an Err for a string value that does not match the pattern', () => {
      // Arrange
      const invariant = StringPatternInvariant({ pattern: /^[a-z]+$/ });
      // Act
      const result = invariant('123');

      // Assert
      assertErr(result);
      expect(result.error.details.pattern).toEqual(/^[a-z]+$/);
    });

    it('should preserve the received value in the error details', () => {
      // Arrange
      const invariant = StringPatternInvariant({ pattern: /^[a-z]+$/ });
      // Act
      const result = invariant('123');

      // Assert
      assertErr(result);
      expect(result.error.details.received).toBe('123');
    });

    it('should use the provided message for the error', () => {
      // Arrange
      const invariant = StringPatternInvariant({
        pattern: /^[a-z]+$/,
        message: 'My String must match the pattern /^[a-z]+$/.',
      });
      // Act
      const result = invariant('123');

      // Assert
      assertErr(result);
      expect(result.error.message).toBe(
        'My String must match the pattern /^[a-z]+$/.',
      );
    });

    it('should use the provided message function for the error', () => {
      // Arrange
      const invariant = StringPatternInvariant({
        pattern: /^[a-z]+$/,
        message: (value) =>
          `My String must match the pattern /^[a-z]+$/. Got ${value.length}.`,
      });

      // Act
      const result = invariant('123');

      // Assert
      assertErr(result);
      expect(result.error.message).toBe(
        'My String must match the pattern /^[a-z]+$/. Got 3.',
      );
    });

    it('should be stateless across calls for a pattern with the global flag', () => {
      // Arrange — a `g`-flagged pattern advances `lastIndex` on each `test`,
      // which would otherwise make consecutive calls alternate Ok/Err.
      const invariant = StringPatternInvariant({ pattern: /foo/g });

      // Act / Assert — the same input must produce the same verdict every time.
      assertOk(invariant('foo'));
      assertOk(invariant('foo'));
      assertOk(invariant('foo'));
    });

    it('should not mutate the caller-supplied pattern', () => {
      // Arrange
      const pattern = /foo/g;

      // Act
      StringPatternInvariant({ pattern })('foo');

      // Assert — the internal normalized copy is used, so the caller's regex is
      // untouched.
      expect(pattern.lastIndex).toBe(0);
    });

    it('should strip the global flag from the stored pattern detail', () => {
      // Arrange
      const invariant = StringPatternInvariant({ pattern: /^[a-z]+$/g });

      // Act
      const result = invariant('123');

      // Assert
      assertErr(result);
      expect(result.error.details.pattern.flags).not.toContain('g');
    });
  });
});
