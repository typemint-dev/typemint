import { describe, expect, it } from "vitest";
import { isRecord } from "./is-record.js";

describe("(unit) isRecord", () => {
  describe("when given a plain object", () => {
    it("should return true", () => {
      // Arrange
      const value = { a: 1, b: "two" };

      // Act
      const result = isRecord(value);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe("when given an empty object", () => {
    it("should return true", () => {
      // Arrange
      const value = {};

      // Act
      const result = isRecord(value);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe("when given an object created with Object.create(null)", () => {
    it("should return true", () => {
      // Arrange
      const value = Object.create(null);

      // Act
      const result = isRecord(value);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe("when given an object with an inherited prototype", () => {
    it("should return true", () => {
      // Arrange
      const value = Object.create({ inherited: true });

      // Act
      const result = isRecord(value);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe("when given a class instance", () => {
    it("should return true for a Date", () => {
      // Arrange
      const value = new Date();

      // Act
      const result = isRecord(value);

      // Assert
      expect(result).toBe(true);
    });

    it("should return true for a Map", () => {
      // Arrange
      const value = new Map();

      // Act
      const result = isRecord(value);

      // Assert
      expect(result).toBe(true);
    });

    it("should return true for a RegExp", () => {
      // Arrange
      const value = /regex/;

      // Act
      const result = isRecord(value);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe("when given null", () => {
    it("should return false", () => {
      // Arrange
      const value = null;

      // Act
      const result = isRecord(value);

      // Assert

      expect(result).toBe(false);
    });
  });

  describe("when given undefined", () => {
    it("should return false", () => {
      // Arrange
      const value = undefined;

      // Act
      const result = isRecord(value);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe("when given an array", () => {
    it("should return false for an empty array", () => {
      // Arrange
      const value: unknown[] = [];

      // Act
      const result = isRecord(value);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for a populated array", () => {
      // Arrange
      const value = [1, 2, 3];

      // Act
      const result = isRecord(value);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe("when given a primitive", () => {
    it("should return false for a number", () => {
      // Arrange
      const value = 42;

      // Act
      const result = isRecord(value);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for a string", () => {
      // Arrange
      const value = "string";

      // Act
      const result = isRecord(value);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for a boolean", () => {
      // Arrange
      const value = true;

      // Act
      const result = isRecord(value);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for a symbol", () => {
      // Arrange
      const value = Symbol("s");

      // Act
      const result = isRecord(value);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for a bigint", () => {
      // Arrange
      const value = BigInt(1);

      // Act
      const result = isRecord(value);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe("when given a function", () => {
    it("should return false for an arrow function", () => {
      // Arrange
      const value = () => {};

      // Act
      const result = isRecord(value);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for a named function", () => {
      // Arrange
      const value = function named() {};

      // Act
      const result = isRecord(value);

      // Assert
      expect(result).toBe(false);
    });
  });
});
