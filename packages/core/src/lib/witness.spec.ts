import { describe, expect, expectTypeOf, it } from 'vitest';
import { witness, type InferWitnessType, type Witness } from './witness.js';

describe('(unit) Witness', () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: Infer witness type
  // ─────────────────────────────────────────────────────────────────────────────
  describe('InferWitnessType', () => {
    it('should infer a primitive type from a witness', () => {
      // Arrange
      type TestWitness = Witness<number>;

      // Act
      type TestType = InferWitnessType<TestWitness>;

      // Assert
      expectTypeOf<TestType>().toEqualTypeOf<number>();
    });

    it('should infer an object type from a witness', () => {
      // Arrange
      type TestWitness = Witness<{ id: string; count: number }>;

      // Act
      type TestType = InferWitnessType<TestWitness>;

      // Assert
      expectTypeOf<TestType>().toEqualTypeOf<{ id: string; count: number }>();
    });

    it('should preserve a union type carried by a witness', () => {
      // Arrange
      type TestWitness = Witness<'a' | 'b'>;

      // Act
      type TestType = InferWitnessType<TestWitness>;

      // Assert
      expectTypeOf<TestType>().toEqualTypeOf<'a' | 'b'>();
    });

    it('should not allow inferring from a non-witness', () => {
      // Arrange
      type NotAWitness = number;

      // Act
      // @ts-expect-error - number does not satisfy the Witness<unknown> constraint
      type TestType = InferWitnessType<NotAWitness>;
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: witness factory
  // ─────────────────────────────────────────────────────────────────────────────
  describe('witness', () => {
    it('should produce a value typed as Witness<T>', () => {
      // Arrange & Act
      const w = witness<number>();

      // Assert
      expectTypeOf(w).toEqualTypeOf<Witness<number>>();
    });

    it('should let the carried type be recovered with InferWitnessType', () => {
      // Arrange
      const w = witness<{ id: string }>();

      // Act
      type Recovered = InferWitnessType<typeof w>;

      // Assert
      expectTypeOf<Recovered>().toEqualTypeOf<{ id: string }>();
    });

    it('should carry no runtime payload', () => {
      // Arrange & Act
      const w = witness<number>();

      // Assert
      expect(Object.keys(w)).toHaveLength(0);
      expect(Reflect.ownKeys(w)).toHaveLength(0);
    });

    it('should return a fresh object on each call', () => {
      // Arrange & Act
      const a = witness<number>();
      const b = witness<number>();

      // Assert
      expect(a).not.toBe(b);
    });
  });
});
