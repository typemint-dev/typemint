import {
  assert,
  assertDefined,
  isRecord,
  Kind,
  PanicException,
} from '@typemint/core';

const resultSymbol = Symbol.for('typemint.result');

// ───────────────────────────────────────────────────────────────────────────────
// #region Handler Type

/**
 * Exhaustive handler set for pattern-matching a {@link Result}.
 *
 * Both branches must return the same type `U`, which becomes the result
 * of {@link Result.match}.
 *
 * @example
 * ```ts
 * const message = result.match({
 *   Ok: (value) => `Got ${value}`,
 *   Err: (error) => `Failed: ${error}`,
 * });
 * ```
 */
export type ResultHandlers<T, E, U> = {
  readonly Ok: (value: T) => U;
  readonly Err: (error: E) => U;
};
// #endregion

// ───────────────────────────────────────────────────────────────────────────────
// #region Ok Type
/**
 * Plain-object shape of an {@link Ok}, without methods.
 *
 * Produced by {@link Ok.toJSON} and accepted by {@link Result.fromJSON}.
 * Useful for serialization, logging, and any context where an `Ok` instance
 * must be represented as data only.
 *
 * @example
 * ```ts
 * const serialized: OkLike<number> = { kind: "Ok", value: 42 };
 * const result = Result.fromJSON<number, string>(serialized);
 * // Ok(Ok(42))
 * ```
 */
export type OkLike<T> = Kind<'Ok'> & { value: T };
export const OkLike = {
  /**
   * Structural type-guard for {@link OkLike}. Performs a shallow
   * envelope check — the inner `value` is not validated.
   *
   * @example
   * ```ts
   * OkLike.isOfType({ kind: "Ok", value: 1 });   // true
   * OkLike.isOfType({ kind: "Err", error: 1 });  // false
   * OkLike.isOfType(null);                       // false
   * ```
   */
  isOfType(value: unknown): value is OkLike<unknown> {
    return Kind.isOf(value, 'Ok') && 'value' in value;
  },
} as const;

/**
 * Successful variant of a {@link Result}.
 *
 * Carries a `value` of type `T` and retains the error-channel type `E`
 * so that Ok/Err can be combined in the same expression without loss
 * of type information.
 *
 * @example
 * ```ts
 * const r: Ok<number, string> = Result.Ok(42);
 * r.value;        // 42
 * r.unwrap();     // 42
 * r.isOk();       // true
 * ```
 */
export type Ok<T, E> = Kind<'Ok'> & {
  readonly value: T;

  // Methods
  /**
   * Returns `true` and narrows the type to {@link Ok}.
   *
   * @example
   * ```ts
   * declare const r: Result<number, string>;
   * if (r.isOk()) {
   *   r.value; // number
   * }
   * ```
   */
  isOk(): this is Ok<T, E>;

  /**
   * Returns `false` on an {@link Ok}.
   *
   * @example
   * ```ts
   * Result.Ok(1).isErr(); // false
   * ```
   */
  isErr(): this is Err<T, E>;

  /**
   * Transforms the success value, leaving the error type unchanged.
   *
   * @example
   * ```ts
   * Result.Ok(2).map((n) => n * 10);
   * // Ok(20)
   * ```
   */
  map<U>(f: (value: T) => U): Ok<U, E>;

  /**
   * No-op on {@link Ok} — returns self with the error type recast.
   *
   * @example
   * ```ts
   * const r: Result<number, string> = Result.Ok(1);
   * const mapped = r.mapErr((e) => new Error(e));
   * // Ok(1) with error type widened to Error
   * ```
   */
  mapErr<F>(f: (error: E) => F): Ok<T, F>;

  /**
   * Applies `f` to the success value and returns the result.
   * The `defaultValue` is ignored.
   *
   * @example
   * ```ts
   * Result.Ok(3).mapOr(0, (n) => n * 2); // 6
   * Result.Err("x").mapOr(0, (n: number) => n * 2); // 0
   * ```
   */
  mapOr<U>(defaultValue: U, f: (value: T) => U): U;

  /**
   * Applies `f` to the success value and returns the result.
   * The `defaultFn` is ignored.
   *
   * @example
   * ```ts
   * Result.Ok(3).mapOrElse(
   *   (err) => `fallback: ${err}`,
   *   (n) => `value: ${n}`,
   * );
   * // "value: 3"
   * ```
   */
  mapOrElse<U>(defaultFn: (error: E) => U, f: (value: T) => U): U;

  /**
   * Calls `f` with the success value and returns its result.
   * Error types accumulate as a union across chained calls.
   *
   * @example
   * ```ts
   * const parse = (s: string): Result<number, "NaN"> =>
   *   Number.isNaN(Number(s)) ? Result.Err("NaN") : Result.Ok(Number(s));
   *
   * Result.Ok("42").andThen(parse);
   * // Ok(42)
   * ```
   */
  andThen<U, F>(f: (value: T) => Result<U, F>): Result<U, E | F>;

  /**
   * No-op on {@link Ok} — returns self with the error type recast.
   *
   * @example
   * ```ts
   * Result.Ok(1).orElse(() => Result.Ok(99));
   * // Ok(1)  — fallback never evaluated
   * ```
   */
  orElse<F>(f: (error: E) => Result<T, F>): Ok<T, F>;

  /**
   * Returns the success value. Available on {@link Ok} only — call
   * `isOk()` first to narrow, or use {@link unsafeUnwrap} to opt out
   * of the narrowing requirement.
   *
   * @example
   * ```ts
   * declare const r: Result<number, string>;
   * if (r.isOk()) {
   *   const value = r.unwrap(); // number
   * }
   * ```
   */
  unwrap(): T;

  /**
   * Returns the success value, ignoring the default.
   *
   * @example
   * ```ts
   * Result.Ok(1).unwrapOr(0);        // 1
   * Result.Ok(1).unwrapOr("fallback"); // 1  (return type: number | string)
   * ```
   */
  unwrapOr<U>(defaultValue: U): T | U;

  /**
   * Returns the success value, ignoring the fallback function.
   *
   * @example
   * ```ts
   * Result.Ok(1).unwrapOrElse(() => 0); // 1
   * ```
   */
  unwrapOrElse<U>(f: (error: E) => U): T | U;

  /**
   * Returns the success value without requiring prior type narrowing.
   * Prefer {@link unwrap} after an `isOk()` check; use this only when
   * you have out-of-band proof that the result is an `Ok`.
   *
   * @example
   * ```ts
   * Result.Ok(1).unsafeUnwrap(); // 1
   * ```
   */
  unsafeUnwrap(): T;

  /**
   * Always panics on {@link Ok}, since there is no error value.
   *
   * @throws {PanicException} Always, when called on an `Ok`.
   *
   * @example
   * ```ts
   * Result.Ok(1).unsafeUnwrapErr();
   * // throws PanicException("Called unsafeUnwrapErr on an Ok value")
   * ```
   */
  unsafeUnwrapErr(): never;

  /**
   * Calls `f` with the success value for side effects, then returns self.
   *
   * @example
   * ```ts
   * Result.Ok(1).tap((n) => console.log("got", n));
   * // logs "got 1", returns Ok(1)
   * ```
   */
  tap(f: (value: T) => void): Ok<T, E>;

  /**
   * No-op on {@link Ok} — returns self, `f` is not called.
   *
   * @example
   * ```ts
   * Result.Ok(1).tapErr((e) => console.log("err", e));
   * // Ok(1); callback never runs
   * ```
   */
  tapErr(f: (error: E) => void): Ok<T, E>;

  /**
   * Calls the `Ok` handler with the success value and returns its result.
   *
   * @example
   * ```ts
   * Result.Ok(1).match({
   *   Ok:  (n) => `ok:${n}`,
   *   Err: (e) => `err:${e}`,
   * });
   * // "ok:1"
   * ```
   */
  match<U>(handlers: ResultHandlers<T, E, U>): U;

  /**
   * Returns a JSON-serializable representation of the `Ok` variant.
   * Called automatically by {@link JSON.stringify}.
   *
   * Only strips methods — it does not convert non-JSON-safe payload
   * values (e.g. `bigint`, `Date`, `Temporal.*`). Pair with a codec
   * for that.
   *
   * @example
   * ```ts
   * JSON.stringify(Result.Ok(42));
   * // '{"kind":"Ok","value":42}'
   *
   * Result.Ok(42).toJSON();
   * // { kind: "Ok", value: 42 }
   * ```
   */
  toJSON(): OkLike<T>;
};
// #endregion
// ───────────────────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────────────────
// #region Err Type
/**
 * Plain-object shape of an {@link Err}, without methods.
 *
 * Produced by {@link Err.toJSON} and accepted by {@link Result.fromJSON}.
 *
 * @example
 * ```ts
 * const serialized: ErrLike<string> = { kind: "Err", error: "not-found" };
 * Result.fromJSON<never, string>(serialized);
 * // Ok(Err("not-found"))
 * ```
 */
export type ErrLike<E> = Kind<'Err'> & { error: E };
export const ErrLike = {
  /**
   * Structural type-guard for {@link ErrLike}. Performs a shallow
   * envelope check — the inner `error` is not validated.
   *
   * @example
   * ```ts
   * ErrLike.isOfType({ kind: "Err", error: "x" }); // true
   * ErrLike.isOfType({ kind: "Ok", value: 1 });    // false
   * ```
   */
  isOfType(value: unknown): value is ErrLike<unknown> {
    return Kind.isOf(value, 'Err') && 'error' in value;
  },
} as const;

/**
 * Failure variant of a {@link Result}.
 *
 * Carries an `error` of type `E` and retains the success-channel type `T`
 * so that Ok/Err can flow through the same combinators without loss
 * of type information.
 *
 * @example
 * ```ts
 * const r: Err<number, string> = Result.Err("boom");
 * r.error;         // "boom"
 * r.unwrapErr();   // "boom"
 * r.isErr();       // true
 * ```
 */
export type Err<T, E> = Kind<'Err'> & {
  readonly error: E;

  // Methods
  /**
   * Returns `false` on an {@link Err}.
   *
   * @example
   * ```ts
   * Result.Err("x").isOk(); // false
   * ```
   */
  isOk(): this is Ok<T, E>;

  /**
   * Returns `true` and narrows the type to {@link Err}.
   *
   * @example
   * ```ts
   * declare const r: Result<number, string>;
   * if (r.isErr()) {
   *   r.error; // string
   * }
   * ```
   */
  isErr(): this is Err<T, E>;

  /**
   * No-op on {@link Err} — returns self with the value type recast.
   *
   * @example
   * ```ts
   * const r: Result<number, string> = Result.Err("x");
   * r.map((n) => n * 2);
   * // Err("x") with value type narrowed to number
   * ```
   */
  map<U>(f: (value: T) => U): Err<U, E>;

  /**
   * Transforms the error value, leaving the value type unchanged.
   *
   * @example
   * ```ts
   * Result.Err("NOT_FOUND").mapErr((code) => ({ code }));
   * // Err({ code: "NOT_FOUND" })
   * ```
   */
  mapErr<F>(f: (error: E) => F): Err<T, F>;

  /**
   * Returns `defaultValue` as-is; `f` is not called.
   *
   * @example
   * ```ts
   * Result.Err("x").mapOr(0, (n: number) => n * 2); // 0
   * ```
   */
  mapOr<U>(defaultValue: U, f: (value: T) => U): U;

  /**
   * Applies `defaultFn` to the error and returns the result; `f` is ignored.
   *
   * @example
   * ```ts
   * Result.Err("boom").mapOrElse(
   *   (err) => `fallback:${err}`,
   *   (n: number) => `value:${n}`,
   * );
   * // "fallback:boom"
   * ```
   */
  mapOrElse<U>(defaultFn: (error: E) => U, f: (value: T) => U): U;

  /**
   * No-op on {@link Err} — returns self with the value type recast.
   * Error types accumulate as a union across chained calls.
   *
   * @example
   * ```ts
   * const r: Result<number, "A"> = Result.Err("A");
   * r.andThen((n) => Result.Err("B" as const));
   * // Err("A") typed as Result<never, "A" | "B">
   * ```
   */
  andThen<U, F>(f: (value: T) => Result<U, F>): Result<U, E | F>;

  /**
   * Calls `f` with the error and returns its result.
   *
   * @example
   * ```ts
   * Result.Err("boom").orElse(() => Result.Ok(0));
   * // Ok(0)
   * ```
   */
  orElse<F>(f: (error: E) => Result<T, F>): Result<T, F>;

  /**
   * Always panics on {@link Err}, since there is no success value.
   *
   * @throws {PanicException} Always, when called on an `Err`.
   *
   * @example
   * ```ts
   * Result.Err("x").unsafeUnwrap();
   * // throws PanicException("Called unsafeUnwrap on an Err value")
   * ```
   */
  unsafeUnwrap(): never;

  /**
   * Returns the error value without requiring prior type narrowing.
   * Prefer {@link unwrapErr} after an `isErr()` check.
   *
   * @example
   * ```ts
   * Result.Err("x").unsafeUnwrapErr(); // "x"
   * ```
   */
  unsafeUnwrapErr(): E;

  /**
   * Returns `defaultValue`, since self is an {@link Err}.
   *
   * @example
   * ```ts
   * Result.Err("x").unwrapOr(0); // 0
   * ```
   */
  unwrapOr<U>(defaultValue: U): T | U;

  /**
   * Calls `f` with the error to compute a fallback value.
   *
   * @example
   * ```ts
   * Result.Err("boom").unwrapOrElse((e) => `recovered:${e}`);
   * // "recovered:boom"
   * ```
   */
  unwrapOrElse<U>(f: (error: E) => U): T | U;

  /**
   * Returns the error value. Available on {@link Err} only — call
   * `isErr()` first to narrow, or use {@link unsafeUnwrapErr} to opt
   * out of the narrowing requirement.
   *
   * @example
   * ```ts
   * declare const r: Result<number, string>;
   * if (r.isErr()) {
   *   const e = r.unwrapErr(); // string
   * }
   * ```
   */
  unwrapErr(): E;

  /**
   * No-op on {@link Err} — returns self, `f` is not called.
   *
   * @example
   * ```ts
   * Result.Err("x").tap((v) => console.log(v));
   * // Err("x"); callback never runs
   * ```
   */
  tap(f: (value: T) => void): Err<T, E>;

  /**
   * Calls `f` with the error for side effects, then returns self.
   *
   * @example
   * ```ts
   * Result.Err("boom").tapErr((e) => console.error(e));
   * // logs "boom", returns Err("boom")
   * ```
   */
  tapErr(f: (error: E) => void): Err<T, E>;

  /**
   * Calls the `Err` handler with the error value and returns its result.
   *
   * @example
   * ```ts
   * Result.Err("x").match({
   *   Ok:  (n) => `ok:${n}`,
   *   Err: (e) => `err:${e}`,
   * });
   * // "err:x"
   * ```
   */
  match<U>(handlers: ResultHandlers<T, E, U>): U;

  /**
   * Returns a JSON-serializable representation of the `Err` variant.
   * Called automatically by {@link JSON.stringify}.
   *
   * Note: if `error` is an `Error` instance, its non-enumerable fields
   * (`message`, `stack`) will not be included by default — map the error
   * to a plain object first if you need them serialized.
   *
   * @example
   * ```ts
   * JSON.stringify(Result.Err({ code: "NOT_FOUND" }));
   * // '{"kind":"Err","error":{"code":"NOT_FOUND"}}'
   *
   * Result.Err("boom").toJSON();
   * // { kind: "Err", error: "boom" }
   * ```
   */
  toJSON(): ErrLike<E>;
};
// #endregion
// ───────────────────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────────────────
// #region Result Type
/**
 * Tagged union of {@link Ok} and {@link Err}.
 *
 * Use `isOk()` / `isErr()` to narrow, or {@link match} for exhaustive
 * handling.
 *
 * @example
 * ```ts
 * function divide(a: number, b: number): Result<number, "DIV_BY_ZERO"> {
 *   return b === 0 ? Result.Err("DIV_BY_ZERO") : Result.Ok(a / b);
 * }
 *
 * const r = divide(10, 2);
 * if (r.isOk()) {
 *   r.value; // 5
 * }
 * ```
 */
export type Result<T, E> = Ok<T, E> | Err<T, E>;

/**
 * Plain-object form of a {@link Result}. A union of {@link OkLike} and
 * {@link ErrLike}. Suitable for transport (JSON, message queues, logs).
 *
 * @example
 * ```ts
 * const data: ResultLike<number, string> = { kind: "Ok", value: 1 };
 * ```
 */
export type ResultLike<T, E> = OkLike<T> | ErrLike<E>;
export const ResultLike = {
  /**
   * Structural type-guard for {@link ResultLike} — matches either an
   * {@link OkLike} or {@link ErrLike} envelope.
   *
   * @example
   * ```ts
   * ResultLike.isOfType({ kind: "Ok", value: 1 });     // true
   * ResultLike.isOfType({ kind: "Err", error: "x" }); // true
   * ResultLike.isOfType({ kind: "Maybe" });            // false
   * ```
   */
  isOfType(value: unknown): value is ResultLike<unknown, unknown> {
    return OkLike.isOfType(value) || ErrLike.isOfType(value);
  },
} as const;

/**
 * Extracts the success type `T` from an {@link Ok}-like value.
 *
 * @example
 * ```ts
 * type R = Result<number, string>;
 * type V = InferOk<R>; // number
 * ```
 */
export type InferOk<T> = T extends Ok<infer U, unknown> ? U : never;

/**
 * Extracts the error type `E` from an {@link Err}-like value.
 *
 * @example
 * ```ts
 * type R = Result<number, "A" | "B">;
 * type E = InferErr<R>; // "A" | "B"
 * ```
 */
export type InferErr<T> = T extends Err<unknown, infer U> ? U : never;
// #endregion
// ───────────────────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────────────────
// #region Parse Error Type
/**
 * Structured error produced by {@link Result.fromJSON} when the input
 * does not match the expected serialized shape of a {@link Result}.
 *
 * Tagged via the {@link Kind} convention so it can be distinguished
 * from user-level errors in mixed error channels.
 *
 * @example
 * ```ts
 * const parsed = Result.fromJSON("not an object");
 * if (parsed.isErr()) {
 *   parsed.error.kind;     // "ParseResultError"
 *   parsed.error.reason;   // human-readable description
 *   parsed.error.received; // original unknown input
 * }
 * ```
 */
export type ParseResultError = Kind<'ParseResultError'> & {
  readonly reason: string;
  readonly received: unknown;
};

export const ParseResultError = {
  /**
   * Constructs a {@link ParseResultError}.
   *
   * @example
   * ```ts
   * ParseResultError.of("Expected object", null);
   * // { kind: "ParseResultError", reason: "Expected object", received: null }
   * ```
   */
  of(reason: string, received: unknown): ParseResultError {
    return {
      ...Kind.from('ParseResultError'),
      reason,
      received,
    };
  },

  /**
   * Type-guard for {@link ParseResultError}. Checks the `kind` discriminant.
   *
   * @example
   * ```ts
   * ParseResultError.isOfType(ParseResultError.of("x", null)); // true
   * ParseResultError.isOfType({ kind: "Other" });              // false
   * ```
   */
  isOfType(value: unknown): value is ParseResultError {
    return Kind.isOf(value, 'ParseResultError');
  },
} as const;
// #endregion

// ───────────────────────────────────────────────────────────────────────────────
// #MARK Implementations
// ───────────────────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────────────────
// #region Ok Implementation
class _OkImpl<T, E> implements Ok<T, E> {
  readonly kind = 'Ok' as const;

  public readonly [resultSymbol] = true;

  constructor(public readonly value: T) {}

  public isOk(): this is Ok<T, E> {
    return true;
  }

  public isErr(): this is Err<T, E> {
    return false;
  }

  public map<U>(f: (value: T) => U): Ok<U, E> {
    return new _OkImpl(f(this.value));
  }

  public mapErr<F>(_f: (error: E) => F): Ok<T, F> {
    return this as unknown as _OkImpl<T, F>;
  }

  public mapOr<U>(_defaultValue: U, f: (value: T) => U): U {
    return f(this.value);
  }

  public mapOrElse<U>(_defaultFn: (error: E) => U, f: (value: T) => U): U {
    return f(this.value);
  }

  public andThen<U, F>(f: (value: T) => Result<U, F>): Result<U, E | F> {
    return f(this.value);
  }

  public orElse<F>(_f: (error: E) => Result<T, F>): Ok<T, F> {
    return this as unknown as _OkImpl<T, F>;
  }

  public unwrap(): T {
    return this.value;
  }

  public unwrapOr<U>(_defaultValue: U): T | U {
    return this.value;
  }

  public unwrapOrElse<U>(_f: (error: E) => U): T | U {
    return this.value;
  }

  public unsafeUnwrap(): T {
    return this.value;
  }

  public unsafeUnwrapErr(): never {
    throw new PanicException('Called unsafeUnwrapErr on an Ok value');
  }

  public tap(f: (value: T) => void): Ok<T, E> {
    f(this.value);
    return this;
  }

  public tapErr(_f: (error: E) => void): Ok<T, E> {
    return this;
  }

  public match<U>(handlers: ResultHandlers<T, E, U>): U {
    return handlers.Ok(this.value);
  }

  public toJSON(): OkLike<T> {
    return { kind: 'Ok', value: this.value };
  }
}
// #endregion
// ───────────────────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────────────────
// #region Err Implementation
class _ErrImpl<T, E> implements Err<T, E> {
  readonly kind = 'Err' as const;

  public readonly [resultSymbol] = true;

  constructor(public readonly error: E) {}

  public isOk(): this is Ok<T, E> {
    return false;
  }

  public isErr(): this is Err<T, E> {
    return true;
  }

  public map<U>(_f: (value: T) => U): Err<U, E> {
    return this as unknown as _ErrImpl<U, E>;
  }

  public mapErr<F>(f: (error: E) => F): Err<T, F> {
    return new _ErrImpl(f(this.error));
  }

  public mapOr<U>(defaultValue: U, _f: (value: T) => U): U {
    return defaultValue;
  }

  public mapOrElse<U>(defaultFn: (error: E) => U, _f: (value: T) => U): U {
    return defaultFn(this.error);
  }

  public andThen<U, F>(_f: (value: T) => Result<U, F>): Result<U, E | F> {
    return this as unknown as _ErrImpl<U, E>;
  }

  public orElse<F>(f: (error: E) => Result<T, F>): Result<T, F> {
    return f(this.error);
  }

  public unwrapOr<U>(defaultValue: U): T | U {
    return defaultValue;
  }

  public unwrapOrElse<U>(f: (error: E) => U): T | U {
    return f(this.error);
  }

  public unwrapErr(): E {
    return this.error;
  }

  public unsafeUnwrap(): never {
    throw new PanicException('Called unsafeUnwrap on an Err value');
  }

  public unsafeUnwrapErr(): E {
    return this.error;
  }

  public tap(_f: (value: T) => void): Err<T, E> {
    return this;
  }

  public tapErr(f: (error: E) => void): Err<T, E> {
    f(this.error);
    return this;
  }

  public match<U>(handlers: ResultHandlers<T, E, U>): U {
    return handlers.Err(this.error);
  }

  public toJSON(): ErrLike<E> {
    return { kind: 'Err', error: this.error };
  }
}
// #endregion
// ───────────────────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────────────────
// #region Factory Functions
/**
 * Creates a successful {@link Result}. By default the error channel is
 * typed as `never`; supply the `E` type argument explicitly when you
 * want to widen it for downstream unification.
 *
 * @example
 * ```ts
 * Ok(42);                // Ok<number, never>
 * Ok<number, string>(1); // Ok<number, string>
 * ```
 */
export function Ok<T>(value: T): Ok<T, never>;
export function Ok<T, E>(value: T): Ok<T, E>;
export function Ok<T, E = never>(value: T): Ok<T, E> {
  return new _OkImpl(value);
}

/**
 * Creates a failed {@link Result}. By default the success channel is
 * typed as `never`; supply the `T` type argument explicitly when you
 * want to widen it for downstream unification.
 *
 * @example
 * ```ts
 * Err("NOT_FOUND");              // Err<never, string>
 * Err<number, string>("x");      // Err<number, string>
 * ```
 */
export function Err<E>(error: E): Err<never, E>;
export function Err<T, E>(error: E): Err<T, E>;
export function Err<T = never, E = unknown>(error: E): Err<T, E> {
  return new _ErrImpl(error);
}
// #endregion

// ───────────────────────────────────────────────────────────────────────────────
// #region Result Namespace

export const Result = {
  // Factories
  Ok,
  Err,

  /**
   * Wraps a nullable value in a {@link Result}. Returns {@link Ok} if
   * the value is non-null/undefined, {@link Err} with the provided
   * error otherwise.
   *
   * @example
   *
   * ```ts
   * const port = Result.fromNullable(process.env.PORT, 'PORT not set');
   * // Result<string, string>
   * ```
   */
  fromNullable<T, E>(
    value: T | null | undefined,
    error: E,
  ): Result<NonNullable<T>, E> {
    return value !== null && value !== undefined
      ? new _OkImpl(value)
      : new _ErrImpl(error);
  },

  /**
   * Runs `f` and captures any thrown value into an {@link Err}.
   * {@link PanicException} is never swallowed — it re-throws, because
   * panics indicate programmer error, not a recoverable failure.
   *
   * @example
   * ```ts
   * const parsed = Result.fromThrowable(
   *   () => JSON.parse(input),
   *   (e) => (e instanceof Error ? e.message : "parse-error"),
   * );
   * // Result<unknown, string>
   * ```
   */
  fromThrowable<T, E = unknown>(
    f: () => T,
    mapError?: (e: unknown) => E,
  ): Result<T, E> {
    try {
      return new _OkImpl(f());
    } catch (error: unknown) {
      if (error instanceof PanicException) throw error; // don't swallow panics
      return new _ErrImpl(mapError ? mapError(error) : (error as E));
    }
  },

  /**
   * Awaits a promise (or a thunk returning a promise) and captures
   * rejections into an {@link Err}. {@link PanicException} is re-thrown.
   *
   * @example
   * ```ts
   * const r = await Result.fromPromise(
   *   () => fetch("/api/user").then((r) => r.json()),
   *   (e) => ({ code: "NETWORK", cause: e }),
   * );
   * // Result<unknown, { code: "NETWORK"; cause: unknown }>
   * ```
   */
  async fromPromise<T, E = unknown>(
    p: Promise<T> | (() => Promise<T>),
    mapError?: (e: unknown) => E,
  ): Promise<Result<T, E>> {
    try {
      const value = await (typeof p === 'function' ? p() : p);
      return new _OkImpl(value);
    } catch (error: unknown) {
      if (error instanceof PanicException) throw error;
      return new _ErrImpl(mapError ? mapError(error) : (error as E));
    }
  },

  /**
   * Reconstructs a {@link Result} from its serialized JSON shape
   * (as produced by {@link Ok.toJSON} / {@link Err.toJSON}).
   *
   * The outer {@link Result} represents the *parse outcome*:
   * - {@link Ok} wraps the successfully reconstructed inner `Result<T, E>`.
   * - {@link Err} carries a {@link ParseResultError} describing why the
   *   input was not a valid serialized `Result`.
   *
   * Runtime validation is shallow — it only verifies the envelope
   * (`{ kind: "Ok" | "Err", value | error }`). The inner `T` / `E` payloads
   * are passed through unchecked; callers that need deeper validation should
   * combine this with a schema/validator and {@link Result.andThen}.
   *
   * @example
   * ```ts
   * const json = JSON.stringify(Result.Ok(42));
   * const parsed = Result.fromJSON<number, string>(JSON.parse(json));
   * // Ok(Ok(42))
   *
   * const bad = Result.fromJSON(JSON.parse('{"kind":"Maybe"}'));
   * // Err(ParseResultError { reason: ..., received: ... })
   * ```
   */
  fromJSON<T = unknown, E = unknown>(
    value: unknown,
  ): Result<Result<T, E>, ParseResultError> {
    if (!isRecord(value)) {
      return new _ErrImpl(
        ParseResultError.of(
          'Expected an object with a "kind" discriminant.',
          value,
        ),
      );
    }

    if (OkLike.isOfType(value)) {
      return new _OkImpl(new _OkImpl((value as OkLike<T>).value));
    }

    if (ErrLike.isOfType(value)) {
      return new _OkImpl(new _ErrImpl((value as ErrLike<E>).error));
    }

    return new _ErrImpl(
      ParseResultError.of(
        'Expected encoded Ok or Err, got a structure which cannot be resolved.',
        value,
      ),
    );
  },
  /**
   * Combines multiple {@link Result}s into a single {@link Result} of a tuple.
   *
   * - If every input is {@link Ok}, returns `Ok` of a tuple of their values,
   *   preserving element order and types.
   * - On the first {@link Err}, short-circuits and returns that error.
   *   Subsequent results are not inspected.
   *
   * @example
   * ```ts
   * const r = Result.all(
   *   Result.Ok(1),
   *   Result.Ok("hello"),
   *   Result.Ok(true),
   * );
   * // Result<[number, string, boolean], never>
   *
   * const fail = Result.all(
   *   Result.Ok(1),
   *   Result.Err("oops" as const),
   *   Result.Ok(true),   // never inspected
   * );
   * // Result<[number, string, boolean], "oops">
   * ```
   */
  all<R extends readonly Result<unknown, unknown>[]>(
    ...results: R
  ): Result<{ -readonly [K in keyof R]: InferOk<R[K]> }, InferErr<R[number]>> {
    const values: unknown[] = [];
    for (const r of results) {
      if (r.isErr()) {
        return r as Err<
          { -readonly [K in keyof R]: InferOk<R[K]> },
          InferErr<R[number]>
        >;
      }
      values.push(r.value);
    }
    return Ok(values) as Ok<
      { -readonly [K in keyof R]: InferOk<R[K]> },
      InferErr<R[number]>
    >;
  },

  /**
   * Like {@link all}, but collects all errors instead of short-circuiting.
   *
   * - If every input is {@link Ok}, returns `Ok` of the tuple.
   * - If any input is {@link Err}, returns `Err` containing an array of
   *   all errors in the order they occurred.
   *
   * @example
   * ```ts
   * Result.allSettled(
   *   Result.Err("A" as const),
   *   Result.Ok(1),
   *   Result.Err("B" as const),
   * );
   * // Err(["A", "B"])
   *
   * Result.allSettled(Result.Ok(1), Result.Ok(2));
   * // Ok([1, 2])
   * ```
   */
  allSettled<R extends readonly Result<unknown, unknown>[]>(
    ...results: R
  ): Result<
    { -readonly [K in keyof R]: InferOk<R[K]> },
    InferErr<R[number]>[]
  > {
    const values: unknown[] = [];
    const errors: unknown[] = [];
    for (const r of results) {
      if (r.isErr()) {
        errors.push(r.error);
      } else {
        values.push(r.value);
      }
    }
    return errors.length === 0
      ? (Ok(values) as Ok<
          { -readonly [K in keyof R]: InferOk<R[K]> },
          InferErr<R[number]>[]
        >)
      : (Err(errors) as Err<
          { -readonly [K in keyof R]: InferOk<R[K]> },
          InferErr<R[number]>[]
        >);
  },

  /**
   * Combines a record of named {@link Result}s into a single Result of
   * a record of their values.
   *
   * @example
   * ```ts
   * const r = Result.allRecord({
   *   name: validateName(input),
   *   email: validateEmail(input),
   * });
   * // Result<{ name: Name; email: Email }, NameError | EmailError>
   * ```
   */
  allRecord<R extends Readonly<Record<string, Result<unknown, unknown>>>>(
    results: R,
  ): Result<{ -readonly [K in keyof R]: InferOk<R[K]> }, InferErr<R[keyof R]>> {
    const entries: Record<string, unknown> = {};
    for (const key in results) {
      const r = results[key];
      if (r.isErr()) {
        return r as Err<
          { -readonly [K in keyof R]: InferOk<R[K]> },
          InferErr<R[keyof R]>
        >;
      }
      entries[key] = r.value;
    }
    return Ok(entries) as Ok<
      { -readonly [K in keyof R]: InferOk<R[K]> },
      InferErr<R[keyof R]>
    >;
  },

  /**
   * Type-guard that checks whether an unknown value is a {@link Result}
   * (either {@link Ok} or {@link Err}). Relies on an internal symbol
   * that is set on every Result instance.
   *
   * @example
   * ```ts
   * Result.isResult(Result.Ok(1));          // true
   * Result.isResult({ kind: "Ok", value: 1 }); // false — plain object, not an instance
   * Result.isResult(null);                  // false
   * ```
   */
  isResult(value: unknown): value is Result<unknown, unknown> {
    return (
      isRecord(value) && resultSymbol in value && value[resultSymbol] === true
    );
  },

  /**
   * Data-first type-guard for {@link Ok}. Equivalent to `r.isOk()`.
   *
   * @example
   * ```ts
   * declare const r: Result<number, string>;
   * if (Result.isOk(r)) {
   *   r.value; // number
   * }
   * ```
   */
  isOk<T, E>(value: Result<T, E>): value is Ok<T, E> {
    return value.isOk();
  },

  /**
   * Data-first type-guard for {@link Err}. Equivalent to `r.isErr()`.
   *
   * @example
   * ```ts
   * declare const r: Result<number, string>;
   * if (Result.isErr(r)) {
   *   r.error; // string
   * }
   * ```
   */
  isErr<T, E>(value: Result<T, E>): value is Err<T, E> {
    return value.isErr();
  },

  /**
   * Data-first version of {@link Ok.unsafeUnwrap}. Panics on an {@link Err}.
   *
   * @throws {PanicException} If called on an `Err`.
   *
   * @example
   * ```ts
   * Result.unsafeUnwrap(Result.Ok(1));  // 1
   * Result.unsafeUnwrap(Result.Err(0)); // throws PanicException
   * ```
   */
  unsafeUnwrap<T, E>(value: Result<T, E>): T {
    return value.unsafeUnwrap();
  },

  /**
   * Data-first version of {@link Err.unsafeUnwrapErr}. Panics on an {@link Ok}.
   *
   * @throws {PanicException} If called on an `Ok`.
   *
   * @example
   * ```ts
   * Result.unsafeUnwrapErr(Result.Err("x")); // "x"
   * Result.unsafeUnwrapErr(Result.Ok(1));    // throws PanicException
   * ```
   */
  unsafeUnwrapErr<T, E>(value: Result<T, E>): E {
    return value.unsafeUnwrapErr();
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Data-last (curried) operators — designed for `pipe` / `flow` composition.
  // Each returns a function awaiting the `Result` as its last argument.
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Data-last {@link Ok.map}. Transforms the success value.
   *
   * @example
   * ```ts
   * pipe(Result.Ok(2), Result.map((n) => n * 10));
   * // Ok(20)
   * ```
   */
  map<T, U>(f: (value: T) => U): <E>(r: Result<T, E>) => Result<U, E> {
    return (r) => r.map(f);
  },

  /**
   * Data-last {@link Err.mapErr}. Transforms the error value.
   *
   * @example
   * ```ts
   * pipe(
   *   Result.Err("NOT_FOUND"),
   *   Result.mapErr((code) => ({ code })),
   * );
   * // Err({ code: "NOT_FOUND" })
   * ```
   */
  mapErr<E, F>(f: (error: E) => F): <T>(r: Result<T, E>) => Result<T, F> {
    return (r) => r.mapErr(f);
  },

  /**
   * Data-last {@link Ok.mapOr}. Folds to `U` using either a default
   * (for `Err`) or a mapping function (for `Ok`).
   *
   * @example
   * ```ts
   * pipe(Result.Ok(3), Result.mapOr(0, (n: number) => n * 2));
   * // 6
   * ```
   */
  mapOr<T, U>(defaultValue: U, f: (value: T) => U): <E>(r: Result<T, E>) => U {
    return (r) => r.mapOr(defaultValue, f);
  },

  /**
   * Data-last {@link Ok.mapOrElse}. Folds both branches to `U`.
   *
   * @example
   * ```ts
   * pipe(
   *   Result.Err("boom"),
   *   Result.mapOrElse(
   *     (e: string) => `fallback:${e}`,
   *     (n: number) => `value:${n}`,
   *   ),
   * );
   * // "fallback:boom"
   * ```
   */
  mapOrElse<T, E, U>(
    defaultFn: (error: E) => U,
    f: (value: T) => U,
  ): (r: Result<T, E>) => U {
    return (r) => r.mapOrElse(defaultFn, f);
  },

  /**
   * Data-last {@link Ok.andThen}. Chains a fallible step; error types
   * accumulate as a union.
   *
   * @example
   * ```ts
   * const parse = (s: string): Result<number, "NaN"> =>
   *   Number.isNaN(Number(s)) ? Result.Err("NaN") : Result.Ok(Number(s));
   *
   * pipe(Result.Ok("42"), Result.andThen(parse));
   * // Ok(42)
   * ```
   */
  andThen<T, U, F>(
    f: (value: T) => Result<U, F>,
  ): <E>(r: Result<T, E>) => Result<U, E | F> {
    return (r) => r.andThen(f);
  },

  /**
   * Data-last {@link Err.orElse}. Recovers from an `Err` by producing
   * another {@link Result}.
   *
   * @example
   * ```ts
   * pipe(
   *   Result.Err("boom"),
   *   Result.orElse((_e) => Result.Ok(0)),
   * );
   * // Ok(0)
   * ```
   */
  orElse<T, E, F>(
    f: (error: E) => Result<T, F>,
  ): (r: Result<T, E>) => Result<T, F> {
    return (r) => r.orElse(f);
  },

  /**
   * Data-last {@link Ok.unwrapOr}. Terminates the pipeline, returning
   * either the success value or the provided default.
   *
   * @example
   * ```ts
   * pipe(Result.Err("x"), Result.unwrapOr(0)); // 0
   * pipe(Result.Ok(1),    Result.unwrapOr(0)); // 1
   * ```
   */
  unwrapOr<T, U>(defaultValue: U): <E>(r: Result<T, E>) => T | U {
    return (r) => r.unwrapOr(defaultValue);
  },

  /**
   * Data-last {@link Ok.unwrapOrElse}. Terminates the pipeline, computing
   * the fallback lazily from the error on `Err`.
   *
   * @example
   * ```ts
   * pipe(
   *   Result.Err("boom"),
   *   Result.unwrapOrElse((e) => `recovered:${e}`),
   * );
   * // "recovered:boom"
   * ```
   */
  unwrapOrElse<T, E, U>(f: (error: E) => U): (r: Result<T, E>) => T | U {
    return (r) => r.unwrapOrElse(f);
  },

  /**
   * Data-last {@link Ok.tap}. Runs a side-effect on the success value
   * and passes the {@link Result} through unchanged.
   *
   * @example
   * ```ts
   * pipe(
   *   Result.Ok(1),
   *   Result.tap((n) => console.log("got", n)),
   * );
   * // logs "got 1", returns Ok(1)
   * ```
   */
  tap<T>(f: (value: T) => void): <E>(r: Result<T, E>) => Result<T, E> {
    return (r) => r.tap(f);
  },

  /**
   * Data-last {@link Err.tapErr}. Runs a side-effect on the error value
   * and passes the {@link Result} through unchanged.
   *
   * @example
   * ```ts
   * pipe(
   *   Result.Err("boom"),
   *   Result.tapErr((e) => console.error(e)),
   * );
   * // logs "boom", returns Err("boom")
   * ```
   */
  tapErr<E>(f: (error: E) => void): <T>(r: Result<T, E>) => Result<T, E> {
    return (r) => r.tapErr(f);
  },

  /**
   * Data-last {@link Ok.match}. Exhaustive pattern match that terminates
   * the pipeline.
   *
   * @example
   * ```ts
   * pipe(
   *   Result.Ok(1),
   *   Result.match({
   *     Ok:  (n) => `ok:${n}`,
   *     Err: (e) => `err:${e}`,
   *   }),
   * );
   * // "ok:1"
   * ```
   */
  match<T, E, U>(handlers: ResultHandlers<T, E, U>): (r: Result<T, E>) => U {
    return (r) => r.match(handlers);
  },
} as const;
// #endregion
// ───────────────────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────────────────
// #region Asserts
/**
 * Asserts that `value` is an {@link Ok}. After a successful call, the
 * compiler narrows `value` to `Ok<T, E>` in the surrounding scope.
 *
 * Intended for tests and invariant checks; for runtime branching
 * prefer {@link Ok.isOk} or {@link Result.match}.
 *
 * @throws {PanicException} If the Result is `null` or `undefined`.
 * @throws {AssertException} If the Result is not an `Ok`.
 *
 * @example
 * ```ts
 * const r: Result<number, string> = Result.Ok(1);
 * assertOk(r);
 * r.value; // number — narrowed
 * ```
 */
export function assertOk<T, E>(
  value: Result<T, E>,
  message = 'Expected an Ok result but got an Err result.',
): asserts value is Ok<T, E> {
  assertDefined(value, 'Expected a Result value, but got null or undefined.');
  assert(value.isOk(), message);
}

/**
 * Asserts that `value` is an {@link Err}. After a successful call, the
 * compiler narrows `value` to `Err<T, E>` in the surrounding scope.
 *
 * Intended for tests and invariant checks; for runtime branching
 * prefer {@link Err.isErr} or {@link Result.match}.
 *
 * @throws {PanicException} If the Result is `null` or `undefined`.
 * @throws {AssertException} If the Result is not an `Err`.
 *
 * @example
 * ```ts
 * const r: Result<number, string> = Result.Err("boom");
 * assertErr(r);
 * r.error; // string — narrowed
 * ```
 */
export function assertErr<T, E>(
  value: Result<T, E>,
  message = 'Expected an Err result but got an Ok result.',
): asserts value is Err<T, E> {
  assertDefined(value, 'Expected a Result value, but got null or undefined.');
  assert(value.isErr(), message);
}

// #endregion
// ───────────────────────────────────────────────────────────────────────────────
