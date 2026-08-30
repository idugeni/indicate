'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface OrganizationOption {
  readonly id: string;
  readonly name: string;
  readonly records: readonly string[];
}

type View = 'dashboard' | 'configuration' | 'publishers' | 'editorial' | 'analytics' | 'audit';
const navigation: readonly { readonly view: View; readonly label: string }[] = [
  { view: 'dashboard', label: 'Dashboard' }, { view: 'configuration', label: 'Domains, regions & sites' },
  { view: 'publishers', label: 'Publishers' }, { view: 'editorial', label: 'Articles' },
  { view: 'analytics', label: 'Analytics' }, { view: 'audit', label: 'Audit logs' },
];

interface ApiError { readonly error?: { readonly message?: string; readonly fields?: Readonly<Record<string, readonly string[]>> } }

export function CmsWorkspace({ displayName, organizations }: { readonly displayName: string; readonly organizations: readonly OrganizationOption[] }) {
  const initial = organizations[0]?.id ?? '';
  const [organizationId, setOrganizationId] = useState(initial);
  const [generation, setGeneration] = useState(initial ? 1 : 0);
  const [view, setView] = useState<View>('dashboard');
  const [data, setData] = useState<unknown>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const organizationRef = useRef(initial);
  const active = organizations.find(({ id }) => id === organizationId);

  const load = useCallback(async (nextView: View, nextOrganization = organizationId) => {
    if (!nextOrganization) return;
    setBusy(true); setError(null);
    const response = await fetch(`/api/cms/stage3?organizationId=${encodeURIComponent(nextOrganization)}&view=${nextView}${filterQuery}`, { cache: 'no-store' });
    const body = await response.json() as unknown;
    if (organizationRef.current !== nextOrganization) { setBusy(false); return; }
    if (!response.ok) setError((body as ApiError).error?.message ?? 'The operation could not be completed.');
    else setData(body);
    setBusy(false);
  }, [filterQuery, organizationId]);

  useEffect(() => {
    if (!organizationId) return;
    const controller = new AbortController();
    fetch(`/api/cms/stage3?organizationId=${encodeURIComponent(organizationId)}&view=${view}${filterQuery}`, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => ({ response, body: await response.json() as unknown }))
      .then(({ response, body }) => {
        if (organizationRef.current !== organizationId) return;
        if (!response.ok) setError((body as ApiError).error?.message ?? 'The operation could not be completed.');
        else { setError(null); setData(body); }
      })
      .catch((requestError: unknown) => { if (!(requestError instanceof DOMException && requestError.name === 'AbortError')) setError('The operation could not be completed.'); });
    return () => controller.abort();
  }, [filterQuery, organizationId, view]);

  const switchOrganization = async (next: string) => {
    setError(null);
    const response = await fetch('/api/cms/active-organization', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ organizationId: next }) });
    if (!response.ok || !organizations.some(({ id }) => id === next)) { setError('The requested resource is unavailable.'); return; }
    setData(null); organizationRef.current = next; setOrganizationId(next); setGeneration((value) => value + 1); await load(view, next);
  };

  const command = async (action: string, payload: unknown) => {
    const commandOrganization = organizationId;
    setBusy(true); setError(null);
    const response = await fetch('/api/cms/stage3', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ organizationId: commandOrganization, action, payload }) });
    const body = await response.json() as unknown;
    if (organizationRef.current !== commandOrganization) { setBusy(false); return; }
    if (!response.ok) {
      const apiError = body as ApiError;
      const details = apiError.error?.fields === undefined ? '' : ` ${Object.entries(apiError.error.fields).map(([field, messages]) => `${field}: ${messages.join(', ')}`).join('; ')}`;
      setError(`${apiError.error?.message ?? 'The operation could not be completed.'}${details}`);
    } else await load(view);
    setBusy(false);
  };

  return (
    <div className="cms-shell" data-generation={generation}>
      <header className="cms-topbar">
        <div><strong>Indicate CMS</strong><span>Signed in as {displayName}</span></div>
        <label>Active organization
          <select aria-label="Switch organization" value={organizationId} onChange={(event) => void switchOrganization(event.target.value)}>
            {organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
            <option value="foreign-organization">Unavailable organization</option>
          </select>
        </label>
      </header>
      <div className="cms-layout">
        <nav aria-label="CMS navigation" className="cms-nav">
          {navigation.map((item) => <button aria-current={view === item.view ? 'page' : undefined} key={item.view} onClick={() => setView(item.view)}>{item.label}</button>)}
          <button disabled title="Stage 4 dependency">Media (Stage 4)</button>
          <button disabled title="Stage 4 dependency">Publishing (Stage 4)</button>
          <button onClick={() => setView('configuration')}>Settings</button>
        </nav>
        <main className="cms-content">
          <header><p className="eyebrow">{active?.name ?? 'No active membership'}</p><h1>{navigation.find((item) => item.view === view)?.label}</h1></header>
          {error === null ? null : <p className="cms-alert" role="alert">{error}</p>}
          <p role="status">Tenant state generation {generation}{busy ? ' · Loading' : ' · Ready'}</p>
          <ul aria-label="Tenant records" className="tenant-records">{active?.records.map((record) => <li key={record}>{record}</li>)}</ul>
          <FilterControls view={view} data={data} onApply={setFilterQuery} />
          {view === 'publishers' ? <PublisherForm data={data} command={command} /> : null}
          {view === 'editorial' ? <EditorialForm data={data} command={command} onSubmit={(payload) => command('article.create', payload)} onAssign={(payload) => command('article.sites.assign', payload)} /> : null}
          {view === 'configuration' ? <ConfigurationForms data={data} command={command} /> : null}
          <DataView view={view} data={data} />
        </main>
      </div>
    </div>
  );
}

function FilterControls({ view, data, onApply }: { readonly view: View; readonly data: unknown; readonly onApply: (query: string) => void }) {
  if (!['editorial', 'analytics', 'audit'].includes(view)) return null;
  const model = data as { regions?: { id: string; name: string }[]; sites?: { id: string; normalizedHostname: string }[]; categories?: { id: string; name: string }[]; publishers?: { id: string; name: string }[]; authors?: { id: string; displayName: string }[] } | null;
  const apply = (form: HTMLFormElement) => {
    const params = new URLSearchParams();
    for (const [key, value] of new FormData(form)) {
      if (typeof value !== 'string' || value.length === 0) continue;
      params.set(key, (key === 'from' || key === 'to') ? new Date(value).toISOString() : value);
    }
    const query = params.toString(); onApply(query.length === 0 ? '' : `&${query}`);
  };
  return <form className="cms-form cms-filters" aria-label={`${view} filters`} onSubmit={(event) => { event.preventDefault(); apply(event.currentTarget); }}>
    <h2>Filter {view}</h2>
    {view === 'editorial' ? <><label>Region<select name="regionId"><option value="">All</option>{model?.regions?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Site<select name="siteId"><option value="">All</option>{model?.sites?.map((item) => <option key={item.id} value={item.id}>{item.normalizedHostname}</option>)}</select></label><label>Category<select name="categoryId"><option value="">All</option>{model?.categories?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Publisher<select name="publisherId"><option value="">All</option>{model?.publishers?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Author<select name="authorId"><option value="">All</option>{model?.authors?.map((item) => <option key={item.id} value={item.id}>{item.displayName}</option>)}</select></label><label>Publication state<select name="publicationState"><option value="">All</option>{['queued', 'processing', 'published', 'failed', 'retrying'].map((item) => <option key={item}>{item}</option>)}</select></label><label>Search<input name="search" /></label></> : null}
    {view === 'audit' ? <><label>Actor<input name="actorId" /></label><label>Action<input name="action" /></label><label>Target type<input name="targetType" /></label><label>Outcome<select name="outcome"><option value="">All</option><option>succeeded</option><option>denied</option><option>failed</option></select></label></> : null}
    {view === 'analytics' || view === 'audit' ? <><label>From<input name="from" type="datetime-local" /></label><label>To<input name="to" type="datetime-local" /></label></> : null}
    <button type="submit">Apply filters</button><button type="reset" onClick={() => onApply('')}>Clear filters</button>
  </form>;
}

function PublisherForm({ data, command }: { readonly data: unknown; readonly command: (action: string, payload: unknown) => Promise<void> }) {
  const model = data as { publishers?: { id: string; name: string; type: string; attributionLabel: string; contacts: Record<string, string>; evidenceReference: string | null; version: number; verificationStatus: string }[]; sites?: { id: string; normalizedHostname: string }[]; affiliations?: { id: string; publisherId: string; siteId: string; institutionName: string; claimScopes: string[]; evidenceReference: string; active: boolean; version: number }[] } | null;
  return <div className="cms-form-grid"><form className="cms-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void command('publisher.create', { name: form.get('name'), type: form.get('type'), attributionLabel: form.get('attributionLabel'), contacts: {}, evidenceReference: form.get('evidenceReference') || null }); }}>
    <h2>Create publisher</h2><label>Name<input name="name" required /></label><label>Type<select name="type"><option value="independent_publisher">Independent publisher</option><option value="government_institution">Government institution</option><option value="company">Company</option></select></label><label>Attribution<input name="attributionLabel" required /></label><label>Evidence reference<input name="evidenceReference" /></label><button type="submit">Create publisher</button>
  </form><form className="cms-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const publisher = model?.publishers?.find(({ id }) => id === form.get('publisherId')); if (publisher !== undefined) void command(String(form.get('decision')), { id: publisher.id, expectedVersion: publisher.version, evidenceReference: form.get('evidenceReference') || undefined, reason: form.get('reason') || undefined }); }}><h2>Publisher verification</h2><label>Publisher<select name="publisherId">{model?.publishers?.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.verificationStatus}</option>)}</select></label><label>Decision<select name="decision"><option value="publisher.submit">Submit</option><option value="publisher.approve">Approve</option><option value="publisher.reject">Reject</option><option value="publisher.archive">Archive</option></select></label><label>Evidence reference<input name="evidenceReference" /></label><label>Rejection reason<input name="reason" /></label><button type="submit">Apply publisher decision</button></form>
  <form className="cms-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const publisher = model?.publishers?.find(({ id }) => id === form.get('publisherId')); if (publisher !== undefined) void command('publisher.update', { id: publisher.id, expectedVersion: publisher.version, name: form.get('name'), type: form.get('type'), attributionLabel: form.get('attributionLabel'), contacts: publisher.contacts, evidenceReference: form.get('evidenceReference') || null }); }}><h2>Edit publisher</h2><label>Publisher<select name="publisherId">{model?.publishers?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Name<input name="name" required /></label><label>Type<select name="type"><option value="independent_publisher">Independent publisher</option><option value="government_institution">Government institution</option><option value="company">Company</option></select></label><label>Attribution<input name="attributionLabel" required /></label><label>Evidence reference<input name="evidenceReference" /></label><button type="submit">Update publisher</button></form>
  <form className="cms-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void command('affiliation.create', { publisherId: form.get('publisherId'), siteId: form.get('siteId'), institutionName: form.get('institutionName'), claimScopes: String(form.get('claimScopes')).split(',').map((item) => item.trim()).filter(Boolean), evidenceReference: form.get('evidenceReference') }); }}><h2>Create official affiliation</h2><label>Verified publisher<select name="publisherId">{model?.publishers?.filter(({ verificationStatus }) => verificationStatus === 'verified').map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Site<select name="siteId">{model?.sites?.map((item) => <option key={item.id} value={item.id}>{item.normalizedHostname}</option>)}</select></label><label>Institution name<input name="institutionName" required /></label><label>Claim scopes<input name="claimScopes" required /></label><label>Evidence reference<input name="evidenceReference" required /></label><button type="submit">Create affiliation</button></form>
  <form className="cms-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const affiliation = model?.affiliations?.find(({ id }) => id === form.get('affiliationId')); if (affiliation !== undefined) void command('affiliation.update', { id: affiliation.id, expectedVersion: affiliation.version, institutionName: form.get('institutionName'), claimScopes: String(form.get('claimScopes')).split(',').map((item) => item.trim()).filter(Boolean), evidenceReference: form.get('evidenceReference'), active: form.get('active') === 'true' }); }}><h2>Official affiliation lifecycle</h2><label>Affiliation<select name="affiliationId">{model?.affiliations?.map((item) => <option key={item.id} value={item.id}>{item.institutionName}</option>)}</select></label><label>Institution name<input name="institutionName" required /></label><label>Claim scopes<input name="claimScopes" required /></label><label>Evidence reference<input name="evidenceReference" required /></label><label>Status<select name="active"><option value="true">Active</option><option value="false">Inactive</option></select></label><button type="submit">Update affiliation</button></form></div>;
}

function EditorialForm({ data, command, onSubmit, onAssign }: { readonly data: unknown; readonly command: (action: string, payload: unknown) => Promise<void>; readonly onSubmit: (payload: unknown) => Promise<void>; readonly onAssign: (payload: unknown) => Promise<void> }) {
  const model = data as { regions?: { id: string; name: string }[]; publishers?: { id: string; name: string }[]; categories?: { id: string; name: string; slug: string; status: string; version: number }[]; authors?: { id: string; displayName: string; byline: string; status: string; version: number }[]; sites?: { id: string; normalizedHostname: string }[]; articles?: { id: string; regionId: string; publisherId: string | null; categoryId: string | null; authorId: string | null; slug: string; title: string; body: string; source: string; version: number; status: string }[] } | null;
  return <div className="cms-form-grid"><form className="cms-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void onSubmit({ regionId: form.get('regionId'), publisherId: form.get('publisherId') || null, categoryId: form.get('categoryId') || null, authorId: form.get('authorId') || null, slug: form.get('slug'), title: form.get('title'), body: form.get('body'), source: form.get('source'), status: 'draft' }); }}>
    <h2>Create canonical article</h2><label>Region<select name="regionId" required>{model?.regions?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Publisher<select name="publisherId"><option value="">None</option>{model?.publishers?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Category<select name="categoryId"><option value="">None</option>{model?.categories?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Author<select name="authorId"><option value="">None</option>{model?.authors?.map((item) => <option key={item.id} value={item.id}>{item.displayName}</option>)}</select></label><label>Slug<input name="slug" required pattern="[a-z0-9-]+" /></label><label>Title<input name="title" required /></label><label>Source<input name="source" required /></label><label>Body<textarea name="body" required /></label><button type="submit">Create article</button>
  </form><form className="cms-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void onAssign({ articleId: form.get('articleId'), siteIds: form.getAll('siteIds') }); }}><h2>Assign sites</h2><label>Article<select name="articleId">{model?.articles?.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><fieldset><legend>Sites</legend>{model?.sites?.map((item) => <label key={item.id}><input type="checkbox" name="siteIds" value={item.id} />{item.normalizedHostname}</label>)}</fieldset><button type="submit">Save assignments</button></form>
  <form className="cms-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void command('category.create', { name: form.get('name'), slug: form.get('slug'), status: 'active' }); }}><h2>Create Category</h2><label>Name<input name="name" required /></label><label>Slug<input name="slug" required /></label><button type="submit">Create Category</button></form>
  <form className="cms-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void command('author.create', { displayName: form.get('displayName'), byline: form.get('byline'), status: 'active' }); }}><h2>Create Author</h2><label>Name<input name="displayName" required /></label><label>Byline<input name="byline" required /></label><button type="submit">Create Author</button></form>
  <form className="cms-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const article = model?.articles?.find(({ id }) => id === form.get('articleId')); if (article !== undefined) void command(String(form.get('transition')), { id: article.id, expectedVersion: article.version }); }}><h2>Article lifecycle</h2><label>Article<select name="articleId">{model?.articles?.map((item) => <option key={item.id} value={item.id}>{item.title} · {item.status}</option>)}</select></label><label>Action<select name="transition"><option value="article.archive">Archive</option><option value="article.restore">Restore</option></select></label><button type="submit">Apply Article lifecycle</button></form>
  <form className="cms-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const article = model?.articles?.find(({ id }) => id === form.get('articleId')); if (article !== undefined) void command('article.update', { id: article.id, expectedVersion: article.version, regionId: form.get('regionId'), publisherId: form.get('publisherId') || null, categoryId: form.get('categoryId') || null, authorId: form.get('authorId') || null, slug: form.get('slug'), title: form.get('title'), body: form.get('body'), source: form.get('source'), status: form.get('status') }); }}><h2>Update canonical article</h2><label>Article<select name="articleId">{model?.articles?.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label>Region<select name="regionId">{model?.regions?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Publisher<select name="publisherId"><option value="">None</option>{model?.publishers?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Category<select name="categoryId"><option value="">None</option>{model?.categories?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Author<select name="authorId"><option value="">None</option>{model?.authors?.map((item) => <option key={item.id} value={item.id}>{item.displayName}</option>)}</select></label><label>Slug<input name="slug" required /></label><label>Title<input name="title" required /></label><label>Source<input name="source" required /></label><label>Body<textarea name="body" required /></label><label>Status<select name="status"><option>draft</option><option>active</option></select></label><button type="submit">Update article</button></form>
  <form className="cms-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const category = model?.categories?.find(({ id }) => id === form.get('categoryId')); if (category !== undefined) void command('category.update', { id: category.id, expectedVersion: category.version, name: form.get('name'), slug: form.get('slug'), status: form.get('status') }); }}><h2>Update Category</h2><label>Category<select name="categoryId">{model?.categories?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Name<input name="name" required /></label><label>Slug<input name="slug" required /></label><label>Status<select name="status"><option>active</option><option>inactive</option><option>archived</option></select></label><button type="submit">Update Category</button></form>
  <form className="cms-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const author = model?.authors?.find(({ id }) => id === form.get('authorId')); if (author !== undefined) void command('author.update', { id: author.id, expectedVersion: author.version, displayName: form.get('displayName'), byline: form.get('byline'), status: form.get('status') }); }}><h2>Update Author</h2><label>Author<select name="authorId">{model?.authors?.map((item) => <option key={item.id} value={item.id}>{item.displayName}</option>)}</select></label><label>Name<input name="displayName" required /></label><label>Byline<input name="byline" required /></label><label>Status<select name="status"><option>active</option><option>inactive</option><option>archived</option></select></label><button type="submit">Update Author</button></form></div>;
}

function ConfigurationForms({ data, command }: { readonly data: unknown; readonly command: (action: string, payload: unknown) => Promise<void> }) {
  const model = data as { domains?: { id: string; normalizedHostname: string; version: number; status: string }[]; regions?: { id: string; externalKey: string; name: string; slug: string; version: number; status: string }[]; sites?: { id: string; domainId: string; regionId: string | null; normalizedHostname: string; version: number; status: string }[]; siteSettings?: { siteId: string; version: number }[]; roles?: { id: string; name: string; version: number; active: boolean }[]; memberships?: { userId: string; displayName: string; roleId: string; status: string; version: number }[] } | null;
  return <div className="cms-form-grid">
    <form className="cms-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void command('domain.create', { normalizedHostname: form.get('hostname'), status: 'inactive' }); }}><h2>Add domain</h2><label>Hostname<input name="hostname" required /></label><button type="submit">Create domain</button></form>
    <form className="cms-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const item = model?.domains?.find(({ id }) => id === form.get('domainId')); if (item !== undefined) void command('domain.update', { id: item.id, expectedVersion: item.version, normalizedHostname: item.normalizedHostname, status: form.get('status') }); }}><h2>Domain lifecycle</h2><label>Domain<select name="domainId">{model?.domains?.map((item) => <option key={item.id} value={item.id}>{item.normalizedHostname}</option>)}</select></label><label>Status<select name="status"><option value="active">Active</option><option value="inactive">Inactive</option><option value="archived">Archived</option></select></label><button type="submit">Update domain</button></form>
    <form className="cms-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void command('region.create', { externalKey: form.get('slug'), name: form.get('name'), slug: form.get('slug'), status: 'active' }); }}><h2>Add region</h2><label>Name<input name="name" required /></label><label>Slug<input name="slug" required /></label><button type="submit">Create region</button></form>
    <form className="cms-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void command('site.create', { domainId: form.get('domainId'), regionId: form.get('regionId') || null, normalizedHostname: form.get('hostname'), status: 'inactive' }); }}><h2>Add Site</h2><label>Domain<select name="domainId">{model?.domains?.map((item) => <option key={item.id} value={item.id}>{item.normalizedHostname}</option>)}</select></label><label>Region<select name="regionId"><option value="">Apex</option>{model?.regions?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Hostname<input name="hostname" required /></label><button type="submit">Create Site</button></form>
    <form className="cms-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const settings = model?.siteSettings?.find(({ siteId }) => siteId === form.get('siteId')); void command('site.settings.update', { siteId: form.get('siteId'), ...(settings === undefined ? {} : { expectedVersion: settings.version }), name: form.get('name'), description: form.get('description') }); }}><h2>Site Settings</h2><label>Site<select name="siteId">{model?.sites?.map((item) => <option key={item.id} value={item.id}>{item.normalizedHostname}</option>)}</select></label><label>Site name<input name="name" required /></label><label>Description<textarea name="description" /></label><button type="submit">Save Site Settings</button></form>
    <form className="cms-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void command('role.create', { name: form.get('name'), active: true, permissions: String(form.get('permissions')).split(',').map((value) => value.trim()).filter(Boolean) }); }}><h2>Create Role</h2><label>Name<input name="name" required /></label><label>Permissions<input name="permissions" placeholder="article.read, article.manage" required /></label><button type="submit">Create Role</button></form>
    <form className="cms-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const membership = model?.memberships?.find(({ userId }) => userId === form.get('userId')); if (membership !== undefined) void command('membership.update', { userId: membership.userId, roleId: form.get('roleId'), status: form.get('status'), expectedVersion: membership.version }); }}><h2>Membership lifecycle</h2><label>Member<select name="userId">{model?.memberships?.map((item) => <option key={item.userId} value={item.userId}>{item.displayName}</option>)}</select></label><label>Role<select name="roleId">{model?.roles?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Status<select name="status"><option>active</option><option>inactive</option><option>archived</option></select></label><button type="submit">Update Membership</button></form>
    <form className="cms-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const region = model?.regions?.find(({ id }) => id === form.get('regionId')); if (region !== undefined) void command('region.update', { id: region.id, expectedVersion: region.version, externalKey: form.get('externalKey'), name: form.get('name'), slug: form.get('slug'), status: form.get('status') }); }}><h2>Region lifecycle</h2><label>Region<select name="regionId">{model?.regions?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>External key<input name="externalKey" required /></label><label>Name<input name="name" required /></label><label>Slug<input name="slug" required /></label><label>Status<select name="status"><option>active</option><option>inactive</option><option>archived</option></select></label><button type="submit">Update region</button></form>
    <form className="cms-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const site = model?.sites?.find(({ id }) => id === form.get('siteId')); if (site !== undefined) void command('site.update', { id: site.id, expectedVersion: site.version, domainId: form.get('domainId'), regionId: form.get('regionId') || null, normalizedHostname: form.get('hostname'), status: form.get('status') }); }}><h2>Site lifecycle</h2><label>Site<select name="siteId">{model?.sites?.map((item) => <option key={item.id} value={item.id}>{item.normalizedHostname}</option>)}</select></label><label>Domain<select name="domainId">{model?.domains?.map((item) => <option key={item.id} value={item.id}>{item.normalizedHostname}</option>)}</select></label><label>Region<select name="regionId"><option value="">Apex</option>{model?.regions?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Hostname<input name="hostname" required /></label><label>Status<select name="status"><option>active</option><option>inactive</option><option>archived</option></select></label><button type="submit">Update Site</button></form>
    <form className="cms-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const role = model?.roles?.find(({ id }) => id === form.get('roleId')); if (role !== undefined) void command('role.update', { id: role.id, expectedVersion: role.version, name: form.get('name'), active: form.get('active') === 'true', permissions: String(form.get('permissions')).split(',').map((value) => value.trim()).filter(Boolean) }); }}><h2>Role lifecycle</h2><label>Role<select name="roleId">{model?.roles?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Name<input name="name" required /></label><label>Permissions<input name="permissions" required /></label><label>Status<select name="active"><option value="true">Active</option><option value="false">Inactive</option></select></label><button type="submit">Update Role</button></form>
    <form className="cms-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void command('membership.update', { userId: form.get('userId'), roleId: form.get('roleId'), status: 'active' }); }}><h2>Add Membership</h2><label>User ID<input name="userId" required /></label><label>Role<select name="roleId">{model?.roles?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><button type="submit">Add Membership</button></form>
  </div>;
}

function DataView({ view, data }: { readonly view: View; readonly data: unknown }) {
  if (data === null) return <p>Loading tenant data…</p>;
  if (view === 'dashboard') {
    const dashboard = data as Record<string, unknown>;
    const jobs = dashboard.jobsByState as Record<string, number> | undefined;
    return <><div className="metric-grid">{Object.entries(dashboard).filter(([, value]) => typeof value === 'number').map(([key, value]) => <article className="metric" key={key}><strong>{String(value)}</strong><span>{key.replaceAll(/([A-Z])/g, ' $1')}</span></article>)}</div>{jobs === undefined ? null : <section className="cms-card"><h2>Publishing jobs by state</h2><ul>{Object.entries(jobs).map(([state, count]) => <li key={state}>{state}: {count}</li>)}</ul></section>}</>;
  }
  const source = Array.isArray(data) ? { records: data } : data as Record<string, unknown>;
  const collections = Object.entries(source).filter(([, value]) => Array.isArray(value));
  return <div className="cms-data-grid">{collections.map(([name, values]) => <section className="cms-card" key={name}><h2>{name.replaceAll(/([A-Z])/g, ' $1')}</h2>{(values as Record<string, unknown>[]).length === 0 ? <p>No records</p> : <ul>{(values as Record<string, unknown>[]).slice(0, 20).map((item, index) => <li key={String(item.id ?? `${name}-${index}`)}>{String(item.name ?? item.title ?? item.action ?? item.key ?? item.normalizedHostname ?? item.displayName ?? item.id)}</li>)}</ul>}</section>)}</div>;
}
