import { Node } from '@tiptap/core';

type EmbedNodeName = 'twitter' | 'instagram' | 'tiktok' | 'facebook' | 'drive';

function embedNode(name: EmbedNodeName, label: string) {
  return Node.create({
    name,
    group: 'block',
    atom: true,
    selectable: true,
    addAttributes() {
      return { src: { default: null } };
    },
    parseHTML() {
      return [{ tag: `div[data-social-embed="${name}"]` }];
    },
    renderHTML({ HTMLAttributes }) {
      return ['div', { 'data-social-embed': name, ...HTMLAttributes }, `${label} tersemat — lihat di pratinjau.`];
    },
  });
}

/**
 * Atom block for an embedded X post; stores the canonical post URL in `src`.
 */
export const TwitterEmbed = embedNode('twitter', 'Postingan X');

/**
 * Atom block for an embedded Instagram post; stores the canonical post URL in `src`.
 */
export const InstagramEmbed = embedNode('instagram', 'Postingan Instagram');

/**
 * Atom block for an embedded TikTok video; stores the validated watch URL in `src`.
 */
export const TikTokEmbed = embedNode('tiktok', 'Video TikTok');

/**
 * Atom block for an embedded Facebook post; stores the validated post URL in `src`.
 */
export const FacebookEmbed = embedNode('facebook', 'Postingan Facebook');

/**
 * Atom block for an embedded Google Drive file, folder, or Docs editor; stores the validated URL in `src`.
 */
export const DriveEmbed = embedNode('drive', 'Google Drive');
