'use client';

import { useState } from 'react';

export interface OrganizationOption {
  readonly id: string;
  readonly name: string;
  readonly records: readonly string[];
}

export function ActiveOrganizationSelector({ organizations }: { readonly organizations: readonly OrganizationOption[] }) {
  const initial = organizations[0]?.id ?? '';
  const [organizationId, setOrganizationId] = useState(initial);
  const [generation, setGeneration] = useState(initial ? 1 : 0);
  const [error, setError] = useState<string | null>(null);
  const active = organizations.find(({ id }) => id === organizationId);

  const switchOrganization = async (next: string) => {
    setError(null);
    const response = await fetch('/api/cms/active-organization', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ organizationId: next }),
    });
    if (!response.ok || !organizations.some(({ id }) => id === next)) {
      setError('The requested resource is unavailable.');
      return;
    }
    setOrganizationId(next);
    setGeneration((value) => value + 1);
  };

  return (
    <section aria-labelledby="active-organization-title" data-generation={generation}>
      <h1 id="active-organization-title">Stage 2 tenant control</h1>
      {active === undefined ? <p>No active organization membership is available.</p> : (
        <>
          <p>Active organization: <strong>{active.id}</strong></p>
          <label htmlFor="organization">Switch organization</label>
          <select id="organization" value={organizationId} onChange={(event) => switchOrganization(event.target.value)}>
            {organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
            <option value="foreign-organization">Unavailable organization</option>
          </select>
          {error === null ? null : <p role="alert">{error}</p>}
          <ul aria-label="Tenant records">{active.records.map((record) => <li key={record}>{record}</li>)}</ul>
          <p role="status">Tenant state generation {generation}</p>
        </>
      )}
    </section>
  );
}
