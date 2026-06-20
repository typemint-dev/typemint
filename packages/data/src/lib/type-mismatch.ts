import { Kind, WithDetail, WithMessage, TypeDescriptor } from '@typemint/core';

/**
 * A structured error describing that a value of one type was expected but a
 * value of a different type was received.
 *
 * It is the intersection of three reusable shapes from `@typemint/core`:
 * - {@link Kind} — tags the object with the discriminant `'TypeMismatchError'`
 *   so it can be narrowed within discriminated unions.
 * - {@link WithMessage} — a human-readable `message`.
 * - {@link WithDetail} — the structured `details`, holding the `expected`
 *   {@link TypeDescriptor} and the actual `received` value.
 *
 * The two sides are intentionally asymmetric. `expected` is something the
 * caller knows statically, so it is described by a {@link TypeDescriptor} whose
 * phantom `TExpected` type can be recovered later with
 * {@link InferTypeMismatchErrorExpected}. `received`, on the other hand, is the
 * value you are trying to identify — at a type-check boundary it is usually
 * `unknown` — so it is stored as the raw value rather than a descriptor. Its
 * type `TReceived` is inferred from that value and can be recovered with
 * {@link InferTypeMismatchErrorReceived}.
 *
 * @typeParam TExpected - The type that was expected (phantom).
 * @typeParam TReceived - The type of the received value.
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
      received: TReceived;
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
 * Creates a {@link TypeMismatchError} from a {@link TypeDescriptor} for the
 * expected type and the actual received value.
 *
 * `TExpected` is inferred from the descriptor and `TReceived` from the value,
 * so neither has to be written out at the call site. The `message` is derived
 * as `Expected <expected> but got <received>`, where the received part is the
 * runtime type name of the value (see {@link typeNameOf}). The descriptor and
 * the raw value are preserved under `details` for programmatic access.
 *
 * @param expected - A descriptor for the type that was expected.
 * @param received - The value that was actually received.
 * @returns A fully populated `TypeMismatchError`.
 *
 * @example
 *
 * ```ts
 * import { TypeDescriptor, witness } from '@typemint/core';
 *
 * const error = TypeMismatchError(
 *   TypeDescriptor('Number', witness<number>()),
 *   'hello',
 * );
 *
 * error.kind;             // 'TypeMismatchError'
 * error.message;          // 'Expected Number but got string'
 * error.details.expected; // the Number descriptor
 * error.details.received; // 'hello'
 * ```
 */
export function TypeMismatchError<TExpected, TReceived>(
  expected: TypeDescriptor<TExpected, string>,
  received: TReceived,
): TypeMismatchError<TExpected, TReceived> {
  const message = `Expected ${expected.name} but got ${typeNameOf(received)}`;

  return {
    ...kind,
    ...WithMessage.from(message),
    ...WithDetail.from({ expected, received }),
  };
}

/**
 * Derives a human-readable runtime type name for an arbitrary value, used to
 * describe the `received` value in a {@link TypeMismatchError} message.
 *
 * Returns `'null'` for `null`, `'Array'` for arrays, the constructor name for
 * other objects (falling back to `'object'`), and the `typeof` result for
 * primitives.
 */
function typeNameOf(value: unknown): string {
  if (value === null) {
    return 'null';
  }

  if (Array.isArray(value)) {
    return 'Array';
  }

  if (typeof value === 'object') {
    return value.constructor?.name ?? 'object';
  }

  return typeof value;
}
