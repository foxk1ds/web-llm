import { cn } from '@/lib/cn';

export interface HeaderProps extends React.HTMLAttributes<HTMLElement> {
  title: string;
  subtitle?: string;
  leading?: React.ReactNode;
  actions?: React.ReactNode;
}

/**
 * The application header. Flat canvas fill, one hairline, no glow.
 * On small screens the title truncates; actions never shrink.
 */
export function Header({ title, subtitle, leading, actions, className, ...props }: HeaderProps) {
  return (
    <header className={cn('app-header', className)} {...props}>
      {leading ? <div className="flex shrink-0 items-center">{leading}</div> : null}

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-sm font-semibold tracking-tight text-ink">{title}</h1>
        {subtitle ? <p className="mt-0.5 truncate text-xs text-ink-muted">{subtitle}</p> : null}
      </div>

      {actions ? <div className="flex shrink-0 items-center gap-1.5">{actions}</div> : null}
    </header>
  );
}
