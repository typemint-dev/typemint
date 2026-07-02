import {
  TypeDescriptor,
  witness,
  type Kind,
  type WithMessage,
} from '@typemint/core';
import { Result } from '@typemint/result';
import { TypeMismatchError } from './type-mismatch.js';
import type { Decoder } from './decoder.js';
import { Invariant } from './invariant.js';

export const NumberDescriptor = TypeDescriptor('number', witness<number>());

export type NumberDescriptor = typeof NumberDescriptor;

export function isNumber(value: unknown): value is number {
  return typeof value === 'number';
}

export type UnknownToNumberDecoder = Decoder<
  unknown,
  number,
  TypeMismatchError<number, unknown>
>;

export const unknownToNumberDecoder: UnknownToNumberDecoder =
  Result.liftPredicate(isNumber, (value) =>
    TypeMismatchError(NumberDescriptor, value),
  );

// ─────────────────────────────────────────────────────────────────────────────
// #region IsIntegerInvariant
const IsIntegerInvariantErrorKind = 'IsIntegerInvariantError' as const;
export type IsIntegerInvariantError = Kind<typeof IsIntegerInvariantErrorKind> &
  WithMessage;

function ofIsIntegerInvariant(message: string): IsIntegerInvariantError {
  return {
    kind: IsIntegerInvariantErrorKind,
    message,
  };
}

export type IsIntegerInvariantOptions = {
  readonly message?: string | ((value: number) => string);
};
export function IsIntegerInvariant(
  opts: IsIntegerInvariantOptions = {},
): Invariant<number, IsIntegerInvariantError> {
  return Invariant(
    (value: number) => Number.isInteger(value),
    (value: number) => {
      let message = 'Value must be an integer';
      if (typeof opts.message === 'function') {
        message = opts.message(value);
      } else if (typeof opts.message === 'string') {
        message = opts.message;
      }
      return ofIsIntegerInvariant(message);
    },
  );
}
//
// #endregion IsIntegerInvariant
// ─────────────────────────────────────────────────────────────────────────────
