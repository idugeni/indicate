'use client';

import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '@/ui/cn';

const MIN_WIDTH_PX = 224;
const MAX_WIDTH_PX = 448;
const KEYBOARD_STEP_PX = 16;
const DRAG_THRESHOLD_PX = 4;

function clampWidth(width: number): number {
  return Math.min(MAX_WIDTH_PX, Math.max(MIN_WIDTH_PX, Math.round(width)));
}

/**
 * Hover-revealed edge rail that resizes and collapses the dashboard sidebar.
 *
 * Mirrors the Vercel dashboard: a round chevron button sits on the sidebar's
 * right border at mid-height and stays invisible until the pointer reaches that
 * edge. Dragging sideways resizes, a click toggles collapsed, arrow keys
 * resize for keyboard users. Exposed as an ARIA window splitter.
 *
 * @remarks
 * The rail sits above the workspace chrome (sticky header `z-30`, sticky footer
 * `z-20`) so the edge stays hoverable and the grip stays visible behind them,
 * and below the `z-50` overlay layer so modals, sheets, and menus still cover it.
 */
export function SidebarResizeRail({
  width,
  collapsed,
  label,
  onWidthChange,
  onCollapsedChange,
  onDraggingChange,
}: {
  /** Current rendered sidebar width in pixels, including the collapsed width. */
  readonly width: number;
  readonly collapsed: boolean;
  /** Accessible name announced for the splitter, e.g. "Collapse sidebar". */
  readonly label: string;
  readonly onWidthChange: (width: number) => void;
  readonly onCollapsedChange: (collapsed: boolean) => void;
  /** Lets the owner drop its width transition mid-drag so the drag tracks the pointer. */
  readonly onDraggingChange?: (dragging: boolean) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const originRef = useRef<{ readonly x: number; readonly width: number } | null>(null);
  const draggedRef = useRef(false);
  const capturedRef = useRef(false);
  const expandedOnPointerDownRef = useRef(false);

  useEffect(() => {
    onDraggingChange?.(dragging);
  }, [dragging, onDraggingChange]);

  useEffect(() => {
    if (!dragging) return;
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
    };
  }, [dragging]);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    if (typeof event.currentTarget.setPointerCapture === 'function') {
      event.currentTarget.setPointerCapture(event.pointerId);
      capturedRef.current = true;
    }
    draggedRef.current = false;
    expandedOnPointerDownRef.current = collapsed;
    if (collapsed) {
      onCollapsedChange(false);
      originRef.current = { x: event.clientX, width: MIN_WIDTH_PX };
      return;
    }
    originRef.current = { x: event.clientX, width };
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const origin = originRef.current;
    if (!origin) return;
    const delta = event.clientX - origin.x;
    if (!draggedRef.current && Math.abs(delta) < DRAG_THRESHOLD_PX) return;
    draggedRef.current = true;
    setDragging(true);
    onWidthChange(clampWidth(origin.width + delta));
  };

  const endPointerGesture = (event: PointerEvent<HTMLDivElement>): void => {
    const wasDrag = draggedRef.current;
    const expandedOnPointerDown = expandedOnPointerDownRef.current;
    originRef.current = null;
    draggedRef.current = false;
    expandedOnPointerDownRef.current = false;
    setDragging(false);
    if (capturedRef.current && typeof event.currentTarget.releasePointerCapture === 'function') {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    capturedRef.current = false;
    if (wasDrag || expandedOnPointerDown) return;
    onCollapsedChange(!collapsed);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onCollapsedChange(!collapsed);
      return;
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      onCollapsedChange(false);
      onWidthChange(event.key === 'Home' ? MIN_WIDTH_PX : MAX_WIDTH_PX);
      return;
    }
    if (collapsed) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const step = event.key === 'ArrowLeft' ? -KEYBOARD_STEP_PX : KEYBOARD_STEP_PX;
    onWidthChange(clampWidth(width + step));
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={Math.round(width)}
      aria-valuemin={MIN_WIDTH_PX}
      aria-valuemax={MAX_WIDTH_PX}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endPointerGesture}
      onPointerCancel={endPointerGesture}
      onKeyDown={handleKeyDown}
      className="group/rail absolute inset-y-0 -right-3.5 z-40 hidden w-7 touch-none select-none items-center justify-center focus-visible:outline-none md:flex"
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-y-0 left-1/2 w-px -translate-x-1/2 transition-colors duration-150',
          dragging ? 'bg-brass' : 'bg-transparent group-hover/rail:bg-hairline-strong',
        )}
      />
      <span
        aria-hidden="true"
        className={cn(
          'relative z-10 flex h-7 w-7 flex-none items-center justify-center rounded-full border transition-[opacity,background-color,border-color,color] duration-150',
          dragging
            ? 'border-brass bg-brass/15 text-brass opacity-100'
            : 'border-hairline-strong bg-bg-raised-2 text-paper-dim opacity-0 group-hover/rail:border-brass/60 group-hover/rail:text-paper group-hover/rail:opacity-100 group-focus-visible/rail:border-brass/60 group-focus-visible/rail:text-paper group-focus-visible/rail:opacity-100',
        )}
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
        ) : (
          <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
        )}

      </span>
    </div>
  );
}
