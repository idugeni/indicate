// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditorialWorkspaceV2 } from './editorial-workspace-v2';

const submit = vi.fn(async () => ({ id: 'article-1', slug: 'artikel-1', organizationId: 'org-1' }));
const command = vi.fn(async () => ({
  article: {
    id: 'article-1',
    version: 4,
    slug: 'artikel-1',
    title: 'Artikel',
    body: 'Isi',
    status: 'draft',
  },
}));

const form = {
  titleText: 'Artikel',
  slug: 'artikel-1',
  provinceId: 'province-1',
  nationalActive: false,
  bodyText: 'Isi artikel',
  bodyJsonProblem: null,
  effectiveCategoryIds: ['category-1'],
  bodyJsonDraft: null,
  status: 'draft',
  setStatus: vi.fn(),
  isSubmitting: false,
  isEditing: false,
  willPublish: false,
  statusSelectId: 'status',
  handleSaveArticle: vi.fn((event: { preventDefault: () => void }) => event.preventDefault()),
  editorStats: { words: 12, minutes: 1 },
  targetLabel: 'portal apex',
  targetSiteIds: ['site-1', 'site-2'],
  modeProblem: null,
  editOriginalStatus: null,
};

vi.mock('@/modules/dashboard/components/editorial/use-article-form-state', () => ({
  useArticleFormState: vi.fn((args: { onSubmit: typeof submit }) => {
    void args;
    return form;
  }),
}));

vi.mock('@/modules/dashboard/components/editorial/article-composer-fields', () => ({
  ArticleComposerFields: () => <div data-testid="composer-fields">Composer</div>,
}));

vi.mock('@/modules/dashboard/components/editorial/article-inspector-fields', () => ({
  ArticleInspectorFields: () => <div data-testid="inspector-fields">Inspector</div>,
}));

vi.mock('@/modules/dashboard/components/editorial/liveblog-updates', () => ({
  LiveblogUpdates: () => null,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('EditorialWorkspaceV2', () => {
  it('renders a dedicated editorial workspace instead of the legacy form surface', () => {
    render(
      <EditorialWorkspaceV2
        data={{ regions: [] }}
        onSubmit={submit}
        command={command}
        organizationId="org-1"
      />,
    );

    expect(screen.getByRole('heading', { name: 'Create & Prepare' })).toBeDefined();
    expect(screen.getByRole('region', { name: 'Editorial canvas' })).toBeDefined();
    expect(screen.getByRole('complementary', { name: 'Editorial inspector' })).toBeDefined();
    expect(screen.getByText('Writing canvas')).toBeDefined();
    expect(screen.getByText('Publication inspector')).toBeDefined();
    expect(screen.getByText('Preflight')).toBeDefined();
  });

  it('exposes the production save action through the existing form state contract', async () => {
    const u = userEvent.setup();
    render(
      <EditorialWorkspaceV2
        data={{ regions: [] }}
        onSubmit={submit}
        command={command}
        organizationId="org-1"
      />,
    );

    await u.click(screen.getByRole('button', { name: 'Simpan Draf' }));
    expect(form.handleSaveArticle).toHaveBeenCalled();
  });

  it('loads edit mode through article.edit.load before mounting the V2 workspace', async () => {
    render(
      <EditorialWorkspaceV2
        data={{ regions: [] }}
        onSubmit={submit}
        command={command}
        organizationId="org-1"
        editArticleId="article-1"
        editOwnerOrganizationId="owner-org-2"
      />,
    );

    await waitFor(() =>
      expect(command).toHaveBeenCalledWith(
        'article.edit.load',
        { id: 'article-1', ownerOrganizationId: 'owner-org-2' },
      ),
    );
  });
  it('explains resource denials and preserves the request id', async () => {
    command.mockResolvedValueOnce({
      error: { code: 'RESOURCE_UNAVAILABLE', message: 'The requested resource is unavailable.' },
      requestId: 'req-edit-1',
    });
    render(
      <EditorialWorkspaceV2
        data={{ regions: [] }}
        onSubmit={submit}
        command={command}
        organizationId="org-1"
        editArticleId="article-1"
      />,
    );

    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain('ID permintaan: req-edit-1'),
    );
    expect(screen.getByRole('alert').textContent).toContain('organisasi yang dipilih');
    expect(screen.getByRole('alert').textContent).not.toContain('Respons editor tak dikenali.');
  });

});
