import { describe, expect, expectTypeOf, it } from 'vitest';
import { Invariant, type InferInvariantError } from './invariant.js';
import { assertErr, assertOk } from '@typemint/result';

describe('(unit) invariant', () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: Invariant.and
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Invariant.and', () => {
    it('should return an invariant that is the conjunction of the given invariants', () => {
      // Arrange
      const invariant1 = Invariant(
        (value: number) => value > 0,
        () => 'Value must be greater than 0' as const,
      );
      const invariant2 = Invariant(
        (value: number) => value < 10,
        () => 'Value must be less than 10' as const,
      );
      const invariant = Invariant.and(invariant1, invariant2);

      // Act
      const result = invariant(5);

      // Assert
      assertOk(result);
    });

    it('should accumulate errors from the given invariants into a union type', () => {
      // Arrange
      const invariant1 = Invariant(
        (value: number) => value > 0,
        () => 'Value must be greater than 0' as const,
      );
      const invariant2 = Invariant(
        (value: number) => value < 10,
        () => 'Value must be less than 10' as const,
      );

      // Act
      const invariant = Invariant.and(invariant1, invariant2);
      type InvariantError = InferInvariantError<typeof invariant>;

      // Assert
      expectTypeOf<InvariantError>().toEqualTypeOf<
        'Value must be greater than 0' | 'Value must be less than 10'
      >();
    });

    it('should accumulate more than two invariant errors into a union type', () => {
      // Arrange
      const invariant1 = Invariant(
        (value: number) => value > 0,
        () => 'Value must be greater than 0' as const,
      );
      const invariant2 = Invariant(
        (value: number) => value < 10,
        () => 'Value must be less than 10' as const,
      );
      const invariant3 = Invariant(
        (value: number) => value % 2 === 0,
        () => 'Value must be even' as const,
      );

      const invariant = Invariant.and(invariant1, invariant2, invariant3);
      type InvariantError = InferInvariantError<typeof invariant>;

      // Assert
      expectTypeOf<InvariantError>().toEqualTypeOf<
        | 'Value must be greater than 0'
        | 'Value must be less than 10'
        | 'Value must be even'
      >();
    });

    it('should fail-fast and return error of first failing invariant', () => {
      // Arrange
      const invariant1 = Invariant(
        (value: number) => value > 0,
        () => 'Value must be greater than 0' as const,
      );
      const invariant2 = Invariant(
        (value: number) => value < 10,
        () => 'Value must be less than 10' as const,
      );
      const invariant3 = Invariant(
        (value: number) => value % 2 === 0,
        () => 'Value must be even' as const,
      );

      const invariant = Invariant.and(invariant1, invariant2, invariant3);
      const result = invariant(11);

      // Assert
      assertErr(result);
      expect(result.error).toBe('Value must be less than 10');
    });
  });
});
