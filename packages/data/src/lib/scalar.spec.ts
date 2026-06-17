import { describe, expectTypeOf, it } from 'vitest';
import {
  InferScalarType,
  Scalar,
  ScalarDescriptor,
  type InferScalarRoot,
  type InferScalarMeta,
  type InferScalarNames,
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
      type TestScalar = InferScalarType<TestScalarDescriptor>;

      // Assert
      expectTypeOf<TestScalar>().toEqualTypeOf<Scalar<'test', number>>();
    });

    it('should infer to never when the passed type is not a scalar descriptor', () => {
      // Arrange
      type TestScalarDescriptor = number;

      // Act
      // @ts-expect-error - test scalar descriptor is not a scalar descriptor
      type TestScalar = InferScalarType<TestScalarDescriptor>;

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
      type TestScalarName = InferScalarNames<TestScalar>;

      // Assert
      expectTypeOf<TestScalarName>().toEqualTypeOf<'test'>();
    });

    it('should not allow to infer a scalar name from a non-scalar', () => {
      // Arrange
      type TestScalar = number;

      // Act
      // @ts-expect-error - test scalar is not a scalar
      type TestScalarName = InferScalarNames<TestScalar>;
    });

    it('should infer the scalar name from a composed scalar as union of all the scalar names', () => {
      // Arrange
      type Int = Scalar<'int', number>;
      type UInt = Scalar<'uint', Int>;

      // Act
      type ComposedScalarName = InferScalarNames<UInt>;

      // Assert
      expectTypeOf<ComposedScalarName>().toEqualTypeOf<'uint' | 'int'>();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: Infer scalar root
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Infer scalar root from a scalar', () => {
    it('should infer the scalar base type from the scalar', () => {
      // Arrange
      type TestScalar = Scalar<'test', number>;

      // Act
      type TestScalarRoot = InferScalarRoot<TestScalar>;

      // Assert
      expectTypeOf<TestScalarRoot>().toEqualTypeOf<number>();
    });

    it('should infer the scalar root from a composed scalar', () => {
      // Arrange
      type Int = Scalar<'int', number>;
      type UInt = Scalar<'uint', Int>;

      // Act
      type ComposedScalarBaseType = InferScalarRoot<UInt>;

      // Assert
      expectTypeOf<ComposedScalarBaseType>().toEqualTypeOf<number>();
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

    it('should infer a union of all the scalar meta when composed from another scalar', () => {
      // Arrange
      type Int = Scalar<'int', number, 'intMeta'>;
      type UInt = Scalar<'uint', Int, 'uintMeta'>;

      // Act
      type ComposedScalarMeta = InferScalarMeta<UInt>;

      // Assert
      expectTypeOf<ComposedScalarMeta>().toEqualTypeOf<
        'uintMeta' | 'intMeta'
      >();
    });
  });
});
