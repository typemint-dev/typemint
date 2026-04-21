import {
  assert,
  assertDefined,
  isRecord,
  Kind,
  PanicException,
} from '@typemint/core';
import {
  Err,
  Ok,
  type Err as ErrType,
  type Ok as OkType,
  type Result,
} from './result.js';

const optionSymbol = Symbol.for('typemint.option');

// ───────────────────────────────────────────────────────────────────────────────
// #region Handler Type

/**
 * Exhaustive handler set for pattern-matching an {@link Option}.
 *
 * Both branches must return the same type `U`, which becomes the result
 * of {@link Option.match}.
 *
 * @example
 * ```ts
 * const message = option.match({
 *   Some: (value) => `Got ${value}`,
 *   None: () => "nothing",
 * });
 * ```
 */
export type OptionHandlers<T, U> = {
  readonly Some: (value: T) => U;
  readonly None: () => U;
};
// #endregion

// ───────────────────────────────────────────────────────────────────────────────
// #region SomeLike Type
/**
 * Plain-object shape of a {@link Some}, without methods.
 *
 * Produced by {@link Some.toJSON} and accepted by {@link Option.fromJSON}.
 * Useful for serialization, logging, and any context where a `Some` instance
 * must be represented as data only.
 *
 * @example
 * ```ts
 * const serialized: SomeLike<number> = { kind: "Some", value: 42 };
 * const option = Option.fromJSON<number>(serialized);
 * // Ok(Some(42))
 * ```
 */
export type SomeLike<T> = { kind: 'Some'; value: T };
export const SomeLike = {
  /**
   * Structural type-guard for {@link SomeLike}. Performs a shallow
   * envelope check — the inner `value` is not validated.
   *
   * @example
   * ```ts
   * SomeLike.isOfType({ kind: "Some", value: 1 });  // true
   * SomeLike.isOfType({ kind: "None" });             // false
   * SomeLike.isOfType(null);                         // false
   * ```
   */
  isOfType(value: unknown): value is SomeLike<unknown> {
    return isRecord(value) && value.kind === 'Some' && 'value' in value;
  },
} as const;
// #endregion
// ───────────────────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────────────────
// #region NoneLike Type
/**
 * Plain-object shape of a {@link None}, without methods.
 *
 * Produced by {@link None.toJSON} and accepted by {@link Option.fromJSON}.
 *
 * @example
 * ```ts
 * const serialized: NoneLike = { kind: "None" };
 * Option.fromJSON(serialized);
 * // Ok(None())
 * ```
 */
export type NoneLike = { kind: 'None' };
export const NoneLike = {
  /**
   * Structural type-guard for {@link NoneLike}.
   *
   * @example
   * ```ts
   * NoneLike.isOfType({ kind: "None" });             // true
   * NoneLike.isOfType({ kind: "Some", value: 1 });   // false
   * ```
   */
  isOfType(value: unknown): value is NoneLike {
    return isRecord(value) && value.kind === 'None';
  },
} as const;
// #endregion
// ───────────────────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────────────────
// #region OptionLike Type
/**
 * Plain-object form of an {@link Option}. A union of {@link SomeLike} and
 * {@link NoneLike}. Suitable for transport (JSON, message queues, logs).
 *
 * @example
 * ```ts
 * const data: OptionLike<number> = { kind: "Some", value: 1 };
 * ```
 */
export type OptionLike<T> = SomeLike<T> | NoneLike;
export const OptionLike = {
  /**
   * Structural type-guard for {@link OptionLike} — matches either a
   * {@link SomeLike} or {@link NoneLike} envelope.
   *
   * @example
   * ```ts
   * OptionLike.isOfType({ kind: "Some", value: 1 }); // true
   * OptionLike.isOfType({ kind: "None" });            // true
   * OptionLike.isOfType({ kind: "Ok" });              // false
   * ```
   */
  isOfType(value: unknown): value is OptionLike<unknown> {
    return SomeLike.isOfType(value) || NoneLike.isOfType(value);
  },
} as const;
// #endregion
// ───────────────────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────────────────
// #region Some Type
/**
 * Present variant of an {@link Option}.
 *
 * Carries a `value` of type `T`. The phantom error-channel type is retained
 * across combinators so `Some` and `None` can be combined in the same
 * expression without loss of type information.
 *
 * @example
 * ```ts
 * const o: Some<number> = Option.Some(42);
 * o.value;      // 42
 * o.unwrap();   // 42
 * o.isSome();   // true
 * ```
 */
export type Some<T> = Kind<'Some'> & {
  readonly value: T;

  // Methods
  /**
   * Returns `true` and narrows the type to {@link Some}.
   *
   * @example
   * ```ts
   * declare const o: Option<number>;
   * if (o.isSome()) {
   *   o.value; // number
   * }
   * ```
   */
  isSome(): this is Some<T>;

  /**
   * Returns `false` on a {@link Some}.
   *
   * @example
   * ```ts
   * Option.Some(1).isNone(); // false
   * ```
   */
  isNone(): this is None<T>;

  /**
   * Transforms the present value.
   *
   * @example
   * ```ts
   * Option.Some(2).map((n) => n * 10);
   * // Some(20)
   * ```
   */
  map<U>(f: (value: T) => U): Some<U>;

  /**
   * Applies `f` to the present value and returns the result.
   * The `defaultValue` is ignored.
   *
   * @example
   * ```ts
   * Option.Some(3).mapOr(0, (n) => n * 2); // 6
   * Option.None<number>().mapOr(0, (n) => n * 2); // 0
   * ```
   */
  mapOr<U>(defaultValue: U, f: (value: T) => U): U;

  /**
   * Applies `f` to the present value and returns the result.
   * The `defaultFn` is ignored.
   *
   * @example
   * ```ts
   * Option.Some(3).mapOrElse(
   *   () => "nothing",
   *   (n) => `value: ${n}`,
   * );
   * // "value: 3"
   * ```
   */
  mapOrElse<U>(defaultFn: () => U, f: (value: T) => U): U;

  /**
   * Calls `f` with the present value and returns its result.
   *
   * @example
   * ```ts
   * const parse = (s: string): Option<number> =>
   *   Number.isNaN(Number(s)) ? Option.None() : Option.Some(Number(s));
   *
   * Option.Some("42").andThen(parse);
   * // Some(42)
   * ```
   */
  andThen<U>(f: (value: T) => Option<U>): Option<U>;

  /**
   * No-op on {@link Some} — returns self.
   *
   * @example
   * ```ts
   * Option.Some(1).orElse(() => Option.Some(99));
   * // Some(1)  — fallback never evaluated
   * ```
   */
  orElse(f: () => Option<T>): Some<T>;

  /**
   * Returns `None` if `predicate` returns `false`, otherwise returns self.
   *
   * @example
   * ```ts
   * Option.Some(4).filter((n) => n % 2 === 0); // Some(4)
   * Option.Some(3).filter((n) => n % 2 === 0); // None()
   * ```
   */
  filter(predicate: (value: T) => boolean): Option<T>;

  /**
   * Combines two `Some` values into a `Some` of a tuple.
   * Returns `None` if `other` is `None`.
   *
   * @example
   * ```ts
   * Option.Some(1).zip(Option.Some("a")); // Some([1, "a"])
   * Option.Some(1).zip(Option.None());    // None()
   * ```
   */
  zip<U>(other: Option<U>): Option<[T, U]>;

  /**
   * Returns the present value. Available on {@link Some} only — call
   * `isSome()` first to narrow, or use {@link unsafeUnwrap} to opt out
   * of the narrowing requirement.
   *
   * @example
   * ```ts
   * declare const o: Option<number>;
   * if (o.isSome()) {
   *   const value = o.unwrap(); // number
   * }
   * ```
   */
  unwrap(): T;

  /**
   * Returns the present value, ignoring the default.
   *
   * @example
   * ```ts
   * Option.Some(1).unwrapOr(0); // 1
   * ```
   */
  unwrapOr<U>(defaultValue: U): T | U;

  /**
   * Returns the present value, ignoring the fallback function.
   *
   * @example
   * ```ts
   * Option.Some(1).unwrapOrElse(() => 0); // 1
   * ```
   */
  unwrapOrElse<U>(f: () => U): T | U;

  /**
   * Returns the present value without requiring prior type narrowing.
   * Prefer {@link unwrap} after an `isSome()` check.
   *
   * @example
   * ```ts
   * Option.Some(1).unsafeUnwrap(); // 1
   * ```
   */
  unsafeUnwrap(): T;

  /**
   * Calls `f` with the present value for side effects, then returns self.
   *
   * @example
   * ```ts
   * Option.Some(1).tap((n) => console.log("got", n));
   * // logs "got 1", returns Some(1)
   * ```
   */
  tap(f: (value: T) => void): Some<T>;

  /**
   * No-op on {@link Some} — returns self, `f` is not called.
   *
   * @example
   * ```ts
   * Option.Some(1).tapNone(() => console.log("empty"));
   * // Some(1); callback never runs
   * ```
   */
  tapNone(f: () => void): Some<T>;

  /**
   * Calls the `Some` handler with the present value and returns its result.
   *
   * @example
   * ```ts
   * Option.Some(1).match({
   *   Some: (n) => `some:${n}`,
   *   None: () => "none",
   * });
   * // "some:1"
   * ```
   */
  match<U>(handlers: OptionHandlers<T, U>): U;

  /**
   * Returns a JSON-serializable representation of the `Some` variant.
   * Called automatically by {@link JSON.stringify}.
   *
   * Only strips methods — it does not convert non-JSON-safe payload
   * values (e.g. `bigint`, `Date`, `Temporal.*`). Pair with a codec
   * for that.
   *
   * @example
   * ```ts
   * JSON.stringify(Option.Some(42));
   * // '{"kind":"Some","value":42}'
   *
   * Option.Some(42).toJSON();
   * // { kind: "Some", value: 42 }
   * ```
   */
  toJSON(): SomeLike<T>;

  /**
   * Converts this `Some` into an {@link Ok}. The `error` argument is
   * accepted for call-site symmetry with {@link None.toResult} but is
   * never used.
   *
   * @example
   * ```ts
   * Option.Some(1).toResult("NOT_FOUND");
   * // Ok(1)
   * ```
   */
  toResult<E>(error: E): OkType<T, E>;
};
// #endregion
// ───────────────────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────────────────
// #region None Type
/**
 * Absent variant of an {@link Option}.
 *
 * Carries no value. The phantom type `T` is retained so `None<T>` can be
 * combined with `Some<T>` in a single `Option<T>` union without loss of
 * type information.
 *
 * @example
 * ```ts
 * const o: None<number> = Option.None();
 * o.isNone();   // true
 * o.isSome();   // false
 * ```
 */
export type None<T = never> = Kind<'None'> & {
  // Methods
  /**
   * Returns `false` on a {@link None}.
   *
   * @example
   * ```ts
   * Option.None().isSome(); // false
   * ```
   */
  isSome(): this is Some<T>;

  /**
   * Returns `true` and narrows the type to {@link None}.
   *
   * @example
   * ```ts
   * declare const o: Option<number>;
   * if (o.isNone()) {
   *   // o is None<number>
   * }
   * ```
   */
  isNone(): this is None<T>;

  /**
   * No-op on {@link None} — returns self with the value type recast.
   *
   * @example
   * ```ts
   * Option.None<number>().map((n) => n * 2);
   * // None()
   * ```
   */
  map<U>(f: (value: T) => U): None<U>;

  /**
   * Returns `defaultValue`; `f` is not called.
   *
   * @example
   * ```ts
   * Option.None<number>().mapOr(0, (n) => n * 2); // 0
   * ```
   */
  mapOr<U>(defaultValue: U, f: (value: T) => U): U;

  /**
   * Calls `defaultFn` and returns the result; `f` is not called.
   *
   * @example
   * ```ts
   * Option.None<number>().mapOrElse(
   *   () => "nothing",
   *   (n) => `value: ${n}`,
   * );
   * // "nothing"
   * ```
   */
  mapOrElse<U>(defaultFn: () => U, f: (value: T) => U): U;

  /**
   * No-op on {@link None} — returns self with the value type recast.
   *
   * @example
   * ```ts
   * Option.None<string>().andThen((s) => Option.Some(s.length));
   * // None()
   * ```
   */
  andThen<U>(f: (value: T) => Option<U>): None<U>;

  /**
   * Calls `f` and returns its result.
   *
   * @example
   * ```ts
   * Option.None<number>().orElse(() => Option.Some(0));
   * // Some(0)
   * ```
   */
  orElse(f: () => Option<T>): Option<T>;

  /**
   * No-op on {@link None} — always returns self.
   *
   * @example
   * ```ts
   * Option.None<number>().filter((n) => n > 0); // None()
   * ```
   */
  filter(predicate: (value: T) => boolean): None<T>;

  /**
   * Always returns `None` — there is no value to pair.
   *
   * @example
   * ```ts
   * Option.None<number>().zip(Option.Some("a")); // None()
   * ```
   */
  zip<U>(other: Option<U>): None<[T, U]>;

  /**
   * Returns `defaultValue`, since self is a {@link None}.
   *
   * @example
   * ```ts
   * Option.None<number>().unwrapOr(0); // 0
   * ```
   */
  unwrapOr<U>(defaultValue: U): T | U;

  /**
   * Calls `f` to compute a fallback value.
   *
   * @example
   * ```ts
   * Option.None<number>().unwrapOrElse(() => 42); // 42
   * ```
   */
  unwrapOrElse<U>(f: () => U): T | U;

  /**
   * Always panics on {@link None}, since there is no value.
   *
   * @throws {PanicException} Always, when called on a `None`.
   *
   * @example
   * ```ts
   * Option.None().unsafeUnwrap();
   * // throws PanicException("Called unsafeUnwrap on a None value")
   * ```
   */
  unsafeUnwrap(): never;

  /**
   * No-op on {@link None} — returns self, `f` is not called.
   *
   * @example
   * ```ts
   * Option.None<number>().tap((n) => console.log(n));
   * // None(); callback never runs
   * ```
   */
  tap(f: (value: T) => void): None<T>;

  /**
   * Calls `f` for side effects, then returns self.
   *
   * @example
   * ```ts
   * Option.None().tapNone(() => console.log("empty"));
   * // logs "empty", returns None()
   * ```
   */
  tapNone(f: () => void): None<T>;

  /**
   * Calls the `None` handler and returns its result.
   *
   * @example
   * ```ts
   * Option.None<number>().match({
   *   Some: (n) => `some:${n}`,
   *   None: () => "none",
   * });
   * // "none"
   * ```
   */
  match<U>(handlers: OptionHandlers<T, U>): U;

  /**
   * Returns a JSON-serializable representation of the `None` variant.
   * Called automatically by {@link JSON.stringify}.
   *
   * @example
   * ```ts
   * JSON.stringify(Option.None());
   * // '{"kind":"None"}'
   *
   * Option.None().toJSON();
   * // { kind: "None" }
   * ```
   */
  toJSON(): NoneLike;

  /**
   * Converts this `None` into an {@link Err} carrying the provided `error`.
   *
   * @example
   * ```ts
   * Option.None<number>().toResult("NOT_FOUND");
   * // Err("NOT_FOUND")
   * ```
   */
  toResult<E>(error: E): ErrType<T, E>;
};
// #endregion
// ───────────────────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────────────────
// #region Option Type
/**
 * Tagged union of {@link Some} and {@link None}.
 *
 * Use `isSome()` / `isNone()` to narrow, or {@link match} for exhaustive
 * handling.
 *
 * @example
 * ```ts
 * function findUser(id: string): Option<User> {
 *   const user = db.find(id);
 *   return user !== null ? Option.Some(user) : Option.None();
 * }
 *
 * const o = findUser("42");
 * if (o.isSome()) {
 *   o.value; // User
 * }
 * ```
 */
export type Option<T> = Some<T> | None<T>;

/**
 * Extracts the value type `T` from a {@link Some}-like value.
 *
 * @example
 * ```ts
 * type O = Option<number>;
 * type V = InferSome<O>; // number
 * ```
 */
export type InferSome<T> = T extends Some<infer U> ? U : never;
// #endregion
// ───────────────────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────────────────
// #region ParseOptionError Type
/**
 * Structured error produced by {@link Option.fromJSON} when the input
 * does not match the expected serialized shape of an {@link Option}.
 *
 * Tagged via the {@link Kind} convention so it can be distinguished
 * from user-level errors in mixed error channels.
 *
 * @example
 * ```ts
 * const parsed = Option.fromJSON("not an object");
 * if (parsed.isErr()) {
 *   parsed.error.kind;     // "ParseOptionError"
 *   parsed.error.reason;   // human-readable description
 *   parsed.error.received; // original unknown input
 * }
 * ```
 */
export type ParseOptionError = Kind<'ParseOptionError'> & {
  readonly reason: string;
  readonly received: unknown;
};

export const ParseOptionError = {
  /**
   * Constructs a {@link ParseOptionError}.
   *
   * @example
   * ```ts
   * ParseOptionError.of("Expected object", null);
   * // { kind: "ParseOptionError", reason: "Expected object", received: null }
   * ```
   */
  of(reason: string, received: unknown): ParseOptionError {
    return {
      ...Kind.of('ParseOptionError'),
      reason,
      received,
    };
  },

  /**
   * Type-guard for {@link ParseOptionError}. Checks the `kind` discriminant.
   *
   * @example
   * ```ts
   * ParseOptionError.isOfType(ParseOptionError.of("x", null)); // true
   * ParseOptionError.isOfType({ kind: "Other" });              // false
   * ```
   */
  isOfType(value: unknown): value is ParseOptionError {
    return isRecord(value) && Kind.isOf(value, 'ParseOptionError');
  },
} as const;
// #endregion

// ───────────────────────────────────────────────────────────────────────────────
// #MARK Implementations
// ───────────────────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────────────────
// #region Some Implementation
class _SomeImpl<T> implements Some<T> {
  readonly kind = 'Some' as const;

  public readonly [optionSymbol] = true;

  constructor(public readonly value: T) {}

  public isSome(): this is Some<T> {
    return true;
  }

  public isNone(): this is None<T> {
    return false;
  }

  public map<U>(f: (value: T) => U): Some<U> {
    return new _SomeImpl(f(this.value));
  }

  public mapOr<U>(_defaultValue: U, f: (value: T) => U): U {
    return f(this.value);
  }

  public mapOrElse<U>(_defaultFn: () => U, f: (value: T) => U): U {
    return f(this.value);
  }

  public andThen<U>(f: (value: T) => Option<U>): Option<U> {
    return f(this.value);
  }

  public orElse(_f: () => Option<T>): Some<T> {
    return this;
  }

  public filter(predicate: (value: T) => boolean): Option<T> {
    return predicate(this.value) ? this : new _NoneImpl<T>();
  }

  public zip<U>(other: Option<U>): Option<[T, U]> {
    return other.isSome()
      ? new _SomeImpl<[T, U]>([this.value, other.value])
      : new _NoneImpl<[T, U]>();
  }

  public unwrap(): T {
    return this.value;
  }

  public unwrapOr<U>(_defaultValue: U): T | U {
    return this.value;
  }

  public unwrapOrElse<U>(_f: () => U): T | U {
    return this.value;
  }

  public unsafeUnwrap(): T {
    return this.value;
  }

  public tap(f: (value: T) => void): Some<T> {
    f(this.value);
    return this;
  }

  public tapNone(_f: () => void): Some<T> {
    return this;
  }

  public match<U>(handlers: OptionHandlers<T, U>): U {
    return handlers.Some(this.value);
  }

  public toJSON(): SomeLike<T> {
    return { kind: 'Some', value: this.value };
  }

  public toResult<E>(_error: E): OkType<T, E> {
    return Ok(this.value);
  }
}
// #endregion
// ───────────────────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────────────────
// #region None Implementation
class _NoneImpl<T> implements None<T> {
  readonly kind = 'None' as const;

  public readonly [optionSymbol] = true;

  public isSome(): this is Some<T> {
    return false;
  }

  public isNone(): this is None<T> {
    return true;
  }

  public map<U>(_f: (value: T) => U): None<U> {
    return this as unknown as _NoneImpl<U>;
  }

  public mapOr<U>(defaultValue: U, _f: (value: T) => U): U {
    return defaultValue;
  }

  public mapOrElse<U>(defaultFn: () => U, _f: (value: T) => U): U {
    return defaultFn();
  }

  public andThen<U>(_f: (value: T) => Option<U>): None<U> {
    return this as unknown as _NoneImpl<U>;
  }

  public orElse(f: () => Option<T>): Option<T> {
    return f();
  }

  public filter(_predicate: (value: T) => boolean): None<T> {
    return this;
  }

  public zip<U>(_other: Option<U>): None<[T, U]> {
    return this as unknown as _NoneImpl<[T, U]>;
  }

  public unwrapOr<U>(defaultValue: U): T | U {
    return defaultValue;
  }

  public unwrapOrElse<U>(f: () => U): T | U {
    return f();
  }

  public unsafeUnwrap(): never {
    throw new PanicException('Called unsafeUnwrap on a None value');
  }

  public tap(_f: (value: T) => void): None<T> {
    return this;
  }

  public tapNone(f: () => void): None<T> {
    f();
    return this;
  }

  public match<U>(handlers: OptionHandlers<T, U>): U {
    return handlers.None();
  }

  public toJSON(): NoneLike {
    return { kind: 'None' };
  }

  public toResult<E>(error: E): ErrType<T, E> {
    return Err(error);
  }
}
// #endregion
// ───────────────────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────────────────
// #region Factory Functions
/**
 * Creates a present {@link Option}. By default the type parameter is
 * inferred from the value; supply it explicitly when widening is needed.
 *
 * @example
 * ```ts
 * Some(42);              // Some<number>
 * Some<number | null>(1); // Some<number | null>
 * ```
 */
export function Some<T>(value: T): Some<T> {
  return new _SomeImpl(value);
}

/**
 * Creates an absent {@link Option}. By default the value type is `never`;
 * supply the type argument explicitly or let TypeScript infer it from context.
 *
 * @example
 * ```ts
 * None();          // None<never>
 * None<number>();  // None<number>
 *
 * function find(): Option<number> {
 *   return None(); // T inferred as number from return type
 * }
 * ```
 */
export function None<T = never>(): None<T> {
  return new _NoneImpl<T>();
}
// #endregion

// ───────────────────────────────────────────────────────────────────────────────
// #region Option Namespace

export const Option = {
  // Factories
  Some,
  None,

  /**
   * Wraps a nullable value in an {@link Option}. Returns {@link Some} if
   * the value is non-null/undefined, {@link None} otherwise.
   *
   * @example
   * ```ts
   * Option.fromNullable(process.env.PORT);
   * // Option<string>
   *
   * Option.fromNullable(null);
   * // None()
   * ```
   */
  fromNullable<T>(value: T | null | undefined): Option<NonNullable<T>> {
    return value !== null && value !== undefined
      ? new _SomeImpl(value)
      : new _NoneImpl();
  },

  /**
   * Converts a {@link Result} into an {@link Option}, discarding the error.
   *
   * - {@link Ok} → {@link Some} carrying the success value.
   * - {@link Err} → {@link None}.
   *
   * @example
   * ```ts
   * import { Result } from "./result.js";
   *
   * Option.fromResult(Result.Ok(42));      // Some(42)
   * Option.fromResult(Result.Err("boom")); // None()
   * ```
   */
  fromResult<T, E>(result: Result<T, E>): Option<T> {
    return result.isOk() ? new _SomeImpl(result.value) : new _NoneImpl();
  },

  /**
   * Reconstructs an {@link Option} from its serialized JSON shape
   * (as produced by {@link Some.toJSON} / {@link None.toJSON}).
   *
   * The outer {@link Result} represents the *parse outcome*:
   * - {@link Ok} wraps the successfully reconstructed inner `Option<T>`.
   * - {@link Err} carries a {@link ParseOptionError} describing why the
   *   input was not a valid serialized `Option`.
   *
   * Runtime validation is shallow — it only verifies the envelope.
   * The inner `T` payload is passed through unchecked.
   *
   * @example
   * ```ts
   * const json = JSON.stringify(Option.Some(42));
   * const parsed = Option.fromJSON<number>(JSON.parse(json));
   * // Ok(Some(42))
   *
   * const bad = Option.fromJSON(JSON.parse('{"kind":"Ok"}'));
   * // Err(ParseOptionError { reason: ..., received: ... })
   * ```
   */
  fromJSON<T = unknown>(value: unknown): Result<Option<T>, ParseOptionError> {
    if (!isRecord(value)) {
      return Err(
        ParseOptionError.of(
          'Expected an object with a "kind" discriminant.',
          value,
        ),
      );
    }

    if (SomeLike.isOfType(value)) {
      return Ok(new _SomeImpl((value as SomeLike<T>).value));
    }

    if (NoneLike.isOfType(value)) {
      return Ok(new _NoneImpl<T>());
    }

    return Err(
      ParseOptionError.of(
        'Expected encoded Some or None, got a structure which cannot be resolved.',
        value,
      ),
    );
  },

  /**
   * Combines multiple {@link Option}s into a single {@link Option} of a tuple.
   *
   * - If every input is {@link Some}, returns `Some` of a tuple of their
   *   values, preserving element order and types.
   * - On the first {@link None}, short-circuits and returns `None`.
   *
   * @example
   * ```ts
   * Option.all(
   *   Option.Some(1),
   *   Option.Some("hello"),
   *   Option.Some(true),
   * );
   * // Some([1, "hello", true])
   *
   * Option.all(
   *   Option.Some(1),
   *   Option.None<string>(),
   *   Option.Some(true),
   * );
   * // None()
   * ```
   */
  all<O extends readonly Option<unknown>[]>(
    ...options: O
  ): Option<{ -readonly [K in keyof O]: InferSome<O[K]> }> {
    const values: unknown[] = [];
    for (const o of options) {
      if (o.isNone()) {
        return new _NoneImpl() as None<{
          -readonly [K in keyof O]: InferSome<O[K]>;
        }>;
      }
      values.push(o.value);
    }
    return new _SomeImpl(values) as Some<{
      -readonly [K in keyof O]: InferSome<O[K]>;
    }>;
  },

  /**
   * Combines a record of named {@link Option}s into a single `Option` of
   * a record of their values.
   *
   * @example
   * ```ts
   * const o = Option.allRecord({
   *   name: parseName(input),
   *   age:  parseAge(input),
   * });
   * // Option<{ name: Name; age: Age }>
   * ```
   */
  allRecord<R extends Readonly<Record<string, Option<unknown>>>>(
    options: R,
  ): Option<{ -readonly [K in keyof R]: InferSome<R[K]> }> {
    const entries: Record<string, unknown> = {};
    for (const key in options) {
      const o = options[key];
      if (o.isNone()) {
        return new _NoneImpl() as None<{
          -readonly [K in keyof R]: InferSome<R[K]>;
        }>;
      }
      entries[key] = o.value;
    }
    return new _SomeImpl(entries) as Some<{
      -readonly [K in keyof R]: InferSome<R[K]>;
    }>;
  },

  /**
   * Type-guard that checks whether an unknown value is an {@link Option}
   * (either {@link Some} or {@link None}). Relies on an internal symbol
   * that is set on every Option instance.
   *
   * @example
   * ```ts
   * Option.isOption(Option.Some(1));            // true
   * Option.isOption(Option.None());             // true
   * Option.isOption({ kind: "Some", value: 1 }); // false — plain object
   * Option.isOption(null);                      // false
   * ```
   */
  isOption(value: unknown): value is Option<unknown> {
    return (
      isRecord(value) && optionSymbol in value && value[optionSymbol] === true
    );
  },

  /**
   * Data-first type-guard for {@link Some}. Equivalent to `o.isSome()`.
   *
   * @example
   * ```ts
   * declare const o: Option<number>;
   * if (Option.isSome(o)) {
   *   o.value; // number
   * }
   * ```
   */
  isSome<T>(value: Option<T>): value is Some<T> {
    return value.isSome();
  },

  /**
   * Data-first type-guard for {@link None}. Equivalent to `o.isNone()`.
   *
   * @example
   * ```ts
   * declare const o: Option<number>;
   * if (Option.isNone(o)) {
   *   // o is None<number>
   * }
   * ```
   */
  isNone<T>(value: Option<T>): value is None<T> {
    return value.isNone();
  },

  /**
   * Data-first version of {@link Some.unsafeUnwrap}. Panics on a {@link None}.
   *
   * @throws {PanicException} If called on a `None`.
   *
   * @example
   * ```ts
   * Option.unsafeUnwrap(Option.Some(1));  // 1
   * Option.unsafeUnwrap(Option.None());   // throws PanicException
   * ```
   */
  unsafeUnwrap<T>(value: Option<T>): T {
    return value.unsafeUnwrap();
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Data-last (curried) operators — designed for `pipe` / `flow` composition.
  // Each returns a function awaiting the `Option` as its last argument.
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Data-last {@link Some.map}. Transforms the present value.
   *
   * @example
   * ```ts
   * pipe(Option.Some(2), Option.map((n) => n * 10));
   * // Some(20)
   * ```
   */
  map<T, U>(f: (value: T) => U): (o: Option<T>) => Option<U> {
    return (o) => o.map(f);
  },

  /**
   * Data-last {@link Some.mapOr}. Folds to `U` using either a default
   * (for `None`) or a mapping function (for `Some`).
   *
   * @example
   * ```ts
   * pipe(Option.Some(3), Option.mapOr(0, (n: number) => n * 2));
   * // 6
   * ```
   */
  mapOr<T, U>(defaultValue: U, f: (value: T) => U): (o: Option<T>) => U {
    return (o) => o.mapOr(defaultValue, f);
  },

  /**
   * Data-last {@link Some.mapOrElse}. Folds both branches to `U`.
   *
   * @example
   * ```ts
   * pipe(
   *   Option.None<number>(),
   *   Option.mapOrElse(
   *     () => "nothing",
   *     (n: number) => `value:${n}`,
   *   ),
   * );
   * // "nothing"
   * ```
   */
  mapOrElse<T, U>(defaultFn: () => U, f: (value: T) => U): (o: Option<T>) => U {
    return (o) => o.mapOrElse(defaultFn, f);
  },

  /**
   * Data-last {@link Some.andThen}. Chains a fallible step.
   *
   * @example
   * ```ts
   * const parse = (s: string): Option<number> =>
   *   Number.isNaN(Number(s)) ? Option.None() : Option.Some(Number(s));
   *
   * pipe(Option.Some("42"), Option.andThen(parse));
   * // Some(42)
   * ```
   */
  andThen<T, U>(f: (value: T) => Option<U>): (o: Option<T>) => Option<U> {
    return (o) => o.andThen(f);
  },

  /**
   * Data-last {@link None.orElse}. Recovers from absence by producing
   * another {@link Option}.
   *
   * @example
   * ```ts
   * pipe(
   *   Option.None<number>(),
   *   Option.orElse(() => Option.Some(0)),
   * );
   * // Some(0)
   * ```
   */
  orElse<T>(f: () => Option<T>): (o: Option<T>) => Option<T> {
    return (o) => o.orElse(f);
  },

  /**
   * Data-last {@link Some.filter}. Returns `None` if the predicate fails.
   *
   * @example
   * ```ts
   * pipe(
   *   Option.Some(4),
   *   Option.filter((n: number) => n % 2 === 0),
   * );
   * // Some(4)
   * ```
   */
  filter<T>(predicate: (value: T) => boolean): (o: Option<T>) => Option<T> {
    return (o) => o.filter(predicate);
  },

  /**
   * Data-last {@link Some.unwrapOr}. Terminates the pipeline, returning
   * either the present value or the provided default.
   *
   * @example
   * ```ts
   * pipe(Option.None<number>(), Option.unwrapOr(0)); // 0
   * pipe(Option.Some(1),        Option.unwrapOr(0)); // 1
   * ```
   */
  unwrapOr<T, U>(defaultValue: U): (o: Option<T>) => T | U {
    return (o) => o.unwrapOr(defaultValue);
  },

  /**
   * Data-last {@link None.unwrapOrElse}. Terminates the pipeline, computing
   * the fallback lazily on `None`.
   *
   * @example
   * ```ts
   * pipe(
   *   Option.None<number>(),
   *   Option.unwrapOrElse(() => 42),
   * );
   * // 42
   * ```
   */
  unwrapOrElse<T, U>(f: () => U): (o: Option<T>) => T | U {
    return (o) => o.unwrapOrElse(f);
  },

  /**
   * Data-last {@link Some.tap}. Runs a side-effect on the present value
   * and passes the {@link Option} through unchanged.
   *
   * @example
   * ```ts
   * pipe(
   *   Option.Some(1),
   *   Option.tap((n) => console.log("got", n)),
   * );
   * // logs "got 1", returns Some(1)
   * ```
   */
  tap<T>(f: (value: T) => void): (o: Option<T>) => Option<T> {
    return (o) => o.tap(f);
  },

  /**
   * Data-last {@link None.tapNone}. Runs a side-effect on absence
   * and passes the {@link Option} through unchanged.
   *
   * @example
   * ```ts
   * pipe(
   *   Option.None(),
   *   Option.tapNone(() => console.log("nothing here")),
   * );
   * // logs "nothing here", returns None()
   * ```
   */
  tapNone<T>(f: () => void): (o: Option<T>) => Option<T> {
    return (o) => o.tapNone(f);
  },

  /**
   * Data-last {@link Some.match}. Exhaustive pattern match that terminates
   * the pipeline.
   *
   * @example
   * ```ts
   * pipe(
   *   Option.Some(1),
   *   Option.match({
   *     Some: (n) => `some:${n}`,
   *     None: () => "none",
   *   }),
   * );
   * // "some:1"
   * ```
   */
  match<T, U>(handlers: OptionHandlers<T, U>): (o: Option<T>) => U {
    return (o) => o.match(handlers);
  },

  /**
   * Data-last {@link Some.toResult}. Converts an {@link Option} into a
   * {@link Result}, using `error` as the `Err` value when the option
   * is {@link None}.
   *
   * @example
   * ```ts
   * pipe(Option.Some(1),             Option.toResult("NOT_FOUND")); // Ok(1)
   * pipe(Option.None<number>(),      Option.toResult("NOT_FOUND")); // Err("NOT_FOUND")
   * ```
   */
  toResult<T, E>(error: E): (o: Option<T>) => Result<T, E> {
    return (o) => o.toResult(error);
  },
} as const;
// #endregion
// ───────────────────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────────────────
// #region Asserts
/**
 * Asserts that `value` is a {@link Some}. After a successful call, the
 * compiler narrows `value` to `Some<T>` in the surrounding scope.
 *
 * Intended for tests and invariant checks; for runtime branching
 * prefer {@link Some.isSome} or {@link Option.match}.
 *
 * @throws {PanicException} If the Option is `null` or `undefined`.
 * @throws {AssertException} If the Option is not a `Some`.
 *
 * @example
 * ```ts
 * const o: Option<number> = Option.Some(1);
 * assertSome(o);
 * o.value; // number — narrowed
 * ```
 */
export function assertSome<T>(
  value: Option<T>,
  message = 'Expected a Some option but got a None.',
): asserts value is Some<T> {
  assertDefined(value, 'Expected an Option value, but got null or undefined.');
  assert(value.isSome(), message);
}

/**
 * Asserts that `value` is a {@link None}. After a successful call, the
 * compiler narrows `value` to `None<T>` in the surrounding scope.
 *
 * Intended for tests and invariant checks; for runtime branching
 * prefer {@link None.isNone} or {@link Option.match}.
 *
 * @throws {PanicException} If the Option is `null` or `undefined`.
 * @throws {AssertException} If the Option is not a `None`.
 *
 * @example
 * ```ts
 * const o: Option<number> = Option.None();
 * assertNone(o);
 * // o is None<number> — narrowed
 * ```
 */
export function assertNone<T>(
  value: Option<T>,
  message = 'Expected a None option but got a Some.',
): asserts value is None<T> {
  assertDefined(value, 'Expected an Option value, but got null or undefined.');
  assert(value.isNone(), message);
}

// #endregion
// ───────────────────────────────────────────────────────────────────────────────
