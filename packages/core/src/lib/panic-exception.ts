/**
 * The PanicException is a special kind of exception that is used to signal
 * that the runtime is in an invalid state that is not recoverable or cannot
 * be handled by Results. (Most likely an invalid value was passed where
 * no invalid value is admissible). The PanicException always signal a bug.
 *
 * The PanicException is one of the most bottom-level dependency, it should not
 * depend on any other type in our monorepo to prevent circular dependencies.
 */
export class PanicException extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'PanicException';

    // Cause is typed as unknown, thus all nullish values are valid.
    if (cause !== undefined) {
      this.cause = cause;
    }
  }

  public static panic(message: string) {
    return (cause?: unknown) => {
      throw new PanicException(message, cause);
    };
  }
}
