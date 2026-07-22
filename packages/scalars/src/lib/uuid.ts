import { Invariant, Scalar, type InferScalarType } from '@typemint/data';
import {
  Kind,
  PanicException,
  type WithDetail,
  type WithMessage,
} from '@typemint/core';

function requireWebCrypto(): Crypto & { randomUUIDv7?: () => string } {
  if (
    typeof crypto === 'undefined' ||
    !crypto.randomUUID ||
    !crypto.getRandomValues
  ) {
    throw new PanicException(
      '@typemint/scalars: global Web Crypto is required (Node ≥ 19 or a browser)',
    );
  }
  return crypto;
}

// ─────────────────────────────────────────────────────────────────────────────
// #region: Uuid
const VERSION_NIBBLE_INDEX = 14;

export const IsUuidInvariantErrorKind = 'IsUuidInvariantError' as const;
export type IsUuidInvariantError = Kind<typeof IsUuidInvariantErrorKind> &
  WithMessage &
  WithDetail<{ value: string }>;
function ofIsUuidInvariantError(value: string): IsUuidInvariantError {
  return {
    kind: IsUuidInvariantErrorKind,
    message: `Value is not a valid Uuid: ${value}`,
    details: { value },
  };
}

const NIL = '00000000-0000-0000-0000-000000000000';
const MAX = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
function isUuid(value: string): boolean {
  const v = value.toLowerCase();
  if (v === NIL || v === MAX) return true;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
    v,
  );
}

const isUuidInvariant = Invariant(isUuid, ofIsUuidInvariantError);

export const Uuid = Scalar('Uuid', 'string', {
  invariants: [isUuidInvariant],
  methods: (self) => ({
    getVersion: (uuid: InferScalarType<typeof self>): number => {
      // We cast string | unknown to string to satisfy the type checker but
      // we know that the value must be numeric in the valid uuid format.
      return Number.parseInt(uuid[VERSION_NIBBLE_INDEX] as string, 16);
    },
  }),
  factories: (self) => ({
    generate: (): InferScalarType<typeof self> => {
      return self.ofUnsafe(requireWebCrypto().randomUUID());
    },
  }),
});
export type Uuid = InferScalarType<typeof Uuid>;

// #endregion
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// #region: UUID4

export const IsUuid4InvariantErrorKind = 'IsUuid4InvariantError' as const;
export type IsUuid4InvariantError = Kind<typeof IsUuid4InvariantErrorKind> &
  WithMessage &
  WithDetail<{ value: string }>;
function ofIsUuid4InvariantError(value: string): IsUuid4InvariantError {
  return {
    kind: IsUuid4InvariantErrorKind,
    message: `Value is not a valid UUID v4: ${value}`,
    details: { value },
  };
}

function isUuid4(value: Uuid): boolean {
  return Uuid.getVersion(value) === 4;
}

const isUuid4Invariant = Invariant(isUuid4, ofIsUuid4InvariantError);

export const UUID4 = Uuid.extend('UUID4', {
  invariants: [isUuid4Invariant],
  factories: (self) => ({
    generate: (): InferScalarType<typeof self> => {
      return self.ofUnsafe(requireWebCrypto().randomUUID());
    },
  }),
});
export type UUID4 = InferScalarType<typeof UUID4>;
// #endregion
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// #region UUID7
export const IsUuid7InvariantErrorKind = 'IsUuid7InvariantError' as const;
export type IsUuid7InvariantError = Kind<typeof IsUuid7InvariantErrorKind> &
  WithMessage &
  WithDetail<{ value: string }>;
function ofIsUuid7InvariantError(value: string): IsUuid7InvariantError {
  return {
    kind: IsUuid7InvariantErrorKind,
    message: `Value is not a valid UUID v7: ${value}`,
    details: { value },
  };
}

// The parent `Uuid` invariant already guarantees a well-formed UUID, so this
// only needs to assert the v7-specific part: the version nibble (index 14,
// the first hex digit of the 3rd group) must be `7`.
function isUuid7(value: Uuid): boolean {
  return Uuid.getVersion(value) === 7;
}

const isUuid7Invariant = Invariant(isUuid7, ofIsUuid7InvariantError);

// Dependency-free UUID v7 (RFC 9562 §5.7): 48-bit big-endian millisecond
// timestamp + random fill. Mirrors Node's `randomUUIDv7()` semantics
// (non-monotonic) and relies only on `crypto.getRandomValues`, which is
// available in every runtime that exposes the global `crypto`.
function buildUuid7(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const now = Date.now();
  bytes[0] = (now / 2 ** 40) & 0xff;
  bytes[1] = (now / 2 ** 32) & 0xff;
  bytes[2] = (now / 2 ** 24) & 0xff;
  bytes[3] = (now / 2 ** 16) & 0xff;
  bytes[4] = (now / 2 ** 8) & 0xff;
  bytes[5] = now & 0xff;
  bytes[6] = (bytes[6]! & 0x0f) | 0x70; // version 7
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // variant 10
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(
    '',
  );
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export const UUID7 = Uuid.extend('UUID7', {
  invariants: [isUuid7Invariant],
  factories: (self) => ({
    generate: (): InferScalarType<typeof self> => {
      return self.ofUnsafe(requireWebCrypto().randomUUIDv7?.() ?? buildUuid7());
    },
  }),
});
export type UUID7 = InferScalarType<typeof UUID7>;

// #endregion
// ─────────────────────────────────────────────────────────────────────────────
