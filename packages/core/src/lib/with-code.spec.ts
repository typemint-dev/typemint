import { describe, expect, expectTypeOf, it } from "vitest";
import { assertWithCode, WithCode } from "./with-code.js";
import type { DiscriminantDescriptor } from "./discriminant.js";
import { AssertException } from "./assert.js";

describe("(unit) WithCode", () => {
  // ---------------------------------------------------------------------------
  // MARK: descriptor
  // ---------------------------------------------------------------------------
  describe("descriptor", () => {
    it('should be a DiscriminantDescriptor keyed by "code"', () => {
      // Arrange
      // Act
      // Assert
      expectTypeOf(WithCode).toEqualTypeOf<DiscriminantDescriptor<"code">>();
    });
  });

  // ---------------------------------------------------------------------------
  // MARK: assertWithCode
  // ---------------------------------------------------------------------------
  describe("assertWithCode", () => {
    it("should not throw if the value is a WithCode", () => {
      // Arrange
      const value = WithCode.of("success");

      // Act
      const act = () => assertWithCode(value, "success");

      // Assert
      expect(act).not.toThrow();
    });

    it("should throw an AssertException if the value is not a WithCode", () => {
      // Arrange
      const value = "not a WithCode";

      // Act
      const act = () => assertWithCode(value, "success");

      // Assert
      expect(act).toThrow(AssertException);
    });

    it("should throw with the default message if the value is not a WithCode", () => {
      // Arrange
      const value = "not a WithCode";

      // Act
      const act = () => assertWithCode(value, "success");

      // Assert
      expect(act).toThrow("Value is not of code success");
    });

    it("should throw with a custom message if provided", () => {
      // Arrange
      const value = "not a WithCode";
      const message = "Value is not of code success";

      // Act
      const act = () => assertWithCode(value, "success", message);

      // Assert
      expect(act).toThrow(message);
    });

    it("should throw with a lazy message if provided", () => {
      // Arrange
      const value = "not a WithCode";
      const message = () => "Value is not of code success";

      // Act
      const act = () => assertWithCode(value, "success", message);

      // Assert
      expect(act).toThrow("Value is not of code success");
    });

    it("should narrow the type to the WithCode type if the value is a WithCode", () => {
      // Arrange
      const value: unknown | WithCode<"success"> | WithCode<"error"> =
        WithCode.of("success");

      // Act
      assertWithCode(value, "success");

      // Assert
      expectTypeOf(value).toEqualTypeOf<WithCode<"success">>();
    });
  });

  // ---------------------------------------------------------------------------
  // MARK: WithCode.of
  // ---------------------------------------------------------------------------
  describe("WithCode.of", () => {
    it("should create a WithCode instance with the given code", () => {
      // Arrange
      const code = "success";

      // Act
      const result = WithCode.of(code);

      // Assert
      expect(result).toEqual({ code });
    });

    it("should preserve the literal type of the code", () => {
      // Arrange
      const code = "success";

      // Act
      const result = WithCode.of(code);

      // Assert
      expectTypeOf(result).toEqualTypeOf<WithCode<"success">>();
    });
  });

  // ---------------------------------------------------------------------------
  // MARK: WithCode.isOfType
  // ---------------------------------------------------------------------------
  describe("WithCode.isOfType", () => {
    it("should return true if the value is a WithCode", () => {
      // Arrange
      const value = WithCode.of("success");

      // Act
      const result = WithCode.isOfType(value);

      // Assert
      expect(result).toBe(true);
    });

    it("should return false if the value is not a WithCode", () => {
      // Arrange
      const value = "not a WithCode";

      // Act
      const result = WithCode.isOfType(value);

      // Assert
      expect(result).toBe(false);
    });

    it("should narrow the type to the WithCode type if the value is a WithCode", () => {
      // Arrange
      const value: unknown | WithCode<"success"> | WithCode<"error"> =
        WithCode.of("success");

      // Act
      if (WithCode.isOfType(value)) {
        // Assert
        expectTypeOf(value).toEqualTypeOf<WithCode<string>>();
      } else {
        expectTypeOf(value).toBeUnknown();
      }
    });
  });

  // ---------------------------------------------------------------------------
  // MARK: WithCode.isOf
  // ---------------------------------------------------------------------------
  describe("WithCode.isOf", () => {
    it("should return true if the value is a WithCode", () => {
      // Arrange
      const value = WithCode.of("success");

      // Act
      const result = WithCode.isOf(value, "success");

      // Assert
      expect(result).toBe(true);
    });

    it("should return false if the value is not a WithCode", () => {
      // Arrange
      const value = "not a WithCode";

      // Act
      const result = WithCode.isOf(value, "success");

      // Assert
      expect(result).toBe(false);
    });

    it("should narrow the type to the WithCode type if the value is a WithCode", () => {
      // Arrange
      const value: unknown | WithCode<"success"> | WithCode<"error"> =
        WithCode.of("success");

      // Act
      if (WithCode.isOf(value, "success")) {
        // Assert
        expectTypeOf(value).toEqualTypeOf<WithCode<"success">>();
      } else {
        expectTypeOf(value).toBeUnknown();
      }
    });
  });

  // ---------------------------------------------------------------------------
  // MARK: WithCode.getKey
  // ---------------------------------------------------------------------------
  describe("WithCode.getKey", () => {
    it("should return the key of the WithCode", () => {
      // Arrange
      const value = WithCode.of("success");

      // Act
      const result = WithCode.getKey(value);

      // Assert
      expect(result).toBe("code");
    });

    it("should preserve the literal type of the key", () => {
      // Arrange
      const value = WithCode.of("success");

      // Act
      const result = WithCode.getKey(value);

      // Assert
      expectTypeOf(result).toEqualTypeOf<"code">();
    });
  });

  // ---------------------------------------------------------------------------
  // MARK: WithCode.getValue
  // ---------------------------------------------------------------------------
  describe("WithCode.getValue", () => {
    it("should return the value of the WithCode", () => {
      // Arrange
      const value = WithCode.of("success");

      // Act
      const result = WithCode.getValue(value);

      // Assert
      expect(result).toBe("success");
    });

    it("should preserve the literal type of the value", () => {
      // Arrange
      const value = WithCode.of("success");

      // Act
      const result = WithCode.getValue(value);

      // Assert
      expectTypeOf(result).toEqualTypeOf<"success">();
    });
  });

  // ---------------------------------------------------------------------------
  // MARK: WithCode.match
  // ---------------------------------------------------------------------------
  describe("WithCode.match", () => {
    it("should match the value with the given code", () => {
      // Arrange
      const value: WithCode<"success" | "error" | "unknown"> =
        WithCode.of("success");

      // Act
      const result = WithCode.match(value, {
        success: () => "success",
        error: () => "error",
        unknown: () => "unknown",
      });

      // Assert
      expect(result).toBe("success");
    });
  });

  // ---------------------------------------------------------------------------
  // MARK: WithCode.matchOr
  // ---------------------------------------------------------------------------
  describe("WithCode.matchOr", () => {
    it("should match the value with the given code", () => {
      // Arrange
      const value: WithCode<"success" | "error" | "unknown"> =
        WithCode.of("success");

      // Act
      const result = WithCode.matchOr(
        value,
        {
          success: () => "success",
          error: () => "error",
          unknown: () => "unknown",
        },
        () => "something else",
      );

      // Assert
      expect(result).toBe("success");
    });
  });
});
