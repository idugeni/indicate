import { describe, expect, it } from 'vitest';

import {
  DriveEmbed,
  FacebookEmbed,
  InstagramEmbed,
  TikTokEmbed,
  TwitterEmbed,
} from '@/modules/dashboard/components/editorial/embed-nodes';

interface EmbedNodeConfig {
  readonly group?: unknown;
  readonly atom?: unknown;
  readonly selectable?: unknown;
  readonly addAttributes?: () => Record<string, { default: unknown }>;
  readonly parseHTML?: () => readonly { tag: string }[];
  readonly renderHTML?: (props: { readonly HTMLAttributes: Record<string, unknown> }) => unknown;
}

function configOf(node: { readonly config: unknown }): EmbedNodeConfig {
  return node.config as EmbedNodeConfig;
}

const NODES = [
  { node: TwitterEmbed, name: 'twitter', label: 'Postingan X' },
  { node: InstagramEmbed, name: 'instagram', label: 'Postingan Instagram' },
  { node: TikTokEmbed, name: 'tiktok', label: 'Video TikTok' },
  { node: FacebookEmbed, name: 'facebook', label: 'Postingan Facebook' },
  { node: DriveEmbed, name: 'drive', label: 'Google Drive' },
] as const;

describe('Node sematan sosial', () => {
  it('menyimpan tiap sematan sebagai atom blok', () => {
    for (const { node, name } of NODES) {
      expect(node.name).toBe(name);
      expect(configOf(node).group).toBe('block');
      expect(configOf(node).atom).toBe(true);
      expect(configOf(node).selectable).toBe(true);
    }
  });

  it('memberi atribut src dengan nilai bawaan kosong', () => {
    for (const { node } of NODES) {
      expect(configOf(node).addAttributes?.()).toEqual({ src: { default: null } });
    }
  });

  it('mengurai kembali div sematan dari HTML', () => {
    for (const { node, name } of NODES) {
      expect(configOf(node).parseHTML?.()).toEqual([{ tag: `div[data-social-embed="${name}"]` }]);
    }
  });

  it('merender div yang menyimpan src dan menyebutkan label platform', () => {
    for (const { node, name, label } of NODES) {
      const rendered = configOf(node).renderHTML?.({ HTMLAttributes: { src: 'https://contoh.id/unggahan' } }) as [
        string,
        Record<string, unknown>,
        string,
      ];
      expect(rendered[0]).toBe('div');
      expect(rendered[1]).toEqual({ 'data-social-embed': name, src: 'https://contoh.id/unggahan' });
      expect(rendered[2]).toBe(`${label} tersemat — lihat di pratinjau.`);
    }
  });
});
