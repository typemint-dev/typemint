import { describe, expectTypeOf, it } from 'vitest';
import type {
  DictionaryDescriptor,
  InferDictionaryKeys,
  InferDictionaryValues,
} from './dictionary.js';

describe('(unit) Dictionary', () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: Infer dictionary keys
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Infer dictionary keys from a record', () => {
    it('should infer the keys of the given record', () => {
      // Arrange
      const record = { a: 1, b: 2, c: 3 } as const;
      // Act
      type Keys = InferDictionaryKeys<typeof record>;
      // Assert
      expectTypeOf<Keys>().toEqualTypeOf<'a' | 'b' | 'c'>();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: Infer dictionary values
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Infer dictionary values from a record', () => {
    it('should infer the values of the given record', () => {
      // Arrange
      const record = { a: 1, b: 2, c: 3 } as const;

      // Act
      type Values = InferDictionaryValues<typeof record>;
      // Assert
      expectTypeOf<Values>().toEqualTypeOf<1 | 2 | 3>();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: Dictionary descriptor
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Dictionary descriptor', () => {
    it('should be a record with the keys of the given record', () => {
      // Arrange
      const record = { a: 1, b: 2, c: 3 } as const;

      // Act
      type Descriptor = DictionaryDescriptor<typeof record>;
      // Assert
      expectTypeOf<Descriptor>().toEqualTypeOf<{
        readonly a: 1;
        readonly b: 2;
        readonly c: 3;
      }>();
    });
  });
});
