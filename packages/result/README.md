# @typemint/result

Type-safe error handling and optional values for TypeScript.

`@typemint/result` provides two algebraic data types — `Result` and `Option` — that replace
thrown exceptions and `null`/`undefined` with explicit, composable types. Both ship with a
rich instance API, a namespace of static helpers, and a full set of data-last curried operators
designed for `pipe` / `flow` pipelines.

## Install

```bash
pnpm add @typemint/result
```

## What's Inside

| Export             | Purpose                                                             |
| ------------------ | ------------------------------------------------------------------- |
| `Result<T, E>`     | Tagged union of `Ok<T, E>` and `Err<T, E>` for fallible operations. |
| `Ok<T, E>`         | Success variant — carries a `value: T`.                             |
| `Err<T, E>`        | Failure variant — carries an `error: E`.                            |
| `Option<T>`        | Tagged union of `Some<T>` and `None<T>` for optional values.        |
| `Some<T>`          | Present variant — carries a `value: T`.                             |
| `None<T>`          | Absent variant — carries no value.                                  |
| `OkLike<T>`        | Plain-object serialization shape of `Ok`.                           |
| `ErrLike<E>`       | Plain-object serialization shape of `Err`.                          |
| `ResultLike<T, E>` | Union of `OkLike` and `ErrLike` — for transport/logging.            |
| `SomeLike<T>`      | Plain-object serialization shape of `Some`.                         |
| `NoneLike`         | Plain-object serialization shape of `None`.                         |
| `OptionLike<T>`    | Union of `SomeLike` and `NoneLike`.                                 |
| `assertOk`         | Assertion that narrows a `Result` to `Ok`.                          |
| `assertErr`        | Assertion that narrows a `Result` to `Err`.                         |
| `assertSome`       | Assertion that narrows an `Option` to `Some`.                       |
| `assertNone`       | Assertion that narrows an `Option` to `None`.                       |

---

## Two APIs: data-first and data-last

Every operation on `Result` and `Option` is exposed in two equivalent forms:

- **Data-first (instance methods)** — called as a method on the value.

  ```ts
  result.map((n) => n * 2).andThen(parse).unwrapOr(0);
  ```

- **Data-last (namespace operators)** — curried functions that take the data as their
  last argument.

  ```ts
  pipe(
    result,
    Result.map((n) => n * 2),
    Result.andThen(parse),
    Result.unwrapOr(0),
  );
  ```

Both forms produce identical results — in fact, every data-last operator is literally
defined as `(x) => x.method(...)`. The choice between them is stylistic and contextual.

### Why both?

**Data-first is better when:**

- You already have a value in hand and want a short, readable chain.
- You rely on IDE method-completion to discover what's available.
- The transformation is linear and self-contained.
- You're coming from OOP and method chaining feels natural.

```ts
// Reads top-to-bottom, left-to-right in a single expression:
const status = user
  .getProfile()
  .map((p) => p.status)
  .unwrapOr('inactive');
```

**Data-last is better when:**

- You want to build a reusable pipeline *before* you have a value to run it on.
- You're composing with other curried combinators (`flow`, `pipe`, point-free code).
- The function should be passed around as a first-class value (stored in a map,
  returned from a factory, applied to many inputs).
- You want to factor a complex pipeline into named steps without manually threading
  a parameter through each one.

```ts
// Define once, apply to many inputs — no value needed up front:
const normalize = flow(
  Option.map((s: string) => s.trim()),
  Option.filter((s) => s.length > 0),
  Option.map((s) => s.toLowerCase()),
  Option.unwrapOr('unknown'),
);

inputs.map(normalize);
```

### Trade-offs

- Data-first has **better ergonomics for inline transformations** but is **harder to
  compose point-free** — you can't easily pass `r.map` around because it loses its
  `this` binding.
- Data-last has **better composability and reuse** but requires `pipe` or `flow` to
  read naturally, and type inference occasionally needs an explicit annotation on the
  first callback (e.g. `Result.map((n: number) => ...)` when the input type isn't
  flowing in from a prior step).

There is no performance difference. Pick whichever form makes a particular call site
clearer. Mixing them in the same codebase is fine and common — use instance methods
for local work and the namespace operators when building reusable pipelines.

---

## Result

`Result<T, E>` represents the outcome of an operation that can either succeed with a value
of type `T` or fail with an error of type `E`. It is a tagged union of `Ok<T, E>` and
`Err<T, E>`.

```ts
import { Result } from '@typemint/result';

function divide(a: number, b: number): Result<number, 'DIV_BY_ZERO'> {
  return b === 0 ? Result.Err('DIV_BY_ZERO') : Result.Ok(a / b);
}

const r = divide(10, 2);

if (r.isOk()) {
  console.log(r.value); // 5
}
```

### Creating Results

```ts
// Top-level factory functions
import { Ok, Err } from '@typemint/result';

Ok(42);               // Ok<number, never>
Ok<number, string>(42); // Ok<number, string> — widen the error channel

Err('NOT_FOUND');               // Err<never, string>
Err<number, string>('NOT_FOUND'); // Err<number, string> — widen the value channel

// Or via the Result namespace
Result.Ok(42);
Result.Err('NOT_FOUND');
```

### Result — instance methods

These methods are available directly on any `Ok` or `Err` instance.

#### `isOk() / isErr()`

Runtime type-guards that also narrow the TypeScript type at the call site. Each returns
a boolean you can branch on; after a successful check the compiler treats the value as
the specific variant for the remainder of the scope, so you can access `.value` on an
`Ok` or `.error` on an `Err` without a cast. Both guards are side-effect free and
cheap to call repeatedly.

```ts
const r: Result<number, string> = Result.Ok(1);

if (r.isOk()) {
  r.value; // number — compiler narrows here
}

if (r.isErr()) {
  r.error; // string — compiler narrows here
}
```

#### `map(f)`

Apply `f` to the success value and wrap the output in a new `Ok`. On `Err` the
instance is returned as-is with the success type adjusted — `f` is **never called**,
so there's no risk of side effects firing on the failure path. Use this for pure
value transformations that can't themselves fail; if `f` might fail, use
[`andThen`](#andthenf) instead.

```ts
Result.Ok(2).map((n) => n * 10);    // Ok(20)
Result.Err('x').map((n) => n * 10); // Err('x') — f not called
```

#### `mapErr(f)`

The mirror of `map` for the error channel. Transforms the error when the Result is
`Err`; leaves `Ok` untouched. Typical uses include **normalizing errors** from several
sources into a single domain type, **enriching errors** with context (timestamps,
operation names, causal chains), or **converting library errors** into application-level
tags before they propagate further.

```ts
Result.Err('NOT_FOUND').mapErr((code) => ({ code })); // Err({ code: 'NOT_FOUND' })
Result.Ok(1).mapErr((e) => e);                        // Ok(1) — f not called
```

#### `mapOr(defaultValue, f)`

Eagerly collapses the Result to a plain value of type `U`. On `Ok`, returns `f(value)`;
on `Err`, returns `defaultValue` directly. The default is evaluated at the call site
regardless of whether it's needed, so prefer [`mapOrElse`](#maporelsedefaultfn-f) if
the default is expensive to compute or if you need access to the error to build it.

```ts
Result.Ok(3).mapOr(0, (n) => n * 2);    // 6
Result.Err('x').mapOr(0, (n) => n * 2); // 0
```

#### `mapOrElse(defaultFn, f)`

Lazy, two-branch fold. On `Ok`, returns `f(value)`; on `Err`, returns `defaultFn(error)`.
Unlike `mapOr`, the default is only computed when actually needed and has access to the
error. Use this when the fallback is expensive, when it depends on the specific failure
mode, or whenever you want the exhaustive two-branch handling of `match` but with a
single output type.

```ts
Result.Ok(3).mapOrElse(
  (e) => `err:${e}`,
  (n) => `ok:${n}`,
); // 'ok:3'
Result.Err('x').mapOrElse(
  (e) => `err:${e}`,
  (n) => `ok:${n}`,
); // 'err:x'
```

#### `andThen(f)`

Chains another fallible operation. `f` receives the success value and returns a new
`Result`, which replaces the current one. On `Err`, `f` is not called and the existing
error is returned unchanged — this is the **short-circuit** behaviour that lets you
write long chains as if everything succeeded. Error types **accumulate as a union**
across chained calls, so at the end of a pipeline the type precisely describes every
way it could have failed.

```ts
const parse = (s: string): Result<number, 'NaN'> =>
  Number.isNaN(Number(s)) ? Result.Err('NaN') : Result.Ok(Number(s));

Result.Ok('42').andThen(parse);   // Ok(42)
Result.Ok('bad').andThen(parse);  // Err('NaN')
Result.Err('x').andThen(parse);   // Err('x') — f not called
```

#### `orElse(f)`

The mirror of `andThen` for error recovery. On `Err`, calls `f(error)` and returns
its `Result` — which may itself be either `Ok` (recovery succeeded) or a different
`Err` (recovery failed, possibly with a new error type). On `Ok`, returns self
unchanged without invoking `f`. Useful for trying alternative strategies, falling back
to a cache, switching to a default path, or chaining retry logic.

```ts
Result.Err('boom').orElse((_e) => Result.Ok(0)); // Ok(0)
Result.Ok(1).orElse(() => Result.Ok(99));         // Ok(1) — f not called
```

#### `unwrap()`

Extracts the success value. Only defined on `Ok`, so the type system rejects calls on
an unnarrowed `Result` — you **must** call `isOk()` first (or use `assertOk`,
`Result.match`, etc.). This is the preferred way to extract a value because misuse is
a **compile-time** error rather than a runtime panic.

```ts
const r: Result<number, string> = Result.Ok(42);
if (r.isOk()) {
  r.unwrap(); // 42
}
```

#### `unwrapErr()`

Extracts the error value. Only defined on `Err`, so the type system rejects calls on
an unnarrowed `Result` — you **must** call `isErr()` first. As with `unwrap`, this
makes accidental misuse a compile error rather than a runtime panic.

```ts
const r: Result<number, string> = Result.Err('boom');
if (r.isErr()) {
  r.unwrapErr(); // 'boom'
}
```

#### `unwrapOr(defaultValue)`

Returns the success value if present, otherwise returns `defaultValue`. Always
terminates the Result — the return type is `T | U` and no further chaining is possible.
The default is eagerly evaluated, so use [`unwrapOrElse`](#unwraporelsef) when
computing it is expensive or depends on the error.

```ts
Result.Ok(1).unwrapOr(0);    // 1
Result.Err('x').unwrapOr(0); // 0
```

#### `unwrapOrElse(f)`

Returns the success value if present, otherwise calls `f(error)` to compute a fallback
lazily. Because the callback receives the error, you can produce different defaults for
different failure modes — useful for e.g. returning a cached value on network errors
but a hardcoded default on validation errors.

```ts
Result.Err('boom').unwrapOrElse((e) => `recovered:${e}`); // 'recovered:boom'
```

#### `unsafeUnwrap() / unsafeUnwrapErr()`

Extract the value or error **without** requiring type narrowing first. If the Result
is the wrong variant, they throw a `PanicException` — a non-recoverable error that
signals a violated invariant rather than a recoverable failure. Reserve these for
cases where you have **out-of-band proof** that the Result is a particular variant
(for example: after a schema has validated the shape, inside tests, or immediately
following a call that always returns the same variant). For normal code paths, always
prefer `unwrap` / `unwrapErr` after an explicit `isOk()` / `isErr()` check.

```ts
Result.Ok(1).unsafeUnwrap();       // 1
Result.Err('x').unsafeUnwrapErr(); // 'x'
Result.Err('x').unsafeUnwrap();    // throws PanicException
```

#### `tap(f)`

Runs a side effect with the success value and returns the **same instance unchanged**
(reference equality is preserved). On `Err`, `f` is not called. This is the idiomatic
way to insert **observational** steps mid-pipeline — logging, metrics, tracing,
debugging — without breaking the chain or affecting the flow of values.

```ts
Result.Ok(1).tap((n) => console.log('got', n)); // logs 'got 1', returns Ok(1)
```

#### `tapErr(f)`

Mirror of `tap` for the error channel. Observe the error without recovering from it
or altering the Result. Commonly used for error logging, monitoring, or capturing
debug context before the error continues propagating up the chain.

```ts
Result.Err('boom').tapErr((e) => console.error(e)); // logs 'boom', returns Err('boom')
```

#### `match(handlers)`

Exhaustive pattern match: provide a handler for each variant and `match` returns the
output of whichever branch fires. Both handlers must return the same type `U`, which
becomes the return type of `match`. This is the **safest** way to fold a Result into
another type — the type system guarantees both branches are handled, and the result
is a single expression rather than a statement. Prefer `match` over explicit
`isOk()` / `isErr()` branching whenever you want an expression-level result.

```ts
const message = result.match({
  Ok:  (n) => `value: ${n}`,
  Err: (e) => `error: ${e}`,
});
```

#### `toJSON()`

Returns the Result as a plain object — `{ kind: 'Ok', value: ... }` or
`{ kind: 'Err', error: ... }` — with no methods attached. JavaScript's `JSON.stringify`
calls this method automatically, so serializing a Result works transparently with
built-in APIs. Note that only the methods are stripped; non-JSON-safe payload values
(e.g. `bigint`, `Date`, `Temporal.*`, functions) are **not** converted — pair with a
codec layer if you need that.

```ts
Result.Ok(42).toJSON();       // { kind: 'Ok', value: 42 }
Result.Err('x').toJSON();     // { kind: 'Err', error: 'x' }
JSON.stringify(Result.Ok(1)); // '{"kind":"Ok","value":1}'
```

---

### Result — namespace

Static helpers and constructors on the `Result` object.

#### `Result.fromNullable(value, error)`

Lifts a value that might be `null` or `undefined` into the `Result` world. If the value
is present it's wrapped in `Ok`; if it's nullish the supplied `error` is wrapped in
`Err`. Especially useful at the boundary with code that uses nullability for
absence — environment variables, cache lookups, the first argument of a find, etc.
The resulting `Ok` has type `NonNullable<T>`, so downstream callers never have to
re-check for null.

```ts
Result.fromNullable(process.env.PORT, 'PORT not set');
// Ok<string, string> when PORT is set, Err('PORT not set') otherwise
```

#### `Result.fromThrowable(f, mapError?)`

Bridges exception-throwing code into the `Result` world. Invokes `f`; if it throws,
the thrown value is passed through `mapError` (or kept as-is) and returned as `Err`,
otherwise the return value is wrapped in `Ok`. `PanicException` is **never** swallowed —
panics represent programmer errors (violated invariants) rather than recoverable
failures, so they continue to propagate. Use this as the standard interop layer for
JSON.parse, RegExp construction, throwing parsers, and other legacy/library code.

```ts
const parsed = Result.fromThrowable(
  () => JSON.parse(raw),
  (e) => (e instanceof Error ? e.message : 'parse-error'),
);
// Result<unknown, string>
```

#### `Result.fromPromise(p, mapError?)`

The async counterpart of `fromThrowable`. Accepts either a promise or a thunk returning
one, awaits it, and maps a rejection through `mapError` into an `Err`. Resolves with
`Ok(value)` on success. Preferring a thunk is recommended, because a plain promise
begins executing at the call site and any sync throw during promise creation wouldn't
be captured. Use this at the boundary with `fetch`, database drivers, and any other
rejection-based async API.

```ts
const r = await Result.fromPromise(
  () => fetch('/api/user').then((res) => res.json()),
  (e) => ({ code: 'NETWORK', cause: e }),
);
// Result<unknown, { code: 'NETWORK'; cause: unknown }>
```

#### `Result.fromJSON(value)`

Reconstructs a `Result` from its serialized plain-object form. Validates that `value`
has the expected `{ kind: 'Ok', value }` or `{ kind: 'Err', error }` shape and returns
`Ok(resultInstance)` if so, or `Err(ParseResultError)` describing the mismatch if not.
Because the outer `Result` itself represents the parse outcome, success cases return
a nested `Ok(Ok(...))` — unwrap the outer layer once you've validated the shape.

```ts
const json = JSON.parse('{"kind":"Ok","value":42}');
Result.fromJSON<number, string>(json); // Ok(Ok(42))

Result.fromJSON({ kind: 'wrong' }); // Err(ParseResultError { ... })
```

#### `Result.all(...results)`

Combines multiple independent `Result`s into a single tuple-valued `Result`. On
success the return type is a tuple matching the argument order; on failure the first
`Err` short-circuits the combination and is returned directly, with subsequent `Err`s
ignored. This is the analogue of `Promise.all` for synchronous fallible computations
and is ideal when you want to **fail fast** — e.g. gate further work on all inputs
being valid.

```ts
Result.all(Result.Ok(1), Result.Ok('hello'), Result.Ok(true));
// Ok([1, 'hello', true])

Result.all(Result.Ok(1), Result.Err('oops'), Result.Ok(true));
// Err('oops')
```

#### `Result.allSettled(...results)`

Like `all`, but **accumulates every error** instead of short-circuiting on the first.
Returns `Ok([...values])` only when every input is `Ok`; otherwise returns
`Err([...errors])` containing each failure. The analogue of `Promise.allSettled` for
cases where you want to report *all* problems at once — typical for form validation,
where stopping at the first invalid field produces a poor user experience.

```ts
Result.allSettled(Result.Err('A'), Result.Ok(1), Result.Err('B'));
// Err(['A', 'B'])
```

#### `Result.allRecord(record)`

The record-shaped variant of `all`. Accepts an object whose values are `Result`s and
returns a `Result` whose success type is a record with the same keys and unwrapped
values. Short-circuits on the first `Err` (in object-key iteration order). Preferred
over `all` when working with named fields, because the result keeps meaningful names
instead of positional indices.

```ts
Result.allRecord({
  name: validateName(input),
  email: validateEmail(input),
});
// Result<{ name: Name; email: Email }, NameError | EmailError>
```

#### `Result.isResult(value)`

Runtime check that a value is a genuine `Result` **instance** produced by this
library, not merely a plain object with a matching shape. Internally uses a branded
symbol so accidentally-shaped look-alikes (e.g. an API response happening to include
`kind: 'Ok'`) are correctly rejected. Use this at trust boundaries — deserializers,
RPC handlers, IPC entry points.

```ts
Result.isResult(Result.Ok(1));              // true
Result.isResult({ kind: 'Ok', value: 1 }); // false
```

#### `Result.isOk(result)` / `Result.isErr(result)`

Data-first type-guards: standalone functions with the same effect as the instance
methods `result.isOk()` / `result.isErr()`. Behave identically, but can be passed as
first-class values — handy as a predicate for `Array.prototype.filter` or as a
callback argument:

```ts
const onlyOks = results.filter(Result.isOk);
// onlyOks is narrowed to Ok<T, E>[]
```

---

### Result — data-last operators

Every instance method has a curried, data-last counterpart on the `Result` namespace.
These are designed for composition with `pipe` / `flow` from `@typemint/core`.

```ts
import { flow } from '@typemint/core';
import { Result } from '@typemint/result';

const processOrder = flow(
  Result.map((order: Order) => applyDiscount(order)),
  Result.andThen((order) => validateStock(order)),
  Result.mapErr((e) => ({ code: e, timestamp: Date.now() })),
  Result.tap((order) => console.log('processed', order.id)),
  Result.unwrapOr(defaultOrder),
);

processOrder(Result.Ok(rawOrder));
```

| Operator                         | Description                                              |
| -------------------------------- | -------------------------------------------------------- |
| `Result.map(f)`                  | `(r) => r.map(f)`                                        |
| `Result.mapErr(f)`               | `(r) => r.mapErr(f)`                                     |
| `Result.mapOr(default, f)`       | `(r) => r.mapOr(default, f)`                             |
| `Result.mapOrElse(defaultFn, f)` | `(r) => r.mapOrElse(defaultFn, f)`                       |
| `Result.andThen(f)`              | `(r) => r.andThen(f)` — chain fallible step              |
| `Result.orElse(f)`               | `(r) => r.orElse(f)` — recover from error                |
| `Result.unwrapOr(default)`       | `(r) => r.unwrapOr(default)` — extract or use default    |
| `Result.unwrapOrElse(f)`         | `(r) => r.unwrapOrElse(f)` — extract or compute fallback |
| `Result.tap(f)`                  | `(r) => r.tap(f)` — side effect on value                 |
| `Result.tapErr(f)`               | `(r) => r.tapErr(f)` — side effect on error              |
| `Result.match(handlers)`         | `(r) => r.match(handlers)` — exhaustive fold             |

---

## Option

`Option<T>` represents a value that may or may not be present. It is a tagged union of
`Some<T>` (present) and `None<T>` (absent). It is the explicit, type-safe alternative to
`T | null | undefined`.

```ts
import { Option } from '@typemint/result';

function findUser(id: string): Option<User> {
  const user = db.get(id);
  return user != null ? Option.Some(user) : Option.None();
}

const o = findUser('42');

if (o.isSome()) {
  console.log(o.value.name);
}
```

### Creating Options

```ts
import { Some, None } from '@typemint/result';

Some(42);       // Some<number>
None();         // None<never> — T inferred from context
None<number>(); // None<number>

// Or via the Option namespace
Option.Some(42);
Option.None<number>();
```

### Option — instance methods

#### `isSome() / isNone()`

Runtime type-guards that also narrow the TypeScript type at the call site. After a
successful check the compiler treats the value as the specific variant for the rest of
the block — `.value` becomes available on `Some` without a cast. Both guards are
side-effect free and may be called as often as needed.

```ts
const o: Option<number> = Option.Some(1);

if (o.isSome()) {
  o.value; // number — narrowed
}

if (o.isNone()) {
  // o is None<number>
}
```

#### `map(f)`

Applies `f` to the value when the Option is `Some`, producing a new `Some`. On `None`
the instance is returned as-is with the success type adjusted — `f` is **never called**.
Use for pure transformations that cannot themselves fail or produce absence; if `f`
could return `None`, use [`andThen`](#andthenf-1) instead.

```ts
Option.Some(2).map((n) => n * 10);       // Some(20)
Option.None<number>().map((n) => n * 10); // None()
```

#### `mapOr(defaultValue, f)`

Eagerly collapses the Option to a plain value of type `U`. On `Some`, returns
`f(value)`; on `None`, returns `defaultValue` directly. The default is computed at the
call site regardless of which branch fires — prefer
[`mapOrElse`](#maporelsedefaultfn-f-1) if it is expensive to build.

```ts
Option.Some(3).mapOr(0, (n) => n * 2);       // 6
Option.None<number>().mapOr(0, (n) => n * 2); // 0
```

#### `mapOrElse(defaultFn, f)`

Lazy, two-branch fold. On `Some`, returns `f(value)`; on `None`, calls `defaultFn()`.
Unlike `mapOr`, the default is only evaluated when actually needed. Use when the
fallback is expensive, or when you want exhaustive two-branch handling as a single
expression without a separate `match`.

```ts
Option.Some(3).mapOrElse(
  () => 'nothing',
  (n) => `value:${n}`,
); // 'value:3'
Option.None<number>().mapOrElse(
  () => 'nothing',
  (n) => `value:${n}`,
); // 'nothing'
```

#### `andThen(f)`

Chains another operation that may itself produce absence. `f` receives the value and
returns a new `Option`, which replaces the current one. On `None`, `f` is not called
and the existing `None` is returned — this **short-circuit** behaviour lets you chain
several lookups or validations without intermediate checks. Also known as `flatMap` in
other libraries.

```ts
const parse = (s: string): Option<number> =>
  Number.isNaN(Number(s)) ? Option.None() : Option.Some(Number(s));

Option.Some('42').andThen(parse);      // Some(42)
Option.Some('bad').andThen(parse);     // None()
Option.None<string>().andThen(parse);  // None() — f not called
```

#### `orElse(f)`

The mirror of `andThen` for absence recovery. On `None`, calls `f()` and returns its
`Option` — which can itself be `Some` (recovery succeeded) or another `None`. On `Some`,
returns self unchanged without calling `f`. Typical uses: try a primary source, then
a cache, then a hard-coded default, chained via `orElse`.

```ts
Option.None<number>().orElse(() => Option.Some(0)); // Some(0)
Option.Some(1).orElse(() => Option.Some(99));       // Some(1) — f not called
```

#### `filter(predicate)`

Keeps the `Some` when `predicate(value)` is truthy; replaces it with `None` otherwise.
On an existing `None`, the predicate is not called. Useful for narrowing a value that
technically exists but doesn't meet an additional constraint (e.g. a string is
present but empty, a number is present but negative).

```ts
Option.Some(4).filter((n) => n % 2 === 0);   // Some(4)
Option.Some(3).filter((n) => n % 2 === 0);   // None()
Option.None<number>().filter(() => true);     // None() — predicate not called
```

#### `zip(other)`

Combines two independent `Option`s into a single `Option` of a tuple. Returns
`Some([a, b])` only when **both** inputs are `Some`; if either is `None`, the result
is `None`. The `Option`-world equivalent of a logical AND across presence.

```ts
Option.Some(1).zip(Option.Some('a')); // Some([1, 'a'])
Option.Some(1).zip(Option.None());    // None()
```

#### `unwrap()`

Extracts the contained value. Only defined on `Some`, so the type system rejects calls
on an unnarrowed `Option` — you **must** call `isSome()` first (or use `assertSome`,
`match`, etc.). Preferred over `unsafeUnwrap` because misuse is a compile error, not
a runtime panic.

```ts
const o: Option<number> = Option.Some(42);
if (o.isSome()) {
  o.unwrap(); // 42
}
```

#### `unwrapOr(defaultValue)`

Returns the contained value if present, otherwise returns `defaultValue`. Always
terminates the Option — the return type is `T | U` and no further chaining is possible.
The default is evaluated eagerly; use [`unwrapOrElse`](#unwraporelsef-1) if it's
expensive or you only want to compute it on demand.

```ts
Option.Some(1).unwrapOr(0);       // 1
Option.None<number>().unwrapOr(0); // 0
```

#### `unwrapOrElse(f)`

Returns the contained value if present, otherwise calls `f()` to compute the fallback
lazily. Unlike `Result.unwrapOrElse`, the callback takes no argument — `None` carries
no information beyond its own absence.

```ts
Option.None<number>().unwrapOrElse(() => 42); // 42
```

#### `unsafeUnwrap()`

Extracts the value **without** requiring narrowing. Throws a `PanicException` if the
Option is `None` — this represents a violated invariant, not a recoverable failure.
Reserve for cases where you have out-of-band proof that the Option is `Some` (e.g.
after `assertSome`, inside tests, or immediately after a constructor that always
produces `Some`). For normal code, prefer `unwrap` after an `isSome()` check or
`unwrapOr` / `unwrapOrElse` for a safe fallback.

```ts
Option.Some(1).unsafeUnwrap();  // 1
Option.None().unsafeUnwrap();   // throws PanicException
```

#### `tap(f)`

Runs a side effect with the present value and returns the **same instance unchanged**
(reference equality preserved). On `None`, `f` is not called. Intended for logging,
metrics, tracing, and other observational work that shouldn't affect the pipeline.

```ts
Option.Some(1).tap((n) => console.log('got', n)); // logs 'got 1', returns Some(1)
```

#### `tapNone(f)`

Mirror of `tap` for the absent branch. Invokes `f()` on `None` and returns the same
`None`; does nothing on `Some`. Useful for recording metrics like "cache miss count"
or logging unexpected absences without treating them as errors.

```ts
Option.None().tapNone(() => console.log('empty')); // logs 'empty', returns None()
```

#### `match(handlers)`

Exhaustive pattern match. Both handlers must return the same type `U`, which becomes
the return type of `match`. The type system guarantees both branches are handled, and
the result is a single expression. Prefer `match` over `isSome()` / `isNone()`
branching whenever you want an expression-level result.

```ts
const label = option.match({
  Some: (n) => `value: ${n}`,
  None: () => 'nothing',
});
```

#### `toJSON()`

Returns the Option as a plain object — `{ kind: 'Some', value: ... }` or
`{ kind: 'None' }` — with no methods attached. `JSON.stringify` calls this method
automatically. As with `Result.toJSON`, only methods are stripped; if the wrapped
value itself isn't JSON-safe (e.g. `bigint`, `Date`), pair with a codec.

```ts
Option.Some(42).toJSON(); // { kind: 'Some', value: 42 }
Option.None().toJSON();   // { kind: 'None' }
```

#### `toResult(error)`

Converts the Option into a `Result` by attaching an error for the absent case.
`Some(v)` becomes `Ok(v)`; `None` becomes `Err(error)`. Use at the boundary where an
"absent" value should become a "failure" — e.g. a database lookup returning `None`
should become `Err('NOT_FOUND')` before being returned from an API handler.

```ts
Option.Some(1).toResult('NOT_FOUND');          // Ok(1)
Option.None<number>().toResult('NOT_FOUND');   // Err('NOT_FOUND')
```

---

### Option — namespace

#### `Option.fromNullable(value)`

Lifts a possibly-nullish value into the `Option` world. Only `null` and `undefined`
become `None`; every other falsy value (`0`, `''`, `false`, `NaN`) is preserved as
`Some`. This is the primary adaptor for values that use nullability to model absence —
DOM APIs, `Map.get`, `Array.prototype.find`, optional object properties. The resulting
`Some` carries `NonNullable<T>`, so downstream code never has to re-check for null.

```ts
Option.fromNullable('hello');   // Some('hello')
Option.fromNullable(null);      // None()
Option.fromNullable(undefined); // None()
Option.fromNullable(0);         // Some(0) — only null/undefined become None
```

#### `Option.fromResult(result)`

Drops the error channel of a `Result` and returns an `Option`: `Ok(v)` becomes
`Some(v)`, `Err(_)` becomes `None`. Useful when you have a `Result` but the caller
only cares whether it succeeded, not why it failed — e.g. a best-effort lookup where
any failure should be treated as absence.

```ts
Option.fromResult(Result.Ok(42));       // Some(42)
Option.fromResult(Result.Err('boom'));  // None()
```

#### `Option.fromJSON(value)`

Reconstructs an `Option` from its serialized plain-object form. Validates that `value`
has the expected `{ kind: 'Some', value }` or `{ kind: 'None' }` shape and returns
`Ok(optionInstance)` if so, or `Err(ParseOptionError)` describing the mismatch if not.
As with `Result.fromJSON`, the outer `Result` represents the parse outcome, so success
cases return a nested `Ok(Some(...))` or `Ok(None)`.

```ts
const json = JSON.parse('{"kind":"Some","value":42}');
Option.fromJSON<number>(json); // Ok(Some(42))

Option.fromJSON({ kind: 'wrong' }); // Err(ParseOptionError { ... })
```

#### `Option.all(...options)`

Combines multiple independent `Option`s into a single tuple-valued `Option`. Returns
`Some([...values])` only when **every** input is `Some`; otherwise returns `None` as
soon as any input is absent (remaining inputs are ignored). Analogous to `Result.all`
and `Promise.all` — appropriate when all values are required for the next step.

```ts
Option.all(Option.Some(1), Option.Some('a'), Option.Some(true));
// Some([1, 'a', true])

Option.all(Option.Some(1), Option.None<string>(), Option.Some(true));
// None()
```

#### `Option.allRecord(record)`

The record-shaped variant of `Option.all`. Accepts an object of `Option` values and
returns a single `Option` of a record with the same keys and unwrapped values.
Resolves to `None` the moment any input is absent. Preferred over positional `all`
when dealing with named fields, since the resulting object retains meaningful keys.

```ts
Option.allRecord({
  name: parseName(input),
  age:  parseAge(input),
});
// Option<{ name: Name; age: Age }>
```

#### `Option.isOption(value)`

Runtime check that a value is a genuine `Option` **instance** produced by this
library, not merely a plain object matching the shape. Uses a branded symbol so
look-alike objects (e.g. a deserialized payload that hasn't been run through
`fromJSON`) are correctly rejected. Use at trust boundaries.

```ts
Option.isOption(Option.Some(1));              // true
Option.isOption({ kind: 'Some', value: 1 }); // false
```

#### `Option.isSome(option)` / `Option.isNone(option)`

Data-first type-guards: standalone functions equivalent to the instance methods, but
usable as first-class values. Convenient for `Array.prototype.filter` and anywhere a
predicate callback is expected:

```ts
const values = options.filter(Option.isSome).map((o) => o.value);
// values: T[] — narrowed through the filter
```

---

### Option — data-last operators

```ts
import { flow } from '@typemint/core';
import { Option } from '@typemint/result';

const getDisplayName = flow(
  Option.map((user: User) => user.displayName),
  Option.orElse(() => Option.Some('Anonymous')),
  Option.map((name) => name.trim()),
  Option.filter((name) => name.length > 0),
  Option.unwrapOr('Anonymous'),
);

getDisplayName(Option.Some({ displayName: '  Alice  ' })); // 'Alice'
getDisplayName(Option.None());                              // 'Anonymous'
```

| Operator                         | Description                                    |
| -------------------------------- | ---------------------------------------------- |
| `Option.map(f)`                  | `(o) => o.map(f)`                              |
| `Option.mapOr(default, f)`       | `(o) => o.mapOr(default, f)`                   |
| `Option.mapOrElse(defaultFn, f)` | `(o) => o.mapOrElse(defaultFn, f)`             |
| `Option.andThen(f)`              | `(o) => o.andThen(f)` — chain optional step    |
| `Option.orElse(f)`               | `(o) => o.orElse(f)` — recover from absence    |
| `Option.filter(predicate)`       | `(o) => o.filter(predicate)`                   |
| `Option.unwrapOr(default)`       | `(o) => o.unwrapOr(default)`                   |
| `Option.unwrapOrElse(f)`         | `(o) => o.unwrapOrElse(f)`                     |
| `Option.tap(f)`                  | `(o) => o.tap(f)` — side effect on value       |
| `Option.tapNone(f)`              | `(o) => o.tapNone(f)` — side effect on absence |
| `Option.match(handlers)`         | `(o) => o.match(handlers)` — exhaustive fold   |
| `Option.toResult(error)`         | `(o) => o.toResult(error)` — convert to Result |

---

## Result ↔ Option interop

The two types convert to each other freely.

```ts
// Result → Option (drop the error)
const option  = Option.fromResult(Result.Ok(42));      // Some(42)
const option2 = Option.fromResult(Result.Err('x'));    // None()

// Option → Result (supply an error for the None case)
const result  = Option.Some(1).toResult('NOT_FOUND');          // Ok(1)
const result2 = Option.None<number>().toResult('NOT_FOUND');   // Err('NOT_FOUND')

// Data-last in a pipeline
pipe(
  option,
  Option.toResult('NOT_FOUND'),
  Result.mapErr((e) => ({ code: e })),
);
```

---

## Serialization

Both types support round-trip JSON serialization out of the box.

```ts
// Serialize
const json = JSON.stringify(Result.Ok(42));
// '{"kind":"Ok","value":42}'

// Deserialize
const parsed = Result.fromJSON<number, string>(JSON.parse(json));
// Ok(Ok(42)) — outer Ok = parse succeeded, inner Ok = the original value

if (parsed.isOk()) {
  const inner = parsed.value; // Result<number, string>
}
```

The plain-object shapes (`OkLike`, `ErrLike`, `SomeLike`, `NoneLike`) are exported
separately for use in serialization schemas and type guards without needing a live instance.

```ts
import { OkLike, SomeLike } from '@typemint/result';

OkLike.isOfType({ kind: 'Ok', value: 1 });    // true
SomeLike.isOfType({ kind: 'Some', value: 1 }); // true
```

---

## Assertions

The library exposes four assertion helpers — `assertOk`, `assertErr`, `assertSome`,
`assertNone` — that narrow the argument's type in the caller's scope and **throw on
mismatch**. They are intended for two situations:

1. **Tests**, where you want a failing assertion to surface clearly rather than
   appearing as a `TypeError` several lines later when you try to access `.value`.
2. **Invariant checks**, where your code already knows which variant the Result /
   Option must be (because of business rules, earlier validation, or out-of-band
   proof) and you want to make that knowledge explicit to the type system.

They are **not** a general error-handling mechanism — for normal branching, use
`isOk()` / `isSome()` / `match` / `unwrapOr` etc., which don't throw.

```ts
import { assertOk, assertErr, assertSome, assertNone } from '@typemint/result';

const r: Result<number, string> = Result.Ok(1);
assertOk(r);   // narrows r to Ok<number, string> in the following scope
r.value;       // number

const o: Option<number> = Option.None();
assertNone(o); // narrows o to None<number>
```

All four functions throw `AssertException` (from `@typemint/core`) on failure.
`AssertException` is distinct from `PanicException`: it signals "a contract I expected
to hold at this point did not", which in a test run surfaces as a test failure and in
production should be treated as a bug to fix rather than as an expected error to
recover from.

---

## License

MIT
