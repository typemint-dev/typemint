# @typemint/core

Basic building blocks for algebraic data modeling in TypeScript.

`@typemint/core` provides the foundational primitives that the rest of the typemint
ecosystem builds on. It is intentionally small -- every export is a low-level tool
for constructing, inspecting, and dispatching over typed data structures.

## Install

```bash
pnpm add @typemint/core
```

## What's Inside

### Discriminated unions

| Export         | Purpose                                                                               |
| -------------- | ------------------------------------------------------------------------------------- |
| `Discriminant` | Factory for discriminated union tags — construction, guards, and exhaustive matching. |
| `Kind`         | Pre-built `Discriminant("kind")` convenience alias.                                   |

### Object mixins

| Export        | Purpose                                                                                            |
| ------------- | -------------------------------------------------------------------------------------------------- |
| `WithCode`    | Mixin type and namespace for a typed string `code` property.                                       |
| `WithMessage` | Mixin type and namespace for a string `message` property, with safe extraction via `getOr`.        |
| `WithDetail`  | Mixin type and namespace for a structured contextual metadata payload (`Record<string, unknown>`). |

### Pipelines

| Export             | Purpose                                                                                               |
| ------------------ | ----------------------------------------------------------------------------------------------------- |
| `flow`             | Compose unary operators into a single reusable function, left-to-right.                               |
| `struct`           | Lift a record of unary operators into a single operator that runs them across record fields.          |
| `struct.required`  | Semantic alias for `struct` — same behavior, clearer parallelism with `struct.partial` at call-sites. |
| `struct.partial`   | `struct` variant where every field is optional — missing input keys are skipped instead of forced.    |
| `struct.merge`     | Combine multiple record-shaped operators into one applied to a shared input.                          |
| `tuple`            | Lift a tuple of unary operators into a single operator that runs them across positions.               |
| `identity`         | Return the input unchanged — a `FlowOperator<T, T>` useful as a default or no-op step.                |
| `FlowOperator`     | Type alias for a single unary step `(value: TInput) => TOutput`.                                      |

### Assertions

| Export            | Purpose                                                                          |
| ----------------- | -------------------------------------------------------------------------------- |
| `assert`          | Throws `AssertException` when the supplied condition is `false`.                 |
| `assertDefined`   | Narrows `T` to `NonNullable<T>`, throwing if the value is `null` or `undefined`. |
| `AssertException` | Error class thrown by `assert` — distinguishable via `instanceof`.               |

### Records

| Export         | Purpose                                                                |
| -------------- | ---------------------------------------------------------------------- |
| `isRecord`     | Type guard that narrows `unknown` to `Record<PropertyKey, unknown>`.   |
| `assertRecord` | Assertion variant of `isRecord` — throws `AssertException` on failure. |

### Runtime proof-of-construction

| Export  | Purpose                                                                                            |
| ------- | -------------------------------------------------------------------------------------------------- |
| `Stamp` | Creates a factory-scoped hidden symbol to verify an object was produced by a specific constructor. |

### Errors

| Export           | Purpose                                                                                        |
| ---------------- | ---------------------------------------------------------------------------------------------- |
| `PanicException` | Error class for unrecoverable invariant violations (the runtime backstop for the type system). |

## Tools

### `Discriminant`

Creates a descriptor for a discriminated-union tag keyed on an arbitrary property
name. The descriptor gives you construction (`from`), type guards (`isOfType`,
`isOf`), value extraction (`getValue`), and three flavours of pattern matching
(`match`, `matchOr`, `tryMatch`).

```typescript
import { Discriminant } from '@typemint/core';

const Status = Discriminant('status');

type Ok = typeof Status & { status: 'ok'; value: number };
type Fail = typeof Status & { status: 'fail'; reason: string };
type Response = Ok | Fail;

const res: Response = { status: 'ok', value: 42 };

const label = Status.match(res, {
  ok: (v) => `value is ${v.value}`,
  fail: (v) => `error: ${v.reason}`,
});
// 'value is 42'
```

---

### `Kind`

A pre-built `Discriminant("kind")` convenience. Reach for `Kind` when `"kind"`
is your discriminant key so you don't need to create the descriptor yourself.

```typescript
import { Kind } from '@typemint/core';

const cat = { ...Kind.from('cat'), meow: () => 'meow' } as const;
const dog = { ...Kind.from('dog'), bark: () => 'bark' } as const;

type Animal = typeof cat | typeof dog;

Kind.match(cat as Animal, {
  cat: (v) => v.meow(),
  dog: (v) => v.bark(),
}); // 'meow'
```

---

### `WithCode`

Mixin type and namespace for a typed string `code` property. Useful for error
codes, event types, or any variant tag that lives alongside other fields.

```typescript
import { WithCode, WithMessage } from '@typemint/core';

type NotFoundError = WithCode<'NOT_FOUND'> & WithMessage;

const err: NotFoundError = {
  ...WithCode.from('NOT_FOUND'),
  ...WithMessage.from('Resource not found.'),
};

WithCode.isOf(err, 'NOT_FOUND'); // true
```

---

### `WithMessage`

Mixin type and namespace for a string `message` property. The `getOr` helper
safely extracts a message from an `unknown` value — handy in `catch` blocks
where the thrown value is untyped.

```typescript
import { WithMessage } from '@typemint/core';

try {
  JSON.parse('invalid');
} catch (error) {
  const msg = WithMessage.getOr(error, 'An unknown error occurred.');
  console.error(msg);
}
```

---

### `WithDetail`

Mixin type and namespace for a structured contextual metadata payload. The
payload must be a plain object (`Record<string, unknown>`) — use `WithMessage`
for a bare string and `WithCode` for a string discriminant.

```typescript
import { WithCode, WithDetail } from '@typemint/core';

type ValidationError = WithCode<'VALIDATION_ERROR'> &
  WithDetail<{ field: string; constraint: string }>;

const err: ValidationError = {
  ...WithCode.from('VALIDATION_ERROR'),
  ...WithDetail.from({ field: 'email', constraint: 'format' }),
};

WithDetail.isOfType(err); // true
```

---

### `flow`

Composes unary operators into a single reusable function that applies them
left-to-right. Unlike a `pipe` call, `flow` does not take a value — it returns
a new function. Overloads are provided for arities 1–12 so parameter types are
inferred without annotations.

```typescript
import { flow } from '@typemint/core';

const toSlug = flow(
  (s: string) => s.toLowerCase(),
  (s) => s.trim(),
  (s) => s.replace(/\s+/g, '-'),
);

toSlug('  Hello World  '); // 'hello-world'
```

---

### `struct`

Lifts a record of unary operators into a single operator that applies each
one to the field of the same name on an input record, returning a record of
the results. Where `flow` composes operators **sequentially** along a single
value, `struct` applies operators **in parallel** across the keys of a
record. The returned operator is itself a `FlowOperator` and can be plugged
into a `flow` as a step.

`struct` is **strict by default**: every key declared on the operator
record must be present on the input. Missing keys raise a `PanicException`
because the input type guarantees their presence — a missing key can only
arrive via a type-system bypass (`as any`, untrusted JSON, etc.) and is
treated as a bug. For genuinely optional fields use `struct.partial`.

```typescript
import { flow, struct } from '@typemint/core';

const summarize = flow(
  struct({
    name: (s: string) => s.trim(),
    age: (n: number) => Math.max(0, n),
  }),
  (user) => `${user.name} (${user.age})`,
);

summarize({ name: '  Ada ', age: -3 }); // 'Ada (0)'
```

---

### `struct.required`

Semantic alias for `struct`. Same function, same strictness contract,
same runtime behavior — only the call-site spelling differs. Reach
for `struct.required` when you want the parallelism with
`struct.partial` to be visible at the call-site, especially inside a
`struct.merge` where a record has both required and optional fields.

```typescript
import { struct } from '@typemint/core';

const normalize = struct.merge(
  struct.required({
    id: (n: number) => n,
    name: (s: string) => s.trim(),
  }),
  struct.partial({
    age: (n: number) => Math.max(0, n),
  }),
);
```

The plain `struct(...)` form is still the shorter, default spelling
for cases where there's no contrast with `struct.partial`.

---

### `struct.partial`

The lenient sibling of `struct`. Builds a record-shaped operator where
every field is **optional** on both input and output: missing input keys
are skipped (the matching operator is not invoked and the key is omitted
from the result), while present keys drive their operator as usual. An
explicit `undefined` value counts as "present" and is forwarded to the
operator.

Reach for `struct.partial` when modelling truly optional fields — for
example, decoding update payloads where the absence of a field means
"leave alone" — and prefer plain `struct` otherwise so that contract
violations surface at the boundary.

```typescript
import { struct } from '@typemint/core';

const update = struct.partial({
  name: (s: string) => s.trim(),
  age: (n: number) => Math.max(0, n),
});

update({ name: '  Ada ' }); //         { name: 'Ada' }
update({ age: -3 }); //                 { age: 0 }
update({ name: '  Ada ', age: 4 }); //  { name: 'Ada', age: 4 }
update({}); //                          {}
```

---

### `struct.merge`

Combine multiple record-shaped operators into one. Each contributor
is applied to the same input record and the results are spread-merged
into a single output record. This is the natural way to compose a
strict `struct` with one or more `struct.partial` operators when an
object has both required and optional fields — declare each portion
separately, then `struct.merge` them.

The merged operator's input is typed as the **intersection** of every
contributor's input (so each contributor's strictness contract is
preserved), and its output is the intersection of every contributor's
output. Operators are applied **left-to-right**; on overlapping output
keys, the **rightmost** operator wins (standard spread semantics). The
output record is prototype-less, matching the convention of `struct`.

```typescript
import { struct } from '@typemint/core';

const required = struct({
  id: (n: number) => n,
  name: (s: string) => s.trim(),
});

const optional = struct.partial({
  nickname: (s: string) => s.trim(),
  age: (n: number) => Math.max(0, n),
});

const normalize = struct.merge(required, optional);

normalize({ id: 1, name: '  Ada ' });
// { id: 1, name: 'Ada' }

normalize({ id: 1, name: '  Ada ', nickname: '  Adita ', age: -3 });
// { id: 1, name: 'Ada', nickname: 'Adita', age: 0 }
```

---

### `tuple`

Lifts a tuple of unary operators into a single operator that applies each
one to the element at the same index of an input tuple, returning a tuple
of the results. Where `flow` composes operators **sequentially** along a
single value, `tuple` applies operators **in parallel** across the
positions of a tuple — the positional counterpart to `struct`. Operators
are passed as a single array argument so call-sites stay visually distinct
from `flow`. The returned operator is itself a `FlowOperator` and can be
plugged into a `flow` as a step.

Like `struct`, `tuple` is **strict on input length**: the input must have
at least as many elements as there are declared operators. A shorter
input raises a `PanicException` because the input type guarantees the
declared arity — a shorter array can only arrive via a type-system
bypass and is treated as a bug. Extra elements past the declared arity
are ignored.

```typescript
import { flow, tuple } from '@typemint/core';

const summarize = flow(
  tuple([(s: string) => s.trim(), (n: number) => Math.max(0, n)]),
  ([name, age]) => `${name} (${age})`,
);

summarize(['  Ada ', -3]); // 'Ada (0)'
```

---

### `identity`

Returns its argument unchanged. Although trivially simple, `identity` is
a useful building block for higher-order code: it serves as a no-op slot
inside conditional pipelines, as a default for an optional transform
(`config.map ?? identity`), and as an "as-is" callback for APIs that
take a mapper. It is itself a `FlowOperator<T, T>` and composes
directly into `flow`, `struct`, and `tuple` without further wrapping.
Reference identity is preserved: `identity(obj) === obj`.

```typescript
import { flow, identity } from '@typemint/core';

const transform = (debug: boolean) =>
  flow(
    (s: string) => s.trim(),
    debug ? (s: string) => (console.log(s), s) : identity,
    (s: string) => s.toUpperCase(),
  );

transform(false)('  hello  '); // 'HELLO'
```

---

### `assert` / `assertDefined`

Lightweight runtime assertions. `assert` throws an `AssertException` when
the condition is `false`. `assertDefined` narrows `T` to `NonNullable<T>`,
throwing when the value is `null` or `undefined`. Both accept a lazy message
factory to avoid computing an expensive string on the happy path.

```typescript
import { assert, assertDefined } from '@typemint/core';

function divide(a: number, b: number): number {
  assert(b !== 0, 'Cannot divide by zero.');
  return a / b;
}

function getName(user: { name?: string } | null) {
  assertDefined(user, 'User must not be null.');
  assertDefined(user.name, () => `User ${JSON.stringify(user)} has no name.`);
  return user.name;
}
```

---

### `isRecord` / `assertRecord`

`isRecord` is a type guard that narrows `unknown` to `Record<PropertyKey, unknown>`.
It returns `false` for `null` and arrays. `assertRecord` is the assertion
variant — it throws an `AssertException` on failure.

```typescript
import { isRecord, assertRecord } from '@typemint/core';

isRecord({ a: 1 }); // true
isRecord([1, 2]); // false
isRecord(null); // false

function process(input: unknown) {
  assertRecord(input, 'Expected a plain object.');
  console.log(input['key']);
}
```

---

### `Stamp`

Creates a factory-scoped, hidden symbol that proves an object was produced by
a specific constructor. Two `Stamp()` calls always produce independent
stamps — stamping with one cannot be detected by another.

```typescript
import { Stamp } from '@typemint/core';

const UserStamp = Stamp();

function createUser(name: string) {
  return UserStamp.stamp({ name });
}

const user = createUser('Alice');
UserStamp.isStamped(user); // true
UserStamp.isStamped({ name: 'Alice' }); // false — not stamped
```

---

### `PanicException`

Thrown to signal an unrecoverable invariant violation — a situation that should
be impossible if the type system is used correctly. Unlike `AssertException`,
a `PanicException` always indicates a bug. Use `PanicException.panic(message)`
to get a pre-bound throwing function, useful as a one-liner fallback.

```typescript
import { PanicException } from '@typemint/core';

function unreachable(value: never): never {
  throw new PanicException(`Unreachable branch reached with: ${String(value)}`);
}

// As a bound thrower — useful in .catch() or Promise chains:
fetch('/api').catch(PanicException.panic('Network request failed'));
```

---

## Documentation

- [Discriminant](./docs/discriminant.md) -- in-depth walkthrough of
  the discriminant abstraction, object construction, and exhaustive
  pattern matching.

## License

MIT
