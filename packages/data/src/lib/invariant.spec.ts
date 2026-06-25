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

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: Invariant.or
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Invariant.or', () => {
    it('should return ok when the first invariant passes', () => {
      // Arrange
      const invariant1 = Invariant(
        (value: number) => value > 0,
        () => 'Value must be greater than 0' as const,
      );
      const invariant2 = Invariant(
        (value: number) => value % 2 === 0,
        () => 'Value must be even' as const,
      );
      const invariant = Invariant.or(invariant1, invariant2);

      // Act
      const result = invariant(3);

      // Assert
      assertOk(result);
    });

    it('should return ok when only the last invariant passes', () => {
      // Arrange
      const invariant1 = Invariant(
        (value: number) => value > 0,
        () => 'Value must be greater than 0' as const,
      );
      const invariant2 = Invariant(
        (value: number) => value % 2 === 0,
        () => 'Value must be even' as const,
      );
      const invariant = Invariant.or(invariant1, invariant2);

      // Act
      const result = invariant(-2);

      // Assert
      assertOk(result);
    });

    it('should return the last error when all invariants fail', () => {
      // Arrange
      const invariant1 = Invariant(
        (value: number) => value > 0,
        () => 'Value must be greater than 0' as const,
      );
      const invariant2 = Invariant(
        (value: number) => value % 2 === 0,
        () => 'Value must be even' as const,
      );
      const invariant = Invariant.or(invariant1, invariant2);

      // Act
      const result = invariant(-3);

      // Assert
      assertErr(result);
      expect(result.error).toBe('Value must be even');
    });

    it('should accumulate error types into a union type', () => {
      // Arrange
      const invariant1 = Invariant(
        (value: number) => value > 0,
        () => 'Value must be greater than 0' as const,
      );
      const invariant2 = Invariant(
        (value: number) => value % 2 === 0,
        () => 'Value must be even' as const,
      );
      const invariant3 = Invariant(
        (value: number) => value < 100,
        () => 'Value must be less than 100' as const,
      );

      // Act
      const invariant = Invariant.or(invariant1, invariant2, invariant3);
      type InvariantError = InferInvariantError<typeof invariant>;

      // Assert
      expectTypeOf<InvariantError>().toEqualTypeOf<
        | 'Value must be greater than 0'
        | 'Value must be even'
        | 'Value must be less than 100'
      >();
    });

    it('should short-circuit and not run subsequent invariants after first success', () => {
      // Arrange
      let callCount = 0;
      const invariant1 = Invariant(
        (value: number) => value > 0,
        () => 'Value must be greater than 0' as const,
      );
      const invariant2 = Invariant(
        (value: number) => {
          callCount++;
          return value % 2 === 0;
        },
        () => 'Value must be even' as const,
      );
      const invariant = Invariant.or(invariant1, invariant2);

      // Act
      invariant(3);

      // Assert
      expect(callCount).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: Invariant.andSettled
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Invariant.andSettled', () => {
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
      const invariant = Invariant.andSettled(invariant1, invariant2);
      const result = invariant(5);

      // Assert
      assertOk(result);
    });

    it('should accumulate errors from the given invariants into an array', () => {
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
      const invariant = Invariant.andSettled(
        invariant1,
        invariant2,
        invariant3,
      );
      const result = invariant(11);

      // Assert
      assertErr(result);
      expect(result.error).toEqual([
        'Value must be less than 10',
        'Value must be even',
      ]);
    });

    it('should accumulate the error types into an array of union types', () => {
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
      const invariant = Invariant.andSettled(
        invariant1,
        invariant2,
        invariant3,
      );
      type InvariantError = InferInvariantError<typeof invariant>;

      // Assert
      expectTypeOf<InvariantError>().toEqualTypeOf<
        Array<
          | 'Value must be greater than 0'
          | 'Value must be less than 10'
          | 'Value must be even'
        >
      >();
    });
  });
});
