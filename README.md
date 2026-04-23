# TypeMint

TypeScript libraries for algebraic data modeling, explicit error handling, and typed data.

This repo is a **pnpm workspace** with three published packages under `packages/`:

| Package | Description |
| --------| ------------|
| [`@typemint/core`](./packages/core) | Low-level building blocks: discriminated unions, kinds, `flow`, assertions, and small object shapes. |
| [`@typemint/result`](./packages/result) | `Result` and `Option` types, pipelines, and JSON-friendly “like” shapes. Depends on **core**. |
| [`@typemint/data`](./packages/data) | Typed data structures. Depends on **core**. |

- **Test runner:** [Vitest](https://vitest.dev/) (root runs tests across the workspace).
- **Lint / format:** [oxlint](https://oxc.rs/docs/guide/usage/linter.html) and [oxfmt](https://oxc.rs/docs/guide/usage/formatter).
- **Releases & changelogs:** [Changesets](https://github.com/changesets/changesets) (see `.changeset/`).

## Requirements

- [Node.js](https://nodejs.org/) and [pnpm](https://pnpm.io/) (version pinned in the root `packageManager` field).

## Install

```bash
pnpm install
```

## Common commands

### Lint

Lint the whole repository from the root:

```bash
pnpm lint
```

Lint a single package (example):

```bash
pnpm --filter @typemint/core lint
```

### Build

Compile all workspace packages (each package runs `tsc` into `dist/`):

```bash
pnpm -r run build
```

Build one package:

```bash
pnpm --filter @typemint/result build
```

### Changelog and versioning (Changesets)

Record what changed (interactive prompt; creates a file under `.changeset/`):

```bash
pnpm exec changeset
```

When you are ready, apply pending changesets—bump `package.json` versions and update each package `CHANGELOG.md`:

```bash
pnpm exec changeset version
```

Publishing to npm (after building and when versions are set) is typically:

```bash
pnpm exec changeset publish
```

## Tests and formatting

- Run tests: `pnpm test` or `pnpm test:coverage` at the root.
- Format: `pnpm fmt` (check only: `pnpm fmt:check`).

## License

See each package’s `package.json` (MIT for published packages in this monorepo).
