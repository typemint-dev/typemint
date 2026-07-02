# @typemint/data

Type-safe data structures for TypeScript.

This package ships two complementary primitives for modelling closed sets of
named values:

- **`LiteralUnion`** — a runtime descriptor for a closed set of string literals.
  It *names* things: countries, statuses, roles, currencies, log levels. It
  provides type guards, exhaustive matching, and iteration.
- **`Dictionary`** — a frozen, read-only projection that maps each name to a
  fixed value (an HTTP status number, an ISO code, an emoji, a label). It
  *encodes* the names that a `LiteralUnion` declares.

The guiding principle: **names are strings, encodings are dictionaries.** A
`LiteralUnion` holds the canonical identities of your domain; a `Dictionary`
holds whatever each identity projects to.

## Installation

```bash
pnpm add @typemint/data
```

```ts
import { LiteralUnion, Dictionary } from '@typemint/data';
```

## Table of contents

- [`LiteralUnion`](#literalunion)
  - [Creating a union](#creating-a-union)
  - [Member access](#member-access)
  - [`isOfType`](#isoftypevalue-unknown-value-is-t)
  - [`toArray`](#toarray-nonemptyreadonlyarrayt)
  - [`size`](#size)
  - [Iteration (`Symbol.iterator`)](#iteration-symboliterator)
  - [`match`](#matchvalue-handlers--matchhandlers)
  - [`matchResult`](#matchresultresult-handlers--matchresulthandlers)
  - [Type helpers](#literalunion-type-helpers)
- [`Dictionary`](#dictionary)
  - [Creating a dictionary](#creating-a-dictionary)
  - [`Dictionary.fromLiteralUnion`](#dictionaryfromliteralunion)
  - [Member access](#member-access-1)
  - [`keys`](#keys-nonemptyreadonlyarray)
  - [`values`](#values-nonemptyreadonlyarray)
  - [`entries`](#entries-nonemptyreadonlyarray)
  - [`isOfType`](#isoftypevalue-unknown-value-is-value)
  - [`size`](#size-1)
  - [Iteration (`Symbol.iterator`)](#iteration-symboliterator-1)
  - [Type helpers](#dictionary-type-helpers)
- [How `LiteralUnion` and `Dictionary` work together](#how-literalunion-and-dictionary-work-together)
- [`Invariant`](#invariant)
  - [Creating an invariant](#creating-an-invariant)
  - [`Invariant.and`](#invariantandfirst-rest)
  - [`Invariant.andSettled`](#invariantandsettledfirst-rest)
  - [`Invariant.or`](#invariantorfirst-rest)
  - [Type helpers](#invariant-type-helpers)
- [`Scalar`](#scalar)
  - [Primitive obsession, and the states it lets in](#primitive-obsession-and-the-states-it-lets-in)
  - [Creating a scalar](#creating-a-scalar)
  - [Refine, never transform](#refine-never-transform)
  - [`of`](#ofvalue-removealltagstroot)
  - [`parse`](#parsevalue-unknown)
  - [`validate`](#validatevalue-removealltagstroot)
  - [`is`](#isvalue-unknown-value-is-scalar)
  - [`unwrap`](#unwrapvalue-scalar)
  - [Adding invariants](#adding-invariants)
  - [Methods and constants](#methods-and-constants)
  - [`extend`: refining a scalar](#extend-refining-a-scalar)
  - [Type helpers](#scalar-type-helpers)
- [License](#license)

---

## `LiteralUnion`

`LiteralUnion` turns a tuple of string literals into a runtime descriptor that
carries both the values themselves and a set of methods for working with them.

### A `LiteralUnion` represents nominal states, not values

This is the most important thing to understand about `LiteralUnion`: it does
**not** represent values or their meaning — it represents **nominal symbols**,
the identities of the entities you want to work with.

When you write `LiteralUnion(['germany', 'france', 'usa'])`, the member
`'germany'` is *not* a value that means anything in particular. It does not
carry Germany's calling code, its ISO alpha-2 code, its capital, its flag, or
its population. It is purely a **name** — a stable, comparable token that says
"this is the country we call Germany," nothing more.

The actual representations — the data each name maps to — live somewhere else:

- A **`Dictionary`** projects each name to a fixed value (`'germany' → 'DE'`).
- A **codec** encodes/decodes a name to and from some external wire format.

In other words: the point of a `LiteralUnion` is to give you a closed set of
nominal symbols to work with, and to make working with them safe and
exhaustive. The moment you need *what a symbol means* rather than *which symbol
it is*, you reach for a `Dictionary` or a codec instead. See
[How they work together](#how-literalunion-and-dictionary-work-together) for the
full picture.

### Creating a union

Call `LiteralUnion` with a tuple of strings. The argument **must be a `const`
tuple** so that TypeScript can derive the precise literal types of each member.
When you pass an array literal directly, TypeScript infers the tuple
automatically; when you pass a value declared elsewhere, add `as const`:

```ts
// Array literal passed directly — types are inferred.
const Country = LiteralUnion(['germany', 'france', 'usa']);

// A value declared separately must be marked `as const`.
const members = ['germany', 'france', 'usa'] as const;
const Country = LiteralUnion(members);
```

Without `as const`, a separately-declared array widens to `string[]`, and
TypeScript can no longer derive the literal union — you would lose the precise
`'germany' | 'france' | 'usa'` type and the exhaustiveness checks that depend
on it:

```ts
// ⚠️ widens to string[] — the literal types are lost.
const members = ['germany', 'france', 'usa'];
const Country = LiteralUnion(members); // members are typed as `string`
```

To obtain the literal union *type* from the descriptor, use `InferLiteralUnion`:

```ts
type Country = InferLiteralUnion<typeof Country>;
// type Country = 'germany' | 'france' | 'usa'
```

Some rules enforced at construction time:

- The tuple must contain **at least one** member, otherwise a `PanicException`
  is thrown.
- Member names must not collide with the reserved descriptor keys
  (`isOfType`, `toArray`, `size`, `match`, `matchResult`). A collision throws a
  `PanicException`.
- Only `string` members are allowed by design — see the rationale in
  [How they work together](#how-literalunion-and-dictionary-work-together).

### Member access

Each declared member is exposed as a property on the descriptor whose value is
the literal itself. This gives you a single, typo-proof source of truth instead
of scattering raw string literals through your code:

```ts
Country.germany; // 'germany'
Country.france;  // 'france'

if (value === Country.usa) {
  // ...
}
```

### `isOfType(value: unknown): value is T`

Type guard that narrows an `unknown` value to a member of the union. Backed by
an `O(1)` `Set` lookup using strict string equality, so it is safe to use at
the trust boundary of your system (HTTP payloads, env vars, DB columns, …).

```ts
const Country = LiteralUnion(['germany', 'france', 'usa']);

function handleRequest(body: { country: unknown }) {
  if (!Country.isOfType(body.country)) {
    throw new Error(`Unknown country: ${String(body.country)}`);
  }
  // body.country is now typed as 'germany' | 'france' | 'usa'
  return lookupCountry(body.country);
}
```

It can also be used as a predicate to filter unknown arrays down to valid
members:

```ts
const Status = LiteralUnion(['active', 'pending', 'archived']);

const raw: unknown[] = ['active', 42, 'pending', null, 'archived', 'bogus'];
const valid = raw.filter(Status.isOfType);
// valid: ('active' | 'pending' | 'archived')[]  →  ['active', 'pending', 'archived']
```

Note: `isOfType` only proves membership in the union *as a whole*. To narrow to
a single member, compare directly afterwards (`value === Country.germany`).

### `toArray(): NonEmptyReadonlyArray<T>`

Returns the union's members as a non-empty `readonly` tuple, in declaration
order. The **same reference** is returned on every call (the array is cached
internally), so it is free to call repeatedly. Because the return type is a
non-empty tuple, destructuring the first element is safe without an
`undefined` check.

```ts
const Country = LiteralUnion(['germany', 'france', 'usa']);

for (const country of Country.toArray()) {
  console.log(country); // 'germany', 'france', 'usa'
}

const [first] = Country.toArray(); // first: 'germany' | 'france' | 'usa'
```

The returned array must not be mutated. If you need a mutable copy, spread it:

```ts
const sorted = [...Country.toArray()].sort();
```

It pairs nicely with schema libraries, since the literal types are preserved:

```ts
const Role = LiteralUnion(['admin', 'editor', 'viewer']);
const RoleSchema = z.enum(Role.toArray());
// RoleSchema: z.ZodEnum<['admin', 'editor', 'viewer']>
```

### `size`

The number of members in the union.

```ts
const Country = LiteralUnion(['germany', 'france', 'usa']);
Country.size; // 3
```

### Iteration (`Symbol.iterator`)

The descriptor is iterable, yielding each member in declaration order. This
means you can spread it or use it directly in a `for...of` loop without calling
`toArray()`:

```ts
const Country = LiteralUnion(['germany', 'france', 'usa']);

[...Country];            // ['germany', 'france', 'usa']
for (const c of Country) { /* ... */ }
```

The descriptor also reports `Object.prototype.toString.call(Country)` as
`'[object LiteralUnion]'` via `Symbol.toStringTag`.

### `match(value, handlers)` / `match(handlers)`

Exhaustively dispatch on a member of the union and return the value produced by
the matching handler. `match` is the canonical way to *run code* per member —
the value-side counterpart to a `Dictionary` (which projects each member to a
fixed value).

Key properties:

- **Exhaustiveness is enforced at compile time.** Every member must have a
  handler; missing one is a TypeScript error. There is no default/fallthrough.
- **Per-branch narrowing.** Each handler receives the *narrow* literal for its
  own key (the `germany` handler sees `value: 'germany'`, not the full union).
- **Synchronous only.** Handlers may *return* Promises, in which case the
  result type is `Promise<U>` and the caller awaits — there is no `matchAsync`.

**Data-first** — dispatch immediately:

```ts
const Country = LiteralUnion(['germany', 'france', 'usa']);
type Country = InferLiteralUnion<typeof Country>;

function alpha2(country: Country): string {
  return Country.match(country, {
    germany: () => 'DE',
    france:  () => 'FR',
    usa:     () => 'US',
  });
}
```

**Data-last** — pass only the handlers and get back a matcher function, ideal
for `pipe` chains and `Array.prototype.map`:

```ts
const Currency = LiteralUnion(['eur', 'usd', 'gbp']);

const symbol = Currency.match({
  eur: () => '€',
  usd: () => '$',
  gbp: () => '£',
});

Currency.toArray().map(symbol); // ['€', '$', '£']
```

Missing a case is a compile error:

```ts
// @ts-expect-error — Property 'usa' is missing in type ...
Country.match(country, {
  germany: () => 'DE',
  france:  () => 'FR',
});
```

> If a handler is missing or not a function at runtime (only reachable by
> bypassing the type system, e.g. with `as any` or untyped JS), `match` throws
> a `PanicException`.

### `matchResult(result, handlers)` / `matchResult(handlers)`

The [`Result`](https://www.npmjs.com/package/@typemint/result)-aware companion
to `match`. It lifts the dispatch into the `Result` monad so you can thread a
possibly-failed value through a literal-union dispatch without manually
unwrapping `Ok`/`Err`. It is implemented in terms of `Result.andThen`:

- **`Err` short-circuits.** If the input is `Err(e)`, no handler runs and the
  exact same `Err` instance is propagated unchanged (reference identity and any
  attached metadata are preserved).
- **`Ok` dispatches.** If the input is `Ok(v)`, the handler matching `v` runs
  and its returned `Result<A, E2>` becomes the output.
- **Errors compose.** The output error type is `E1 | E2` — the union of "the
  input may already be failed" and "any handler may fail."

**Data-first:**

```ts
import { Result } from '@typemint/result';

const Country = LiteralUnion(['germany', 'france', 'usa']);
type Country = InferLiteralUnion<typeof Country>;

declare function parseCountry(input: unknown): Result<Country, ParseError>;
declare function lookupCapital(c: Country): Result<string, NotFoundError>;

const capital = Country.matchResult(parseCountry(rawInput), {
  germany: () => lookupCapital('germany'),
  france:  () => lookupCapital('france'),
  usa:     () => lookupCapital('usa'),
});
// capital: Result<string, ParseError | NotFoundError>
```

**Data-last** — returns a matcher suitable for `map`/`pipe`. Handlers are
validated eagerly at matcher-creation time:

```ts
const toSymbol = Currency.matchResult({
  eur: () => Result.Ok('€' as const),
  usd: () => Result.Ok('$' as const),
  gbp: () => Result.Ok('£' as const),
});
// toSymbol: <E>(r: Result<Currency, E>) => Result<'€' | '$' | '£', E>

const symbols = parsedInputs.map(toSymbol);
```

The following two expressions are interchangeable — `matchResult` is just the
ergonomic form of `andThen` + `match`:

```ts
const a = Country.matchResult(parseCountry(input), {
  germany: () => lookupCapital('germany'),
  france:  () => lookupCapital('france'),
  usa:     () => lookupCapital('usa'),
});

const b = parseCountry(input).andThen((country) =>
  Country.match(country, {
    germany: () => lookupCapital('germany'),
    france:  () => lookupCapital('france'),
    usa:     () => lookupCapital('usa'),
  }),
);
```

### `LiteralUnion` type helpers

| Type | Description |
| --- | --- |
| `InferLiteralUnion<typeof U>` | Extract the literal union type (`'a' \| 'b'`) from a descriptor. |
| `LiteralUnionFrom<T>` | Derive a literal union from a `const` tuple type. |
| `LiteralUnionDescriptor<T>` | The full descriptor type (members + methods). |
| `LiteralUnionMembers<T>` | The `{ [K in T]: K }` member record. |
| `LiteralUnionMethods<T>` | The method portion of the descriptor. |
| `LiteralUnionMatchHandlers<T, U>` | Exhaustive handler map for `match`. |
| `LiteralUnionResultHandlers<T, A, E>` | Exhaustive handler map for `matchResult`. |
| `LiteralUnionMemberBase` | The base constraint for members (`string`). |

```ts
const Status = LiteralUnion(['active', 'pending', 'archived']);
type Status = InferLiteralUnion<typeof Status>;
// type Status = 'active' | 'pending' | 'archived'
```

---

## `Dictionary`

`Dictionary` turns a plain object into a frozen, read-only descriptor that maps
each key to a fixed value, and adds methods for iterating keys, values, and
entries. Where a `LiteralUnion` declares the *names*, a `Dictionary` declares
what each name *projects to*.

### Creating a dictionary

```ts
const codes = Dictionary({ germany: 'DE', france: 'FR', usa: 'US' });
```

As with `LiteralUnion`, the source **must be a `const` value** so that
TypeScript can derive the precise key and value literal types. An object
literal passed directly is inferred correctly, but a value declared elsewhere
must be marked `as const`:

```ts
// Object literal passed directly — keys and values are inferred as literals.
const codes = Dictionary({ germany: 'DE', france: 'FR', usa: 'US' });

// A value declared separately must be marked `as const`.
const source = { germany: 'DE', france: 'FR', usa: 'US' } as const;
const codes = Dictionary(source);
```

Without `as const`, the values widen to `string` and you lose the precise
`'DE' | 'FR' | 'US'` value type that `values()` and `isOfType` depend on.

The source object is copied onto a `null`-prototype descriptor (no prototype
pollution), and keys/values/entries are memoized and frozen at construction.

Rules enforced at construction time:

- The source must have **at least one** key, otherwise a `PanicException` is
  thrown.
- Keys must not collide with the reserved descriptor keys (`isOfType`, `keys`,
  `values`, `entries`, `size`). A collision throws a `PanicException`.

### `Dictionary.fromLiteralUnion`

`Dictionary.fromLiteralUnion(union, source)` builds a `Dictionary` whose keys
are pinned to the members of an existing `LiteralUnion`. Use it when the
**union is the source of truth** and every dictionary must cover it — the
inverse of [the canonical pattern](#the-canonical-pattern-keys-flow-into-the-union),
where keys flow *out* of the dictionary into the union.

```ts
const Country = LiteralUnion(['germany', 'france', 'usa']);

const alpha2 = Dictionary.fromLiteralUnion(Country, {
  germany: 'DE',
  france: 'FR',
  usa: 'US',
});
```

It gives you two guarantees that a plain `Dictionary({ ... })` call does not:

**1. Exhaustiveness is enforced at compile time.** The `source` object must
provide an entry for *every* member of the union. Miss one and it is a type
error — you cannot forget a member:

```ts
// ❌ Argument of type '{ germany: string; france: string; }' is not
//    assignable to parameter of type 'Record<"germany" | "france" | "usa", …>'
const partial = Dictionary.fromLiteralUnion(Country, {
  germany: 'DE',
  france: 'FR',
});
```

The required keys come straight from the union you pass as the first argument,
so the dictionary can never silently drift behind the union.

> **Note — extra keys are not rejected.** Because `source` is captured through
> a generic (`const`) type parameter, TypeScript's excess-property check does
> not apply, so a stray key beyond the union's members is *not* a compile
> error. The factory guarantees *every member is present*, not *only members
> are present*. If you also need to forbid extras, add an explicit
> `satisfies Record<InferLiteralUnion<typeof Country>, V>` on the source.

**2. Values are captured as literals — no `as const` needed.** The factory uses
a `const` type parameter on the `source`, so value literals are preserved
without you having to annotate the object:

```ts
const alpha2 = Dictionary.fromLiteralUnion(Country, {
  germany: 'DE',
  france: 'FR',
  usa: 'US',
});

alpha2.germany;        // type: 'DE'  (not widened to string)
alpha2.values();       // type: NonEmptyReadonlyArray<'DE' | 'FR' | 'US'>
alpha2.isOfType('DE'); // narrows to 'DE' | 'FR' | 'US'
```

With a plain `Dictionary({ germany: 'DE', ... })` the values would still be
inferred as literals, but the keys are unchecked against any union. With
`fromLiteralUnion` you get *both*: exhaustive keys **and** literal values, in a
single call.

> The first argument is only used to drive the key type at compile time; the
> resulting descriptor is an ordinary `Dictionary` built from `source`. So all
> the members and methods below (`keys`, `values`, `entries`, `isOfType`,
> iteration, …) work exactly the same.

### Member access

Each key is exposed as a read-only property whose value is the projected value:

```ts
const codes = Dictionary({ germany: 'DE', france: 'FR', usa: 'US' });

codes.germany; // 'DE'
codes.usa;     // 'US'
```

### `keys(): NonEmptyReadonlyArray`

Returns the dictionary's keys as a non-empty `readonly` tuple, in insertion
order. The same memoized reference is returned on every call.

```ts
const codes = Dictionary({ germany: 'DE', france: 'FR', usa: 'US' });
codes.keys(); // ['germany', 'france', 'usa']
```

This is the primary bridge into `LiteralUnion`:

```ts
const Country = LiteralUnion(codes.keys());
```

### `values(): NonEmptyReadonlyArray`

Returns the projected values as a non-empty `readonly` tuple, in key order.
Memoized and frozen.

```ts
const codes = Dictionary({ germany: 'DE', france: 'FR', usa: 'US' });
codes.values(); // ['DE', 'FR', 'US']
```

### `entries(): NonEmptyReadonlyArray`

Returns `[key, value]` pairs as a non-empty `readonly` tuple. Each entry is
itself a frozen `readonly [K, T[K]]` tuple, and the key type is preserved
per-entry.

```ts
const codes = Dictionary({ germany: 'DE', france: 'FR', usa: 'US' });

for (const [name, code] of codes.entries()) {
  console.log(`${name} → ${code}`);
}
// germany → DE
// france → FR
// usa → US
```

### `isOfType(value: unknown): value is value`

Type guard that narrows an `unknown` value to one of the dictionary's
**values** (not its keys). It checks membership against the memoized value
list.

```ts
const codes = Dictionary({ germany: 'DE', france: 'FR', usa: 'US' });

function parseCode(input: unknown) {
  if (!codes.isOfType(input)) {
    throw new Error(`Unknown code: ${String(input)}`);
  }
  // input is now typed as 'DE' | 'FR' | 'US'
  return input;
}
```

### `size`

The number of entries in the dictionary.

```ts
const codes = Dictionary({ germany: 'DE', france: 'FR', usa: 'US' });
codes.size; // 3
```

### Iteration (`Symbol.iterator`)

The descriptor is iterable, yielding `[key, value]` entries in key order — so
it can be passed straight to `new Map(...)` or used in a `for...of` loop:

```ts
const codes = Dictionary({ germany: 'DE', france: 'FR', usa: 'US' });

const map = new Map(codes); // Map { 'germany' => 'DE', ... }
for (const [name, code] of codes) { /* ... */ }
```

The descriptor reports `Object.prototype.toString.call(codes)` as
`'[object Dictionary]'` via `Symbol.toStringTag`.

### `Dictionary` type helpers

| Type | Description |
| --- | --- |
| `DictionaryDescriptor<T>` | The full descriptor type (members + methods). |
| `DictionarySource<T>` | The accepted source shape (`Readonly<Record<string, T>>`). |
| `InferDictionaryKeys<T>` | The union of key literals. |
| `InferDictionaryValues<T>` | The union of value types. |
| `DictionaryEntry<T>` | The per-key `readonly [K, T[K]]` entry type. |
| `DictionaryMembers<T>` | The member record type. |
| `DictionaryMethods<T>` | The method portion of the descriptor. |
| `DictionaryKeyBase` | The base constraint for keys (`string`). |

---

## How `LiteralUnion` and `Dictionary` work together

The two primitives are designed to be used as a pair, and they divide the work
along one clear seam:

> **The `LiteralUnion` names things. The `Dictionary` encodes them.**

A `LiteralUnion` models the closed set of **nominal identities** in your
domain — the names a domain uses to refer to its members (countries, statuses,
roles, currencies, payment methods). These are always strings, because a name
is text: it is self-documenting at every call site, survives every transport
(JSON, URLs, env vars, DB columns) unchanged, and compares safely across module
boundaries.

A `Dictionary` holds the **projections** of those names — the encodings that
external systems care about. Apparently-numeric domains almost always reduce to
"a name with a numeric projection":

| External numeric form          | Nominal identity (`LiteralUnion`) | Numeric form lives in              |
| ------------------------------ | --------------------------------- | ---------------------------------- |
| HTTP status (`200`, `404`)     | `'ok'`, `'notFound'`, …           | `Dictionary<HttpStatus, number>`   |
| ISO 3166 numeric-3 (`276`=DE)  | `'germany'`, `'france'`, …        | `Dictionary<Country, number>`      |
| ISO 4217 numeric (`978`=EUR)   | `'eur'`, `'usd'`, …               | `Dictionary<Currency, number>`     |

### The canonical pattern: keys flow into the union

Build the `Dictionary` first (it holds the data), then derive the
`LiteralUnion` from its keys so both share a single source of truth:

```ts
const codes = Dictionary({ germany: 'DE', france: 'FR', usa: 'US' });
const Country = LiteralUnion(codes.keys());
type Country = InferLiteralUnion<typeof Country>;
```

Now each primitive does what it is best at:

```ts
// Pure data lookup — the Dictionary projects a name to its value.
codes.germany; // 'DE'

// Pure dispatch — the LiteralUnion runs code per member, exhaustively.
Country.match(c, {
  germany: () => '🇩🇪',
  france:  () => '🇫🇷',
  usa:     () => '🇺🇸',
});

// Dispatch that uses the projected value — match closes over the dictionary.
Country.match(c, {
  germany: (k) => `${k}: ${codes[k]}`, // 'germany: DE'
  france:  (k) => `${k}: ${codes[k]}`,
  usa:     (k) => `${k}: ${codes[k]}`,
});
```

### The union as a linchpin between representations

The canonical pattern above flows keys *out* of one dictionary into the union.
But a domain usually has **many** representations of the same entity — an
alpha-2 code, an ISO numeric code, a flag emoji, a wire format, a DB column.
The union is the right home for the **name**; each representation is a separate
`Dictionary`. The union then becomes the **linchpin** they all pivot around.

Think of `'germany'` as the hub of a wheel, with a spoke to each
representation. None of the spokes connect to each other directly — they all
connect through the name. Define the union *first*, then build each
representation with `Dictionary.fromLiteralUnion`, which forces every
dictionary to cover the union exhaustively:

```ts
const Country = LiteralUnion(['germany', 'france', 'usa']);

// Each representation must cover every member — forget one and it won't compile.
const alpha2  = Dictionary.fromLiteralUnion(Country, { germany: 'DE',  france: 'FR',  usa: 'US'  });
const numeric = Dictionary.fromLiteralUnion(Country, { germany: 276,   france: 250,   usa: 840   });
const flag    = Dictionary.fromLiteralUnion(Country, { germany: '🇩🇪', france: '🇫🇷', usa: '🇺🇸' });
```

Because every dictionary is keyed by the same union, the representations never
drift apart: adding a member to `Country` makes *all three* `fromLiteralUnion`
calls fail to compile until you supply the missing entry. Converting between
any two representations is always a two-step pivot — *encoding → name →
encoding* — and the name is the one fixed point they all agree on.

### Choosing between `match` and a `Dictionary` lookup

- If a name maps to a **fixed value**, reach for the `Dictionary`
  (`codes[name]`). It is a pure data lookup, allocation-free, and serializable.
- If a name needs to **run logic** (call a service, branch on more than the
  value, build something), reach for `LiteralUnion.match`. It guarantees
  exhaustiveness and gives per-branch narrowing.

### End-to-end example: guard, then dispatch

A typical boundary flow combines both primitives — validate untrusted input
with the union's guard, then project or dispatch:

```ts
const codes = Dictionary({ germany: 'DE', france: 'FR', usa: 'US' });
const Country = LiteralUnion(codes.keys());

function toAlpha2(input: unknown): string {
  if (!Country.isOfType(input)) {
    throw new Error(`Unknown country: ${String(input)}`);
  }
  // input: 'germany' | 'france' | 'usa'
  return codes[input]; // 'DE' | 'FR' | 'US'
}
```

Because the union is derived from the dictionary's keys, the two can never
drift out of sync: adding a country to `codes` automatically extends both the
union's members and the exhaustiveness check on every `match`.

---

## `Invariant`

An `Invariant` is a validation rule for an already-typed value: a function
`(value: TValue) => Result<void, TError>` that returns `Ok` when the value
satisfies the rule and `Err` when it does not. Invariants are the primary way
to express domain constraints on a [`Scalar`](#scalar) beyond what its decoder
can check (e.g. "this number must be positive", "this string must not be
empty").

### Creating an invariant

Call `Invariant` with a predicate and an error factory. The error factory
receives the offending value so it can produce context-rich errors:

```ts
import { Invariant } from '@typemint/data';

const isPositive = Invariant(
  (n: number) => n > 0,
  (n) => `Expected positive number, got ${n}`,
);

isPositive(5);   // Ok(void)
isPositive(-1);  // Err('Expected positive number, got -1')
```

Invariants compose freely via the static combinators below. A single
invariant can also be built from `Result.liftPredicate` when you already have
a predicate and an error factory available as separate values:

```ts
import { Result } from '@typemint/result';

const isNonEmpty = Result.liftPredicate(
  (s: string) => s.length > 0,
  () => 'EMPTY_STRING',
);
// (value: string) => Result<string, 'EMPTY_STRING'>
// assignable to Invariant<string, 'EMPTY_STRING'>
```

### `Invariant.and(first, ...rest)`

Fail-fast AND: runs each invariant left to right and returns the first `Err`
immediately, without evaluating the remaining invariants. Returns `Ok` only
when every invariant passes. The error type is the union of every individual
error type.

Use `and` when the first violation is enough to make the value unacceptable
and subsequent checks would be redundant or misleading.

```ts
const isInRange = Invariant.and(
  Invariant((n: number) => n > 0,   () => 'TOO_SMALL' as const),
  Invariant((n: number) => n < 100, () => 'TOO_LARGE' as const),
);

isInRange(50);   // Ok(void)
isInRange(-1);   // Err('TOO_SMALL')  — second invariant never runs
isInRange(200);  // Err('TOO_LARGE')
```

### `Invariant.andSettled(first, ...rest)`

Accumulating AND: runs every invariant regardless of earlier failures and
collects all errors into an array. Returns `Ok` only when every invariant
passes; otherwise returns `Err([...errors])` with one entry per failing
invariant. The error type is an array of the union of every individual error
type.

Use `andSettled` when you want to surface every violation at once — for
example, validating all fields of a form rather than stopping at the first
invalid one.

```ts
const validate = Invariant.andSettled(
  Invariant((n: number) => n > 0,       () => 'TOO_SMALL' as const),
  Invariant((n: number) => n < 100,     () => 'TOO_LARGE' as const),
  Invariant((n: number) => n % 2 === 0, () => 'NOT_EVEN'  as const),
);

validate(50);   // Ok(void)
validate(-3);   // Err(['TOO_SMALL', 'NOT_EVEN'])  — both violations reported
validate(200);  // Err(['TOO_LARGE', 'NOT_EVEN'])
```

### `Invariant.or(first, ...rest)`

Short-circuit OR: runs each invariant left to right and returns `Ok`
immediately on the first success, without evaluating the remaining invariants.
Returns the **last** `Err` only when every invariant fails. The error type is
the union of every individual error type.

Use `or` to express "at least one of these conditions must hold" — for
example, a value that is acceptable when it is either zero or a positive even
number.

```ts
const isNonZero = Invariant.or(
  Invariant((n: number) => n > 0, () => 'NOT_POSITIVE' as const),
  Invariant((n: number) => n < 0, () => 'NOT_NEGATIVE' as const),
);

isNonZero(5);   // Ok(void)  — first invariant passes, second never runs
isNonZero(-3);  // Ok(void)  — second invariant passes
isNonZero(0);   // Err('NOT_NEGATIVE')  — both fail, last error returned
```

Combinators compose freely, so complex rules can be expressed by nesting:

```ts
const isValidScore = Invariant.and(
  Invariant((n: number) => Number.isInteger(n), () => 'NOT_INTEGER' as const),
  Invariant.or(
    Invariant((n: number) => n === 0,   () => 'NOT_ZERO'     as const),
    Invariant((n: number) => n >= 10,   () => 'BELOW_MIN'    as const),
  ),
);
```

### `Invariant` type helpers

| Type | Description |
| ---- | ----------- |
| `Invariant<TValue, TError>` | The invariant function type: `(value: TValue) => Result<void, TError>`. |
| `InferInvariantError<T>` | Extracts the error type from an `Invariant`. |

```ts
const isPositive = Invariant(
  (n: number) => n > 0,
  () => 'NOT_POSITIVE' as const,
);

type Error = InferInvariantError<typeof isPositive>;
// type Error = 'NOT_POSITIVE'
```

---

## `Scalar`

A `Scalar` is a **branded primitive**: an ordinary `string`, `number`,
`bigint`, or `boolean` tagged with a phantom brand that makes it a distinct
nominal type. A `Scalar<'Email', string>` *is* a `string` at runtime — the
brand exists only in the type system — but the compiler treats it as its own
type that a plain `string` is not assignable to.

```ts
import { Scalar, InferScalarType } from '@typemint/data';

const isEmail = Invariant(
  (value: string) => value.includes('@'),
  () => 'NOT_EMAIL' as const,
);

const Email = Scalar('Email', 'string', { invariants: [isEmail] });
type Email = InferScalarType<typeof Email>; // Scalar<'Email', string>

const result = Email.parse('a@b.com'); // Result<Email, TypeMismatchError<…> | 'NOT_EMAIL'>
```

### Primitive obsession, and the states it lets in

*Primitive obsession* is modelling domain concepts with raw primitives — a user
id, an email, an age, and a discount percentage all typed as `string` or
`number`. The types compile, but they are all the same type, so nothing stops
you from passing the wrong one:

```ts
function chargeUser(userId: string, amountCents: number) { /* … */ }

// All four arguments are `string`/`number`, so the compiler is happy —
// even though the id and the amount are swapped, and the "amount" is negative.
chargeUser(String(-999), Number(userIdFromSomewhere));
```

The deeper problem is that a raw primitive can represent states your domain
never should: an email with no `@`, a negative age, a percentage above 100, an
empty username. These are **unrepresentable states** — values the type
*permits* but the domain *forbids* — and every function that receives a raw
primitive has to re-check for them (or, more often, forgets to).

A `Scalar` closes both gaps at once by tying an **invariant** to a **type**:

- The invariant runs **once**, at the boundary, when the value is constructed.
- The brand then travels with the value as a *type-level certificate* that the
  invariant held. A function that asks for an `Email` cannot be handed a raw
  `string`, a `UserId`, or an unvalidated one — only a value that already went
  through `Email.parse`/`Email.of`.

```ts
function chargeUser(userId: UserId, amount: PositiveCents) { /* … */ }

chargeUser(rawString, rawNumber);
//         ^^^^^^^^^ Argument of type 'string' is not assignable to 'UserId'.
```

Once a value is branded, the "is this a valid email / positive amount / non-empty
name" question is answered by the type, not re-litigated at every call site. The
illegal states stop being representable past the boundary.

### Creating a scalar

Call `Scalar(name, kind, config?)`:

- **`name`** — the brand. Two scalars over the same primitive but with different
  names are distinct, non-interchangeable types (`Scalar('UserId', 'string')`
  is not a `Scalar('Email', 'string')`).
- **`kind`** — the primitive to refine, one of `'string' | 'number' | 'bigint'
  | 'boolean'`. It is recognized at runtime with a direct `typeof` check — no
  decoder or codec required.
- **`config`** — optional; declares `invariants`, custom `methods`, and
  `consts` (all covered below).

```ts
// Bare scalar — brands the primitive, checks nothing beyond its `typeof`.
const UserId = Scalar('UserId', 'string');

const id = UserId.parse(req.params.id);
// Result<Scalar<'UserId', string>, TypeMismatchError<string, unknown>>
```

Only `string`, `number`, `bigint`, and `boolean` are allowed. The restriction
is deliberate: a brand certifies "this value passed its invariants", which is
only honest if the value **cannot change** after the check. Primitives are
immutable and compare by value (`===`), so branded scalars are safe as map
keys, set members, and in equality checks. Mutable value objects (`Date`,
`URL`, `RegExp`) are excluded — brand their canonical primitive serialization
instead (e.g. a `BirthDate` as an ISO-8601 `string`) and reconstruct the rich
object on demand. Plain records belong in a `Struct`, not a `Scalar`.

### Refine, never transform

A scalar **refines** a value; it never **transforms** it. Construction
validates the input against the invariants and brands it *as-is* — the value is
never trimmed, lower-cased, parsed, or otherwise normalized. Representation
changes belong to a codec layer, not to a scalar. This is what keeps the brand
honest: the branded value is byte-for-byte the value you validated.

### `of(value: RemoveAllTags<TRoot>)`

Brands a value that is **already** the correct primitive, running the full
invariant chain fail-fast (the first failing invariant short-circuits). Use it
when the input type is statically known to be the underlying primitive; use
[`parse`](#parsevalue-unknown) when it is `unknown`.

```ts
const r = Email.of('a@b.com'); // Result<Email, 'NOT_EMAIL'>
if (r.isOk()) {
  r.value; // branded Email
}

Email.of('nope'); // Err('NOT_EMAIL')
```

### `parse(value: unknown)`

The entry point for **untrusted input**. It first checks the value is the right
primitive (returning a `TypeMismatchError` if not), then applies the invariants
fail-fast. This is `of` preceded by a `typeof` recognition step, so the error
channel gains the `TypeMismatchError`.

```ts
const r = Email.parse(JSON.parse(body).email);
// Result<Email, TypeMismatchError<string, unknown> | 'NOT_EMAIL'>

if (r.isErr()) {
  // Either "not a string" or "NOT_EMAIL".
}
```

### `validate(value: RemoveAllTags<TRoot>)`

Like `of`, but **accumulates every** invariant failure instead of stopping at
the first, returning them as a `readonly` array. Use it to report all problems
with a value at once — form validation is the archetypal case.

```ts
const r = Password.validate(input);
if (r.isErr()) {
  r.error; // e.g. ['TOO_SHORT', 'NO_DIGIT'] — every failing rule, not just the first
}
```

### `is(value: unknown): value is Scalar`

Type guard that narrows an `unknown` value to the branded scalar when it is both
the right primitive and satisfies every invariant. Equivalent to
`parse(value).isOk()`.

```ts
if (Email.is(x)) {
  // x: Scalar<'Email', string>
}
```

### `unwrap(value: Scalar)`

Strips **every** brand off a value and returns the underlying primitive — the
inverse of `of`. Because brands are phantom, this is identity at runtime and a
pure type-level operation; use it to hand a validated value to an API that wants
the bare primitive, without widening through `as`.

```ts
const raw: string = Email.unwrap(emailValue); // no cast, no brand
```

### Adding invariants

Invariants are how a scalar rules out unrepresentable states. Pass them in
`config.invariants`; they run in `of`, `parse`, and `validate`, and their error
types flow into the descriptor's error channel automatically. Declare the array
inline (or `as const`) so it stays a readonly tuple — that is what lets the
error union be inferred precisely instead of collapsing to `any`.

```ts
const isNonEmpty = Invariant(
  (s: string) => s.length > 0,
  () => 'EMPTY' as const,
);
const maxLen = Invariant(
  (s: string) => s.length <= 32,
  () => 'TOO_LONG' as const,
);

const Username = Scalar('Username', 'string', {
  invariants: [isNonEmpty, maxLen],
});
type UsernameError = InferScalarInvariantError<typeof Username>;
// 'EMPTY' | 'TOO_LONG'

Username.of('');                         // Err('EMPTY')      — fail-fast
Username.validate('a'.repeat(40));       // Err(['TOO_LONG']) — all failures
Username.of('alice');                    // Ok(branded Username)
```

Because invariants are ordinary [`Invariant`](#invariant) values, they compose
with `Invariant.and`/`or`/`andSettled` before you ever hand them to a scalar:

```ts
const isPercentage = Invariant.and(
  Invariant((n: number) => n >= 0,   () => 'BELOW_MIN' as const),
  Invariant((n: number) => n <= 100, () => 'ABOVE_MAX' as const),
);

const Percentage = Scalar('Percentage', 'number', {
  invariants: [isPercentage],
});
```

### Methods and constants

`config.methods` hangs extra functions off the descriptor. Each method takes a
validated branded value as its first argument, so only values that passed the
invariants can be passed in. The callback receives `self` — the descriptor with
its built-in members — so a method can reuse `self.of`, `self.parse`, etc.

`config.consts` attaches static data that travels with the type.

```ts
const Email = Scalar('Email', 'string', {
  invariants: [isEmail],
  methods: (self) => ({
    getDomain: (email: InferScalarType<typeof self>) => email.split('@')[1],
  }),
  consts: { MAX_LENGTH: 254 },
});

Email.MAX_LENGTH; // 254

const parsed = Email.parse('a@b.com');
if (parsed.isOk()) {
  Email.getDomain(parsed.value); // 'b.com'
}
```

A method or const name that collides with a **built-in** member (`name`, `of`,
`parse`, `validate`, `is`, `unwrap`, `extend`) is a compile error. A collision
between a method and a const (the two maps are checked independently) surfaces
at construction time as a `PanicException`.

### `extend`: refining a scalar

`extend` derives a stricter scalar from an existing one. The derived scalar's
root is the parent's *branded* type, so brands **nest** and a derived value
stays assignable to its parent — a `UInt` is still an `Int`. Invariants
**compose**: the derived scalar enforces the parent's invariants *and* the new
ones, and its error channel is the union of both.

```ts
const isInteger = Invariant(
  (n: number) => Number.isInteger(n),
  () => 'NOT_INTEGER' as const,
);
const isNonNegative = Invariant(
  (n: number) => n >= 0,
  () => 'NEGATIVE' as const,
);

const Int = Scalar('Int', 'number', { invariants: [isInteger] });
const UInt = Int.extend('UInt', { invariants: [isNonNegative] });
// UInt: ScalarDescriptor<'UInt', Scalar<'Int', number>, 'NOT_INTEGER' | 'NEGATIVE'>

UInt.of(2.5); // Err('NOT_INTEGER') — the inherited invariant still runs
UInt.of(-1);  // Err('NEGATIVE')
UInt.of(5);   // Ok(branded UInt)
```

There is **no constructor chain**: `extend` re-checks the inherited invariants,
so you build a derived value in one call from the raw primitive
(`UInt.of(5)`) — never `UInt.of(Int.of(5).value)`. `unwrap` peels every layer,
so `UInt.unwrap` yields a plain `number`.

Methods and consts are **not** inherited — the derived scalar carries only those
it declares. The parent's own methods remain reachable on a derived value
through the parent descriptor (subtyping), e.g. `Int.someMethod(uintValue)`.

### `Scalar` type helpers

| Type | Description |
| ---- | ----------- |
| `Scalar<TName, TType>` | The branded value type: `TType & Tag<TName>`. |
| `ScalarDescriptor<TName, TRoot, TError>` | The runtime handle returned by the factory (`of`, `parse`, …). |
| `ScalarConfig<…>` | The optional third argument: `invariants`, `methods`, `consts`. |
| `ScalarPrimitive` | The primitives a scalar may refine (`string \| number \| bigint \| boolean`). |
| `ScalarPrimitiveKind` | The runtime `kind` discriminant (`'string' \| 'number' \| …`). |
| `InferScalarType<T>` | The branded `Scalar` type produced by a descriptor. |
| `InferScalarRoot<T>` | The underlying primitive beneath every brand. |
| `InferScalarInvariantError<T>` | The union of errors the scalar's invariants can raise. |
| `ScalarFactory<TName, TKind>` | The type of the `Scalar` factory bound to a name and kind. |

```ts
const Email = Scalar('Email', 'string', { invariants: [isEmail] });

type Email = InferScalarType<typeof Email>;             // Scalar<'Email', string>
type Root = InferScalarRoot<typeof Email>;              // string
type Err = InferScalarInvariantError<typeof Email>;     // 'NOT_EMAIL'
```

## License

MIT
