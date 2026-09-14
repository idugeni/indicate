/** INDICATE media network theme & template registry (national scope). */

export interface MasterTemplatePreset {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: 'news' | 'editorial' | 'tech' | 'official' | 'visual' | 'live';
}

/** Single master template layout: Clean Blue Editorial (satu-satunya template aktif). */
export const MASTER_TEMPLATE_PRESETS: readonly MasterTemplatePreset[] = [
  {
    id: 'clean-blue',
    name: 'Clean Blue Editorial',
    description: 'Layout editorial terang: ticker terkini, hero 2-kolom, kartu pilihan, dan panel newsletter.',
    category: 'news',
  },
];
