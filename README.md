# TypeMint

TypeScript libraries for algebraic data modeling, explicit error handling, and
typed data structures. TypeMint helps you push more of your domain's invariants
into the type system — closed sets of names, fallible operations, optional
values, refined scalars — so that illegal states become unrepresentable and
runtime surprises turn into compile-time errors.

This repo is a **pnpm workspace** with three published packages under
`packages/`. Each builds on the one above it:

| Package | Depends on | Description |
| ------- | ---------- | ----------- |
| [`@typemint/core`](./packages/core) — [README](./packages/core/README.md) | — | Low-level building blocks: discriminated unions, object mixins, `flow`/`struct`/`tuple` pipelines, assertions, type witnesses, and runtime proof-of-construction. |
| [`@typemint/result`](./packages/result) — [README](./packages/result/README.md) | `core` | `Result` and `Option` algebraic types with dual data-first / data-last APIs, plus JSON-friendly "like" serialization shapes. |
| [`@typemint/data`](./packages/data) — [README](./packages/data/README.md) | `core`, `result` | Typed data structures: `LiteralUnion`, `Dictionary`, `Invariant`, and `Scalar`. |

## What's inside

### [`@typemint/core`](./packages/core/README.md)

The foundational primitives the rest of the ecosystem builds on. Intentionally
small — every export is a low-level tool for constructing, inspecting, and
dispatching over typed data.

- **Discriminated unions** — `Discriminant` (construction, guards, and
  exhaustive matching for tagged unions) and the `Kind` convenience alias.
- **Object mixins** — `WithCode`, `WithMessage`, and `WithDetail` for composing
  standard typed properties onto object shapes.
- **Pipelines** — `flow`, `struct` (`.required` / `.partial` / `.merge`),
  `tuple`, and `identity` for composing unary operators; `FlowOperator` type.
- **Assertions** — `assert`, `assertDefined`, and `AssertException`.
- **Records** — `isRecord` / `assertRecord` guards.
- **Type witnesses** — `Witness` / `witness` and `TypeDescriptor` for carrying
  a type as a value to drive inference.
- **Runtime proof-of-construction** — `Stamp` for verifying an object came from a
  specific factory.
- **Errors** — `PanicException` for unrecoverable invariant violations.

### [`@typemint/result`](./packages/result/README.md)

Two algebraic data types that replace thrown exceptions and `null`/`undefined`
with explicit, composable values.

- **`Result<T, E>`** — `Ok` / `Err` tagged union for fallible operations.
- **`Option<T>`** — `Some` / `None` tagged union for optional values.
- **Dual APIs** — every operation is available both **data-first** (instance
  methods for readable chains) and **data-last** (curried operators for
  point-free `pipe` / `flow` pipelines).
- **"Like" shapes** — `ResultLike` / `OptionLike` plain-object forms for
  transport, logging, and JSON serialization.
- **Assertions** — `assertOk`, `assertErr`, `assertSome`, `assertNone`.

### [`@typemint/data`](./packages/data/README.md)

Higher-level data structures for modeling closed sets of named values and
refined primitives. Guiding principle: **names are strings, encodings are
dictionaries.**

- **`LiteralUnion`** — a runtime descriptor for a closed set of string literals
  (countries, statuses, roles, currencies…). Type guards, parsing, exhaustive
  matching, and iteration.
- **`Dictionary`** — a frozen, read-only projection mapping each name to a fixed
  value (an HTTP status number, an ISO code, an emoji, a label).
- **`Invariant`** — composable validation rules (`and`, `or`, `andSettled`),
  with built-in string and number invariants.
- **`Scalar`** — refined primitive types that fight primitive obsession, with
  parse / validate / unwrap and invariant-based refinement via `extend`.

## Requirements

- [Node.js](https://nodejs.org/) and [pnpm](https://pnpm.io/) (version pinned in
  the root `packageManager` field).

## Install

```bash
pnpm install
```

## Common commands

### Test

```bash
pnpm test              # run tests across the workspace
pnpm test:coverage     # run once with coverage
```

Run tests for a single package (see also each package's `precommit:check`):

```bash
pnpm --filter @typemint/data test
```

### Lint & format

TypeMint uses [oxlint](https://oxc.rs/docs/guide/usage/linter.html) and
[oxfmt](https://oxc.rs/docs/guide/usage/formatter) — not eslint/prettier.

```bash
pnpm lint              # lint the whole repo
pnpm fmt               # format in place
pnpm fmt:check         # check formatting only

pnpm --filter @typemint/core lint   # lint one package
```

### Build

Each package compiles with `tsc` into `dist/`.

```bash
pnpm -r run build                     # build all packages
pnpm --filter @typemint/result build  # build one package
```

### Changelog & versioning ([Changesets](https://github.com/changesets/changesets))

```bash
pnpm exec changeset          # record what changed (creates a file under .changeset/)
pnpm exec changeset version  # apply pending changesets: bump versions + update CHANGELOGs
pnpm exec changeset publish  # publish to npm (after building, once versions are set)
```

## License

MIT — see each package's `package.json`.
