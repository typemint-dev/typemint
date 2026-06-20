import type { Result, InferOk, InferErr } from '@typemint/result';

/**
 * A function that decodes a value of type `TIn` into a value of type `TOut`.
 *
 * Decoding may fail, so the result is wrapped in a {@link Result}: a successful
 * decode yields an `Ok<TOut>`, while a failure yields an `Err<TError>`. The
 * `TError` type parameter defaults to `never`, denoting a decoder that is
 * total and cannot fail.
 *
 * @typeParam TIn - The type of the input value to decode.
 * @typeParam TOut - The type produced on a successful decode.
 * @typeParam TError - The error type produced on a failed decode. Defaults to
 * `never` for decoders that never fail.
 *
 * @example
 *
 * ```ts
 * const toNumber: Decoder<string, number, RangeError> = (value) => {
 *   const n = Number(value);
 *   return Number.isNaN(n)
 *     ? Result.Err(new RangeError(`"${value}" is not a number`))
 *     : Result.Ok(n);
 * };
 * ```
 */
export type Decoder<TIn, TOut, TError = never> = (
  value: TIn,
) => Result<TOut, TError>;

// Implements only the decoders for javascript native primitives

export type InferDecoderOutput<TDecoder extends Decoder<unknown, unknown>> =
  InferOk<ReturnType<TDecoder>>;

export type InferDecoderError<TDecoder extends Decoder<unknown, unknown>> =
  InferErr<ReturnType<TDecoder>>;

export type InferDecoderInput<TDecoder extends Decoder<unknown, unknown>> =
  TDecoder extends Decoder<infer TIn, unknown> ? TIn : never;
