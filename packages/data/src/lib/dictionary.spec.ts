import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  Dictionary,
  type DictionaryDescriptor,
  type DictionaryEntry,
  type InferDictionaryKeys,
  type InferDictionaryValues,
} from './dictionary.js';
import { PanicException, type NonEmptyReadonlyArray } from '@typemint/core';
import { LiteralUnion } from './literal-union.js';

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

    it('should infer the keys from a dictionary descriptor', () => {
      // Arrange
      const record = { a: 1, b: 2, c: 3 } as const;
      type Descriptor = DictionaryDescriptor<typeof record>;

      // Act
      type Keys = InferDictionaryKeys<Descriptor>;
      // Assert
      expectTypeOf<Keys>().toEqualTypeOf<'a' | 'b' | 'c'>();
    });

    it('should infer the keys from a live descriptor instance without leaking reserved keys', () => {
      // Arrange
      const descriptor = Dictionary({ a: 1, b: 2, c: 3 } as const);

      // Act
      type Keys = InferDictionaryKeys<typeof descriptor>;
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

    it('should infer the values from a dictionary descriptor', () => {
      // Arrange
      const record = { a: 1, b: 2, c: 3 } as const;
      type Descriptor = DictionaryDescriptor<typeof record>;

      // Act
      type Values = InferDictionaryValues<Descriptor>;
      // Assert
      expectTypeOf<Values>().toEqualTypeOf<1 | 2 | 3>();
    });

    it('should infer the values from a live descriptor instance without leaking method types', () => {
      // Arrange
      const descriptor = Dictionary({ a: 1, b: 2, c: 3 } as const);

      // Act
      type Values = InferDictionaryValues<typeof descriptor>;
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
      type GetKeys = (typeof descriptor)['keys'];
      // Assert
      expectTypeOf<GetKeys>().toEqualTypeOf<
        () => NonEmptyReadonlyArray<'a' | 'b' | 'c'>
      >();
    });

    it('should expose the accessor for the values of the given record', () => {
      // Arrange
      const record = { a: 1, b: 2, c: 3 } as const;

      // Act
      const descriptor = Dictionary(record);
      type GetValues = (typeof descriptor)['values'];
      // Assert
      expectTypeOf<GetValues>().toEqualTypeOf<
        () => NonEmptyReadonlyArray<InferDictionaryValues<typeof record>>
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

    it('should throw a PanicException if the given record has a key that collides with a reserved descriptor key "isOfType"', () => {
      // Arrange
      const record = { a: 1, b: 2, c: 3, isOfType: 'isOfType' } as const;
      // Act
      const act = () => Dictionary(record);
      // Assert
      expect(act).toThrow(PanicException);
    });

    it('should throw a PanicException if the given record has a key that collides with a reserved descriptor key "keys"', () => {
      // Arrange
      const record = { a: 1, b: 2, c: 3, keys: 'keys' } as const;
      // Act
      const act = () => Dictionary(record);
      // Assert
      expect(act).toThrow(PanicException);
    });

    it('should throw a PanicException if the given record has a key that collides with a reserved descriptor key "values"', () => {
      // Arrange
      const record = { a: 1, b: 2, c: 3, values: 'values' } as const;
      // Act
      const act = () => Dictionary(record);
      // Assert
      expect(act).toThrow(PanicException);
    });

    it('should throw a PanicException if the given record has a key that collides with a reserved descriptor key "entries"', () => {
      // Arrange
      const record = { a: 1, b: 2, c: 3, entries: 'entries' } as const;
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

    it('should infer the keys of the given record into a union type', () => {
      // Arrange
      const record = { a: 1, b: 2, c: 3 } as const;

      // Act
      const keys = Dictionary(record).keys();
      // Assert
      expectTypeOf<typeof keys>().toExtend<readonly ('a' | 'b' | 'c')[]>();
    });

    it('should have the isOfType method', () => {
      // Arrange
      const descriptor = Dictionary({ a: 1, b: 2, c: 3 } as const);
      // Assert
      expect(descriptor.isOfType).toBeTypeOf('function');
      expectTypeOf<typeof descriptor.isOfType>().toEqualTypeOf<
        (value: unknown) => value is 1 | 2 | 3
      >();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: Dictionary values
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Dictionary values', () => {
    it('should expose the values of the given record', () => {
      // Arrange
      const record = { a: 1, b: 2, c: 3 } as const;

      // Act
      const descriptor = Dictionary(record);
      // Assert
      expect(descriptor.values()).toEqual([1, 2, 3]);
    });

    it('should return the values of the given record in the order of the given record', () => {
      // Arrange
      const record = { a: 1, b: 2, c: 3 } as const;

      // Act
      const descriptor = Dictionary(record);
      // Assert
      expect(descriptor.values()).toEqual([1, 2, 3]);
    });

    it('should return a frozen array of the values of the given record', () => {
      // Arrange
      const record = { a: 1, b: 2, c: 3 } as const;

      // Act
      const descriptor = Dictionary(record);
      // Assert
      expect(Object.isFrozen(descriptor.values())).toBe(true);
    });

    it('should return the same reference on every call', () => {
      // Arrange
      const record = { a: 1, b: 2, c: 3 } as const;

      // Act
      const descriptor = Dictionary(record);
      // Assert
      expect(descriptor.values()).toBe(descriptor.values());
    });

    it('should infer the values of the given record into a union type', () => {
      // Arrange
      const record = { a: 1, b: 2, c: 3 } as const;

      // Act
      const values = Dictionary(record).values();
      type Values = typeof values;
      // Assert
      expectTypeOf<Values>().toEqualTypeOf<
        NonEmptyReadonlyArray<InferDictionaryValues<typeof record>>
      >();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: Dictionary size
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Dictionary size', () => {
    it('should return the number of keys in the given record', () => {
      // Arrange
      const record = { a: 1, b: 2, c: 3 } as const;

      // Act
      const descriptor = Dictionary(record);
      // Assert
      expect(descriptor.size).toBe(3);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: Dictionary iterator
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Dictionary iterator', () => {
    it('should yield correlated [key, value] tuples when iterated', () => {
      const dict = Dictionary({ a: 1, b: 2, c: 3 } as const);
      expect([...dict]).toEqual([
        ['a', 1],
        ['b', 2],
        ['c', 3],
      ]);
    });

    it('should be re-iterable', () => {
      const dict = Dictionary({ a: 1, b: 2 } as const);
      expect([...dict]).toEqual([...dict]);
    });

    it('should infer correlated entry tuples', () => {
      const dict = Dictionary({ a: 1, b: 2, c: 3 } as const);
      type Entry = ReturnType<(typeof dict)['entries']>[number];
      expectTypeOf<Entry>().toEqualTypeOf<
        readonly ['a', 1] | readonly ['b', 2] | readonly ['c', 3]
      >();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: Dictionary Entries
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Dictionary entries', () => {
    it('should return the string "Dictionary"', () => {
      // Arrange
      const descriptor = Dictionary({ a: 1, b: 2, c: 3 } as const);
      // Assert
      expect(descriptor.entries()).toEqual([
        ['a', 1],
        ['b', 2],
        ['c', 3],
      ]);
    });

    it('should return a frozen array of the entries of the given record', () => {
      // Arrange
      const descriptor = Dictionary({ a: 1, b: 2, c: 3 } as const);
      // Assert
      expect(Object.isFrozen(descriptor.entries())).toBe(true);
    });

    it('should return the same reference on every call', () => {
      // Arrange
      const descriptor = Dictionary({ a: 1, b: 2, c: 3 } as const);
      // Assert
      expect(descriptor.entries()).toBe(descriptor.entries());
    });

    it('should infer the entries of the given record into a union type', () => {
      // Arrange
      const descriptor = Dictionary({ a: 1, b: 2, c: 3 } as const);
      // Act
      const entries = descriptor.entries();
      type Entries = typeof entries;
      // Assert
      expectTypeOf<Entries>().toEqualTypeOf<
        NonEmptyReadonlyArray<
          DictionaryEntry<{
            readonly a: 1;
            readonly b: 2;
            readonly c: 3;
          }>
        >
      >();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: Dictionary Symbol.toStringTag
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Dictionary Symbol.toStringTag', () => {
    it('should return the string tag "Dictionary" when the dictionary is converted to a string', () => {
      // Arrange
      const descriptor = Dictionary({ a: 1, b: 2, c: 3 } as const);
      // Assert
      expect(Object.prototype.toString.call(descriptor)).toBe(
        '[object Dictionary]',
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: Dictionary isOfType
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Dictionary isOfType', () => {
    it('should return true if the value is a key of the given record', () => {
      // Arrange
      const descriptor = Dictionary({ a: 1, b: 2, c: 3 } as const);
      // Assert
      expect(descriptor.isOfType(1)).toBe(true);
    });

    it('should return false if the value is not a key of the given record', () => {
      // Arrange
      const descriptor = Dictionary({ a: 1, b: 2, c: 3 } as const);
      // Assert
      expect(descriptor.isOfType(4)).toBe(false);
    });

    it('should narrow the type to the key if the value is a key of the given record', () => {
      // Arrange
      const descriptor = Dictionary({ a: 1, b: 2, c: 3 } as const);
      // Act
      const value: unknown = 1 as unknown;
      // Assert
      if (descriptor.isOfType(value)) {
        expectTypeOf<typeof value>().toEqualTypeOf<1 | 2 | 3>();
      } else {
        expectTypeOf<typeof value>().toBeUnknown();
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: Dictionary from LiteralUnion
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Dictionary from LiteralUnion', () => {
    it('should create a dictionary descriptor from a literal union', () => {
      // Arrange
      const union = LiteralUnion(['a', 'b', 'c']);
      // Act
      const descriptor = Dictionary.fromLiteralUnion(union, {
        a: 1,
        b: 2,
        c: 3,
      });
      // Assert
      expectTypeOf<typeof descriptor>().toEqualTypeOf<
        DictionaryDescriptor<{
          readonly a: 1;
          readonly b: 2;
          readonly c: 3;
        }>
      >();
    });

    it('should throw a compilation error if the literal union does not cover all the keys of the given record', () => {
      // Arrange
      const union = LiteralUnion(['a', 'b', 'c']);
      // Act
      // @ts-expect-error - the literal union does not cover all the keys of the given record
      Dictionary.fromLiteralUnion(union, {
        a: 1,
        b: 2,
      });
    });

    it('should keep the const value from the source record', () => {
      // Arrange
      const union = LiteralUnion(['a', 'b', 'c']);
      // Act
      const descriptor = Dictionary.fromLiteralUnion(union, {
        a: 1,
        b: 2,
        c: 3,
      });
      type A = typeof descriptor.a;
      // Assert
      expectTypeOf<A>().toEqualTypeOf<1>();
    });
  });
});
