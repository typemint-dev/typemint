import { Result } from '@typemint/result';
import type { Decoder } from './decoder.js';
import { TypeMismatchError } from './type-mismatch.js';
import {
  TypeDescriptor,
  witness,
  type Kind,
  type WithDetail,
  type WithMessage,
} from '@typemint/core';
import { Invariant } from './invariant.js';

/**
 * The canonical {@link TypeDescriptor} for the `string` primitive.
 *
 * It carries the literal name `'string'` for runtime reporting (used, for
 * example, as the `expected` side of a {@link TypeMismatchError}) and the
 * `string` type as its phantom witness for compile-time inference.
 *
 * @example
 *
 * ```ts
 * StringDescriptor.name; // 'string'
 * ```
 */
export const StringDescriptor = TypeDescriptor('string', witness<string>());

/**
 * Type guard that narrows an `unknown` value to `string`.
 *
 * @param value - The value to test.
 * @returns `true` (narrowing to `string`) when `value` is a primitive string.
 *
 * @example
 *
 * ```ts
 * const value: unknown = 'hello';
 *
 * if (isString(value)) {
 *   value.toUpperCase(); // value is narrowed to string
 * }
 * ```
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * The type of a {@link Decoder} that turns an `unknown` value into a `string`,
 * failing with a {@link TypeMismatchError} when the value is not a string.
 *
 * @see unknownToStringDecoder for the canonical implementation.
 */
export type UnknownToStringDecoder = Decoder<
  unknown,
  string,
  TypeMismatchError<string, unknown>
>;

/**
 * Decodes an `unknown` value into a `string`.
 *
 * On success the value is returned unchanged inside an `Ok`. On failure the
 * decoder yields an `Err` holding a {@link TypeMismatchError} whose `expected`
 * side is the {@link StringDescriptor} and whose `received` side is the original
 * offending value (so its runtime type drives the error message).
 *
 * @param value - The value to decode.
 * @returns An `Ok<string>` when `value` is a string, otherwise an
 * `Err<TypeMismatchError<string, unknown>>`.
 *
 * @example
 *
 * ```ts
 * unknownToStringDecoder('hello'); // Ok('hello')
 *
 * const result = unknownToStringDecoder(42);
 * result.isErr();                       // true
 * result.unwrapErr().message;           // 'Expected string but got number'
 * ```
 */
export const unknownToStringDecoder: UnknownToStringDecoder =
  Result.liftPredicate(isString, (value) =>
    TypeMismatchError(StringDescriptor, value),
  );

// ─────────────────────────────────────────────────────────────────────────────
// #region StringMinLengthInvariant
export type StringMinLengthInvariantError =
  Kind<'StringMinLengthInvariantError'> &
    WithMessage &
    WithDetail<{
      minLength: number;
    }>;
function ofStringMinLengthInvariant(
  minLength: number,
  message: string,
): StringMinLengthInvariantError {
  return {
    kind: 'StringMinLengthInvariantError',
    message,
    details: { minLength },
  };
}

export type StringMinLengthInvariantOptions = {
  readonly minLength: number;
  readonly message?: Invariant.MessageOption<string>;
};

export type StringMinLengthInvariant = Invariant<
  string,
  StringMinLengthInvariantError
>;

export function StringMinLengthInvariant(
  opts: StringMinLengthInvariantOptions,
): StringMinLengthInvariant {
  return Invariant(
    (value: string) => value.length >= opts.minLength,
    (value: string) =>
      ofStringMinLengthInvariant(
        opts.minLength,
        Invariant.resolveMessage(
          opts.message,
          value,
          () =>
            `String must be at least ${opts.minLength} characters long. Got ${value.length}.`,
        ),
      ),
  );
}
// #endregion StringMinLengthInvariant
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// #region StringMaxLengthInvariant
export type StringMaxLengthInvariantError =
  Kind<'StringMaxLengthInvariantError'> &
    WithMessage &
    WithDetail<{
      maxLength: number;
    }>;
function ofStringMaxLengthInvariant(
  maxLength: number,
  message: string,
): StringMaxLengthInvariantError {
  return {
    kind: 'StringMaxLengthInvariantError',
    message,
    details: { maxLength },
  };
}

export type StringMaxLengthInvariantOptions = {
  readonly maxLength: number;
  readonly message?: Invariant.MessageOption<string>;
};

export type StringMaxLengthInvariant = Invariant<
  string,
  StringMaxLengthInvariantError
>;

export function StringMaxLengthInvariant(
  opts: StringMaxLengthInvariantOptions,
): StringMaxLengthInvariant {
  return Invariant(
    (value: string) => value.length <= opts.maxLength,
    (value: string) =>
      ofStringMaxLengthInvariant(
        opts.maxLength,
        Invariant.resolveMessage(
          opts.message,
          value,
          () =>
            `String must be at most ${opts.maxLength} characters long. Got ${value.length}.`,
        ),
      ),
  );
}
// #endregion StringMaxLengthInvariant
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// #regions NonEmptyStringInvariant

export type NonEmptyStringInvariantError =
  Kind<'NonEmptyStringInvariantError'> & WithMessage;

function ofNonEmptyStringInvariant(
  message: string,
): NonEmptyStringInvariantError {
  return {
    kind: 'NonEmptyStringInvariantError',
    message,
  };
}

export type NonEmptyStringInvariant = Invariant<
  string,
  NonEmptyStringInvariantError
>;

export type NonEmptyStringInvariantOptions = {
  readonly message?: Invariant.MessageOption<string>;
};

export function NonEmptyStringInvariant(
  opts: NonEmptyStringInvariantOptions = {},
): NonEmptyStringInvariant {
  return Invariant(
    (value: string) => value.length > 0,
    (value: string) =>
      ofNonEmptyStringInvariant(
        Invariant.resolveMessage(
          opts.message,
          value,
          () => 'String must not be empty',
        ),
      ),
  );
}
// #endregion NonEmptyStringInvariant
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// #region StringPatternInvariant
export type StringPatternInvariantError = Kind<'StringPatternInvariantError'> &
  WithMessage &
  WithDetail<{
    pattern: RegExp;
  }>;
function ofStringPatternInvariant(
  pattern: RegExp,
  message: string,
): StringPatternInvariantError {
  return {
    kind: 'StringPatternInvariantError',
    message,
    details: { pattern },
  };
}

export type StringPatternInvariant = Invariant<
  string,
  StringPatternInvariantError
>;

export type StringPatternInvariantOptions = {
  readonly pattern: RegExp;
  readonly message?: Invariant.MessageOption<string>;
};

export function StringPatternInvariant(
  opts: StringPatternInvariantOptions,
): StringPatternInvariant {
  // `RegExp.prototype.test` mutates `lastIndex` when the pattern carries the
  // global (`g`) or sticky (`y`) flag, which would make this reusable
  // invariant return alternating results across calls. Rebuild the pattern
  // without those flags so the test is stateless, and store the normalized
  // copy rather than the caller's mutable instance.
  const pattern = new RegExp(
    opts.pattern.source,
    opts.pattern.flags.replace(/[gy]/g, ''),
  );
  return Invariant(
    (value: string) => pattern.test(value),
    (value: string) =>
      ofStringPatternInvariant(
        pattern,
        Invariant.resolveMessage(
          opts.message,
          value,
          () => `String must match the pattern ${pattern.toString()}`,
        ),
      ),
  );
}

// #endregion StringPatternInvariant
// ─────────────────────────────────────────────────────────────────────────────
