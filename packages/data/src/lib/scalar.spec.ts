import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  InferScalarType,
  Scalar,
  ScalarDescriptor,
  type InferScalarRoot,
  type InferScalarInvariantError,
} from './scalar.js';
import { Invariant } from './invariant.js';
import { assertErr, assertOk, Result } from '@typemint/result';
import type { TypeMismatchError } from './type-mismatch.js';
import { type TypeDescriptor, PanicException } from '@typemint/core';

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

    it('should infer the scalar from a descriptor that carries an invariant error', () => {
      // Arrange
      type TestScalarDescriptor = ScalarDescriptor<
        'test',
        number,
        'SOME_ERROR'
      >;

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
  // MARK: Scalar factory
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Scalar factory', () => {
    it('should infer the scalar descriptor root from the decoder output', () => {
      // Arrange
      const MyString = Scalar('MyString', 'string');

      // Act
      type MyStringScalar = InferScalarRoot<typeof MyString>;

      // Assert
      expectTypeOf<MyStringScalar>().toEqualTypeOf<string>();
    });

    it('should expose the scalar name on the scalar descriptor', () => {
      // Arrange
      const MyString = Scalar('MyString', 'string');

      // Act
      const myStringScalarName = MyString.name;

      // Assert
      expect(myStringScalarName).toBe('MyString');
    });

    it('should preserve the scalar name type on the scalar descriptor', () => {
      // Arrange
      const MyString = Scalar('MyString', 'string');

      // Act
      type MyStringScalarName = typeof MyString.name;

      // Assert
      expectTypeOf<MyStringScalarName>().toEqualTypeOf<'MyString'>();
    });

    it('should derive an invariant error type from the provided invariant', () => {
      // Arrange
      type HelloStringInvariantError = 'Value must be "hello"';
      const helloStringInvariant = Invariant(
        (value: string) => value === 'hello',
        (): HelloStringInvariantError => 'Value must be "hello"',
      );
      const MyString = Scalar('MyString', 'string', {
        invariants: [helloStringInvariant],
      });

      // Act
      type MyStringInvariantError = InferScalarInvariantError<typeof MyString>;

      // Assert
      expectTypeOf<MyStringInvariantError>().toEqualTypeOf<'Value must be "hello"'>();
    });

    it('should derive a union of all error types from a readonly tuple of invariants', () => {
      // Arrange
      const isHello = Invariant(
        (value: string) => value === 'hello',
        () => 'NOT_HELLO' as const,
      );
      const isShort = Invariant(
        (value: string) => value.length <= 5,
        () => 'TOO_LONG' as const,
      );
      const MyString = Scalar('MyString', 'string', {
        invariants: [isHello, isShort],
      });

      // Act
      type MyStringInvariantError = InferScalarInvariantError<typeof MyString>;

      // Assert
      expectTypeOf<MyStringInvariantError>().toEqualTypeOf<
        'NOT_HELLO' | 'TOO_LONG'
      >();
    });

    it('should prevent the scalar descriptor from being mutated', () => {
      // Arrange
      const MyString = Scalar('MyString', 'string');

      // Act
      const act = () => {
        Object.assign(MyString, { foo: 'bar' });
      };

      // Assert
      expect(act).toThrow(Error);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: Scalar of
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Scalar of', () => {
    it('should expose the "of" method on the descriptor with the root type as the input and the Result of the scalar as the output', () => {
      // Arrange
      const MyString = Scalar('MyString', 'string');

      // Act
      type MyStringScalarOf = typeof MyString.of;

      // Assert
      expectTypeOf<MyStringScalarOf>().toEqualTypeOf<
        (value: string) => Result<Scalar<'MyString', string>, never>
      >();
    });

    it('should create a scalar from a value', () => {
      // Arrange
      const MyString = Scalar('MyString', 'string');

      // Act
      const myStringScalarR = MyString.of('hello');

      // Assert
      assertOk(myStringScalarR);
      expect(myStringScalarR.value).toEqual('hello');
    });

    it('should brand the value with the scalar phantom brand', () => {
      // Arrange
      const MyString = Scalar('MyString', 'string');

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
      const MyString = Scalar('MyString', 'string');

      // Act
      // @ts-expect-error - test scalar is not a scalar
      const myStringScalarR = MyString.of(42);
    });

    it('should return an invariant error when the value does not satisfy the invariant', () => {
      // Arrange
      type HelloStringInvariantError = 'Value must be "hello"';
      const helloStringInvariant = Invariant(
        (value: string) => value === 'hello',
        (): HelloStringInvariantError => 'Value must be "hello"',
      );
      const MyString = Scalar('MyString', 'string', {
        invariants: [helloStringInvariant],
      });

      // Act
      const myStringScalarR = MyString.of('world');

      // Assert
      assertErr(myStringScalarR);
      expect(myStringScalarR.error).toBe('Value must be "hello"');
    });

    it('should combine invariants fail-fast, returning the first failing error', () => {
      // Arrange
      const isHello = Invariant(
        (value: string) => value === 'hello',
        () => 'NOT_HELLO' as const,
      );
      const isShort = Invariant(
        (value: string) => value.length <= 5,
        () => 'TOO_LONG' as const,
      );
      const MyString = Scalar('MyString', 'string', {
        invariants: [isHello, isShort],
      });

      // Act
      // Fails the first invariant; the second never runs even though it would
      // also fail, so the first error is the one returned.
      const myStringScalarR = MyString.of('a very long value');

      // Assert
      assertErr(myStringScalarR);
      expect(myStringScalarR.error).toBe('NOT_HELLO');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: Scalar parse
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Scalar parse', () => {
    it('should expose the "parse" method on the descriptor with the unknown type as the input and the Result of the scalar as the output', () => {
      // Arrange
      const MyString = Scalar('MyString', 'string');

      // Act
      type MyStringScalarParse = typeof MyString.parse;

      // Assert
      expectTypeOf<MyStringScalarParse>().toEqualTypeOf<
        (
          value: unknown,
        ) => Result<
          Scalar<'MyString', string>,
          TypeMismatchError<string, unknown>
        >
      >();
    });
    it('should parse a value into a scalar', () => {
      // Arrange
      const MyString = Scalar('MyString', 'string');

      // Act
      const myStringScalarR = MyString.parse('hello');

      // Assert
      assertOk(myStringScalarR);
      expect(myStringScalarR.value).toEqual('hello');
    });

    it('should brand the value with the scalar phantom brand', () => {
      // Arrange
      const MyString = Scalar('MyString', 'string');

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
      const MyString = Scalar('MyString', 'string');

      // Act
      const myStringScalarR = MyString.parse(42);

      // Assert
      assertErr(myStringScalarR);
      expect(myStringScalarR.error.kind).toBe('TypeMismatchError');
    });

    it('should return the MismatchError with the received value and the expected type as the details', () => {
      // Arrange
      const MyString = Scalar('MyString', 'string');

      // Act
      const myStringScalarR = MyString.parse(42);

      assertErr(myStringScalarR);
      expect(myStringScalarR.error.kind).toBe('TypeMismatchError');
      expect(myStringScalarR.error.details.received).toEqual(42);
    });

    it('should return the MismatchError with the type descriptor of the root type as the expected type', () => {
      // Arrange
      const MyString = Scalar('MyString', 'string');

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
      const helloStringInvariant = Invariant(
        (value: string) => value === 'hello',
        (): HelloStringInvariantError => 'Value must be "hello"',
      );
      const MyString = Scalar('MyString', 'string', {
        invariants: [helloStringInvariant],
      });

      // Act
      const myStringScalarR = MyString.parse('world');

      // Assert
      assertErr(myStringScalarR);
      expect(myStringScalarR.error).toBe('Value must be "hello"');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: Scalar primitive kinds
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Scalar primitive kinds', () => {
    it('should recognize a bigint scalar and reject a non-bigint', () => {
      // Arrange
      const Big = Scalar('Big', 'bigint');

      // Act & Assert
      const branded = Big.of(1n);
      assertOk(branded);
      expect(branded.value).toBe(1n);
      expectTypeOf(branded.value).toEqualTypeOf<Scalar<'Big', bigint>>();
      assertOk(Big.parse(42n));
      assertErr(Big.parse(42)); // a number is not a bigint
      expect(Big.is(1n)).toBe(true);
      expect(Big.is(1)).toBe(false);
    });

    it('should recognize a boolean scalar and reject a non-boolean', () => {
      // Arrange
      const Flag = Scalar('Flag', 'boolean');

      // Act & Assert
      const branded = Flag.of(true);
      assertOk(branded);
      expect(branded.value).toBe(true);
      expectTypeOf(branded.value).toEqualTypeOf<Scalar<'Flag', boolean>>();
      assertOk(Flag.parse(false));
      assertErr(Flag.parse('true')); // a string is not a boolean
      expect(Flag.is(false)).toBe(true);
      expect(Flag.is(0)).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: Scalar methods
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Scalar methods', () => {
    it('should expose the methods on the descriptor', () => {
      // Arrange
      const MyString = Scalar('MyString', 'string', {
        methods: (self) => ({
          getDomain: (email: InferScalarType<typeof self>) =>
            email.split('@')[1],
        }),
      });

      // Act
      type MyStringMethods = typeof MyString.getDomain;

      // Assert
      expectTypeOf<MyStringMethods>().toEqualTypeOf<
        (email: Scalar<'MyString', string>) => string | undefined
      >();
    });

    it('should prevent the custom method overriding the key "name" with a compilation error or a runtime error', () => {
      // Arrange & Act
      const act = () => {
        Scalar('MyString', 'string', {
          // @ts-expect-error - test scalar is not a scalar
          methods: (self) => ({
            name: (value: any): any => value,
          }),
        });
      };

      // Assert
      expect(act).toThrow(PanicException);
    });

    it('should prevent the custom method overriding the key "of" with a compilation error', () => {
      // Arrange & Act
      const act = () => {
        Scalar('MyString', 'string', {
          // @ts-expect-error - test scalar is not a scalar
          methods: (self) => ({
            of: (value: any): any => value,
          }),
        });
      };

      // Assert
      expect(act).toThrow(PanicException);
    });

    it('should prevent the custom method overriding the key "parse" with a compilation error', () => {
      // Arrange & Act
      const act = () => {
        Scalar('MyString', 'string', {
          // @ts-expect-error - test scalar is not a scalar
          methods: (self) => ({
            parse: (value: any): any => value,
          }),
        });
      };

      // Assert
      expect(act).toThrow(PanicException);
    });

    it('should prevent the custom method overriding the key "validate" with a compilation error', () => {
      // Arrange & Act
      const act = () => {
        Scalar('MyString', 'string', {
          // @ts-expect-error - test scalar is not a scalar
          methods: (self) => ({
            validate: (value: any): any => value,
          }),
        });
      };

      // Assert
      expect(act).toThrow(PanicException);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: Scalar validate
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Scalar validate', () => {
    it('should expose the "validate" method on the descriptor with the root type as the input and the Result of the scalar as the output', () => {
      // Arrange
      const helloStringInvariant = Invariant(
        (value: string) => value === 'hello',
        () => 'NOT_HELLO' as const,
      );
      const minLengthStringInvariant = Invariant(
        (value: string) => value.length >= 5,
        () => 'TOO_SHORT' as const,
      );
      const MyString = Scalar('MyString', 'string', {
        invariants: [helloStringInvariant, minLengthStringInvariant] as const,
      });

      // Act
      type MyStringScalarValidate = typeof MyString.validate;

      // Assert
      expectTypeOf<MyStringScalarValidate>().toEqualTypeOf<
        (
          value: string,
        ) => Result<
          Scalar<'MyString', string>,
          readonly ('NOT_HELLO' | 'TOO_SHORT')[]
        >
      >();
    });

    it('should validate a value and return the scalar when the value satisfies the invariants', () => {
      // Arrange
      const helloStringInvariant = Invariant(
        (value: string) => value === 'hello',
        () => 'NOT_HELLO' as const,
      );
      const minLengthStringInvariant = Invariant(
        (value: string) => value.length >= 5,
        () => 'TOO_SHORT' as const,
      );
      const MyString = Scalar('MyString', 'string', {
        invariants: [helloStringInvariant, minLengthStringInvariant] as const,
      });

      // Act
      const myStringScalarR = MyString.validate('hello');

      // Assert
      assertOk(myStringScalarR);
      expect(myStringScalarR.value).toEqual('hello');
    });

    it('should return an array of invariant errors when the value does not satisfy the invariants', () => {
      // Arrange
      const helloStringInvariant = Invariant(
        (value: string) => value === 'hello',
        () => 'NOT_HELLO' as const,
      );
      const minLengthStringInvariant = Invariant(
        (value: string) => value.length >= 6,
        () => 'TOO_SHORT' as const,
      );
      const MyString = Scalar('MyString', 'string', {
        invariants: [helloStringInvariant, minLengthStringInvariant] as const,
      });

      // Act
      const myStringScalarR = MyString.validate('world');

      // Assert
      assertErr(myStringScalarR);
      expect(myStringScalarR.error).toEqual(['NOT_HELLO', 'TOO_SHORT']);
    });

    it('should return Ok when the scalar declares no invariants', () => {
      // Arrange
      const MyString = Scalar('MyString', 'string');

      // Act
      const myStringScalarR = MyString.validate('anything');

      // Assert - nothing to check, so the value passes through branded
      assertOk(myStringScalarR);
      expect(myStringScalarR.value).toBe('anything');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: Scalar consts
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Scalar consts', () => {
    it('should expose the consts on the descriptor', () => {
      // Arrange
      const Username = Scalar('Username', 'string', {
        consts: { MIN_LENGTH: 3, MAX_LENGTH: 32 },
      });

      // Act & Assert
      expect(Username.MIN_LENGTH).toBe(3);
      expect(Username.MAX_LENGTH).toBe(32);
    });

    it('should preserve the literal type of the consts', () => {
      // Arrange
      const Username = Scalar('Username', 'string', {
        consts: { MIN_LENGTH: 3 },
      });

      // Act
      type MyStringMinLength = typeof Username.MIN_LENGTH;

      // Assert
      expectTypeOf<MyStringMinLength>().toEqualTypeOf<3>();
    });

    it('should expose consts alongside methods', () => {
      // Arrange
      const Username = Scalar('Username', 'string', {
        consts: { MIN_LENGTH: 3 },
        methods: (self) => ({
          isLongEnough: (value: InferScalarType<typeof self>) =>
            value.length >= 3,
        }),
      });
      const username = Username.of('abc');
      assertOk(username);

      // Act & Assert
      expect(Username.MIN_LENGTH).toBe(3);
      expect(Username.isLongEnough(username.value)).toBe(true);
    });

    it('should prevent a const overriding a built-in key with a compilation error and a runtime error', () => {
      // Arrange & Act
      const act = () => {
        Scalar('MyString', 'string', {
          // @ts-expect-error - "of" collides with a built-in descriptor member
          consts: { of: 1 },
        });
      };

      // Assert
      expect(act).toThrow(PanicException);
    });

    it('should panic when a const collides with a custom method name', () => {
      // Arrange & Act
      // The type guard only forbids built-in keys, so a method/const clash is
      // caught at runtime rather than at compile time.
      const act = () => {
        Scalar('MyString', 'string', {
          methods: () => ({
            label: (value: Scalar<'MyString', string>) => value,
          }),
          consts: { label: 'literal' },
        });
      };

      // Assert
      expect(act).toThrow(PanicException);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: Scalar is
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Scalar is', () => {
    it('should expose the "is" method on the descriptor with the root type as the input and the boolean as the output', () => {
      // Arrange
      const MyString = Scalar('MyString', 'string');

      // Act
      type MyStringScalarIs = typeof MyString.is;

      // Assert
      expectTypeOf<MyStringScalarIs>().toEqualTypeOf<
        (value: unknown) => value is Scalar<'MyString', string>
      >();
    });

    it('should return true when the value is a scalar', () => {
      // Arrange
      const isHelloString = Invariant(
        (value: string) => value === 'hello',
        () => 'NOT_HELLO' as const,
      );
      const MyString = Scalar('MyString', 'string', {
        invariants: [isHelloString],
      });

      // Act
      const isMyString = MyString.is('hello');
      // Assert
      expect(isMyString).toBe(true);
    });

    it('should return false when the value is not a scalar', () => {
      // Arrange
      const isHelloString = Invariant(
        (value: string) => value === 'hello',
        () => 'NOT_HELLO' as const,
      );
      const MyString = Scalar('MyString', 'string', {
        invariants: [isHelloString],
      });

      // Act
      const isMyString = MyString.is('not hello');
      // Assert
      expect(isMyString).toBe(false);
    });

    it('should return false when the value is the wrong primitive', () => {
      // Arrange - no invariants, so only the primitive recognition can fail
      const MyString = Scalar('MyString', 'string');

      // Act & Assert
      expect(MyString.is(123)).toBe(false); // fails type recognition, not an invariant
      expect(MyString.is('hello')).toBe(true);
    });

    it('should infer the scalar type when the value is a scalar', () => {
      // Arrange
      const isHelloString = Invariant(
        (value: string) => value === 'hello',
        () => 'NOT_HELLO' as const,
      );
      const MyString = Scalar('MyString', 'string', {
        invariants: [isHelloString],
      });
      const value: unknown = 'hello';

      // Act
      if (MyString.is(value)) {
        expectTypeOf<typeof value>().toEqualTypeOf<
          Scalar<'MyString', string>
        >();
      } else {
        expectTypeOf<typeof value>().toBeUnknown();
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: Scalar extend
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Scalar extend', () => {
    const isInteger = Invariant(
      (value: number) => Number.isInteger(value),
      () => 'NOT_INTEGER' as const,
    );
    const isNonNegative = Invariant(
      (value: number) => value >= 0,
      () => 'NEGATIVE' as const,
    );

    it('should enforce both the base and the new invariants via parse', () => {
      // Arrange
      const Int = Scalar('Int', 'number', { invariants: [isInteger] });
      const UInt = Int.extend('UInt', { invariants: [isNonNegative] });

      // Act & Assert
      assertOk(UInt.parse(5));
      assertErr(UInt.parse(2.5)); // fails the base invariant
      assertErr(UInt.parse(-3)); // fails the new invariant
      assertErr(UInt.parse('x')); // fails the base recognizer
    });

    it('should surface the base invariant error when the base invariant fails', () => {
      // Arrange
      const Int = Scalar('Int', 'number', { invariants: [isInteger] });
      const UInt = Int.extend('UInt', { invariants: [isNonNegative] });

      // Act
      const result = UInt.parse(2.5);

      // Assert
      assertErr(result);
      expect(result.error).toBe('NOT_INTEGER');
    });

    it('should surface the new invariant error when only the new invariant fails', () => {
      // Arrange
      const Int = Scalar('Int', 'number', { invariants: [isInteger] });
      const UInt = Int.extend('UInt', { invariants: [isNonNegative] });

      // Act
      const result = UInt.parse(-3);

      // Assert
      assertErr(result);
      expect(result.error).toBe('NEGATIVE');
    });

    it('should nest the brand so a derived value is assignable to the base', () => {
      // Arrange
      const Int = Scalar('Int', 'number', { invariants: [isInteger] });
      const UInt = Int.extend('UInt', { invariants: [isNonNegative] });

      // Act
      const result = UInt.parse(5);

      // Assert
      assertOk(result);
      expectTypeOf<typeof result.value>().toEqualTypeOf<
        Scalar<'UInt', Scalar<'Int', number>>
      >();
      const asInt: Scalar<'Int', number> = result.value; // a UInt is an Int
      expect(asInt).toBe(5);
    });

    it('should derive the error type as the union of base and new invariant errors', () => {
      // Arrange
      const Int = Scalar('Int', 'number', { invariants: [isInteger] });
      const UInt = Int.extend('UInt', { invariants: [isNonNegative] });

      // Act
      type UIntError = InferScalarInvariantError<typeof UInt>;

      // Assert
      expectTypeOf<UIntError>().toEqualTypeOf<'NOT_INTEGER' | 'NEGATIVE'>();
    });

    it('should run the full invariant chain on "of", accepting the raw primitive', () => {
      // Arrange
      const Int = Scalar('Int', 'number', { invariants: [isInteger] });
      const UInt = Int.extend('UInt', { invariants: [isNonNegative] });

      // Act & Assert - constructed in one call from the raw number, no chain
      assertOk(UInt.of(5));
      assertErr(UInt.of(-3)); // fails the new invariant
      const baseFailure = UInt.of(2.5); // fails the INHERITED invariant
      assertErr(baseFailure);
      expect(baseFailure.error).toBe('NOT_INTEGER');
    });

    it('should run the full invariant chain on "validate", collecting inherited failures', () => {
      // Arrange
      const Int = Scalar('Int', 'number', { invariants: [isInteger] });
      const UInt = Int.extend('UInt', { invariants: [isNonNegative] });

      // Act - -2.5 violates BOTH the inherited and the new invariant
      const result = UInt.validate(-2.5);

      // Assert - the inherited invariant is not silently dropped
      assertErr(result);
      expect(result.error).toStrictEqual(['NOT_INTEGER', 'NEGATIVE']);
      assertOk(UInt.validate(5));
    });

    it('should accumulate invariants across a multi-level extend chain', () => {
      // Arrange
      const isPositive = Invariant(
        (value: number) => value > 0,
        () => 'NOT_POSITIVE' as const,
      );
      const Int = Scalar('Int', 'number', { invariants: [isInteger] });
      const UInt = Int.extend('UInt', { invariants: [isNonNegative] });
      const PositiveInt = UInt.extend('PositiveInt', {
        invariants: [isPositive],
      });

      // Act & Assert - a single call from the raw number runs all three levels
      const positiveTwoR = PositiveInt.of(2);
      assertOk(positiveTwoR);
      const value: Scalar<'Int', number> = positiveTwoR.value; // still an Int
      expect(value).toBe(2);
      expect(PositiveInt.of(2.5).unsafeUnwrapErr()).toBe('NOT_INTEGER'); // Int level
      expect(PositiveInt.of(-1).unsafeUnwrapErr()).toBe('NEGATIVE'); // UInt level
      expect(PositiveInt.of(0).unsafeUnwrapErr()).toBe('NOT_POSITIVE'); // own level
      expect(PositiveInt.validate(-1.5).unsafeUnwrapErr()).toStrictEqual([
        'NOT_INTEGER',
        'NEGATIVE',
        'NOT_POSITIVE',
      ]);
    });

    it('should not inherit the base scalar methods or consts', () => {
      // Arrange
      const Int = Scalar('Int', 'number', {
        invariants: [isInteger],
        consts: { ZERO: 0 },
      });
      const UInt = Int.extend('UInt', { invariants: [isNonNegative] });

      // Act & Assert - inherited members are absent on the derived descriptor
      expect((UInt as Record<string, unknown>)['ZERO']).toBeUndefined();
    });

    it('should allow the derived scalar to define its own methods and consts', () => {
      // Arrange
      type UIntValue = Scalar<'UInt', Scalar<'Int', number>>;
      const Int = Scalar('Int', 'number', { invariants: [isInteger] });
      const UInt = Int.extend('UInt', {
        invariants: [isNonNegative],
        consts: { MIN: 0 },
        methods: () => ({
          isZero: (value: UIntValue) => value === 0,
        }),
      });

      // Act
      const result = UInt.parse(0);

      // Assert
      assertOk(result);
      expect(UInt.MIN).toBe(0);
      expect(UInt.isZero(result.value)).toBe(true);
    });
  });
});
