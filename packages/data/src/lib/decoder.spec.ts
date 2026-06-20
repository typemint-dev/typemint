import { describe, expectTypeOf, it } from 'vitest';
import type {
  Decoder,
  InferDecoderError,
  InferDecoderOutput,
} from './decoder.js';

describe('(unit) decoder', () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: InferDecoderOutput
  // ─────────────────────────────────────────────────────────────────────────────
  describe('InferDecoderOutput', () => {
    it('should infer the output type of a decoder', () => {
      // Arrange
      type TestDecoder = Decoder<unknown, string>;
      // Act
      type Output = InferDecoderOutput<TestDecoder>;
      // Assert
      expectTypeOf<Output>().toEqualTypeOf<string>();
    });

    it('should infer the output type when the decoder uses the default error type', () => {
      // Arrange
      type TestDecoder = Decoder<unknown, number>;

      // Act
      type Output = InferDecoderOutput<TestDecoder>;

      // Assert
      expectTypeOf<Output>().toEqualTypeOf<number>();
    });

    it('should infer literal output unions from a decoder type', () => {
      // Arrange
      type TestDecoder = Decoder<unknown, 'a' | 'b'>;

      // Act
      type Output = InferDecoderOutput<TestDecoder>;

      // Assert
      expectTypeOf<Output>().toEqualTypeOf<'a' | 'b'>();
    });

    it('should infer output from a function-shaped decoder alias', () => {
      // Arrange
      type TestDecoder = (
        value: unknown,
      ) => ReturnType<Decoder<unknown, bigint>>;

      // Act
      type Output = InferDecoderOutput<TestDecoder>;

      // Assert
      expectTypeOf<Output>().toEqualTypeOf<bigint>();
    });

    it('should reject decoders that specify a non-default error type', () => {
      // Arrange
      type TestDecoder = Decoder<unknown, number, RangeError>;

      // Act
      // @ts-expect-error - InferDecoderOutput currently constrains to Decoder<unknown, unknown, never>
      type Output = InferDecoderOutput<TestDecoder>;
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: InferDecoderError
  // ─────────────────────────────────────────────────────────────────────────────
  describe('InferDecoderError', () => {
    it('should infer the error type of a decoder', () => {
      // Arrange
      type TestDecoder = Decoder<unknown, string>;

      // Act
      type Error = InferDecoderError<TestDecoder>;

      // Assert
      expectTypeOf<Error>().toEqualTypeOf<never>();
    });

    it('should infer never when the decoder uses the default error type', () => {
      // Arrange
      type TestDecoder = Decoder<unknown, number>;

      // Act
      type Error = InferDecoderError<TestDecoder>;

      // Assert
      expectTypeOf<Error>().toEqualTypeOf<never>();
    });

    it('should infer error from a function-shaped decoder alias', () => {
      // Arrange
      type TestDecoder = (
        value: unknown,
      ) => ReturnType<Decoder<unknown, bigint>>;

      // Act
      type Error = InferDecoderError<TestDecoder>;

      // Assert
      expectTypeOf<Error>().toEqualTypeOf<never>();
    });

    it('should reject decoders that specify a non-default error type', () => {
      // Arrange
      type TestDecoder = Decoder<unknown, number, RangeError>;

      // Act
      // @ts-expect-error - InferDecoderError currently constrains to Decoder<unknown, unknown, never>
      type Error = InferDecoderError<TestDecoder>;
    });
  });
});
