'use client';

import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import StarterKit from '@tiptap/starter-kit';
import Youtube from '@tiptap/extension-youtube';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import { Table } from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { MediaOwner } from '@/modules/publishing/models';
import { detectDriveEmbed, detectSocialEmbed, extractYouTubeId, isSafeLinkUrl, isTipTapDoc, type TipTapDoc } from '@/modules/site/tiptap-document';
import { DriveEmbed, FacebookEmbed, InstagramEmbed, TikTokEmbed, TwitterEmbed } from '@/modules/dashboard/components/editorial/embed-nodes';
import { uploadEditorImage } from '@/modules/dashboard/components/editorial/editor-image-upload';

export interface RichTextDocChange {
  readonly doc: TipTapDoc;
  readonly text: string;
}

type CommandFn = (action: string, payload: unknown) => Promise<unknown>;

function rewritePreviewSources(doc: TipTapDoc, mapping: ReadonlyMap<string, string>): TipTapDoc {
  const rewrite = (node: { readonly [key: string]: unknown }): { readonly [key: string]: unknown } => {
    const record = node as { readonly type?: unknown; readonly attrs?: unknown; readonly content?: unknown };
    if (record.type === 'image' && typeof record.attrs === 'object' && record.attrs !== null) {
      const attrs = record.attrs as Readonly<Record<string, unknown>>;
      const src = typeof attrs.src === 'string' ? attrs.src : '';
      const stored = mapping.get(src);
      if (stored !== undefined) return { ...node, attrs: { ...attrs, src: stored } };
      return node;
    }
    if (Array.isArray(record.content)) return { ...node, content: record.content.map((child) => rewrite(child as { readonly [key: string]: unknown })) };
    return node;
  };
  return rewrite(doc as unknown as { readonly [key: string]: unknown }) as unknown as TipTapDoc;
}

function fileStem(name: string): string {
  const stem = name.replace(/\.[a-z0-9]{1,10}$/iu, '').trim();
  return stem === '' ? 'gambar' : stem;
}

/**
 * Accessible TipTap rich-text editor bound to the dashboard design system.
 *
 * @param initialDoc - Initial TipTap JSON for edits; null starts with an empty paragraph.
 * @param onDocChange - Emits durable JSON (presigned previews rewritten) plus plain text.
 * @param command - Dashboard dispatcher for `media.reserve`, `media.complete`, and `media.read`.
 * @param owner - Media owner for inline uploads; defaults to the organization.
 * @param labelledBy - ID of the visible label describing this editor.
 * @param disabled - Disables toolbar and canvas during submission.
 * @returns Toolbar plus canvas styled with Shadcn and Tailwind tokens.
 */
export function RichTextEditor({
  initialDoc,
  onDocChange,
  command,
  owner = { kind: 'organization' },
  labelledBy,
  disabled = false,
}: {
  readonly initialDoc?: unknown;
  readonly onDocChange: (change: RichTextDocChange) => void;
  readonly command: CommandFn;
  readonly owner?: MediaOwner;
  readonly labelledBy?: string;
  readonly disabled?: boolean;
}) {
  const toolbarId = useId();
  const linkInputId = useId();
  const youtubeInputId = useId();
  const socialInputId = useId();
  const selectedCaptionInputId = useId();
  const fileInputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const srcMap = useRef(new Map<string, string>());
  const onDocChangeRef = useRef(onDocChange);
  useEffect(() => {
    onDocChangeRef.current = onDocChange;
  });
  const [linkDraft, setLinkDraft] = useState('');
  const [linkOpen, setLinkOpen] = useState(false);
  const [youtubeDraft, setYoutubeDraft] = useState('');
  const [youtubeOpen, setYoutubeOpen] = useState(false);
  const [socialDraft, setSocialDraft] = useState('');
  const [socialOpen, setSocialOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ readonly src: string; readonly alt: string } | null>(null);
  const selectedCaptionRef = useRef<HTMLInputElement>(null);

  function syncImageSelection(current: Editor): void {
    if (current.isActive('image')) {
      const attrs = current.getAttributes('image') as { readonly src?: unknown; readonly alt?: unknown };
      const src = typeof attrs.src === 'string' ? attrs.src : '';
      const alt = typeof attrs.alt === 'string' ? attrs.alt : '';
      setSelectedImage((prev) => (prev !== null && prev.src === src && prev.alt === alt ? prev : { src, alt }));
    } else {
      setSelectedImage((prev) => (prev === null ? prev : null));
    }
  }

  const editor = useEditor(
    {
      immediatelyRender: false,
      editable: !disabled,
      extensions: [
        StarterKit.configure({ heading: { levels: [2, 3] }, link: false, underline: false }),
        Link.configure({ openOnClick: false, autolink: true, defaultProtocol: 'https', HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' } }),
        Image.configure({ allowBase64: false }),
        Youtube.configure({ controls: true, nocookie: true, modestBranding: true, allowFullscreen: true }),
        TwitterEmbed,
        InstagramEmbed,
        TikTokEmbed,
        FacebookEmbed,
        DriveEmbed,
        Underline,
        Highlight.configure({ multicolor: false }),
        TextStyle,
        Color,
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        Table.configure({ resizable: false }),
        TableRow,
        TableHeader,
        TableCell,
        Placeholder.configure({ placeholder: 'Tuliskan materi berita di sini…', showOnlyWhenEditable: true }),
      ],
      content: isTipTapDoc(initialDoc) ? (initialDoc as unknown as Record<string, unknown>) : { type: 'doc', content: [{ type: 'paragraph' }] },
      editorProps: {
        attributes: { class: 'tiptap-canvas min-h-[180px] p-3 font-sans text-xs leading-relaxed text-paper focus:outline-none', ...(labelledBy === undefined ? {} : { 'aria-labelledby': labelledBy }) },
        handleDrop: (view, event) => {
          const files = [...(event.dataTransfer?.files ?? [])].filter((file) => file.type.startsWith('image/'));
          if (files.length === 0) return false;
          event.preventDefault();
          void insertUpload(files[0]!);
          return true;
        },
        handlePaste: (view, event) => {
          const files = [...(event.clipboardData?.files ?? [])].filter((file) => file.type.startsWith('image/'));
          if (files.length === 0) return false;
          event.preventDefault();
          void insertUpload(files[0]!);
          return true;
        },
      },
      onUpdate: ({ editor: current }) => {
        const raw = current.getJSON() as TipTapDoc;
        onDocChangeRef.current({ doc: rewritePreviewSources(raw, srcMap.current), text: current.getText() });
        syncImageSelection(current);
      },
      onSelectionUpdate: ({ editor: current }) => {
        syncImageSelection(current);
      },
    },
    [],
  );

  useEffect(() => {
    if (editor !== null) editor.setEditable(!disabled);
  }, [editor, disabled]);

  async function insertUpload(file: File): Promise<void> {
    if (editor === null || uploading) return;
    setUploading(true);
    setStatus('Mengunggah gambar…');
    try {
      const { storedSrc, previewUrl } = await uploadEditorImage(file, owner, command);
      if (previewUrl !== storedSrc) srcMap.current.set(previewUrl, storedSrc);
      editor.chain().focus().setImage({ src: previewUrl, alt: fileStem(file.name), title: fileStem(file.name) }).run();
      setStatus('Gambar tersisip.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Gagal mengunggah gambar.');
    } finally {
      setUploading(false);
      if (fileRef.current !== null) fileRef.current.value = '';
    }
  }

  function applyLink(): void {
    if (editor === null) return;
    const href = linkDraft.trim();
    if (href === '') {
      editor.chain().focus().unsetLink().run();
      setLinkOpen(false);
      return;
    }
    if (!isSafeLinkUrl(href)) {
      setStatus('Tautan ditolak: gunakan path /artikel atau URL http(s) publik.');
      return;
    }
    editor.chain().focus().setLink({ href }).run();
    setLinkOpen(false);
    setLinkDraft('');
    setStatus(null);
  }

  function applyYoutube(): void {
    if (editor === null) return;
    const videoId = extractYouTubeId(youtubeDraft);
    if (videoId === null) {
      setStatus('Tautan YouTube tidak valid: tempel URL tonton/bagikan atau 11 karakter ID.');
      return;
    }
    editor.chain().focus().setYoutubeVideo({ src: `https://www.youtube.com/watch?v=${videoId}` }).run();
    setYoutubeOpen(false);
    setYoutubeDraft('');
    setStatus(null);
  }

  function applySocial(): void {
    if (editor === null) return;
    const detected = detectSocialEmbed(socialDraft) ?? detectDriveEmbed(socialDraft);
    if (detected === null) {
      setStatus('Tautan tidak valid: tempel URL YouTube, X, Instagram, TikTok, Facebook, atau Google Drive.');
      return;
    }
    if (detected.type === 'youtube') {
      editor.chain().focus().setYoutubeVideo({ src: detected.url }).run();
    } else {
      editor.chain().focus().insertContent({ type: detected.type, attrs: { src: detected.url } }).run();
    }
    setSocialOpen(false);
    setSocialDraft('');
    setStatus('Sematan tersisip.');
  }

  function applySelectedCaption(): void {
    if (editor === null) return;
    const next = selectedCaptionRef.current?.value.trim() ?? '';
    editor.chain().focus().updateAttributes('image', { alt: next }).run();
    setSelectedImage((prev) => (prev === null ? prev : { ...prev, alt: next }));
    setStatus(next === '' ? 'Keterangan gambar dikosongkan.' : 'Keterangan gambar diperbarui.');
  }

  const busy = disabled || uploading || editor === null;
  const TOOLTIP_CONTENT = 'border border-hairline bg-bg-raised p-2 font-mono text-xs text-paper';
  const toggle = (label: string, active: boolean, run: () => void, tip: string, ariaLabel = label, disabled = busy) => (
    <Tooltip key={label}>
      <TooltipTrigger
        render={
          <Button type="button" variant="outline" size="xs" aria-pressed={active} aria-label={ariaLabel} disabled={disabled} onClick={run}>
            {label}
          </Button>
        }
      />
      <TooltipContent side="top" className={TOOLTIP_CONTENT}>
        {tip}
      </TooltipContent>
    </Tooltip>
  );

  return (
    <div className="overflow-hidden rounded border border-hairline-strong bg-bg transition-colors duration-180 focus-within:border-brass hover:border-hairline">
      <div id={toolbarId} role="toolbar" aria-label="Format teks" className="flex flex-wrap items-center gap-1.5 border-b border-hairline bg-bg-raised p-2">
        {editor === null ? null : (
          <>
            <div role="group" aria-label="Gaya dasar" className="flex items-center gap-1">
            {toggle('Tebal', editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), 'Tebal (Ctrl+B)')}
            {toggle('Miring', editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), 'Miring (Ctrl+I)')}
            </div>
            <Separator orientation="vertical" className="h-5" />
            <div role="group" aria-label="Struktur" className="flex items-center gap-1">
            {toggle('H2', editor.isActive('heading', { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), 'Judul bagian')}
            {toggle('H3', editor.isActive('heading', { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), 'Subbagian')}
            {toggle('Kutip', editor.isActive('blockquote'), () => editor.chain().focus().toggleBlockquote().run(), 'Kutipan')}
            {toggle('Daftar', editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run(), 'Daftar poin')}
            {toggle('Nomor', editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run(), 'Daftar bernomor')}
            </div>
            <Separator orientation="vertical" className="h-5" />
            <div role="group" aria-label="Sisip cepat" className="flex items-center gap-1">
            {toggle('Tautan', editor.isActive('link'), () => {
              setLinkDraft(typeof editor.getAttributes('link').href === 'string' ? (editor.getAttributes('link').href as string) : '');
              setLinkOpen((open) => !open);
            }, 'Sisip atau ubah tautan')}
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button type="button" variant="outline" size="xs" aria-label="Unggah gambar" disabled={busy} onClick={() => fileRef.current?.click()}>
                    {uploading ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : null}
                    Gambar
                  </Button>
                }
              />
              <TooltipContent side="top" className={TOOLTIP_CONTENT}>
                Unggah gambar ke R2
              </TooltipContent>
            </Tooltip>
            </div>
            <Separator orientation="vertical" className="h-5" />
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button type="button" variant="outline" size="xs" aria-expanded={advancedOpen} aria-controls={`${toolbarId}-advanced`} disabled={busy} onClick={() => setAdvancedOpen((open) => !open)}>
                    <ChevronDown className={`h-3 w-3 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                    Lanjutan
                  </Button>
                }
              />
              <TooltipContent side="top" className={TOOLTIP_CONTENT}>
                {advancedOpen ? 'Sembunyikan format lanjutan' : 'Tampilkan format lanjutan'}
              </TooltipContent>
            </Tooltip>
          </>
        )}
      </div>

      {advancedOpen && editor !== null ? (
        <div id={`${toolbarId}-advanced`} role="group" aria-label="Format lanjutan" className="flex flex-wrap items-center gap-1.5 border-b border-hairline bg-bg-raised p-2">
            <div role="group" aria-label="Gaya lanjutan" className="flex items-center gap-1">
            {toggle('Coret', editor.isActive('strike'), () => editor.chain().focus().toggleStrike().run(), 'Coret')}
            {toggle('Garis Bawah', editor.isActive('underline'), () => editor.chain().focus().toggleUnderline().run(), 'Garis bawah (Ctrl+U)')}
            {toggle('Kode Sebaris', editor.isActive('code'), () => editor.chain().focus().toggleCode().run(), 'Kode sebaris')}
            {toggle('Stabilo', editor.isActive('highlight'), () => editor.chain().focus().toggleHighlight().run(), 'Stabilo')}
            <Tooltip>
              <TooltipTrigger
                render={
                  <label className="inline-flex cursor-pointer items-center gap-1 rounded border border-hairline bg-bg-raised px-1.5 py-1 font-sans text-[11px] text-paper-dim transition-colors hover:text-paper">
                    <span aria-hidden="true" className="inline-block h-3 w-3 rounded-sm border border-hairline" style={{ backgroundColor: editor.getAttributes('textStyle').color ?? 'transparent' }} />
                    Warna
                    <input
                      type="color"
                      aria-label="Warna teks"
                      disabled={busy}
                      value={typeof editor.getAttributes('textStyle').color === 'string' ? (editor.getAttributes('textStyle').color as string) : '#000000'}
                      onChange={(event) => editor.chain().focus().setColor(event.target.value).run()}
                      className="sr-only"
                    />
                  </label>
                }
              />
              <TooltipContent side="top" className={TOOLTIP_CONTENT}>
                Warna teks pilihan
              </TooltipContent>
            </Tooltip>
            {toggle('Reset', false, () => editor.chain().focus().unsetColor().run(), 'Kembalikan warna bawaan', 'Hapus warna teks')}
            </div>
            <Separator orientation="vertical" className="h-5" />
            <div role="group" aria-label="Blok dan garis" className="flex items-center gap-1">
            {toggle('Kode', editor.isActive('codeBlock'), () => editor.chain().focus().toggleCodeBlock().run(), 'Blok kode')}
            {toggle('Garis', false, () => editor.chain().focus().setHorizontalRule().run(), 'Garis pemisah')}
            </div>
            <Separator orientation="vertical" className="h-5" />
            <div role="group" aria-label="Perataan" className="flex items-center gap-1">
            {toggle('Kiri', editor.isActive({ textAlign: 'left' }), () => editor.chain().focus().setTextAlign('left').run(), 'Rata kiri')}
            {toggle('Tengah', editor.isActive({ textAlign: 'center' }), () => editor.chain().focus().setTextAlign('center').run(), 'Rata tengah')}
            {toggle('Kanan', editor.isActive({ textAlign: 'right' }), () => editor.chain().focus().setTextAlign('right').run(), 'Rata kanan')}
            {toggle('Rata', editor.isActive({ textAlign: 'justify' }), () => editor.chain().focus().setTextAlign('justify').run(), 'Rata kanan-kiri')}
            </div>
            <Separator orientation="vertical" className="h-5" />
            <div role="group" aria-label="Tabel" className="flex items-center gap-1">
            {toggle('Tabel', editor.isActive('table'), () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(), 'Sisipkan tabel 3×3')}
            {toggle('+Brs', false, () => editor.chain().focus().addRowAfter().run(), 'Tambah baris di bawah')}
            {toggle('+Kol', false, () => editor.chain().focus().addColumnAfter().run(), 'Tambah kolom di kanan')}
            {toggle('Hapus Tabel', false, () => editor.chain().focus().deleteTable().run(), 'Hapus tabel aktif')}
            </div>
            <Separator orientation="vertical" className="h-5" />
            <div role="group" aria-label="Sisipan lanjutan" className="flex items-center gap-1">
            {toggle('YouTube', false, () => setYoutubeOpen((open) => !open), 'Sematkan video YouTube', 'Sematan YouTube')}
            {toggle('Sosial', false, () => setSocialOpen((open) => !open), 'Sematkan YouTube, X, Instagram, TikTok, Facebook, atau Google Drive', 'Sematan sosial')}
            </div>
            <Separator orientation="vertical" className="h-5" />
            <div role="group" aria-label="Riwayat" className="flex items-center gap-1">
            {toggle('Urung', false, () => editor.chain().focus().undo().run(), 'Urungkan (Ctrl+Z)', 'Urungkan', busy || !editor.can().undo())}
            {toggle('Ulang', false, () => editor.chain().focus().redo().run(), 'Ulangi (Ctrl+Shift+Z)', 'Ulangi', busy || !editor.can().redo())}
            </div>
        </div>
      ) : null}

      {linkOpen ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-hairline bg-bg-raised-2 p-2">
          <label htmlFor={linkInputId} className="font-mono text-[11px] text-paper-dim">
            URL tautan
          </label>
          <Input
            id={linkInputId}
            value={linkDraft}
            onChange={(event) => setLinkDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                applyLink();
              }
            }}
            placeholder="https://… atau /slug-artikel"
            disabled={busy}
            className="h-7 min-w-0 flex-1 font-mono text-xs"
          />
          <Button type="button" variant="outline" size="xs" disabled={busy} onClick={applyLink}>
            Terapkan
          </Button>
        </div>
      ) : null}

      {youtubeOpen ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-hairline bg-bg-raised-2 p-2">
          <label htmlFor={youtubeInputId} className="font-mono text-[11px] text-paper-dim">
            URL/ID YouTube
          </label>
          <Input
            id={youtubeInputId}
            value={youtubeDraft}
            onChange={(event) => setYoutubeDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                applyYoutube();
              }
            }}
            placeholder="https://youtu.be/… atau 11 karakter ID"
            disabled={busy}
            className="h-7 min-w-0 flex-1 font-mono text-xs"
          />
          <Button type="button" variant="outline" size="xs" disabled={busy} onClick={applyYoutube}>
            Sematkan
          </Button>
        </div>
      ) : null}

      {socialOpen ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-hairline bg-bg-raised-2 p-2">
          <label htmlFor={socialInputId} className="font-mono text-[11px] text-paper-dim">
            URL postingan sosial
          </label>
          <Input
            id={socialInputId}
            value={socialDraft}
            onChange={(event) => setSocialDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                applySocial();
              }
            }}
            placeholder="youtube.com • x.com • instagram.com • tiktok.com • facebook.com • drive.google.com"
            disabled={busy}
            className="h-7 min-w-0 flex-1 font-mono text-xs"
          />
          <Button type="button" variant="outline" size="xs" disabled={busy} onClick={applySocial}>
            Sematkan
          </Button>
        </div>
      ) : null}

      <input ref={fileRef} id={fileInputId} type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/x-icon,.ico,.heic,.heif" aria-label="Pilih berkas gambar" disabled={busy} className="sr-only" onChange={(event) => {
        const file = event.target.files?.[0];
        if (file !== undefined) void insertUpload(file);
      }} />

      {editor !== null && selectedImage !== null ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-hairline bg-bg-raised-2 p-2">
          <label htmlFor={selectedCaptionInputId} className="font-mono text-[11px] text-paper-dim">
            Keterangan gambar
          </label>
          <Input
            key={selectedImage.src}
            ref={selectedCaptionRef}
            id={selectedCaptionInputId}
            defaultValue={selectedImage.alt}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                applySelectedCaption();
              }
            }}
            placeholder="cth: Suasana pasar pagi"
            disabled={busy}
            maxLength={500}
            className="h-7 min-w-0 flex-1 font-sans text-xs"
          />
          <Button type="button" variant="outline" size="xs" disabled={busy} onClick={applySelectedCaption}>
            Terapkan
          </Button>
        </div>
      ) : null}

      <EditorContent editor={editor} aria-describedby={status === null ? undefined : `${toolbarId}-status`} />
      <p id={`${toolbarId}-status`} role="status" aria-live="polite" className="m-0 border-t border-hairline bg-bg-raised px-3 py-1.5 font-mono text-[11px] text-paper-faint">
        {status ?? 'Paragraf baru: Enter. Heading 2/3, daftar, kutipan, tautan aman, gambar R2, tabel, dan sematan YouTube.'}
      </p>
    </div>
  );
}
