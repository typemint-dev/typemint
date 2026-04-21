import { describe, expect, it, vi } from 'vitest';
import { flow } from './flow.js';
import { PanicException } from './panic-exception.js';

describe('(unit) flow', () => {
  // ---------------------------------------------------------------------------
  // MARK: invocation shape
  // ---------------------------------------------------------------------------
  describe('invocation shape', () => {
    it('should return a function', () => {
      // Arrange
      const op = (n: number) => n + 1;

      // Act
      const result = flow(op);

      // Assert
      expect(typeof result).toBe('function');
    });

    it('should not execute any operator at composition time', () => {
      // Arrange
      const op = vi.fn<(n: number) => number>((n: number) => n + 1);

      // Act
      flow(op);

      // Assert
      expect(op).not.toHaveBeenCalled();
    });

    it('should execute the pipeline only when the returned function is called', () => {
      // Arrange
      const op = vi.fn<(n: number) => number>((n: number) => n + 1);
      const pipeline = flow(op);

      // Act
      pipeline(1);

      // Assert
      expect(op).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // MARK: single operator
  // ---------------------------------------------------------------------------
  describe('when given a single operator', () => {
    it('should pass the input through the operator and return its output', () => {
      // Arrange
      const pipeline = flow((n: number) => n * 2);

      // Act
      const result = pipeline(3);

      // Assert
      expect(result).toBe(6);
    });

    it('should call the operator exactly once per invocation', () => {
      // Arrange
      const op = vi.fn<(n: number) => number>((n: number) => n + 1);
      const pipeline = flow(op);

      // Act
      pipeline(5);

      // Assert
      expect(op).toHaveBeenCalledTimes(1);
    });

    it('should call the operator with the original input', () => {
      // Arrange
      const op = vi.fn<(n: number) => number>((n: number) => n + 1);
      const pipeline = flow(op);

      // Act
      pipeline(5);

      // Assert
      expect(op).toHaveBeenCalledWith(5);
    });
  });

  // ---------------------------------------------------------------------------
  // MARK: multiple operators
  // ---------------------------------------------------------------------------
  describe('when given multiple operators', () => {
    it('should apply operators left-to-right', () => {
      // Arrange
      const pipeline = flow(
        (s: string) => s.trim(),
        (s) => s.toUpperCase(),
        (s) => `[${s}]`,
      );

      // Act
      const result = pipeline('  hello  ');

      // Assert
      expect(result).toBe('[HELLO]');
    });

    it('should thread each operator output into the next operator', () => {
      // Arrange
      const received: unknown[] = [];
      const pipeline = flow(
        (n: number) => {
          received.push(n);
          return n + 1;
        },
        (n: number) => {
          received.push(n);
          return n * 2;
        },
        (n: number) => {
          received.push(n);
          return `${n}`;
        },
      );

      // Act
      pipeline(10);

      // Assert
      expect(received).toEqual([10, 11, 22]);
    });

    it('should return the return value of the last operator', () => {
      // Arrange
      const pipeline = flow(
        (n: number) => n + 1,
        (n: number) => n * 2,
        () => 'final',
      );

      // Act
      const result = pipeline(0);

      // Assert
      expect(result).toBe('final');
    });

    it('should call each operator exactly once per invocation', () => {
      // Arrange
      const a = vi.fn<(n: number) => number>((n: number) => n + 1);
      const b = vi.fn<(n: number) => number>((n: number) => n * 2);
      const c = vi.fn<(n: number) => string>((n: number) => `${n}`);
      const pipeline = flow(a, b, c);

      // Act
      pipeline(1);

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
      const pipeline = flow(
        (n: number) => n + 1,
        (n) => n * 2,
      );

      // Act
      const first = pipeline(1);
      const second = pipeline(10);

      // Assert
      expect([first, second]).toEqual([4, 22]);
    });

    it('should not share state between invocations', () => {
      // Arrange
      const calls: number[] = [];
      const pipeline = flow((n: number) => {
        calls.push(n);
        return n;
      });

      // Act
      pipeline(1);
      pipeline(2);

      // Assert
      expect(calls).toEqual([1, 2]);
    });

    it('should produce the same output as pipe-style manual invocation', () => {
      // Arrange
      const a = (n: number) => n + 1;
      const b = (n: number) => n * 2;
      const c = (n: number) => `${n}`;
      const composed = flow(a, b, c);

      // Act
      const viaFlow = composed(3);
      const viaManual = c(b(a(3)));

      // Assert
      expect(viaFlow).toBe(viaManual);
    });
  });

  // ---------------------------------------------------------------------------
  // MARK: input preservation
  // ---------------------------------------------------------------------------
  describe('input preservation', () => {
    it('should pass non-primitive inputs by reference to the first operator', () => {
      // Arrange
      const input = { name: 'Alice' };
      const op = vi.fn<(v: { name: string }) => { name: string }>(
        (v: { name: string }) => v,
      );
      const pipeline = flow(op);

      // Act
      pipeline(input);

      // Assert
      expect(op.mock.calls[0]?.[0]).toBe(input);
    });

    it('should not mutate the original input', () => {
      // Arrange
      const input = { count: 1 };
      const pipeline = flow((v: { count: number }) => ({ count: v.count + 1 }));

      // Act
      pipeline(input);

      // Assert
      expect(input).toEqual({ count: 1 });
    });
  });

  // ---------------------------------------------------------------------------
  // MARK: error propagation
  // ---------------------------------------------------------------------------
  describe('error propagation', () => {
    it('should propagate errors thrown by an operator', () => {
      // Arrange
      const boom = new Error('boom');
      const pipeline = flow((n: number) => {
        if (n < 0) throw boom;
        return n;
      });

      // Act
      const act = () => pipeline(-1);

      // Assert
      expect(act).toThrow(boom);
    });

    it('should short-circuit the pipeline when an operator throws', () => {
      // Arrange
      const next = vi.fn<(n: number) => number>((n: number) => n);
      const pipeline = flow((n: number) => {
        if (n < 0) throw new Error('boom');
        return n;
      }, next);

      // Act
      const act = () => pipeline(-1);

      // Assert
      expect(act).toThrow('boom');
      expect(next).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // MARK: empty invocation
  // ---------------------------------------------------------------------------
  describe('when called with no operators', () => {
    it('should throw a PanicException', () => {
      // Arrange
      const fns: ((x: unknown) => unknown)[] = [];

      // Act
      const act = () => (flow as (...ops: typeof fns) => unknown)(...fns);

      // Assert
      expect(act).toThrow(PanicException);
    });

    it('should include a helpful message in the thrown exception', () => {
      // Arrange
      const fns: ((x: unknown) => unknown)[] = [];

      // Act
      const act = () => (flow as (...ops: typeof fns) => unknown)(...fns);

      // Assert
      expect(act).toThrow(/at least one operator/i);
    });
  });

  // ---------------------------------------------------------------------------
  // MARK: high arity
  // ---------------------------------------------------------------------------
  describe('high arity pipelines', () => {
    it('should support a 12-operator pipeline via the highest arity overload', () => {
      // Arrange
      const increment = (n: number): number => n + 1;
      const pipeline = flow(
        increment,
        increment,
        increment,
        increment,
        increment,
        increment,
        increment,
        increment,
        increment,
        increment,
        increment,
        increment,
      );

      // Act
      const result = pipeline(0);

      // Assert
      expect(result).toBe(12);
    });

    it('should support pipelines longer than 12 operators via the generic fallback overload', () => {
      // Arrange
      const increment = (n: number): number => n + 1;
      const pipeline = flow(
        increment,
        increment,
        increment,
        increment,
        increment,
        increment,
        increment,
        increment,
        increment,
        increment,
        increment,
        increment,
        increment,
        increment,
        increment,
        increment,
        increment,
        increment,
        increment,
        increment,
      );

      // Act
      const result = pipeline(0);

      // Assert
      expect(result).toBe(20);
    });
  });

  // ---------------------------------------------------------------------------
  // MARK: composition
  // ---------------------------------------------------------------------------
  describe('composing flows', () => {
    it('should accept a flow as an operator inside another flow', () => {
      // Arrange
      const flowA = flow(
        (s: string) => s.trim(),
        (s) => s.length,
      );
      const flowB = flow(
        (n: number) => n * 2,
        (n) => `result: ${n}`,
      );
      const flowC = flow(flowA, flowB);

      // Act
      const result = flowC('  hi  ');

      // Assert
      expect(result).toBe('result: 4');
    });

    it('should thread the composed flow output into the next outer operator', () => {
      // Arrange
      const inner = flow(
        (n: number) => n + 1,
        (n) => n * 2,
      );
      const outer = flow(inner, (n: number) => `${n}`);

      // Act
      const result = outer(3);

      // Assert
      expect(result).toBe('8');
    });

    it('should produce the same output as a single flat flow of the combined operators', () => {
      // Arrange
      const a = (n: number) => n + 1;
      const b = (n: number) => n * 2;
      const c = (n: number) => `${n}`;
      const composed = flow(flow(a, b), c);
      const flat = flow(a, b, c);

      // Act
      const viaComposed = composed(3);
      const viaFlat = flat(3);

      // Assert
      expect(viaComposed).toBe(viaFlat);
    });

    it('should short-circuit errors across nested flows', () => {
      // Arrange
      const next = vi.fn<(n: number) => number>((n: number) => n);
      const inner = flow((n: number) => {
        if (n < 0) throw new Error('boom');
        return n;
      });
      const outer = flow(inner, next);

      // Act
      const act = () => outer(-1);

      // Assert
      expect(act).toThrow('boom');
      expect(next).not.toHaveBeenCalled();
    });
  });
});
