# Discriminant

**Beyond `switch`: Discriminated Unions as a First-Class Abstraction in TypeScript**

TypeScript's discriminated unions are one of its best features -- and one of its most fragile. The discriminant key is
a string repeated across type declarations, object literals, switch statements, and type guards. Nothing in the language
ties them together. Rename the key in one place and miss another, and you get a runtime `undefined`. Add a variant to
the union, and the `switch` stays blissfully under-armed.

This article walks through a small abstraction -- a `Discriminant` descriptor -- that collocates the key declaration,
object tagging, type guarding, and exhaustive dispatch behind a single, well-typed entry point.

## Abstracting the Discriminant

The type-level foundation is a mapped type that produces an object with a single computed key:

```typescript
type Discriminant<TKey extends PropertyKey, TVal extends string> = {
  [K in TKey]: TVal;
};
```

`Discriminant<'__kind', 'user'>` resolves to `{ __kind: 'user' }` -- the minimal shape needed to participate in a union.

A factory function binds a _descriptor_ to a specific key, chosen once and threaded through every subsequent operation
by the type system:

```typescript
const Kind = Discriminant("__kind");
```

No repetition. No room for typos. If the key changes, it changes in one place.

## Formalizing Object Construction

With the descriptor in hand, creating tagged objects becomes declarative:

```typescript
const raccoon = {
  ...Kind.of("raccoon"),
  growl: () => "growl",
} as const;

const dog = {
  ...Kind.of("dog"),
  bark: () => "bark",
} as const;
```

`Kind.of('raccoon')` returns `{ __kind: 'raccoon' }` with its literal type fully preserved. Spreading it in merges the tag
with the variant payload -- no manual annotation required. Every variant is constructed through the same descriptor,
so the key can never drift.

The descriptor also provides inspection utilities: `isOfType(value)` narrows an unknown to "carries this key,"
`isOf(value, 'raccoon')` narrows to a specific variant, and `getKey(value)` retrieves the tag with its literal type intact.

## Exhaustive Matching

Construction and inspection solve half the problem. The other half is dispatch. The `match` method guarantees at compile
time that every variant is handled:

```typescript
type Animal = typeof raccoon | typeof dog;
const input: Animal = raccoon as Animal;

const sound = Kind.match(input, {
  raccoon: (v) => v.growl(),
  dog: (v) => v.bark(),
});
// sound: string = 'growl'
```

The type signature does the heavy lifting:

```typescript
match<
  TRecord extends Discriminant<TKey, string>,
  THandlers extends {
    [K in TRecord[TKey]]: (
      value: Extract<TRecord, Discriminant<TKey, K>>,
    ) => unknown;
  },
>(
  value: TRecord,
  handlers: THandlers,
): ReturnType<THandlers[TRecord[TKey]]>;
```

Three things happen here:

1. **Exhaustiveness.** `THandlers` maps over every discriminant value in the union. Forget a variant and the compiler
   rejects the call -- no `default` clause needed.
2. **Narrowing.** Each handler receives `Extract<TRecord, Discriminant<TKey, K>>` -- the specific variant, not the full
   union. You get `growl` in the raccoon handler and `bark` in the dog handler without casting.
3. **Return type inference.** The result type is the union of all handler return types. If handlers return literal
   constants (`as const`), those literals are preserved.

At runtime, it is five lines: look up the handler by tag, call it, or throw a `PanicException` if the value escaped the
type system (deserialization boundaries, unsafe casts). In well-typed code, that branch is dead.

## Why This Matters

A `switch` works until it doesn't. Unions grow, keys drift across modules, ad-hoc type guards accumulate, and the
implicit `undefined` from a missing branch ships to production. The `Discriminant` descriptor does not replace
TypeScript's narrowing -- it _encapsulates_ it. Four concerns that are normally scattered across the codebase
(key declaration, object tagging, type guarding, exhaustive dispatch) live behind one well-typed entry point.

That is not ceremony. That is cohesion.

---

_Code is from [`@typemint/core`](../src/discriminant.ts). The `Discriminant` descriptor is designed as a building block for higher-level constructs, but it stands on its own as a useful primitive for any project that takes its domain modeling seriously._
