import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { assertErr, assertOk } from '@typemint/result';
import { PanicException } from '@typemint/core';
import {
  IsUuid4InvariantErrorKind,
  IsUuid7InvariantErrorKind,
  IsUuidInvariantErrorKind,
  Uuid,
  UUID4,
  UUID7,
} from './uuid.js';

// Canonical, spec-valid fixtures (lowercase). The version nibble sits at index
// 14 (first hex digit of the 3rd group) and the variant nibble at index 19.
const NIL = '00000000-0000-0000-0000-000000000000';
const MAX = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
const V1 = 'a8098c1a-f86e-11da-bd1a-00b16d1a2a1e';
const V4 = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
const V7 = '017f22e2-79b0-7cc3-98c4-dc0c0c07398f';

// The real Web Crypto, captured before any `vi.stubGlobal('crypto', …)` so
// stubs can delegate to it without recursing into themselves.
const realCrypto = globalThis.crypto;

describe('(unit) uuid', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: Uuid
  // ───────────────────────────────────────────────────────────────────────────
  describe('Uuid', () => {
    describe('of', () => {
      it.each([
        { label: 'v1', value: V1 },
        { label: 'v4', value: V4 },
        { label: 'v7', value: V7 },
        { label: 'nil', value: NIL },
        { label: 'max', value: MAX },
      ])('should accept a well-formed $label UUID', ({ value }) => {
        // Act
        const result = Uuid.of(value);

        // Assert
        assertOk(result);
        expect(result.value).toBe(value);
      });

      it('should accept an upper-case UUID', () => {
        // Act
        const result = Uuid.of(V4.toUpperCase());

        // Assert
        assertOk(result);
      });

      it.each([
        { label: 'a non-UUID string', value: 'not-a-uuid' },
        {
          label: 'the wrong length',
          value: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6',
        },
        {
          label: 'an undefined version (0)',
          value: '9b1deb4d-3b7d-0bad-9bdd-2b0d7b3dcb6d',
        },
        {
          label: 'an undefined version (9)',
          value: '9b1deb4d-3b7d-9bad-9bdd-2b0d7b3dcb6d',
        },
        {
          label: 'an invalid variant (c)',
          value: '9b1deb4d-3b7d-4bad-cbdd-2b0d7b3dcb6d',
        },
      ])('should reject $label', ({ value }) => {
        // Act
        const result = Uuid.of(value);

        // Assert
        assertErr(result);
        expect(result.error.kind).toBe(IsUuidInvariantErrorKind);
      });

      it('should describe the rejected value in the error', () => {
        // Act
        const result = Uuid.of('not-a-uuid');

        // Assert
        assertErr(result);
        expect(result.error).toMatchObject({
          kind: IsUuidInvariantErrorKind,
          details: { value: 'not-a-uuid' },
        });
        expect(result.error.message).toContain('not-a-uuid');
      });
    });

    describe('getVersion', () => {
      it.each([
        { value: V1, version: 1 },
        { value: V4, version: 4 },
        { value: V7, version: 7 },
        { value: NIL, version: 0 },
        { value: MAX, version: 15 },
      ])(
        'should read the version nibble of $value as $version',
        ({ value, version }) => {
          // Act & Assert
          expect(Uuid.getVersion(Uuid.ofUnsafe(value))).toBe(version);
        },
      );
    });

    describe('generate', () => {
      it('should generate a valid v4 UUID as a bare branded value', () => {
        // Act
        const id = Uuid.generate();

        // Assert - runtime: a branded string (not a Result), a valid v4 UUID.
        expect(typeof id).toBe('string');
        assertOk(Uuid.of(id));
        expect(Uuid.getVersion(id)).toBe(4);
        // Assert - type: returns the branded value directly, not a Result.
        expectTypeOf(Uuid.generate).returns.toEqualTypeOf<Uuid>();
      });

      it('should generate distinct values', () => {
        // Act & Assert
        expect(Uuid.generate()).not.toBe(Uuid.generate());
      });

      it('should panic when global Web Crypto is unavailable', () => {
        // Arrange
        vi.stubGlobal('crypto', undefined);

        // Act & Assert
        expect(() => Uuid.generate()).toThrow(PanicException);
      });

      it('should panic when randomUUID is missing', () => {
        // Arrange - crypto exists but lacks the method actually used.
        vi.stubGlobal('crypto', { getRandomValues: () => new Uint8Array() });

        // Act & Assert
        expect(() => Uuid.generate()).toThrow(PanicException);
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: UUID4
  // ───────────────────────────────────────────────────────────────────────────
  describe('UUID4', () => {
    it('should accept a v4 UUID', () => {
      // Act & Assert
      assertOk(UUID4.of(V4));
    });

    it('should reject a valid-but-non-v4 UUID with a v4 error', () => {
      // Act
      const result = UUID4.of(V7);

      // Assert
      assertErr(result);
      expect(result.error.kind).toBe(IsUuid4InvariantErrorKind);
    });

    it('should reject a malformed UUID with the inherited Uuid error', () => {
      // Act
      const result = UUID4.of('not-a-uuid');

      // Assert - the parent invariant fails first (fail-fast).
      assertErr(result);
      expect(result.error.kind).toBe(IsUuidInvariantErrorKind);
    });

    it('should generate a valid v4 UUID as a bare branded value', () => {
      // Act
      const id = UUID4.generate();

      // Assert
      assertOk(UUID4.of(id));
      expect(Uuid.getVersion(id)).toBe(4);
      expectTypeOf(UUID4.generate).returns.toEqualTypeOf<UUID4>();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // MARK: UUID7
  // ───────────────────────────────────────────────────────────────────────────
  describe('UUID7', () => {
    it('should accept a v7 UUID', () => {
      // Act & Assert
      assertOk(UUID7.of(V7));
    });

    it('should reject a valid-but-non-v7 UUID with a v7 error', () => {
      // Act
      const result = UUID7.of(V4);

      // Assert
      assertErr(result);
      expect(result.error.kind).toBe(IsUuid7InvariantErrorKind);
    });

    it('should reject a malformed UUID with the inherited Uuid error', () => {
      // Act
      const result = UUID7.of('not-a-uuid');

      // Assert
      assertErr(result);
      expect(result.error.kind).toBe(IsUuidInvariantErrorKind);
    });

    describe('generate', () => {
      it('should generate a valid v7 UUID as a bare branded value', () => {
        // Act
        const id = UUID7.generate();

        // Assert
        assertOk(UUID7.of(id));
        expect(Uuid.getVersion(id)).toBe(7);
        expectTypeOf(UUID7.generate).returns.toEqualTypeOf<UUID7>();
      });

      it('should generate distinct values', () => {
        // Act & Assert
        expect(UUID7.generate()).not.toBe(UUID7.generate());
      });

      it('should use the native randomUUIDv7 when the runtime provides it', () => {
        // Arrange - a runtime (Node ≥ 26) that exposes randomUUIDv7.
        vi.stubGlobal('crypto', {
          randomUUID: () => realCrypto.randomUUID(),
          getRandomValues: (bytes: ArrayBufferView<ArrayBuffer>) =>
            realCrypto.getRandomValues(bytes),
          randomUUIDv7: () => V7,
        });

        // Act & Assert - the native value is used verbatim.
        expect(UUID7.generate()).toBe(V7);
      });

      it('should fall back to the dependency-free generator when randomUUIDv7 is absent', () => {
        // Arrange - a runtime (browser / Node < 26) without randomUUIDv7.
        vi.stubGlobal('crypto', {
          randomUUID: () => realCrypto.randomUUID(),
          getRandomValues: (bytes: ArrayBufferView<ArrayBuffer>) =>
            realCrypto.getRandomValues(bytes),
        });

        // Act
        const id = UUID7.generate();

        // Assert - the built value is a valid v7 UUID.
        assertOk(UUID7.of(id));
        expect(Uuid.getVersion(id)).toBe(7);
      });

      it('should always produce values that satisfy the v7 invariants', () => {
        // Arrange - force the dependency-free path so buildUuid7 is exercised
        // regardless of the host runtime.
        vi.stubGlobal('crypto', {
          randomUUID: () => realCrypto.randomUUID(),
          getRandomValues: (bytes: ArrayBufferView<ArrayBuffer>) =>
            realCrypto.getRandomValues(bytes),
        });

        // Act & Assert
        for (let i = 0; i < 1000; i++) {
          assertOk(UUID7.of(UUID7.generate()));
        }
      });
    });
  });
});
