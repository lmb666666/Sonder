declare module 'bun:test' {
  export function describe(name: string, callback: () => void): void;
  export function test(name: string, callback: () => void | Promise<void>): void;
  export const expect: {
    <T>(value: T): {
      toEqual(expected: unknown): void;
    };
  };
}
