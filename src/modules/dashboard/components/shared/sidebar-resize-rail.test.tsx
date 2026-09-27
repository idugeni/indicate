// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { SidebarResizeRail } from '@/modules/dashboard/components/shared/sidebar-resize-rail';

afterEach(() => {
  cleanup();
});

function renderRail(overrides: Partial<Parameters<typeof SidebarResizeRail>[0]> = {}) {
  const onWidthChange = vi.fn();
  const onCollapsedChange = vi.fn();
  render(
    <SidebarResizeRail
      width={256}
      collapsed={false}
      label="Ciutkan sidebar"
      onWidthChange={onWidthChange}
      onCollapsedChange={onCollapsedChange}
      {...overrides}
    />,
  );
  return { rail: screen.getByRole('separator'), onWidthChange, onCollapsedChange };
}

describe('Sidebar edge rail', () => {
  it('exposes the current width as a vertical splitter', () => {
    const { rail } = renderRail();
    expect(rail.getAttribute('aria-orientation')).toBe('vertical');
    expect(rail.getAttribute('aria-valuenow')).toBe('256');
    expect(rail.getAttribute('aria-label')).toBe('Ciutkan sidebar');
  });

  it('keeps the chevron hidden until the rail is hovered or focused', () => {
    const { rail } = renderRail();
    const grip = rail.querySelectorAll('span')[1];
    expect(grip?.className).toContain('opacity-0');
    expect(grip?.className).toContain('group-hover/rail:opacity-100');
    expect(grip?.className).toContain('group-focus-visible/rail:opacity-100');
  });

  it('resizes while the rail is dragged', () => {
    const { rail, onWidthChange } = renderRail();
    fireEvent.pointerDown(rail, { button: 0, clientX: 100, pointerId: 1 });
    fireEvent.pointerMove(rail, { clientX: 160, pointerId: 1 });
    expect(onWidthChange).toHaveBeenCalledWith(316);
    fireEvent.pointerUp(rail, { clientX: 160, pointerId: 1 });
  });

  it('clamps the dragged width to the minimum and maximum', () => {
    const { rail, onWidthChange } = renderRail();
    fireEvent.pointerDown(rail, { button: 0, clientX: 100, pointerId: 1 });
    fireEvent.pointerMove(rail, { clientX: 5000, pointerId: 1 });
    expect(onWidthChange).toHaveBeenLastCalledWith(448);
    fireEvent.pointerDown(rail, { button: 0, clientX: 100, pointerId: 2 });
    fireEvent.pointerMove(rail, { clientX: -5000, pointerId: 2 });
    expect(onWidthChange).toHaveBeenLastCalledWith(224);
  });

  it('treats a press without movement as a collapse toggle', () => {
    const { rail, onWidthChange, onCollapsedChange } = renderRail();
    fireEvent.pointerDown(rail, { button: 0, clientX: 100, pointerId: 1 });
    fireEvent.pointerMove(rail, { clientX: 102, pointerId: 1 });
    fireEvent.pointerUp(rail, { clientX: 102, pointerId: 1 });
    expect(onWidthChange).not.toHaveBeenCalled();
    expect(onCollapsedChange).toHaveBeenCalledWith(true);
  });

  it('expands instead of toggling back when a collapsed rail is pressed', () => {
    const { rail, onCollapsedChange } = renderRail({ collapsed: true, width: 64 });
    fireEvent.pointerDown(rail, { button: 0, clientX: 100, pointerId: 1 });
    fireEvent.pointerUp(rail, { clientX: 100, pointerId: 1 });
    expect(onCollapsedChange).toHaveBeenCalledWith(false);
  });

  it('resizes with the arrow keys', () => {
    const { rail, onWidthChange } = renderRail();
    fireEvent.keyDown(rail, { key: 'ArrowRight' });
    expect(onWidthChange).toHaveBeenCalledWith(272);
    fireEvent.keyDown(rail, { key: 'ArrowLeft' });
    expect(onWidthChange).toHaveBeenCalledWith(240);
  });

  it('jumps to the minimum and maximum width with Home and End', () => {
    const { rail, onWidthChange, onCollapsedChange } = renderRail();
    fireEvent.keyDown(rail, { key: 'Home' });
    expect(onWidthChange).toHaveBeenLastCalledWith(224);
    expect(onCollapsedChange).toHaveBeenCalledWith(false);
    fireEvent.keyDown(rail, { key: 'End' });
    expect(onWidthChange).toHaveBeenLastCalledWith(448);
  });
});
