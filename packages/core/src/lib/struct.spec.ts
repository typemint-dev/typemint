import { describe, expect, it, vi } from 'vitest';
import { flow } from './flow.js';
import { PanicException } from './panic-exception.js';
import { struct } from './struct.js';

describe('(unit) struct', () => {
  // ---------------------------------------------------------------------------
  // MARK: invocation shape
  // ---------------------------------------------------------------------------
  describe('invocation shape', () => {
    it('should return a function', () => {
      // Arrange
      const op = (n: number) => n + 1;

      // Act
      const result = struct({ a: op });

      // Assert
      expect(typeof result).toBe('function');
    });

    it('should not execute any operator at composition time', () => {
      // Arrange
      const op = vi.fn<(n: number) => number>((n: number) => n + 1);

      // Act
      struct({ a: op });

      // Assert
      expect(op).not.toHaveBeenCalled();
    });

    it('should execute each operator only when the returned function is called', () => {
      // Arrange
      const a = vi.fn<(n: number) => number>((n: number) => n + 1);
      const b = vi.fn<(s: string) => string>((s: string) => s.toUpperCase());
      const op = struct({ a, b });

      // Act
      op({ a: 1, b: 'x' });

      // Assert
      expect(a).toHaveBeenCalledTimes(1);
      expect(b).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // MARK: single field
  // ---------------------------------------------------------------------------
  describe('when given a single-field record', () => {
    it('should pass the matching input value through the operator', () => {
      // Arrange
      const op = struct({ a: (n: number) => n * 2 });

      // Act
      const result = op({ a: 3 });

      // Assert
      expect(result).toEqual({ a: 6 });
    });

    it('should call the operator exactly once per invocation', () => {
      // Arrange
      const a = vi.fn<(n: number) => number>((n: number) => n + 1);
      const op = struct({ a });

      // Act
      op({ a: 5 });

      // Assert
      expect(a).toHaveBeenCalledTimes(1);
    });

    it('should call the operator with the matching input value', () => {
      // Arrange
      const a = vi.fn<(n: number) => number>((n: number) => n + 1);
      const op = struct({ a });

      // Act
      op({ a: 5 });

      // Assert
      expect(a).toHaveBeenCalledWith(5);
    });
  });

  // ---------------------------------------------------------------------------
  // MARK: multiple fields
  // ---------------------------------------------------------------------------
  describe('when given multiple fields', () => {
    it('should apply each operator to the matching key of the input', () => {
      // Arrange
      const op = struct({
        a: (s: string) => s.toUpperCase(),
        b: (s: string) => s.toLowerCase(),
        c: (n: number) => n * 2,
      });

      // Act
      const result = op({ a: 'hi', b: 'WORLD', c: 4 });

      // Assert
      expect(result).toEqual({ a: 'HI', b: 'world', c: 8 });
    });

    it('should produce a record of the same shape as the operator record', () => {
      // Arrange
      const op = struct({
        a: (s: string) => s.length,
        b: (n: number) => `${n}`,
      });

      // Act
      const result = op({ a: 'hello', b: 42 });

      // Assert
      expect(Object.keys(result).sort()).toEqual(['a', 'b']);
    });

    it('should call each operator with only its matching input field', () => {
      // Arrange
      const a = vi.fn<(s: string) => string>((s: string) => s);
      const b = vi.fn<(n: number) => number>((n: number) => n);
      const op = struct({ a, b });

      // Act
      op({ a: 'hi', b: 7 });

      // Assert
      expect(a).toHaveBeenCalledWith('hi');
      expect(b).toHaveBeenCalledWith(7);
    });

    it('should call each operator exactly once per invocation', () => {
      // Arrange
      const a = vi.fn<(s: string) => string>((s: string) => s);
      const b = vi.fn<(n: number) => number>((n: number) => n);
      const c = vi.fn<(b: boolean) => boolean>((b: boolean) => b);
      const op = struct({ a, b, c });

      // Act
      op({ a: 'x', b: 1, c: true });

      // Assert
      expect(a).toHaveBeenCalledTimes(1);
      expect(b).toHaveBeenCalledTimes(1);
      expect(c).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // MARK: reusability
  // ---------------------------------------------------------------------------
  describe('reusability', () => {
    it('should be invokable multiple times with different inputs', () => {
      // Arrange
      const op = struct({
        a: (n: number) => n + 1,
        b: (s: string) => s.toUpperCase(),
      });

      // Act
      const first = op({ a: 1, b: 'x' });
      const second = op({ a: 10, b: 'y' });

      // Assert
      expect([first, second]).toEqual([
        { a: 2, b: 'X' },
        { a: 11, b: 'Y' },
      ]);
    });

    it('should not share state between invocations', () => {
      // Arrange
      const calls: number[] = [];
      const op = struct({
        a: (n: number) => {
          calls.push(n);
          return n;
        },
      });

      // Act
      op({ a: 1 });
      op({ a: 2 });

      // Assert
      expect(calls).toEqual([1, 2]);
    });

    it('should produce a fresh output record on every invocation', () => {
      // Arrange
      const op = struct({ a: (n: number) => n });

      // Act
      const first = op({ a: 1 });
      const second = op({ a: 1 });

      // Assert
      expect(first).not.toBe(second);
    });
  });

  // ---------------------------------------------------------------------------
  // MARK: input preservation
  // ---------------------------------------------------------------------------
  describe('input preservation', () => {
    it('should not mutate the original input record', () => {
      // Arrange
      const input = { a: 1, b: 'x' };
      const op = struct({
        a: (n: number) => n + 1,
        b: (s: string) => s.toUpperCase(),
      });

      // Act
      op(input);

      // Assert
      expect(input).toEqual({ a: 1, b: 'x' });
    });

    it('should pass non-primitive field values by reference to their operator', () => {
      // Arrange
      const nested = { name: 'Alice' };
      const op = vi.fn<(v: { name: string }) => { name: string }>(
        (v: { name: string }) => v,
      );
      const pipeline = struct({ a: op });

      // Act
      pipeline({ a: nested });

      // Assert
      expect(op.mock.calls[0]?.[0]).toBe(nested);
    });

    it('should drop input keys that are not declared on the operator record', () => {
      // Arrange
      const op = struct({ a: (n: number) => n });
      const input = { a: 1, extra: 'ignored' } as { a: number; extra: string };

      // Act
      const result = op(input) as Record<string, unknown>;

      // Assert
      expect('extra' in result).toBe(false);
    });

    it('should produce a prototype-less output record', () => {
      // Arrange
      const op = struct({ a: (n: number) => n });

      // Act
      const result = op({ a: 1 });

      // Assert
      expect(Object.getPrototypeOf(result)).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // MARK: error propagation
  // ---------------------------------------------------------------------------
  describe('error propagation', () => {
    it('should propagate errors thrown by an operator', () => {
      // Arrange
      const boom = new Error('boom');
      const op = struct({
        a: (n: number) => {
          if (n < 0) throw boom;
          return n;
        },
      });

      // Act
      const act = () => op({ a: -1 });

      // Assert
      expect(act).toThrow(boom);
    });

    it('should short-circuit remaining fields when an earlier operator throws', () => {
      // Arrange
      const second = vi.fn<(n: number) => number>((n: number) => n);
      const op = struct({
        a: (n: number) => {
          if (n < 0) throw new Error('boom');
          return n;
        },
        b: second,
      });

      // Act
      const act = () => op({ a: -1, b: 0 });

      // Assert
      expect(act).toThrow('boom');
      expect(second).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // MARK: empty invocation
  // ---------------------------------------------------------------------------
  describe('when called with an empty record', () => {
    it('should throw a PanicException', () => {
      // Arrange
      const ops = {} as Record<string, (x: unknown) => unknown>;

      // Act
      const act = () => (struct as (_ops: typeof ops) => unknown)(ops);

      // Assert
      expect(act).toThrow(PanicException);
    });

    it('should include a helpful message in the thrown exception', () => {
      // Arrange
      const ops = {} as Record<string, (x: unknown) => unknown>;

      // Act
      const act = () => (struct as (_ops: typeof ops) => unknown)(ops);

      // Assert
      expect(act).toThrow(/at least one field/i);
    });
  });

  // ---------------------------------------------------------------------------
  // MARK: composition with flow
  // ---------------------------------------------------------------------------
  describe('composing with flow', () => {
    it('should be usable as an operator inside a flow', () => {
      // Arrange
      const pipeline = flow(
        struct({
          a: (s: string) => s.toUpperCase(),
          b: (s: string) => s.toLowerCase(),
          c: (n: number) => n * 2,
        }),
        (r: { a: string; b: string; c: number }) => `${r.a}/${r.b}/${r.c}`,
      );

      // Act
      const result = pipeline({ a: 'hi', b: 'WORLD', c: 4 });

      // Assert
      expect(result).toBe('HI/world/8');
    });

    it('should accept flows as field operators', () => {
      // Arrange
      const op = struct({
        a: flow(
          (s: string) => s.trim(),
          (s) => s.toUpperCase(),
        ),
        b: flow(
          (n: number) => n + 1,
          (n) => n * 2,
        ),
      });

      // Act
      const result = op({ a: '  hi  ', b: 3 });

      // Assert
      expect(result).toEqual({ a: 'HI', b: 8 });
    });

    it('should nest with other structs', () => {
      // Arrange
      const op = struct({
        outer: struct({
          inner: (n: number) => n + 1,
        }),
        label: (s: string) => s.toUpperCase(),
      });

      // Act
      const result = op({ outer: { inner: 1 }, label: 'x' });

      // Assert
      expect(result).toEqual({ outer: { inner: 2 }, label: 'X' });
    });
  });

  // ---------------------------------------------------------------------------
  // MARK: missing keys (strict)
  // ---------------------------------------------------------------------------
  describe('when the input is missing a declared key', () => {
    it('should throw a PanicException', () => {
      // Arrange
      const op = struct({
        a: (n: number) => n + 1,
        b: (s: string) => s.toUpperCase(),
      });
      const partialInput = { a: 1 } as unknown as { a: number; b: string };

      // Act
      const act = () => op(partialInput);

      // Assert
      expect(act).toThrow(PanicException);
    });

    it('should mention the missing key name in the error message', () => {
      // Arrange
      const op = struct({
        a: (n: number) => n + 1,
        b: (s: string) => s.toUpperCase(),
      });
      const partialInput = { a: 1 } as unknown as { a: number; b: string };

      // Act
      const act = () => op(partialInput);

      // Assert
      expect(act).toThrow(/'b'/);
    });

    it('should not invoke any operator after the first missing key', () => {
      // Arrange
      const a = vi.fn<(n: number) => number>((n: number) => n);
      const c = vi.fn<(b: boolean) => boolean>((b: boolean) => b);
      const op = struct({
        a,
        b: (s: string) => s,
        c,
      });
      const broken = { a: 1, c: true } as unknown as {
        a: number;
        b: string;
        c: boolean;
      };

      // Act
      const act = () => op(broken);

      // Assert
      expect(act).toThrow(PanicException);
      expect(a).toHaveBeenCalledTimes(1);
      expect(c).not.toHaveBeenCalled();
    });

    it('should treat an explicit `undefined` value as a present key', () => {
      // Arrange
      const a = vi.fn<(v: unknown) => unknown>((v: unknown) => v);
      const op = struct({ a });
      const input = { a: undefined } as unknown as { a: unknown };

      // Act
      const result = op(input);

      // Assert
      expect(a).toHaveBeenCalledWith(undefined);
      expect(result).toEqual({ a: undefined });
    });
  });

  // ---------------------------------------------------------------------------
  // MARK: struct.partial
  // ---------------------------------------------------------------------------
  describe('struct.partial', () => {
    it('should expose a `partial` property on struct', () => {
      // Arrange / Act
      const result = typeof struct.partial;

      // Assert
      expect(result).toBe('function');
    });

    it('should return a function', () => {
      // Arrange
      const op = (n: number) => n + 1;

      // Act
      const result = struct.partial({ a: op });

      // Assert
      expect(typeof result).toBe('function');
    });

    it('should apply each operator to the matching key when present', () => {
      // Arrange
      const op = struct.partial({
        a: (n: number) => n + 1,
        b: (s: string) => s.toUpperCase(),
      });

      // Act
      const result = op({ a: 1, b: 'x' });

      // Assert
      expect(result).toEqual({ a: 2, b: 'X' });
    });

    it('should skip operators whose keys are absent on the input', () => {
      // Arrange
      const a = vi.fn<(n: number) => number>((n: number) => n + 1);
      const b = vi.fn<(s: string) => string>((s: string) => s.toUpperCase());
      const op = struct.partial({ a, b });

      // Act
      const result = op({ a: 1 });

      // Assert
      expect(result).toEqual({ a: 2 });
      expect(a).toHaveBeenCalledTimes(1);
      expect(b).not.toHaveBeenCalled();
    });

    it('should produce an empty record when the input has no declared keys', () => {
      // Arrange
      const op = struct.partial({
        a: (n: number) => n + 1,
        b: (s: string) => s.toUpperCase(),
      });

      // Act
      const result = op({});

      // Assert
      expect(result).toEqual({});
    });

    it('should treat an explicit `undefined` value as a present key', () => {
      // Arrange
      const a = vi.fn<(v: unknown) => unknown>((v: unknown) => v);
      const op = struct.partial({ a });

      // Act
      const result = op({ a: undefined });

      // Assert
      expect(a).toHaveBeenCalledWith(undefined);
      expect(result).toEqual({ a: undefined });
    });

    it('should drop input keys that are not declared on the operator record', () => {
      // Arrange
      const op = struct.partial({ a: (n: number) => n });
      const input = { a: 1, extra: 'ignored' } as unknown as Partial<{
        a: number;
      }>;

      // Act
      const result = op(input) as Record<string, unknown>;

      // Assert
      expect('extra' in result).toBe(false);
    });

    it('should produce a prototype-less output record', () => {
      // Arrange
      const op = struct.partial({ a: (n: number) => n });

      // Act
      const result = op({ a: 1 });

      // Assert
      expect(Object.getPrototypeOf(result)).toBeNull();
    });

    it('should produce a fresh output record on every invocation', () => {
      // Arrange
      const op = struct.partial({ a: (n: number) => n });

      // Act
      const first = op({ a: 1 });
      const second = op({ a: 1 });

      // Assert
      expect(first).not.toBe(second);
    });

    it('should throw a PanicException when called with an empty record', () => {
      // Arrange
      const ops = {} as Record<string, (x: unknown) => unknown>;

      // Act
      const act = () => (struct.partial as (_ops: typeof ops) => unknown)(ops);

      // Assert
      expect(act).toThrow(PanicException);
    });

    it('should propagate errors thrown by an invoked operator', () => {
      // Arrange
      const boom = new Error('boom');
      const op = struct.partial({
        a: (n: number) => {
          if (n < 0) throw boom;
          return n;
        },
      });

      // Act
      const act = () => op({ a: -1 });

      // Assert
      expect(act).toThrow(boom);
    });

    it('should be usable as an operator inside a flow', () => {
      // Arrange
      const pipeline = flow(
        struct.partial({
          name: (s: string) => s.trim(),
          age: (n: number) => Math.max(0, n),
        }),
        (r: Partial<{ name: string; age: number }>) =>
          `${r.name ?? '<no-name>'}/${r.age ?? 0}`,
      );

      // Act
      const result = pipeline({ name: '  Ada  ' });

      // Assert
      expect(result).toBe('Ada/0');
    });
  });
});
