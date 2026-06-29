import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  InferScalarType,
  Scalar,
  ScalarDescriptor,
  type InferScalarRoot,
  type InferScalarMeta,
  type InferScalarNames,
  type InferScalarInvariantError,
} from './scalar.js';
import { unknownToStringDecoder } from './string.js';
import { assertErr, assertOk, Result } from '@typemint/result';
import type { TypeMismatchError } from './type-mismatch.js';
import type { TypeDescriptor } from '@typemint/core';

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

    it('should infer the scalar name from a scalar descriptor', () => {
      // Arrange
      type TestScalarDescriptor = ScalarDescriptor<'test', number>;

      // Act
      type TestScalarName = InferScalarNames<TestScalarDescriptor>;

      // Assert
      expectTypeOf<TestScalarName>().toEqualTypeOf<'test'>();
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

    it('should infer the scalar root from a scalar descriptor', () => {
      // Arrange
      type TestScalarDescriptor = ScalarDescriptor<'test', number>;

      // Act
      type TestScalarRoot = InferScalarRoot<TestScalarDescriptor>;

      // Assert
      expectTypeOf<TestScalarRoot>().toEqualTypeOf<number>();
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

    it('should infer the scalar meta from a scalar descriptor', () => {
      // Arrange
      type TestScalarDescriptor = ScalarDescriptor<'test', number, 'meta'>;

      // Act
      type TestScalarMeta = InferScalarMeta<TestScalarDescriptor>;

      // Assert
      expectTypeOf<TestScalarMeta>().toEqualTypeOf<'meta'>();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: Scalar factory
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Scalar factory', () => {
    it('should infer the scalar descriptor root from the decoder output', () => {
      // Arrange
      const MyString = Scalar('MyString', unknownToStringDecoder);

      // Act
      type MyStringScalar = InferScalarRoot<typeof MyString>;

      // Assert
      expectTypeOf<MyStringScalar>().toEqualTypeOf<string>();
    });

    it('should infer the scalar name from the scalar descriptor', () => {
      // Arrange
      const MyString = Scalar('MyString', unknownToStringDecoder);

      // Act
      type MyStringScalarName = InferScalarNames<typeof MyString>;

      // Assert
      expectTypeOf<MyStringScalarName>().toEqualTypeOf<'MyString'>();
    });

    it('should expose the scalar name on the scalar descriptor', () => {
      // Arrange
      const MyString = Scalar('MyString', unknownToStringDecoder);

      // Act
      const myStringScalarName = MyString.name;

      // Assert
      expect(myStringScalarName).toBe('MyString');
    });

    it('should preserve the scalar name type on the scalar descriptor', () => {
      // Arrange
      const MyString = Scalar('MyString', unknownToStringDecoder);

      // Act
      type MyStringScalarName = typeof MyString.name;

      // Assert
      expectTypeOf<MyStringScalarName>().toEqualTypeOf<'MyString'>();
    });

    it('should derive an invariant error type from the provided invariant', () => {
      // Arrange
      type HelloStringInvariantError = 'Value must be "hello"';
      function isHelloString(value: string): value is 'hello' {
        return value === 'hello';
      }
      const helloStringInvariant = Result.liftPredicate(
        isHelloString,
        'Value must be "hello"' as HelloStringInvariantError,
      );
      const MyString = Scalar('MyString', unknownToStringDecoder, {
        invariant: helloStringInvariant,
      });

      // Act
      type MyStringInvariantError = InferScalarInvariantError<typeof MyString>;

      // Assert
      expectTypeOf<MyStringInvariantError>().toEqualTypeOf<'Value must be "hello"'>();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: Scalar of
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Scalar of', () => {
    it('should expose the "of" method on the descriptor with the root type as the input and the Result of the scalar as the output', () => {
      // Arrange
      const MyString = Scalar('MyString', unknownToStringDecoder);

      // Act
      type MyStringScalarOf = typeof MyString.of;

      // Assert
      expectTypeOf<MyStringScalarOf>().toEqualTypeOf<
        (value: string) => Result<Scalar<'MyString', string, never>, never>
      >();
    });

    it('should create a scalar from a value', () => {
      // Arrange
      const MyString = Scalar('MyString', unknownToStringDecoder);

      // Act
      const myStringScalarR = MyString.of('hello');

      // Assert
      assertOk(myStringScalarR);
      expect(myStringScalarR.value).toEqual('hello');
    });

    it('should brand the value with the scalar phantom brand', () => {
      // Arrange
      const MyString = Scalar('MyString', unknownToStringDecoder);

      // Act
      const myStringScalarR = MyString.of('hello');

      // Assert
      assertOk(myStringScalarR);
      expectTypeOf<typeof myStringScalarR.value>().toEqualTypeOf<
        Scalar<'MyString', string>
      >();
    });

    it('should not accept a value which is not the root type', () => {
      // Arrange
      const MyString = Scalar('MyString', unknownToStringDecoder);

      // Act
      // @ts-expect-error - test scalar is not a scalar
      const myStringScalarR = MyString.of(42);
    });

    it('should return an invariant error when the value does not satisfy the invariant', () => {
      // Arrange
      type HelloStringInvariantError = 'Value must be "hello"';
      const helloStringInvariant = Result.liftPredicate(
        (value: string): value is 'hello' => value === 'hello',
        'Value must be "hello"' as HelloStringInvariantError,
      );
      const MyString = Scalar('MyString', unknownToStringDecoder, {
        invariant: helloStringInvariant,
      });

      // Act
      const myStringScalarR = MyString.of('world');

      // Assert
      assertErr(myStringScalarR);
      expect(myStringScalarR.error).toBe('Value must be "hello"');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: Scalar parse
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Scalar parse', () => {
    it('should expose the "parse" method on the descriptor with the unknown type as the input and the Result of the scalar as the output', () => {
      // Arrange
      const MyString = Scalar('MyString', unknownToStringDecoder);

      // Act
      type MyStringScalarParse = typeof MyString.parse;

      // Assert
      expectTypeOf<MyStringScalarParse>().toEqualTypeOf<
        (
          value: unknown,
        ) => Result<
          Scalar<'MyString', string, never>,
          TypeMismatchError<string, unknown>
        >
      >();
    });
    it('should parse a value into a scalar', () => {
      // Arrange
      const MyString = Scalar('MyString', unknownToStringDecoder);

      // Act
      const myStringScalarR = MyString.parse('hello');

      // Assert
      assertOk(myStringScalarR);
      expect(myStringScalarR.value).toEqual('hello');
    });

    it('should brand the value with the scalar phantom brand', () => {
      // Arrange
      const MyString = Scalar('MyString', unknownToStringDecoder);

      // Act
      const myStringScalarR = MyString.parse('hello');

      // Assert
      assertOk(myStringScalarR);
      expectTypeOf<typeof myStringScalarR.value>().toEqualTypeOf<
        Scalar<'MyString', string>
      >();
    });

    it('should return a TypeMismatchError when the value is not the root type', () => {
      // Arrange
      const MyString = Scalar('MyString', unknownToStringDecoder);

      // Act
      const myStringScalarR = MyString.parse(42);

      // Assert
      assertErr(myStringScalarR);
      expect(myStringScalarR.error.kind).toBe('TypeMismatchError');
    });

    it('should return the MismatchError with the received value and the expected type as the details', () => {
      // Arrange
      const MyString = Scalar('MyString', unknownToStringDecoder);

      // Act
      const myStringScalarR = MyString.parse(42);

      assertErr(myStringScalarR);
      expect(myStringScalarR.error.kind).toBe('TypeMismatchError');
      expect(myStringScalarR.error.details.received).toEqual(42);
    });

    it('should return the MismatchError with the type descriptor of the root type as the expected type', () => {
      // Arrange
      const MyString = Scalar('MyString', unknownToStringDecoder);

      // Act
      const myStringScalarR = MyString.parse(42);

      assertErr(myStringScalarR);
      expectTypeOf<
        typeof myStringScalarR.error.details.expected
      >().toEqualTypeOf<TypeDescriptor<string, string>>();
    });

    it('should return an invariant error when the value does not satisfy the invariant', () => {
      // Arrange
      type HelloStringInvariantError = 'Value must be "hello"';
      const helloStringInvariant = Result.liftPredicate(
        (value: string): value is 'hello' => value === 'hello',
        'Value must be "hello"' as HelloStringInvariantError,
      );
      const MyString = Scalar('MyString', unknownToStringDecoder, {
        invariant: helloStringInvariant,
      });

      // Act
      const myStringScalarR = MyString.parse('world');

      // Assert
      assertErr(myStringScalarR);
      expect(myStringScalarR.error).toBe('Value must be "hello"');
    });
  });
});
