import { Kind, WithDetail, WithMessage, TypeDescriptor } from '@typemint/core';

/**
 * A structured error describing that a value of one type was expected but a
 * value of a different type was received.
 *
 * It is the intersection of three reusable shapes from `@typemint/core`:
 * - {@link Kind} — tags the object with the discriminant `'TypeMismatchError'`
 *   so it can be narrowed within discriminated unions.
 * - {@link WithMessage} — a human-readable `message`.
 * - {@link WithDetail} — the structured `details`, holding the `expected` and
 *   `received` {@link TypeDescriptor}s that drive both the message and
 *   compile-time inference.
 *
 * The `expected` and `received` types are phantom: they only ever live in the
 * type system (carried by the descriptors), so they can be recovered later with
 * {@link InferTypeMismatchErrorExpected} and
 * {@link InferTypeMismatchErrorReceived}.
 *
 * @typeParam TExpected - The type that was expected (phantom).
 * @typeParam TReceived - The type that was actually received (phantom).
 *
 * @example Narrowing a union on the `kind` discriminant
 *
 * `Kind.isOf` filters the union down to the `TypeMismatchError` member, so its
 * `message` and `details` become accessible in the matched branch.
 *
 * ```ts
 * type DecodeError =
 *   | TypeMismatchError<unknown, unknown>
 *   | Kind<'MissingFieldError'>;
 *
 * function handle(error: DecodeError) {
 *   if (Kind.isOf(error, 'TypeMismatchError')) {
 *     console.error(error.message);
 *   }
 * }
 * ```
 */
export type TypeMismatchError<TExpected, TReceived> =
  Kind<'TypeMismatchError'> &
    WithMessage &
    WithDetail<{
      expected: TypeDescriptor<TExpected, string>;
      received: TypeDescriptor<TReceived, string>;
    }>;

/**
 * Extracts the expected type carried by a {@link TypeMismatchError}.
 *
 * @typeParam T - The `TypeMismatchError` to read from.
 *
 * @example
 *
 * ```ts
 * type Err = TypeMismatchError<number, string>;
 * type Expected = InferTypeMismatchErrorExpected<Err>; // number
 * ```
 */
export type InferTypeMismatchErrorExpected<
  T extends TypeMismatchError<unknown, unknown>,
> = T extends TypeMismatchError<infer TExpected, unknown> ? TExpected : never;

/**
 * Extracts the received type carried by a {@link TypeMismatchError}.
 *
 * @typeParam T - The `TypeMismatchError` to read from.
 *
 * @example
 *
 * ```ts
 * type Err = TypeMismatchError<number, string>;
 * type Received = InferTypeMismatchErrorReceived<Err>; // string
 * ```
 */
export type InferTypeMismatchErrorReceived<
  T extends TypeMismatchError<unknown, unknown>,
> = T extends TypeMismatchError<unknown, infer TReceived> ? TReceived : never;

const kind = Kind.from('TypeMismatchError');

/**
 * Creates a {@link TypeMismatchError} from the {@link TypeDescriptor}s of the
 * expected and received types.
 *
 * Both type parameters are inferred from the descriptor arguments, so neither
 * has to be written out at the call site. The `message` is derived from the
 * descriptors' `name`s as `Expected <expected> but got <received>`, and the
 * descriptors themselves are preserved under `details` for programmatic access.
 *
 * @param expected - A descriptor for the type that was expected.
 * @param received - A descriptor for the type that was actually received.
 * @returns A fully populated `TypeMismatchError`.
 *
 * @example
 *
 * ```ts
 * import { TypeDescriptor, witness } from '@typemint/core';
 *
 * const error = TypeMismatchError(
 *   TypeDescriptor('Number', witness<number>()),
 *   TypeDescriptor('String', witness<string>()),
 * );
 *
 * error.kind;                  // 'TypeMismatchError'
 * error.message;               // 'Expected Number but got String'
 * error.details.expected.name; // 'Number'
 * error.details.received.name; // 'String'
 * ```
 */
export function TypeMismatchError<TExpected, TReceived>(
  expected: TypeDescriptor<TExpected, string>,
  received: TypeDescriptor<TReceived, string>,
): TypeMismatchError<TExpected, TReceived> {
  const message = `Expected ${expected.name} but got ${received.name}`;

  return {
    ...kind,
    ...WithMessage.from(message),
    ...WithDetail.from({ expected, received }),
  };
}
