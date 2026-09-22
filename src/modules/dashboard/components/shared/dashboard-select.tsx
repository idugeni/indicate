import { Children, isValidElement, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/**
 * Collect a value-to-label map from select children.
 *
 * @param children - DashboardSelectItem options with string labels.
 * @returns Record mapping each option value to its visible label.
 */
function collectItems(children: ReactNode): Record<string, ReactNode> {
  const map: Record<string, ReactNode> = {};
  for (const child of Children.toArray(children)) {
    if (!isValidElement(child)) continue;
    const props = child.props as { readonly value?: unknown; readonly children?: unknown };
    if (typeof props.value !== 'string') continue;
    if (typeof props.children === 'string' || typeof props.children === 'number') {
      map[props.value] = props.children;
    }
  }
  return map;
}

/**
 * Render a dashboard-styled popover select bound to native form data.
 *
 * @remarks Base UI only resolves option labels through the root `items` prop,
 * so the map is derived from children here; without it the trigger would show
 * the raw submitted id. Uncontrolled mode stays in sync with late-arriving
 * options until the user picks, and follows native `form.reset()`.
 * @param id - Trigger id for label association.
 * @param name - Form field name; omitted for fully controlled selects.
 * @param value - Controlled value; omit for uncontrolled use.
 * @param defaultValue - Initial uncontrolled value; defaults to empty.
 * @param required - Native required validation on the hidden input.
 * @param disabled - Lock the trigger.
 * @param placeholder - Hint shown while empty.
 * @param ariaLabel - Accessible name when no visible label is associated.
 * @param onValueChange - Called with the next value (null when cleared).
 * @param children - DashboardSelectItem options.
 * @returns Themed select matching the control-room surface.
 */
export function DashboardSelect({
  id,
  name,
  value,
  defaultValue = '',
  required = false,
  disabled = false,
  placeholder,
  ariaLabel,
  onValueChange,
  children,
}: {
  readonly id?: string | undefined;
  readonly name?: string | undefined;
  readonly value?: string | undefined;
  readonly defaultValue?: string | undefined;
  readonly required?: boolean | undefined;
  readonly disabled?: boolean | undefined;
  readonly placeholder: string;
  readonly ariaLabel?: string | undefined;
  readonly onValueChange?: ((value: string | null) => void) | undefined;
  readonly children: ReactNode;
}) {
  const items = useMemo(() => collectItems(children), [children]);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const touched = useRef(false);
  const [internal, setInternal] = useState(defaultValue);
  const controlled = value !== undefined;

  useEffect(() => {
    if (controlled || touched.current) return;
    setInternal(defaultValue);
  }, [controlled, defaultValue]);

  useEffect(() => {
    if (controlled) return;
    const form = triggerRef.current?.closest('form');
    if (!form) return;
    const handleReset = () => {
      touched.current = false;
      setInternal(defaultValue);
    };
    form.addEventListener('reset', handleReset);
    return () => form.removeEventListener('reset', handleReset);
  }, [controlled, defaultValue]);

  const handleChange = (next: string | null) => {
    touched.current = true;
    if (!controlled) setInternal(next ?? '');
    onValueChange?.(next);
  };

  return (
    <Select
      items={items}
      required={required}
      disabled={disabled}
      {...(name === undefined ? {} : { name })}
      {...(controlled ? { value } : { value: internal })}
      onValueChange={handleChange}
    >
      <SelectTrigger
        ref={triggerRef}
        {...(id === undefined ? {} : { id })}
        {...(ariaLabel === undefined ? {} : { 'aria-label': ariaLabel })}
        className="h-8 w-full justify-between border-hairline-strong bg-bg font-sans text-xs font-normal text-paper hover:border-paper-faint data-placeholder:text-paper-faint [&_svg]:text-paper-faint"
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="border-hairline bg-bg-raised">
        {children}
      </SelectContent>
    </Select>
  );
}

/**
 * Render one dashboard-styled select option.
 *
 * @param value - Submitted option value.
 * @param disabled - Lock this option.
 * @param children - Visible option label; keep it a plain string so the trigger can show it.
 * @returns Themed popover item.
 */
export function DashboardSelectItem({
  value,
  disabled = false,
  children,
}: {
  readonly value: string;
  readonly disabled?: boolean;
  readonly children: ReactNode;
}) {
  return (
    <SelectItem value={value} disabled={disabled} className="font-sans text-xs text-paper-dim focus:bg-bg-raised-2 focus:text-paper data-[state=checked]:text-paper">
      {children}
    </SelectItem>
  );
}
