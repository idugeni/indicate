import { describe, expect, it } from 'vitest';

import { MASTER_TEMPLATE_PRESETS } from '@/ui/themes';

describe('MASTER_TEMPLATE_PRESETS', () => {
  it('mendaftarkan satu template aktif clean-blue', () => {
    expect(MASTER_TEMPLATE_PRESETS).toHaveLength(1);
    const preset = MASTER_TEMPLATE_PRESETS[0];
    expect(preset?.id).toBe('clean-blue');
    expect(preset?.name).toContain('Clean Blue');
  });

  it('memakai kategori valid dengan id unik dan deskripsi terisi', () => {
    const kategori = ['news', 'editorial', 'tech', 'official', 'visual', 'live'];
    const id = new Set(MASTER_TEMPLATE_PRESETS.map((preset) => preset.id));
    expect(id.size).toBe(MASTER_TEMPLATE_PRESETS.length);
    for (const preset of MASTER_TEMPLATE_PRESETS) {
      expect(kategori).toContain(preset.category);
      expect(preset.name.length).toBeGreaterThan(0);
      expect(preset.description.length).toBeGreaterThan(0);
    }
  });
});
