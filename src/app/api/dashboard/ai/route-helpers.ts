interface StreamCapableAdapter {
  readonly execute: (...args: never[]) => unknown;
  readonly executeStream: (...args: never[]) => unknown;
}

/** Return a streaming adapter only when executeStream is callable. */
export function asStreamCapableAdapter(adapter: { readonly execute: unknown }): StreamCapableAdapter | null {
  const candidate = adapter as Partial<StreamCapableAdapter>;
  return typeof candidate.executeStream === 'function' ? candidate as StreamCapableAdapter : null;
}
