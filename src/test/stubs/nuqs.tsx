import { useCallback, useState } from 'react';

/**
 * `nuqs` stand-in for jsdom component tests.
 *
 * @remarks `nuqs` requires a framework adapter and jsdom has no router, so any
 * component that reads query state throws on render. The workspace test already
 * mocks the module; this factory gives the other tests the same behaviour while
 * keeping one parameter per key, which is what lets a test assert that two
 * pagers on the same view do not share state.
 *
 * Real URL encoding and history behaviour belong to `nuqs` and are not
 * simulated: only "state survives a render and a setter round-trips" is.
 */
export function nuqsStub(): Record<string, unknown> {
  return {
    parseAsStringEnum: () => ({ withDefault: (fallback: string) => ({ withOptions: () => ({ kind: 'string', fallback }) }) }),
    parseAsInteger: { withDefault: (fallback: number) => ({ withOptions: () => ({ kind: 'integer', fallback }) }) },
    useQueryState: (key: string, parser: { kind: 'string' | 'integer'; fallback: string | number }) => {
      const initial = parser.kind === 'integer' ? Number(parser.fallback) : String(parser.fallback);
      const [value, setValue] = useState<number | string>(initial);
      const set = useCallback((next: unknown) => {
        const resolved = next === null || next === undefined || next === ''
          ? (parser.kind === 'integer' ? Number(parser.fallback) : String(parser.fallback))
          : parser.kind === 'integer' ? Number(next) : String(next);
        setValue(resolved);
      }, [parser]);
      return [value, set];
    },
  };
}
