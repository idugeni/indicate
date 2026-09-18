import { describe, expect, it } from 'vitest';

import { getAppEnvironment, isObservabilityDebugEnabled, isProductionServer } from '@/core/config/runtime/runtime-flags';
import { cn } from '@/ui/cn';

describe('runtime flags', () => {
  it('terkunci production dan membaca env yang diinjeksikan', () => {
    expect(getAppEnvironment()).toBe('production');
    expect(isProductionServer({ NODE_ENV: 'production' } as unknown as NodeJS.ProcessEnv)).toBe(true);
    expect(isProductionServer({ NODE_ENV: 'development' } as unknown as NodeJS.ProcessEnv)).toBe(false);
    expect(isObservabilityDebugEnabled({ OBSERVABILITY_DEBUG: '1' } as unknown as NodeJS.ProcessEnv)).toBe(true);
    expect(isObservabilityDebugEnabled({} as unknown as NodeJS.ProcessEnv)).toBe(false);
  });
});

describe('cn', () => {
  it('menggabungkan class dan menyelesaikan konflik tailwind', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
    expect(cn('text-sm', false && 'hidden', 'font-bold')).toBe('text-sm font-bold');
  });
});
