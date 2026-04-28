import { describe, expect, it, vi } from 'vitest';
import { flow } from './flow.js';
import { PanicException } from './panic-exception.js';
import { struct } from './struct.js';
import { tuple } from './tuple.js';

describe('(unit) tuple', () => {
  // ---------------------------------------------------------------------------
  // MARK: invocation shape
  // ---------------------------------------------------------------------------
  describe('invocation shape', () => {
    it('should return a function', () => {
      // Arrange
      const op = (n: number) => n + 1;

      // Act
      const result = tuple([op]);

      // Assert
      expect(typeof result).toBe('function');
    });

    it('should not execute any operator at composition time', () => {
      // Arrange
      const op = vi.fn<(n: number) => number>((n: number) => n + 1);

      // Act
      tuple([op]);

      // Assert
      expect(op).not.toHaveBeenCalled();
    });

    it('should execute each operator only when the returned function is called', () => {
      // Arrange
      const a = vi.fn<(n: number) => number>((n: number) => n + 1);
      const b = vi.fn<(s: string) => string>((s: string) => s.toUpperCase());
      const op = tuple([a, b]);

      // Act
      op([1, 'x']);

      // Assert
      expect(a).toHaveBeenCalledTimes(1);
      expect(b).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // MARK: single operator
  // ---------------------------------------------------------------------------
  describe('when given a single-element tuple', () => {
    it('should pass the matching input value through the operator', () => {
      // Arrange
      const op = tuple([(n: number) => n * 2]);

      // Act
      const result = op([3]);

      // Assert
      expect(result).toEqual([6]);
    });

    it('should call the operator exactly once per invocation', () => {
      // Arrange
      const a = vi.fn<(n: number) => number>((n: number) => n + 1);
      const op = tuple([a]);

      // Act
      op([5]);

      // Assert
      expect(a).toHaveBeenCalledTimes(1);
    });

    it('should call the operator with the matching input value', () => {
      // Arrange
      const a = vi.fn<(n: number) => number>((n: number) => n + 1);
      const op = tuple([a]);

      // Act
      op([5]);

      // Assert
      expect(a).toHaveBeenCalledWith(5);
    });
  });

  // ---------------------------------------------------------------------------
  // MARK: multiple operators
  // ---------------------------------------------------------------------------
  describe('when given multiple operators', () => {
    it('should apply each operator to the matching position of the input', () => {
      // Arrange
      const op = tuple([
        (s: string) => s.toUpperCase(),
        (s: string) => s.toLowerCase(),
        (n: number) => n * 2,
      ]);

      // Act
      const result = op(['hi', 'WORLD', 4]);

      // Assert
      expect(result).toEqual(['HI', 'world', 8]);
    });

    it('should produce a tuple of the same arity as the operator tuple', () => {
      // Arrange
      const op = tuple([(s: string) => s.length, (n: number) => `${n}`]);

      // Act
      const result = op(['hello', 42]);

      // Assert
      expect(result).toHaveLength(2);
    });

    it('should call each operator with only its matching input element', () => {
      // Arrange
      const a = vi.fn<(s: string) => string>((s: string) => s);
      const b = vi.fn<(n: number) => number>((n: number) => n);
      const op = tuple([a, b]);

      // Act
      op(['hi', 7]);

      // Assert
      expect(a).toHaveBeenCalledWith('hi');
      expect(b).toHaveBeenCalledWith(7);
    });

    it('should call each operator exactly once per invocation', () => {
      // Arrange
      const a = vi.fn<(s: string) => string>((s: string) => s);
      const b = vi.fn<(n: number) => number>((n: number) => n);
      const c = vi.fn<(b: boolean) => boolean>((b: boolean) => b);
      const op = tuple([a, b, c]);

      // Act
      op(['x', 1, true]);

      // Assert
      expect(a).toHaveBeenCalledTimes(1);
      expect(b).toHaveBeenCalledTimes(1);
      expect(c).toHaveBeenCalledTimes(1);
    });

    it('should preserve order: produce results in the same positions as the operators', () => {
      // Arrange
      const op = tuple([() => 'first', () => 'second', () => 'third']);

      // Act
      const result = op([0, 0, 0]);

      // Assert
      expect(result).toEqual(['first', 'second', 'third']);
    });
  });

  // ---------------------------------------------------------------------------
  // MARK: reusability
  // ---------------------------------------------------------------------------
  describe('reusability', () => {
    it('should be invokable multiple times with different inputs', () => {
      // Arrange
      const op = tuple([(n: number) => n + 1, (s: string) => s.toUpperCase()]);

      // Act
      const first = op([1, 'x']);
      const second = op([10, 'y']);

      // Assert
      expect([first, second]).toEqual([
        [2, 'X'],
        [11, 'Y'],
      ]);
    });

    it('should not share state between invocations', () => {
      // Arrange
      const calls: number[] = [];
      const op = tuple([
        (n: number) => {
          calls.push(n);
          return n;
        },
      ]);

      // Act
      op([1]);
      op([2]);

      // Assert
      expect(calls).toEqual([1, 2]);
    });

    it('should produce a fresh output tuple on every invocation', () => {
      // Arrange
      const op = tuple([(n: number) => n]);

      // Act
      const first = op([1]);
      const second = op([1]);

      // Assert
      expect(first).not.toBe(second);
    });
  });

  // ---------------------------------------------------------------------------
  // MARK: input preservation
  // ---------------------------------------------------------------------------
  describe('input preservation', () => {
    it('should not mutate the original input tuple', () => {
      // Arrange
      const input: [number, string] = [1, 'x'];
      const op = tuple([(n: number) => n + 1, (s: string) => s.toUpperCase()]);

      // Act
      op(input);

      // Assert
      expect(input).toEqual([1, 'x']);
    });

    it('should pass non-primitive elements by reference to their operator', () => {
      // Arrange
      const nested = { name: 'Alice' };
      const op = vi.fn<(v: { name: string }) => { name: string }>(
        (v: { name: string }) => v,
      );
      const pipeline = tuple([op]);

      // Act
      pipeline([nested]);

      // Assert
      expect(op.mock.calls[0]?.[0]).toBe(nested);
    });

    it('should produce an Array instance as the output', () => {
      // Arrange
      const op = tuple([(n: number) => n]);

      // Act
      const result = op([1]);

      // Assert
      expect(Array.isArray(result)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // MARK: error propagation
  // ---------------------------------------------------------------------------
  describe('error propagation', () => {
    it('should propagate errors thrown by an operator', () => {
      // Arrange
      const boom = new Error('boom');
      const op = tuple([
        (n: number) => {
          if (n < 0) throw boom;
          return n;
        },
      ]);

      // Act
      const act = () => op([-1]);

      // Assert
      expect(act).toThrow(boom);
    });

    it('should short-circuit remaining positions when an earlier operator throws', () => {
      // Arrange
      const second = vi.fn<(n: number) => number>((n: number) => n);
      const op = tuple([
        (n: number) => {
          if (n < 0) throw new Error('boom');
          return n;
        },
        second,
      ]);

      // Act
      const act = () => op([-1, 0]);

      // Assert
      expect(act).toThrow('boom');
      expect(second).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // MARK: empty invocation
  // ---------------------------------------------------------------------------
  describe('when called with an empty tuple', () => {
    it('should throw a PanicException', () => {
      // Arrange
      const ops = [] as ReadonlyArray<(x: unknown) => unknown>;

      // Act
      const act = () => (tuple as (_ops: typeof ops) => unknown)(ops);

      // Assert
      expect(act).toThrow(PanicException);
    });

    it('should include a helpful message in the thrown exception', () => {
      // Arrange
      const ops = [] as ReadonlyArray<(x: unknown) => unknown>;

      // Act
      const act = () => (tuple as (_ops: typeof ops) => unknown)(ops);

      // Assert
      expect(act).toThrow(/at least one operator/i);
    });
  });

  // ---------------------------------------------------------------------------
  // MARK: composition
  // ---------------------------------------------------------------------------
  describe('composing with flow and struct', () => {
    it('should be usable as an operator inside a flow', () => {
      // Arrange
      const pipeline = flow(
        tuple([
          (s: string) => s.toUpperCase(),
          (s: string) => s.toLowerCase(),
          (n: number) => n * 2,
        ]),
        ([a, b, c]: readonly [string, string, number]) => `${a}/${b}/${c}`,
      );

      // Act
      const result = pipeline(['hi', 'WORLD', 4]);

      // Assert
      expect(result).toBe('HI/world/8');
    });

    it('should accept flows as element operators', () => {
      // Arrange
      const op = tuple([
        flow(
          (s: string) => s.trim(),
          (s) => s.toUpperCase(),
        ),
        flow(
          (n: number) => n + 1,
          (n) => n * 2,
        ),
      ]);

      // Act
      const result = op(['  hi  ', 3]);

      // Assert
      expect(result).toEqual(['HI', 8]);
    });

    it('should nest with other tuples', () => {
      // Arrange
      const op = tuple([
        tuple([(n: number) => n + 1]),
        (s: string) => s.toUpperCase(),
      ]);

      // Act
      const result = op([[1], 'x']);

      // Assert
      expect(result).toEqual([[2], 'X']);
    });

    it('should compose with struct: a tuple of structs', () => {
      // Arrange
      const op = tuple([
        struct({ a: (n: number) => n + 1 }),
        (s: string) => s.toUpperCase(),
      ]);

      // Act
      const result = op([{ a: 1 }, 'x']);

      // Assert
      expect(result).toEqual([{ a: 2 }, 'X']);
    });

    it('should compose with struct: a struct of tuples', () => {
      // Arrange
      const op = struct({
        pair: tuple([(s: string) => s.length, (n: number) => `${n}`]),
      });

      // Act
      const result = op({ pair: ['hello', 42] });

      // Assert
      expect(result).toEqual({ pair: [5, '42'] });
    });
  });
});
