'use client';

import { cn } from '@/lib/cn';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  id?: string;
}

/** A solid monochrome toggle: white-fill on black in light, inverse in dark. */
export function Switch({ checked, onChange, label, disabled, id }: SwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'focus-ring relative h-5 w-9 shrink-0 rounded-full border transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40',
        checked ? 'border-ink bg-ink' : 'border-line-strong bg-transparent',
      )}
    >
      <span
        className={cn(
          'absolute top-[3px] h-3 w-3 rounded-full transition-[left,background-color] duration-150',
          checked ? 'left-[18px] bg-canvas' : 'left-[3px] bg-ink-muted',
        )}
      />
    </button>
  );
}
