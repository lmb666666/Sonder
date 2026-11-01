declare module 'bun:test' {
  type Matchers = {
    toEqual(expected: unknown): void;
    toBe(expected: unknown): void;
    toBeDefined(): void;
    toBeUndefined(): void;
    toContain(expected: unknown): void;
    toHaveLength(expected: number): void;
  };

  export function describe(name: string, callback: () => void): void;
  export function test(name: string, callback: () => void | Promise<void>): void;
  export const expect: <T>(value: T) => Matchers & { not: Matchers };
}
