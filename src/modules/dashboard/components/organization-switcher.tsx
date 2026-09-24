'use client';

import { useActionState, useEffect, useOptimistic } from 'react';

import {
  switchActiveOrganization,
  type SwitchOrganizationState,
} from '@/modules/dashboard/switch-organization-action';
import { SearchCombobox } from '@/modules/dashboard/components/shared/search-combobox';
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

  const handleChange = (next: string | null) => {
    if (next === null || next === '' || next === optimisticId || isPending) return;
    setOptimisticId(next);
    const formData = new FormData();
    formData.set('organizationId', next);
    formAction(formData);
  };

  return (
    <>
      <SearchCombobox
        id={selectId}
        value={optimisticId}
        disabled={isPending || organizations.length === 0}
        placeholder="Pilih organisasi"
        options={organizations.map((org) => ({ value: org.id, label: org.name }))}
        onValueChange={handleChange}
      />
      <span aria-live="polite" className="sr-only">
        {isPending ? 'Beralih organisasi…' : ''}
      </span>
    </>
  );
}
