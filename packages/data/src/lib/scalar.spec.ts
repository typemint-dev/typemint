import { describe, expectTypeOf, it } from 'vitest';
import {
  InferScalar,
  Scalar,
  ScalarDescriptor,
  type InferScalarMeta,
  type InferScalarName,
} from './scalar.js';

describe('(unit) Scalar', () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: Infer scalar
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Infer scalar from a scalar descriptor', () => {
    it('should infer the scalar from the scalar descriptor', () => {
      // Arrange
      type TestScalarDescriptor = ScalarDescriptor<'test', number>;

      // Act
      type TestScalar = InferScalar<TestScalarDescriptor>;

      // Assert
      expectTypeOf<TestScalar>().toEqualTypeOf<Scalar<'test', number>>();
    });

    it('should infer to never when the passed type is not a scalar descriptor', () => {
      // Arrange
      type TestScalarDescriptor = number;

      // Act
      // @ts-expect-error - test scalar descriptor is not a scalar descriptor
      type TestScalar = InferScalar<TestScalarDescriptor>;

      // Assert
      expectTypeOf<TestScalar>().toEqualTypeOf<never>();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: Infer scalar name
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Infer scalar name from a scalar', () => {
    it('should infer the scalar name from the scalar', () => {
      // Arrange
      type TestScalar = Scalar<'test', number>;

      // Act
      type TestScalarName = InferScalarName<TestScalar>;

      // Assert
      expectTypeOf<TestScalarName>().toEqualTypeOf<'test'>();
    });

    it('should not allow to infer a scalar name from a non-scalar', () => {
      // Arrange
      type TestScalar = number;

      // Act
      // @ts-expect-error - test scalar is not a scalar
      type TestScalarName = InferScalarName<TestScalar>;
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: Infer scalar meta
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Infer scalar meta from a scalar', () => {
    it('should infer the scalar meta from the scalar', () => {
      // Arrange
      type TestScalar = Scalar<'test', number, 'meta'>;

      // Act
      type TestScalarMeta = InferScalarMeta<TestScalar>;

      // Assert
      expectTypeOf<TestScalarMeta>().toEqualTypeOf<'meta'>();
    });

    it('should not allow to infer a scalar meta from a non-scalar', () => {
      // Arrange
      type TestScalar = number;

      // Act
      // @ts-expect-error - test scalar is not a scalar
      type TestScalarMeta = InferScalarMeta<TestScalar>;
    });

    it('should infer to never when the passed scalar has no meta', () => {
      // Arrange
      type TestScalar = Scalar<'test', number>;

      // Act
      type TestScalarMeta = InferScalarMeta<TestScalar>;

      // Assert
      expectTypeOf<TestScalarMeta>().toEqualTypeOf<never>();
    });
  });
});
