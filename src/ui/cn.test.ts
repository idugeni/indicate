import { describe, expect, it } from 'vitest';

import { cn } from '@/ui/cn';

describe('cn', () => {
  it('menggabung beberapa kelas menjadi satu string', () => {
    expect(cn('px-2', 'py-1')).toBe('px-2 py-1');
  });

  it('mengabaikan nilai kondisional yang falsy', () => {
    expect(cn('dasar', false && 'sembunyi', undefined, null, '')).toBe('dasar');
  });

  it('menyelesaikan konflik utilitas tailwind ke kelas terakhir', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('mendukung sintaks objek dan array', () => {
    expect(cn(['a', 'b'], { aktif: true, mati: false })).toBe('a b aktif');
  });
});
