'use client';

import type { CSSProperties } from 'react';
import type { MiniAppPalette } from '@/app/tg/app/theme';

interface ListSkeletonProps {
  readonly rows?: number;
  readonly theme: MiniAppPalette;
}

interface CardsSkeletonProps {
  readonly theme: MiniAppPalette;
}

interface EmptyStateProps {
  readonly title: string;
  readonly hint?: string;
  readonly actionLabel?: string;
  readonly onAction?: () => void;
  readonly theme: MiniAppPalette;
}

interface SectionErrorProps {
  readonly message: string;
  readonly onRetry: () => void;
  readonly theme: MiniAppPalette;
}

const PULSE_NAME = 'indicateSectionPulse';

const PULSE_STYLES = `@keyframes ${PULSE_NAME}{0%,100%{opacity:.45}50%{opacity:.85}}@media (prefers-reduced-motion:reduce){.${PULSE_NAME}{animation:none!important;opacity:.6!important}}`;

const TITLE_WIDTHS: readonly number[] = [82, 68, 76, 61, 73, 66, 79, 70];

function bar(theme: MiniAppPalette, width: string, height: number, radius: number): CSSProperties {
  return {
    width,
    height,
    borderRadius: radius,
    background: theme.line,
    animation: `${PULSE_NAME} 1.6s ease-in-out infinite`,
  };
}

export function ListSkeleton({ rows = 3, theme }: ListSkeletonProps) {
  const count = Math.min(Math.max(Math.floor(rows), 1), 8);
  const keys = Array.from({ length: count }, (_, index) => index);
  return (
    <div role="status" aria-label="Memuat" aria-busy="true">
      <style>{PULSE_STYLES}</style>
      {keys.map((index) => (
        <div key={index} className={PULSE_NAME} style={skeletonRow(theme)}>
          <div style={bar(theme, `${TITLE_WIDTHS[index % TITLE_WIDTHS.length]}%`, 14, 5)} />
          <div style={bar(theme, '34%', 11, 4)} />
        </div>
      ))}
    </div>
  );
}

export function CardsSkeleton({ theme }: CardsSkeletonProps) {
  return (
    <div role="status" aria-label="Memuat" aria-busy="true" style={skeletonGrid}>
      <style>{PULSE_STYLES}</style>
      {[0, 1, 2, 3].map((index) => (
        <div key={index} className={PULSE_NAME} style={skeletonCard(theme)}>
          <div style={bar(theme, '44%', 28, 6)} />
          <div style={bar(theme, '62%', 11, 4)} />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ title, hint, actionLabel, onAction, theme }: EmptyStateProps) {
  const actionable = actionLabel !== undefined && actionLabel !== '' && onAction !== undefined;
  return (
    <div style={stateCard(theme)}>
      <div style={rule(theme.accent)} />
      <div style={stateTitle(theme)}>{title}</div>
      {hint !== undefined && hint !== '' && <div style={stateHint(theme)}>{hint}</div>}
      {actionable && (
        <button type="button" style={accentButton(theme)} onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function SectionError({ message, onRetry, theme }: SectionErrorProps) {
  return (
    <div role="alert" style={stateCard(theme)}>
      <div style={rule(theme.danger)} />
      <div style={stateTitle(theme)}>{message}</div>
      <button type="button" style={plainButton(theme)} onClick={onRetry}>
        Coba lagi
      </button>
    </div>
  );
}

function skeletonRow(theme: MiniAppPalette): CSSProperties {
  return {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    width: '100%',
    boxSizing: 'border-box',
    background: theme.card,
    border: `1px solid ${theme.line}`,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  };
}

function skeletonCard(theme: MiniAppPalette): CSSProperties {
  return {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    background: theme.card,
    border: `1px solid ${theme.line}`,
    borderRadius: 12,
    padding: 16,
  };
}

function stateCard(theme: MiniAppPalette): CSSProperties {
  return {
    background: theme.card,
    border: `1px solid ${theme.line}`,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  };
}

function rule(color: string): CSSProperties {
  return { height: 2, width: 40, borderRadius: 2, background: color, marginBottom: 10 };
}

function stateTitle(theme: MiniAppPalette): CSSProperties {
  return { color: theme.text, fontSize: 15, fontWeight: 700, lineHeight: 1.45 };
}

function stateHint(theme: MiniAppPalette): CSSProperties {
  return { color: theme.dim, fontSize: 13, lineHeight: 1.55, marginTop: 6 };
}

function accentButton(theme: MiniAppPalette): CSSProperties {
  return {
    background: theme.accent,
    color: theme.bg,
    border: 'none',
    borderRadius: 10,
    padding: '10px 14px',
    fontSize: 14,
    fontWeight: 700,
    marginTop: 12,
  };
}

function plainButton(theme: MiniAppPalette): CSSProperties {
  return {
    background: theme.line,
    color: theme.text,
    border: 'none',
    borderRadius: 10,
    padding: '10px 14px',
    fontSize: 14,
    marginTop: 12,
  };
}

const skeletonGrid: CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 };
