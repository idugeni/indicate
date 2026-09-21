'use client';

import { useActionState, useEffect, useOptimistic } from 'react';

import {
  switchActiveOrganization,
  type SwitchOrganizationState,
} from '@/modules/dashboard/switch-organization-action';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
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
      <NativeSelect
        id={selectId}
        value={optimisticId}
        disabled={isPending || organizations.length === 0}
        onChange={handleChange}
        aria-busy={isPending}
      >
        {organizations.map((org) => (
          <NativeSelectOption key={org.id} value={org.id}>
            {org.name}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <span aria-live="polite" className="sr-only">
        {isPending ? 'Beralih organisasi…' : ''}
      </span>
    </>
  );
}
