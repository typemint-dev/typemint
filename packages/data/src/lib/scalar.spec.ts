import { describe, expectTypeOf, it } from 'vitest';
import { InferScalar, Scalar, ScalarDescriptor } from './scalar.js';
import { identity } from '@typemint/core';

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
  // MARK: factory
  // ─────────────────────────────────────────────────────────────────────────────
  describe('when constructing a scalar descriptor', () => {
    it('should derive the scalar name from the factory first argument', () => {
      // Arrange
      // Act
      const descriptor = Scalar('test', identity);

      // Assert
      expectTypeOf<typeof descriptor>().toEqualTypeOf<
        ScalarDescriptor<'test', unknown>
      >();
    });

    it('should create a scalar descriptor with the "unknown" type if no type is provided in the constructor', () => {
      // Arrange
      // Act
      const descriptor = Scalar('test', identity);

      // Assert
      expectTypeOf<typeof descriptor>().toEqualTypeOf<
        ScalarDescriptor<'test', unknown>
      >();
    });

    it('should create a scalar descriptor which will derive the type of the value from the constructor', () => {
      // Arrange
      // Act
      const descriptor = Scalar('test', identity<number>);

      // Assert
      expectTypeOf<typeof descriptor>().toEqualTypeOf<
        ScalarDescriptor<'test', number>
      >();
    });
  });
});
