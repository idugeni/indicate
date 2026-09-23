import Image from 'next/image';
import type { ReactNode } from 'react';
import { AtSign, Camera, ClipboardList, FileText, FolderOpen, HardDrive, Music2, Play, Presentation, Table, ThumbsUp, type LucideIcon } from 'lucide-react';

import { extractDriveUrl, extractFacebookUrl, extractInstagramUrl, extractTikTokUrl, extractTweetUrl, extractYouTubeId, isSafeLinkUrl, isSafeMediaSrc, isTipTapDoc, resolveMediaSrc, type TipTapNode } from '@/modules/site/tiptap-document';

function renderTextNode(node: TipTapNode, key: string): ReactNode {
  const text = typeof node.text === 'string' ? node.text : '';
  const lines = text.split('\n');
  let content: ReactNode = lines.map((line, lineIndex) => (
    <span key={lineIndex}>
      {lineIndex > 0 ? <br /> : null}
      {line}
    </span>
  ));
  for (const mark of node.marks ?? []) {
    if (mark.type === 'bold') content = <strong>{content}</strong>;
    else if (mark.type === 'italic') content = <em>{content}</em>;
    else if (mark.type === 'strike') content = <s>{content}</s>;
    else if (mark.type === 'code') content = <code>{content}</code>;
    else if (mark.type === 'underline') content = <u>{content}</u>;
    else if (mark.type === 'link') {
      const href = typeof mark.attrs?.href === 'string' ? mark.attrs.href : '';
      if (!isSafeLinkUrl(href)) continue;
      content = (
        <a href={href} target="_blank" rel="noopener noreferrer">
          {content}
        </a>
      );
    }
  }
  return <span key={key}>{content}</span>;
}

function YouTubeCard({ videoId }: { readonly videoId: string }) {
  return (
    <span className="block overflow-hidden rounded-2xl">
      <a
        href={`https://www.youtube.com/watch?v=${videoId}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Tonton video di YouTube (ID ${videoId})`}
        className="group flex items-center gap-4 rounded-2xl bg-slate-100 p-4 transition-colors hover:bg-slate-200"
      >
        <span aria-hidden="true" className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-slate-900 text-white transition-transform group-hover:scale-105">
          <Play className="h-5 w-5 fill-current" />
        </span>
        <span className="min-w-0">
          <span className="block font-sans text-sm font-semibold text-slate-900">Video YouTube</span>
          <span className="block truncate font-mono text-xs text-slate-500">youtube.com/watch?v={videoId}</span>
        </span>
      </a>
    </span>
  );
}

const SOCIAL_META: Record<'twitter' | 'instagram' | 'tiktok' | 'facebook', { readonly label: string; readonly Icon: LucideIcon }> = {
  twitter: { label: 'Postingan X', Icon: AtSign },
  instagram: { label: 'Postingan Instagram', Icon: Camera },
  tiktok: { label: 'Video TikTok', Icon: Music2 },
  facebook: { label: 'Postingan Facebook', Icon: ThumbsUp },
};

function driveMeta(href: string): { readonly label: string; readonly Icon: LucideIcon } {
  if (href.includes('/drive/folders/')) return { label: 'Folder Google Drive', Icon: FolderOpen };
  if (href.includes('docs.google.com/spreadsheets')) return { label: 'Spreadsheet Google', Icon: Table };
  if (href.includes('docs.google.com/presentation')) return { label: 'Presentasi Google', Icon: Presentation };
  if (href.includes('docs.google.com/forms')) return { label: 'Formulir Google', Icon: ClipboardList };
  if (href.includes('docs.google.com/document')) return { label: 'Dokumen Google Docs', Icon: FileText };
  return { label: 'File Google Drive', Icon: HardDrive };
}

function EmbedCard({ label, href, Icon }: { readonly label: string; readonly href: string; readonly Icon: LucideIcon }) {
  const detail = href.replace(/^https:\/\//u, '').slice(0, 80);
  return (
    <span className="block overflow-hidden rounded-2xl">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Lihat ${label} asli`}
        className="group flex items-center gap-4 rounded-2xl bg-slate-100 p-4 transition-colors hover:bg-slate-200"
      >
        <span aria-hidden="true" className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-slate-900 text-white transition-transform group-hover:scale-105">
          <Icon className="h-5 w-5" />
        </span>
        <span className="min-w-0">
          <span className="block font-sans text-sm font-semibold text-slate-900">{label}</span>
          <span className="block truncate font-mono text-xs text-slate-500">{detail}</span>
        </span>
      </a>
    </span>
  );
}

function SocialEmbedCard({ platform, href }: { readonly platform: keyof typeof SOCIAL_META; readonly href: string }) {
  const meta = SOCIAL_META[platform];
  return <EmbedCard label={meta.label} href={href} Icon={meta.Icon} />;
}

function isCanonicalSocialSrc(platform: keyof typeof SOCIAL_META, src: string): boolean {
  const canonical =
    platform === 'twitter' ? extractTweetUrl(src)
    : platform === 'instagram' ? extractInstagramUrl(src)
    : platform === 'tiktok' ? extractTikTokUrl(src)
    : extractFacebookUrl(src);
  return canonical !== null && canonical === src;
}

function renderNodes(nodes: readonly TipTapNode[], keyPrefix: string, context: RenderContext): ReactNode {
  return nodes.map((node, index) => renderNode(node, `${keyPrefix}-${index}`, context));
}

interface RenderContext {
  readonly paragraphClassName: string;
  readonly listClassName: string;
  readonly headingClassName: string;
  readonly quoteClassName: string;
}

function renderNode(node: TipTapNode, key: string, context: RenderContext): ReactNode {
  if (node.type === 'text') return renderTextNode(node, key);
  if (node.type === 'hardBreak') return <br key={key} />;
  if (node.type === 'horizontalRule') return <hr key={key} />;
  if (node.type === 'paragraph') {
    return <p key={key} className={context.paragraphClassName}>{renderNodes(node.content ?? [], key, context)}</p>;
  }
  if (node.type === 'heading') {
    const level = typeof node.attrs?.level === 'number' ? node.attrs.level : 2;
    const children = renderNodes(node.content ?? [], key, context);
    if (level <= 2) return <h2 key={key} className={context.headingClassName}>{children}</h2>;
    return <h3 key={key} className={context.headingClassName}>{children}</h3>;
  }
  if (node.type === 'blockquote') {
    return <blockquote key={key} className={context.quoteClassName}>{renderNodes(node.content ?? [], key, context)}</blockquote>;
  }
  if (node.type === 'bulletList') {
    return (
      <ul key={key} className={context.listClassName}>
        {(node.content ?? []).map((child, childIndex) => (child.type === 'listItem' ? <li key={childIndex}>{renderNodes(child.content ?? [], `${key}-${childIndex}`, context)}</li> : null))}
      </ul>
    );
  }
  if (node.type === 'orderedList') {
    return (
      <ol key={key} className={context.listClassName}>
        {(node.content ?? []).map((child, childIndex) => (child.type === 'listItem' ? <li key={childIndex}>{renderNodes(child.content ?? [], `${key}-${childIndex}`, context)}</li> : null))}
      </ol>
    );
  }
  if (node.type === 'listItem') {
    return <li key={key}>{renderNodes(node.content ?? [], key, context)}</li>;
  }
  if (node.type === 'codeBlock') {
    const code = (node.content ?? []).map((child) => (child.type === 'text' && typeof child.text === 'string' ? child.text : '')).join('');
    return (
      <pre key={key} className={context.quoteClassName}>
        <code>{code}</code>
      </pre>
    );
  }
  if (node.type === 'image') {
    const rawSrc = typeof node.attrs?.src === 'string' ? node.attrs.src : '';
    if (!isSafeMediaSrc(rawSrc)) return <p key={key} className={context.paragraphClassName}>[gambar]</p>;
    const src = resolveMediaSrc(rawSrc);
    const alt = typeof node.attrs?.alt === 'string' ? node.attrs.alt : '';
    const caption = typeof node.attrs?.title === 'string' && node.attrs.title.trim() !== '' ? node.attrs.title : typeof node.attrs?.caption === 'string' && node.attrs.caption.trim() !== '' ? node.attrs.caption : null;
    return (
      <figure key={key} className="m-0 overflow-hidden rounded-2xl shadow-sm">
        <Image unoptimized src={src} alt={alt} className="aspect-video w-full object-cover" width={1200} height={675} sizes="(max-width: 768px) 100vw, 768px" />
        {caption === null ? <figcaption className="sr-only">{alt === '' ? 'Gambar artikel' : alt}</figcaption> : <figcaption className="px-6 pb-4 text-center font-sans text-sm opacity-80">{caption}</figcaption>}
      </figure>
    );
  }
  if (node.type === 'youtube' || node.type === 'video') {
    const attrs = node.attrs ?? {};
    const candidate = typeof attrs.src === 'string' ? attrs.src : typeof attrs.videoId === 'string' ? attrs.videoId : typeof attrs.id === 'string' ? attrs.id : '';
    const videoId = extractYouTubeId(candidate);
    if (videoId === null) return null;
    return <YouTubeCard key={key} videoId={videoId} />;
  }
  if (node.type === 'twitter' || node.type === 'instagram' || node.type === 'tiktok' || node.type === 'facebook') {
    const src = typeof node.attrs?.src === 'string' ? node.attrs.src : '';
    if (!isCanonicalSocialSrc(node.type, src)) return null;
    return <SocialEmbedCard key={key} platform={node.type} href={src} />;
  }
  if (node.type === 'drive') {
    const src = typeof node.attrs?.src === 'string' ? node.attrs.src : '';
    if (extractDriveUrl(src) !== src) return null;
    const meta = driveMeta(src);
    return <EmbedCard key={key} label={meta.label} href={src} Icon={meta.Icon} />;
  }
  return null;
}

/**
 * Render a stored TipTap document into semantic HTML5 without raw HTML injection.
 *
 * @param doc - Untrusted stored TipTap JSON; invalid input renders nothing.
 * @param paragraphClassName - Class applied to paragraph fallbacks.
 * @param listClassName - Class applied to lists.
 * @param headingClassName - Class applied to headings; defaults to paragraph styling.
 * @param quoteClassName - Class applied to quotes and code blocks; defaults to paragraph styling.
 * @returns React nodes built only from the editorial allowlist.
 */
export function TipTapBodyView({
  doc,
  paragraphClassName,
  listClassName,
  headingClassName,
  quoteClassName,
}: {
  readonly doc: unknown;
  readonly paragraphClassName: string;
  readonly listClassName: string;
  readonly headingClassName?: string | undefined;
  readonly quoteClassName?: string | undefined;
}) {
  if (!isTipTapDoc(doc)) return null;
  const context: RenderContext = {
    paragraphClassName,
    listClassName,
    headingClassName: headingClassName ?? paragraphClassName,
    quoteClassName: quoteClassName ?? paragraphClassName,
  };
  return <>{renderNodes(doc.content ?? [], 'tiptap', context)}</>;
}
