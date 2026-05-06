/**
 * The type of literal union members which the union can be built from.
 */
export type LiteralUnionMemberBase =
  | string
  | number
  | bigint
  | boolean
  | symbol;

/**
 * Derive a literal union from a tuple of literal union members.
 *
 * @example
 *
 * ```ts
 * const tuple = [1, 2, 3] as const;
 * type Union = LiteralUnionFrom<typeof tuple>;
 * // type Union = 1 | 2 | 3
 * ```
 */
export type LiteralUnionFrom<
  T extends readonly [LiteralUnionMemberBase, ...LiteralUnionMemberBase[]],
> = T[number];
