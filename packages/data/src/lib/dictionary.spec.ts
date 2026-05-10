import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  Dictionary,
  type DictionaryDescriptor,
  type InferDictionaryKeys,
  type InferDictionaryValues,
} from './dictionary.js';
import { PanicException } from '@typemint/core';

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
      expectTypeOf<Descriptor>().toExtend<{
        readonly a: 1;
        readonly b: 2;
        readonly c: 3;
      }>();
    });

    it('should expose the accessor for the keys of the given record', () => {
      // Arrange
      const record = { a: 1, b: 2, c: 3 } as const;

      // Act
      const descriptor = Dictionary(record);
      // Assert
      expectTypeOf<(typeof descriptor)['keys']>().toEqualTypeOf<
        () => readonly InferDictionaryKeys<typeof record>[]
      >();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: Dictionary factory
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Dictionary factory', () => {
    it('should create a dictionary descriptor from a record', () => {
      // Arrange
      const record = { a: 1, b: 2, c: 3 } as const;

      // Act
      const descriptor = Dictionary(record);
      // Assert
      expectTypeOf<typeof descriptor>().toEqualTypeOf<
        DictionaryDescriptor<typeof record>
      >();
    });

    it('should expose the keys of the given record', () => {
      // Arrange
      const record = { a: 1, b: 2, c: 3 } as const;

      // Act
      const descriptor = Dictionary(record);
      // Assert
      expect(descriptor.a).toBe(1);
      expect(descriptor.b).toBe(2);
      expect(descriptor.c).toBe(3);
    });

    it('should throw a PanicException if the given record is empty', () => {
      // Arrange
      const record = {} as const;

      // Act
      const act = () => Dictionary(record);
      // Assert
      expect(act).toThrow(PanicException);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: Dictionary methods
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Dictionary methods', () => {
    it('should expose the keys of the given record', () => {
      // Arrange
      const record = { a: 1, b: 2, c: 3 } as const;

      // Act
      const descriptor = Dictionary(record);
      // Assert
      expect(descriptor.keys()).toEqual(['a', 'b', 'c']);
    });

    it('should return the keys of the given record in the order of the given record', () => {
      // Arrange
      const record = { a: 1, b: 2, c: 3 } as const;

      // Act
      const descriptor = Dictionary(record);
      // Assert
      expect(descriptor.keys()).toEqual(['a', 'b', 'c']);
    });

    it('should return a frozen array of the keys of the given record', () => {
      // Arrange
      const record = { a: 1, b: 2, c: 3 } as const;

      // Act
      const descriptor = Dictionary(record);
      // Assert
      expect(Object.isFrozen(descriptor.keys())).toBe(true);
    });

    it('should return the same reference on every call', () => {
      // Arrange
      const record = { a: 1, b: 2, c: 3 } as const;

      // Act
      const descriptor = Dictionary(record);
      // Assert
      expect(descriptor.keys()).toBe(descriptor.keys());
    });
  });
});
