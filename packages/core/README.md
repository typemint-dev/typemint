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

| Export           | Purpose                                                                                        |
| ---------------- | ---------------------------------------------------------------------------------------------- |
| `Discriminant`   | Factory for discriminated union tags -- construction, guards, and exhaustive matching.         |
| `isRecord`       | Type guard that narrows `unknown` to `Record<PropertyKey, unknown>`.                           |
| `PanicException` | Error class for unrecoverable invariant violations (the runtime backstop for the type system). |

## Quick Example

```typescript
import { Discriminant } from "@typemint/core";

const Kind = Discriminant("kind");

const raccoon = { ...Kind.from("raccoon"), growl: () => "growl" } as const;
const dog = { ...Kind.from("dog"), bark: () => "bark" } as const;

type Animal = typeof raccoon | typeof dog;

const sound = Kind.match(raccoon as Animal, {
  raccoon: (v) => v.growl(),
  dog: (v) => v.bark(),
});

console.log(sound); // 'growl'
```

## Documentation

- [Discriminant](./docs/discriminant.md) -- in-depth walkthrough of the discriminant abstraction, object construction, and exhaustive pattern matching.

## License

MIT
