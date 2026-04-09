import { assert } from "./assert.js";
import { Discriminant } from "./discriminant.js";

const KIND_KEY = "kind";

export const Kind = Discriminant(KIND_KEY);
export type KindDescriptor = typeof Kind;
export type Kind<TKind extends string> = Discriminant<typeof KIND_KEY, TKind>;

/**
 * Assert that the value is a kind.
 *
 * @param value - The value to assert.
 * @param kind - The kind to assert.
 * @param message - The message to throw if the value is not a kind.
 * @throws {AssertException} - If the value is not a kind.
 */
export function assertKind<TKind extends string>(
  value: unknown,
  kind: TKind,
  message: string = `Value is not a kind of "${kind}".`,
): asserts value is Kind<TKind> {
  assert(Kind.isOf(value, kind), message);
}
