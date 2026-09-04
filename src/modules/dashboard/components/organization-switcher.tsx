'use client';

import { useActionState, useEffect, useOptimistic } from 'react';

import {
  switchActiveOrganization,
  type SwitchOrganizationState,
} from '@/modules/dashboard/switch-organization-action';
import type { OrganizationOption } from '@/modules/dashboard/components/dashboard-types';

const INITIAL_STATE: SwitchOrganizationState = Object.freeze({ status: 'idle' });

interface OrganizationSwitcherProps {
  readonly organizations: readonly OrganizationOption[];
  readonly activeOrganizationId: string;
  readonly selectId: string;
  readonly onSwitchCommitted: (organizationId: string) => void;
  readonly onSwitchFailed: (message: string) => void;
}

/** Org switch via Server Action; optimistic select rolls back to the server-committed id on denial. */
export function OrganizationSwitcher({
  organizations,
  activeOrganizationId,
  selectId,
  onSwitchCommitted,
  onSwitchFailed,
}: OrganizationSwitcherProps) {
  const [state, formAction, isPending] = useActionState(switchActiveOrganization, INITIAL_STATE);
  const [optimisticId, setOptimisticId] = useOptimistic(activeOrganizationId);

  useEffect(() => {
    if (state.status === 'ok') {
      if (state.organizationId !== activeOrganizationId) onSwitchCommitted(state.organizationId);
    } else if (state.status === 'error') {
      setOptimisticId(activeOrganizationId);
      onSwitchFailed(state.message);
    }
  }, [state, activeOrganizationId, onSwitchCommitted, onSwitchFailed, setOptimisticId]);

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const next = event.target.value;
    if (next === '' || next === optimisticId || isPending) return;
    setOptimisticId(next);
    const formData = new FormData();
    formData.set('organizationId', next);
    formAction(formData);
  };

  return (
    <>
      <select
        id={selectId}
        value={optimisticId}
        disabled={isPending || organizations.length === 0}
        onChange={handleChange}
        aria-busy={isPending}
        className="rounded border border-hairline-strong bg-bg-raised-2 px-2.5 py-1.5 font-mono text-xs text-paper transition-colors duration-180 hover:border-hairline focus:border-brass focus:outline-none disabled:opacity-50"
      >
        {organizations.map((org) => (
          <option key={org.id} value={org.id} className="bg-bg-raised text-paper">
            {org.name}
          </option>
        ))}
      </select>
      <span aria-live="polite" className="sr-only">
        {isPending ? 'Beralih organisasi…' : ''}
      </span>
    </>
  );
}
