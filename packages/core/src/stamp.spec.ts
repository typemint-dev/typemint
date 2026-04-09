import { describe, expect, it } from 'vitest';
import { Stamp } from './stamp.js';

describe('(unit) Stamp', () => {
  // ---------------------------------------------------------------------------
  // MARK: stamp
  // ---------------------------------------------------------------------------
  describe('stamp', () => {
    it('should return the same object reference', () => {
      // Arrange
      const MyStamp = Stamp();
      const obj = { name: 'Alice' };

      // Act
      const result = MyStamp.stamp(obj);

      // Assert
      expect(result).toBe(obj);
    });

    it('should preserve existing properties on the object', () => {
      // Arrange
      const MyStamp = Stamp();
      const obj = { name: 'Alice', age: 30 };

      // Act
      MyStamp.stamp(obj);

      // Assert
      expect(obj).toEqual(expect.objectContaining({ name: 'Alice', age: 30 }));
    });

    it('should make the object recognizable by isStamped', () => {
      // Arrange
      const MyStamp = Stamp();
      const obj = { name: 'Alice' };

      // Act
      MyStamp.stamp(obj);

      // Assert
      expect(MyStamp.isStamped(obj)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // MARK: isStamped
  // ---------------------------------------------------------------------------
  describe('isStamped', () => {
    describe('when the value has been stamped', () => {
      it('should return true', () => {
        // Arrange
        const MyStamp = Stamp();
        const obj = MyStamp.stamp({ name: 'Alice' });

        // Act
        const result = MyStamp.isStamped(obj);

        // Assert
        expect(result).toBe(true);
      });
    });

    describe('when the value has not been stamped', () => {
      it('should return false for a plain object', () => {
        // Arrange
        const MyStamp = Stamp();
        const plain = { foo: 'bar' };

        // Act
        const result = MyStamp.isStamped(plain);

        // Assert
        expect(result).toBe(false);
      });
    });

    describe('when the value was stamped by a different Stamp', () => {
      it('should return false', () => {
        // Arrange
        const StampA = Stamp();
        const StampB = Stamp();
        const obj = StampA.stamp({ name: 'Alice' });

        // Act
        const result = StampB.isStamped(obj);

        // Assert
        expect(result).toBe(false);
      });
    });

    describe('when the stamped object has additional properties', () => {
      it('should still be recognized', () => {
        // Arrange
        const MyStamp = Stamp();
        const obj = { name: 'Alice' };
        MyStamp.stamp(obj);
        (obj as any).extra = 'value';

        // Act
        const result = MyStamp.isStamped(obj);

        // Assert
        expect(result).toBe(true);
      });
    });
  });
});
