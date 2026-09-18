// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

afterEach(() => {
  cleanup();
});

describe('Panel ubah ukuran', () => {
  it('merender kedua panel', () => {
    render(
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel>
          <div>Panel kiri</div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel>
          <div>Panel kanan</div>
        </ResizablePanel>
      </ResizablePanelGroup>,
    );
    expect(screen.getByText('Panel kiri')).toBeDefined();
    expect(screen.getByText('Panel kanan')).toBeDefined();
  });

  it('merender gagang pemisah', () => {
    const { container } = render(
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel>
          <div>Panel kiri</div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel>
          <div>Panel kanan</div>
        </ResizablePanel>
      </ResizablePanelGroup>,
    );
    expect(container.querySelector('[data-slot="resizable-handle"]')).not.toBe(null);
  });
});
