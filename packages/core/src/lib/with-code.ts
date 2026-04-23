import { assert, assertRecord, Discriminant } from "../index.js";

export type WithCode<TCode extends string> = Discriminant<"code", TCode>;
export const WithCode = Discriminant("code");

export function assertWithCode<TCode extends string>(
  value: unknown,
  code: TCode,
  message: string | (() => string) = `Value is not of code ${code}`,
): asserts value is WithCode<TCode> {
  assertRecord(value);
  assert(WithCode.isOf(value, code), message);
}
