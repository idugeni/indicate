export interface MiniAppPalette {
  readonly bg: string;
  readonly card: string;
  readonly line: string;
  readonly text: string;
  readonly dim: string;
  readonly accent: string;
  readonly danger: string;
  readonly ok: string;
}

export function miniAppPalette(scheme: 'light' | 'dark'): MiniAppPalette {
  if (scheme === 'light') {
    return {
      bg: '#f6f1e5',
      card: '#fffdf4',
      line: '#e2d7bd',
      text: '#241c0d',
      dim: '#6f6250',
      accent: '#c9a227',
      danger: '#b3262a',
      ok: '#1d7f5c',
    };
  }
  return {
    bg: '#141126',
    card: '#1e1a33',
    line: '#2e2752',
    text: '#f2eefc',
    dim: '#a89fd1',
    accent: '#c9a227',
    danger: '#e5484d',
    ok: '#3fb68b',
  };
}
