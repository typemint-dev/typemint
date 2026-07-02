import {
  TypeDescriptor,
  witness,
  type Kind,
  type WithDetail,
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
  WithMessage &
  WithDetail<{
    received: number;
  }>;

function ofIsIntegerInvariant(
  received: number,
  message: string,
): IsIntegerInvariantError {
  return {
    kind: IsIntegerInvariantErrorKind,
    message,
    details: { received },
  };
}

export type IsIntegerInvariantOptions = {
  readonly message?: Invariant.MessageOption<number>;
};
export function IsIntegerInvariant(
  opts: IsIntegerInvariantOptions = {},
): Invariant<number, IsIntegerInvariantError> {
  return Invariant(
    (value: number) => Number.isInteger(value),
    (value: number) =>
      ofIsIntegerInvariant(
        value,
        Invariant.resolveMessage(
          opts.message,
          value,
          () => 'Value must be an integer',
        ),
      ),
  );
}
//
// #endregion IsIntegerInvariant
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// #region IsLowerThanNumberInvariant
const IsLowerThanNumberInvariantErrorKind =
  'IsLowerThanNumberInvariantError' as const;
export type IsLowerThanNumberInvariantError = Kind<
  typeof IsLowerThanNumberInvariantErrorKind
> &
  WithMessage &
  WithDetail<{
    received: number;
    lowerBound: number;
  }>;

function ofIsLowerThanNumberInvariant(
  received: number,
  lowerBound: number,
  message: string,
): IsLowerThanNumberInvariantError {
  return {
    kind: IsLowerThanNumberInvariantErrorKind,
    message,
    details: { received, lowerBound },
  };
}

export type IsLowerThanNumberInvariantOptions = {
  readonly message?: Invariant.MessageOption<number>;
  readonly lowerBound: number;
};
export function IsLowerThanNumberInvariant(
  opts: IsLowerThanNumberInvariantOptions,
): Invariant<number, IsLowerThanNumberInvariantError> {
  return Invariant(
    (value: number) => value < opts.lowerBound,
    (value: number) =>
      ofIsLowerThanNumberInvariant(
        value,
        opts.lowerBound,
        Invariant.resolveMessage(
          opts.message,
          value,
          () => `Value must be less than ${opts.lowerBound}. Got ${value}.`,
        ),
      ),
  );
}

// #endregion IsLowerThanNumberInvariant
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// #region IsGreaterThanNumberInvariant
const IsGreaterThanNumberInvariantErrorKind =
  'IsGreaterThanNumberInvariantError' as const;
export type IsGreaterThanNumberInvariantError = Kind<
  typeof IsGreaterThanNumberInvariantErrorKind
> &
  WithMessage &
  WithDetail<{
    received: number;
    lowerBound: number;
  }>;

function ofIsGreaterThanNumberInvariant(
  received: number,
  lowerBound: number,
  message: string,
): IsGreaterThanNumberInvariantError {
  return {
    kind: IsGreaterThanNumberInvariantErrorKind,
    message,
    details: { received, lowerBound },
  };
}

export type IsGreaterThanNumberInvariantOptions = {
  readonly message?: Invariant.MessageOption<number>;
  readonly lowerBound: number;
};
export function IsGreaterThanNumberInvariant(
  opts: IsGreaterThanNumberInvariantOptions,
): Invariant<number, IsGreaterThanNumberInvariantError> {
  return Invariant(
    (value: number) => value > opts.lowerBound,
    (value: number) =>
      ofIsGreaterThanNumberInvariant(
        value,
        opts.lowerBound,
        Invariant.resolveMessage(
          opts.message,
          value,
          () => `Value must be greater than ${opts.lowerBound}. Got ${value}.`,
        ),
      ),
  );
}

// #endregion IsGreaterThanNumberInvariant
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// #region IsLowerThenOrEqualNumberInvariant
const IsLowerThenOrEqualNumberInvariantErrorKind =
  'IsLowerThenOrEqualNumberInvariantError' as const;
export type IsLowerThenOrEqualNumberInvariantError = Kind<
  typeof IsLowerThenOrEqualNumberInvariantErrorKind
> &
  WithMessage &
  WithDetail<{
    received: number;
    lowerBound: number;
  }>;

function ofIsLowerThenOrEqualNumberInvariant(
  received: number,
  lowerBound: number,
  message: string,
): IsLowerThenOrEqualNumberInvariantError {
  return {
    kind: IsLowerThenOrEqualNumberInvariantErrorKind,
    message,
    details: { received, lowerBound },
  };
}

export type IsLowerThenOrEqualNumberInvariantOptions = {
  readonly message?: Invariant.MessageOption<number>;
  readonly lowerBound: number;
};
export function IsLowerThenOrEqualNumberInvariant(
  opts: IsLowerThenOrEqualNumberInvariantOptions,
): Invariant<number, IsLowerThenOrEqualNumberInvariantError> {
  return Invariant(
    (value: number) => value <= opts.lowerBound,
    (value: number) =>
      ofIsLowerThenOrEqualNumberInvariant(
        value,
        opts.lowerBound,
        Invariant.resolveMessage(
          opts.message,
          value,
          () =>
            `Value must be less than or equal to ${opts.lowerBound}. Got ${value}.`,
        ),
      ),
  );
}

// #endregion IsLowerThenOrEqualNumberInvariant
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// #region IsGreaterThenOrEqualNumberInvariant
const IsGreaterThenOrEqualNumberInvariantErrorKind =
  'IsGreaterThenOrEqualNumberInvariantError' as const;
export type IsGreaterThenOrEqualNumberInvariantError = Kind<
  typeof IsGreaterThenOrEqualNumberInvariantErrorKind
> &
  WithMessage &
  WithDetail<{
    received: number;
    lowerBound: number;
  }>;

function ofIsGreaterThenOrEqualNumberInvariant(
  received: number,
  lowerBound: number,
  message: string,
): IsGreaterThenOrEqualNumberInvariantError {
  return {
    kind: IsGreaterThenOrEqualNumberInvariantErrorKind,
    message,
    details: { received, lowerBound },
  };
}

export type IsGreaterThenOrEqualNumberInvariantOptions = {
  readonly message?: Invariant.MessageOption<number>;
  readonly lowerBound: number;
};
export function IsGreaterThenOrEqualNumberInvariant(
  opts: IsGreaterThenOrEqualNumberInvariantOptions,
): Invariant<number, IsGreaterThenOrEqualNumberInvariantError> {
  return Invariant(
    (value: number) => value >= opts.lowerBound,
    (value: number) =>
      ofIsGreaterThenOrEqualNumberInvariant(
        value,
        opts.lowerBound,
        Invariant.resolveMessage(
          opts.message,
          value,
          () =>
            `Value must be greater than or equal to ${opts.lowerBound}. Got ${value}.`,
        ),
      ),
  );
}

// #endregion IsGreaterThenOrEqualNumberInvariant
// ─────────────────────────────────────────────────────────────────────────────
