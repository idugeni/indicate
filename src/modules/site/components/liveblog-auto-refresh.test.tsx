// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: refreshMock }) }));
const refreshMock = vi.hoisted(() => vi.fn());

import { LiveblogAutoRefresh } from '@/modules/site/components/liveblog-auto-refresh';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  refreshMock.mockClear();
});

describe('LiveblogAutoRefresh', () => {
  it('tidak merender apa pun dan me-refresh berkala saat tab terlihat', () => {
    vi.useFakeTimers();
    const { container } = render(<LiveblogAutoRefresh intervalSeconds={60} />);
    expect(container.textContent).toBe('');
    expect(refreshMock).not.toHaveBeenCalled();
    vi.advanceTimersByTime(60_000);
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it('diam saat interval non-positif', () => {
    vi.useFakeTimers();
    render(<LiveblogAutoRefresh intervalSeconds={0} />);
    vi.advanceTimersByTime(600_000);
    expect(refreshMock).not.toHaveBeenCalled();
  });
});
