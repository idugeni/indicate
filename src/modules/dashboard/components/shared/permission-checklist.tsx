'use client';

import { useId, useMemo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { EditorOption } from '@/modules/dashboard/components/shared/record-editor-config';

function groupOf(value: string): string {
  const dot = value.indexOf('.');
  return dot > 0 ? value.slice(0, dot) : 'lainnya';
}

export function PermissionChecklist({
  options,
  selected,
  disabled,
  onChange,
}: {
  readonly options: readonly EditorOption[];
  readonly selected: readonly string[];
  readonly disabled?: boolean;
  readonly onChange: (next: readonly string[]) => void;
}) {
  const baseId = useId();
  const groups = useMemo(() => {
    const order: string[] = [];
    const byGroup = new Map<string, EditorOption[]>();
    for (const option of options) {
      const group = groupOf(option.value);
      if (!byGroup.has(group)) {
        byGroup.set(group, []);
        order.push(group);
      }
      byGroup.get(group)!.push(option);
    }
    return order.map((group) => ({ group, items: byGroup.get(group) ?? [] }));
  }, [options]);

  const toggle = (value: string, checked: boolean) => {
    onChange(checked ? [...selected, value] : selected.filter((entry) => entry !== value));
  };

  return (
    <div className="space-y-4">
      {groups.map(({ group, items }) => (
        <div key={group}>
          <p className="m-0 mb-2 font-mono text-[11px] uppercase tracking-wider text-paper-faint">{group}</p>
          <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
            {items.map((option) => {
              const inputId = `${baseId}-${option.value}`;
              return (
                <Label key={option.value} htmlFor={inputId} className="flex cursor-pointer items-center gap-2">
                  <Checkbox
                    id={inputId}
                    checked={selected.includes(option.value)}
                    disabled={disabled}
                    onCheckedChange={(checked) => toggle(option.value, checked)}
                    className="flex-none"
                  />
                  <span className="font-mono text-xs text-paper-dim">{option.label}</span>
                </Label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
