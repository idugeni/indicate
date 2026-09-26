'use client';

import { startTransition, useActionState, useEffect, useOptimistic } from 'react';

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

/**
 * Switches the active organization through a Server Action and shows the
 * selected id optimistically.
 *
 * The optimistic value is updated inside a transition, so React discards it
 * when the action settles and the select snaps back to `activeOrganizationId`
 * whenever the server denies the switch.
 */
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
      onSwitchFailed(state.message);
    }
  }, [state, activeOrganizationId, onSwitchCommitted, onSwitchFailed]);

  const handleChange = (next: string | null) => {
    if (next === null || next === '' || next === optimisticId || isPending) return;
    startTransition(() => {
      setOptimisticId(next);
      const formData = new FormData();
      formData.set('organizationId', next);
      formAction(formData);
    });
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
