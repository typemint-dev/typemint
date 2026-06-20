import { describe, expect, expectTypeOf, it } from 'vitest';
import { witness, type InferWitnessType } from './witness.js';
import {
  TypeDescriptor,
  type InferTypeDescriptorName,
  type InferTypeDescriptorType,
} from './type-descriptor.js';

describe('(unit) TypeDescriptor', () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: Construction
  // ─────────────────────────────────────────────────────────────────────────────
  describe('TypeDescriptor', () => {
    it('should expose the name as a runtime value', () => {
      // Arrange & Act
      const descriptor = TypeDescriptor('Url', witness<URL>());

      // Assert
      expect(descriptor.name).toBe('Url');
    });

    it('should carry only the name at runtime', () => {
      // Arrange & Act
      const descriptor = TypeDescriptor('Url', witness<URL>());

      // Assert
      expect(Object.keys(descriptor)).toEqual(['name']);
      expect(Reflect.ownKeys(descriptor)).toEqual(['name']);
    });

    it('should return a frozen object', () => {
      // Arrange & Act
      const descriptor = TypeDescriptor('Url', witness<URL>());

      // Assert
      expect(Object.isFrozen(descriptor)).toBe(true);
    });

    it('should preserve the literal name in the type', () => {
      // Arrange & Act
      const descriptor = TypeDescriptor('Url', witness<URL>());

      // Assert
      expectTypeOf(descriptor).toEqualTypeOf<TypeDescriptor<URL, 'Url'>>();
      expectTypeOf(descriptor.name).toEqualTypeOf<'Url'>();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: Infer descriptor name
  // ─────────────────────────────────────────────────────────────────────────────
  describe('InferTypeDescriptorName', () => {
    it('should infer the literal name from a descriptor type', () => {
      // Arrange
      type Descriptor = TypeDescriptor<URL, 'Url'>;

      // Act
      type Name = InferTypeDescriptorName<Descriptor>;

      // Assert
      expectTypeOf<Name>().toEqualTypeOf<'Url'>();
    });

    it('should infer the name from a constructed descriptor', () => {
      // Arrange
      const descriptor = TypeDescriptor('Email', witness<string>());

      // Act
      type Name = InferTypeDescriptorName<typeof descriptor>;

      // Assert
      expectTypeOf<Name>().toEqualTypeOf<'Email'>();
    });

    it('should not allow inferring from a non-descriptor', () => {
      // Arrange
      type NotADescriptor = number;

      // Act
      // @ts-expect-error - number does not satisfy the TypeDescriptor constraint
      type Name = InferTypeDescriptorName<NotADescriptor>;
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: Infer descriptor type
  // ─────────────────────────────────────────────────────────────────────────────
  describe('InferTypeDescriptorType', () => {
    it('should infer the described type from a descriptor type', () => {
      // Arrange
      type Descriptor = TypeDescriptor<URL, 'Url'>;

      // Act
      type Type = InferTypeDescriptorType<Descriptor>;

      // Assert
      expectTypeOf<Type>().toEqualTypeOf<URL>();
    });

    it('should infer an object type from a constructed descriptor', () => {
      // Arrange
      const descriptor = TypeDescriptor('User', witness<{ id: string }>());

      // Act
      type Type = InferTypeDescriptorType<typeof descriptor>;

      // Assert
      expectTypeOf<Type>().toEqualTypeOf<{ id: string }>();
    });

    it('should not allow inferring from a non-descriptor', () => {
      // Arrange
      type NotADescriptor = string;

      // Act
      // @ts-expect-error - string does not satisfy the TypeDescriptor constraint
      type Type = InferTypeDescriptorType<NotADescriptor>;
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MARK: Witness compatibility
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Witness compatibility', () => {
    it('should be usable as a witness via InferWitnessType', () => {
      // Arrange
      const descriptor = TypeDescriptor('User', witness<{ id: string }>());

      // Act
      type Type = InferWitnessType<typeof descriptor>;

      // Assert
      expectTypeOf<Type>().toEqualTypeOf<{ id: string }>();
    });
  });
});
