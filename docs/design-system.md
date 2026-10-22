# Web-LLM Design System — “Calm Studio”

This document describes the visual language used by the app after the neon/cyber
refresh. Tokens live in [`app/globals.css`](../app/globals.css); the Tailwind
mapping lives in [`tailwind.config.ts`](../tailwind.config.ts). Reusable
implementations live in [`components/ui/`](../components/ui).

---

## (a) Design rationale

**The problem with the previous look.** The interface leaned on effects rather
than structure: an ambient indigo radial glow behind the whole app, a metallic
gradient wordmark, coloured drop-shadows, `animate-ping` status dots, glass
panels, and periwinkle accents on nearly every interactive element. Individually
each is small; together they read as decorative noise, compete with the model’s
answers, and make the product feel like a demo rather than a tool.

**The new direction.** Three principles:

1. **Content is the interface.** The transcript is the product. Chrome recedes:
   flat warm-paper surfaces, one hairline border, no background glow. Accent
   colour appears only where it carries meaning — focus, selection, primary
   action, links.
2. **Calm, not cold.** Warm neutral greys (`#F7F7F4` / `#121514`) instead of
   blue-black, and a muted eucalyptus accent (`#2F6F62` / `#7CBFAD`) instead of
   electric indigo. Rounded 6–18 px corners and a humanist sans keep it
   approachable; the copy (“Hi, let’s get into it”) does the friendliness, not
   the chrome.
3. **Quiet motion.** Only three animated ideas remain: a fade-up on new content,
   a soft dot pulse for “generating”, and a low-contrast caret. Nothing glows,
   bounces, pings, or shimmers. Everything collapses under
   `prefers-reduced-motion`.

The result is closer to a well-made text editor or notes app: professional,
trustworthy, and still warm enough to invite a first question.

---

## (b) Colour palette

All colours are defined as RGB channel triplets so Tailwind alpha modifiers work
(e.g. `bg-accent/10`). Contrast ratios below are measured against the stated
background following WCAG 2.1 relative luminance.

### Light — “Paper”

| Role | Hex | RGB channels | Notes |
| --- | --- | --- | --- |
| Canvas | `#F7F7F4` | `247 247 244` | App background, warm off-white |
| Surface | `#FFFFFF` | `255 255 255` | Sidebar, cards, composer |
| Surface raised | `#FCFCFA` | `252 252 250` | Popovers / menus |
| Surface sunken | `#F1F1EC` | `241 241 236` | Wells, chips, segmented controls |
| Surface hover | `#F0F1EC` | `240 241 236` | Interactive hover |
| Ink | `#1E2321` | `30 35 33` | Primary text |
| Ink secondary | `#5B635F` | `91 99 95` | Descriptions, subtitles |
| Ink muted | `#66706B` | `102 112 107` | Metadata, placeholders |
| Line | `#E4E4DE` | `228 228 222` | Decorative hairlines only |
| Line strong | `#7C8580` | `124 133 128` | Control/input borders (3:1) |
| Accent | `#2F6F62` | `47 111 98` | Primary actions, links, focus |
| Accent hover | `#275B50` | `39 91 80` | Hover / pressed |
| Accent soft | `#E7F0EC` | `231 240 236` | Selection, icon wells |
| Accent foreground | `#FFFFFF` | `255 255 255` | Text on accent fills |
| Success | `#2C7657` | `44 118 87` | Online, done, copied |
| Success soft | `#E9F4EE` | `233 244 238` | Success banners |
| Warning | `#8A6A1F` | `138 106 31` | Approvals, permissions |
| Warning soft | `#F9F4E6` | `249 244 230` | Warning banners |
| Danger | `#A33A32` | `163 58 50` | Errors, destructive |
| Danger soft | `#F8ECEA` | `248 236 234` | Error banners |

### Dark — “Graphite”

| Role | Hex | RGB channels | Notes |
| --- | --- | --- | --- |
| Canvas | `#121514` | `18 21 20` | Warm near-black, not navy |
| Surface | `#191D1B` | `25 29 27` | Sidebar, cards, composer |
| Surface raised | `#202522` | `32 37 34` | Popovers / menus |
| Surface sunken | `#161A18` | `22 26 24` | Wells, chips, segmented controls |
| Surface hover | `#262C28` | `38 44 40` | Interactive hover |
| Ink | `#E9EBE7` | `233 235 231` | Primary text |
| Ink secondary | `#A7AEA9` | `167 174 169` | Descriptions |
| Ink muted | `#8C948F` | `140 148 143` | Metadata |
| Line | `#2D3330` | `45 51 48` | Hairlines |
| Line strong | `#6C7670` | `108 118 112` | Control borders (3:1) |
| Accent | `#7CBFAD` | `124 191 173` | Primary actions, links, focus |
| Accent hover | `#94CDBD` | `148 205 189` | Hover |
| Accent soft | `#1D2B27` | `29 43 39` | Selection, icon wells |
| Accent foreground | `#0F1A16` | `15 26 22` | Text on accent fills |
| Success | `#79C6A4` | `121 198 164` | Status |
| Success soft | `#172821` | `23 40 33` | Success banners |
| Warning | `#D9B46A` | `217 180 106` | Approvals |
| Warning soft | `#2A2417` | `42 36 23` | Warning banners |
| Danger | `#E8928A` | `232 146 138` | Errors |
| Danger soft | `#2D1B1A` | `45 27 26` | Error banners |
| Danger foreground | `#2A0F0C` | `42 15 12` | Text on danger fills |

### Measured contrast (WCAG AA)

**Light theme**

| Pair | Foreground | Background | Ratio | AA |
| --- | --- | --- | --- | --- |
| Primary text | `#1E2321` | `#F7F7F4` | 14.85:1 | Pass AAA |
| Secondary text | `#5B635F` | `#F7F7F4` | 5.76:1 | Pass |
| Muted text | `#66706B` | `#F7F7F4` | 4.78:1 | Pass |
| Accent link text | `#2F6F62` | `#F7F7F4` | 5.48:1 | Pass |
| Accent link on white | `#2F6F62` | `#FFFFFF` | 5.88:1 | Pass |
| Primary button label | `#FFFFFF` | `#2F6F62` | 5.88:1 | Pass |
| Button label, hover | `#FFFFFF` | `#275B50` | 7.78:1 | Pass |
| Accent on accent-soft | `#2F6F62` | `#E7F0EC` | 5.06:1 | Pass |
| Control border | `#7C8580` | `#FFFFFF` | 3.80:1 | Pass (non-text 3:1) |
| Control border on canvas | `#7C8580` | `#F7F7F4` | 3.54:1 | Pass (non-text) |
| Focus ring | `#2F6F62` | `#FFFFFF` | 5.88:1 | Pass (non-text) |
| Success text | `#2C7657` | `#FFFFFF` | 5.47:1 | Pass |
| Success on success-soft | `#2C7657` | `#E9F4EE` | 4.86:1 | Pass |
| Warning text | `#8A6A1F` | `#FFFFFF` | 5.05:1 | Pass |
| Warning on warning-soft | `#8A6A1F` | `#F9F4E6` | 4.59:1 | Pass |
| Danger text | `#A33A32` | `#FFFFFF` | 6.54:1 | Pass |
| Danger on danger-soft | `#A33A32` | `#F8ECEA` | 5.67:1 | Pass |

**Dark theme**

| Pair | Foreground | Background | Ratio | AA |
| --- | --- | --- | --- | --- |
| Primary text | `#E9EBE7` | `#121514` | 15.31:1 | Pass AAA |
| Secondary text | `#A7AEA9` | `#191D1B` | 7.52:1 | Pass AAA |
| Muted text | `#8C948F` | `#191D1B` | 5.47:1 | Pass |
| Muted text on canvas | `#8C948F` | `#121514` | 5.90:1 | Pass |
| Accent link text | `#7CBFAD` | `#191D1B` | 8.04:1 | Pass AAA |
| Primary button label | `#0F1A16` | `#7CBFAD` | 8.40:1 | Pass AAA |
| Button label, hover | `#0F1A16` | `#94CDBD` | 9.94:1 | Pass AAA |
| Accent on accent-soft | `#7CBFAD` | `#1D2B27` | 6.95:1 | Pass |
| Control border | `#6C7670` | `#191D1B` | 3.62:1 | Pass (non-text 3:1) |
| Control border on canvas | `#6C7670` | `#121514` | 3.90:1 | Pass (non-text) |
| Focus ring | `#7CBFAD` | `#191D1B` | 8.04:1 | Pass (non-text) |
| Success text | `#79C6A4` | `#191D1B` | 8.46:1 | Pass AAA |
| Success on success-soft | `#79C6A4` | `#172821` | 7.66:1 | Pass AAA |
| Warning text | `#D9B46A` | `#191D1B` | 8.67:1 | Pass AAA |
| Warning on warning-soft | `#D9B46A` | `#2A2417` | 7.84:1 | Pass AAA |
| Danger text | `#E8928A` | `#191D1B` | 7.23:1 | Pass AAA |
| Danger on danger-soft | `#E8928A` | `#2D1B1A` | 6.94:1 | Pass |

**Rules of use**

- `line` is decorative (separators, table rules) and deliberately below 3:1.
  Anything that communicates a control boundary — inputs, dropdown triggers,
  toggle tracks — uses `line-strong`, which meets 3:1.
- Never place `ink-muted` on `surface-sunken` for long-form text; it is intended
  for metadata at ≥ 11 px.
- Status colours are paired only with their own `*-soft` background. Do not mix
  e.g. `warning` text on `danger-soft`.
- Surface vs canvas is only ~1.07:1 by design; cards are distinguished by the
  hairline border and (optionally) `shadow-calm`, not by fill contrast alone.

### CSS variables

```css
:root {
  --canvas: 247 247 244;
  --surface: 255 255 255;
  --surface-raised: 252 252 250;
  --surface-sunken: 241 241 236;
  --surface-hover: 240 241 236;

  --ink: 30 35 33;
  --ink-secondary: 91 99 95;
  --ink-muted: 102 112 107;

  --line: 228 228 222;
  --line-strong: 124 133 128;

  --accent: 47 111 98;
  --accent-hover: 39 91 80;
  --accent-soft: 231 240 236;
  --accent-fg: 255 255 255;

  --success: 44 118 87;   --success-soft: 233 244 238;
  --warning: 138 106 31;  --warning-soft: 249 244 230;
  --danger: 163 58 50;    --danger-soft: 248 236 234;
  --danger-fg: 255 255 255;

  --code-bg: 20 25 23;
  --shadow-color: 30 35 33;
  color-scheme: light;
}

.dark {
  --canvas: 18 21 20;
  --surface: 25 29 27;
  --surface-raised: 32 37 34;
  --surface-sunken: 22 26 24;
  --surface-hover: 38 44 40;

  --ink: 233 235 231;
  --ink-secondary: 167 174 169;
  --ink-muted: 140 148 143;

  --line: 45 51 48;
  --line-strong: 108 118 112;

  --accent: 124 191 173;
  --accent-hover: 148 205 189;
  --accent-soft: 29 43 39;
  --accent-fg: 15 26 22;

  --success: 121 198 164; --success-soft: 23 40 33;
  --warning: 217 180 106; --warning-soft: 42 36 23;
  --danger: 232 146 138;  --danger-soft: 45 27 26;
  --danger-fg: 42 15 12;

  --code-bg: 14 18 16;
  --shadow-color: 0 0 0;
  color-scheme: dark;
}
```

Tailwind consumes them through `<alpha-value>` mappings:

```ts
colors: {
  canvas: 'rgb(var(--canvas) / <alpha-value>)',
  surface: {
    DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
    raised: 'rgb(var(--surface-raised) / <alpha-value>)',
    sunken: 'rgb(var(--surface-sunken) / <alpha-value>)',
    hover: 'rgb(var(--surface-hover) / <alpha-value>)',
  },
  ink: {
    DEFAULT: 'rgb(var(--ink) / <alpha-value>)',
    secondary: 'rgb(var(--ink-secondary) / <alpha-value>)',
    muted: 'rgb(var(--ink-muted) / <alpha-value>)',
  },
  line: {
    DEFAULT: 'rgb(var(--line) / <alpha-value>)',
    strong: 'rgb(var(--line-strong) / <alpha-value>)',
  },
  accent: {
    DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
    hover: 'rgb(var(--accent-hover) / <alpha-value>)',
    soft: 'rgb(var(--accent-soft) / <alpha-value>)',
    fg: 'rgb(var(--accent-fg) / <alpha-value>)',
  },
}
```

---

## (c) Typography

**Typefaces**

| Purpose | Typeface | Fallback | Why |
| --- | --- | --- | --- |
| UI & body | **Inter** (variable, 400/500/600) | system-ui stack | Neutral, highly legible at 12–15 px, excellent tabular figures and a friendly lowercase. |
| Code & metadata | **JetBrains Mono** (400/500) | ui-monospace, Menlo, Consolas | Tall x-height, clear `0/O` and `1/l`, comfortable for transcripts. |

Inter and JetBrains Mono are *recommended*, not bundled. They are first in the
font stacks in `tailwind.config.ts`, so self-hosting them (e.g. with
`next/font/local`) upgrades the rendering with no other changes. The app stays
fully functional on the system fallbacks — important for a local-first tool that
may build offline.

**Weights:** 400 for body, 500 for UI labels/buttons and model names, 600 for
titles and headings. Avoid 700+; it hardens the calm tone. Never use italic for
UI copy (only for incidental status such as “stopped”).

**Scale** (implementation in `tailwind.config.ts`)

| Token | Size | Line-height | Tracking | Use |
| --- | --- | --- | --- | --- |
| `text-2xs` | 11 px | 16 px | normal | Pills, metadata, kbd, section labels (uppercase + 0.06em) |
| `text-xs` | 12 px | 16 px | normal | Captions, sidebar rows, card descriptions |
| `text-sm` | 13 px | 20 px | normal | UI labels, buttons, header title |
| `text-base` | 15 px | 24 px | normal | Composer input, default body |
| `text-md` | 16 px | 26 px | normal | Long-form markdown body if needed |
| `text-lg` | 18 px | 28 px | -0.01em | Empty-state subheads |
| `text-xl` | 22 px | 30 px | -0.01em | Markdown H1 |
| `text-2xl` | 28 px | 36 px | -0.015em | Empty-state hero |
| `text-3xl` | 34 px | 42 px | -0.02em | Reserved for marketing surfaces |

**Rules**

- Body copy is 15 px / 24 px in the composer and 15 px / 28 px inside prose
  (comfortable measure, ~65–75 characters in a `max-w-3xl` column).
- Headings tighten letter-spacing by 0.01–0.02em; uppercase labels loosen to
  0.06em and use 11 px semibold.
- Maximum two type sizes per component.
- Code is 12.5 px / 1.65; inline code inherits `0.85em` so it never shouts.

---

## (d) Spacing, radius, elevation

**Spacing** — 4 px base unit.

| Step | px | Typical use |
| --- | --- | --- |
| 0.5 | 2 | Hairline offsets, icon nudges |
| 1 | 4 | Chip padding, tight icon gaps |
| 1.5 | 6 | Button vertical padding, input padding |
| 2 | 8 | Inline gaps, small stacks |
| 2.5 | 10 | Control padding |
| 3 | 12 | Card padding, list gaps |
| 3.5 | 14 | Composer padding |
| 4 | 16 | Page gutters, header padding |
| 5 | 20 | Section padding |
| 6 | 24 | Message vertical rhythm |
| 7 | 28 | Hero spacing |
| 8 | 32 | Section breaks |
| 10 | 40 | Empty-state padding |
| 12 | 48 | Large breaks |
| 16 | 64 | Page-level breathing room |

Layout rhythm: sidebar 272 px, header 56 px, content column `max-w-3xl`
(768 px), gutters 16 px mobile → 24 px ≥ 640 px. Vertical rhythm inside the
transcript: 12 px between blocks, 16 px above/below a message.

**Radius**

| Token | Value | Use |
| --- | --- | --- |
| `rounded-sm` | 6 px | Pills, kbd, small icon buttons, code header chips |
| `rounded` | 8 px | Small controls |
| `rounded-md` | 10 px | Buttons, sidebar rows, inputs |
| `rounded-lg` | 14 px | Cards, banners, tool calls |
| `rounded-xl` | 18 px | Composer, dialogs, large panels |
| `rounded-2xl` | 22 px | Reserved for full-screen sheets |
| `rounded-full` | 9999 px | Status dots, avatars, circular icon buttons |

Principle: one radius step per component, no mixed radii inside a single
surface. Avoid pill-shaped primary buttons — they read playful; 10 px is
friendly but composed.

**Elevation**

| Token | Value | Use |
| --- | --- | --- |
| `shadow-calm` | `0 1px 2px rgb(var(--shadow-color) / 0.06)` | Cards, composer, toggle knob |
| `shadow-calm-md` | `0 12px 32px -16px rgb(var(--shadow-color) / 0.28)` | Menus, popovers, floating scroll button |
| none | — | Inline banners, table containers |

Shadows are neutral, short, and low-opacity. **No coloured glow, ever.** If a
surface needs more separation, add a border, not a halo.

---

## (e) Example component implementations

All three consume the CSS variables above; none hard-codes a hex value. They are
also checked into the repo: `components/ui/Button.tsx`, `Card.tsx`, `Header.tsx`.

### 1. Primary button

```css
/* globals.css */
.btn {
  @apply focus-ring inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50;
}
.btn-md { @apply h-10 px-4; }
.btn-sm { @apply h-8 px-3 text-xs; }
.btn-primary { @apply bg-accent text-accent-fg hover:bg-accent-hover; }
.btn-secondary { @apply border border-line-strong bg-surface text-ink hover:bg-surface-hover; }
.btn-ghost { @apply text-ink-secondary hover:bg-surface-hover hover:text-ink; }
.btn-danger { @apply bg-danger text-danger-fg hover:opacity-90; }

/* Declared as a utility so it can be @applied and reused as a class. */
@utility focus-ring {
  outline: none;
  &:focus-visible {
    outline: 2px solid rgb(var(--accent));
    outline-offset: 2px;
  }
}
```

```tsx
// components/ui/Button.tsx
'use client';
import { forwardRef } from 'react';
import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
};
const SIZES: Record<ButtonSize, string> = { sm: 'btn-sm', md: 'btn-md' };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', type = 'button', className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn('btn', SIZES[size], VARIANTS[variant], className)}
      {...props}
    />
  );
});
```

Usage: `<Button variant="primary">Retry connection</Button>`.

Accessibility:

- 40 px minimum height; icon-only variants must still be ≥ 36 px and carry an
  `aria-label`.
- Primary label contrast is 5.88:1 light / 8.40:1 dark.
- Hover changes colour only, so it is safe under reduced motion; focus uses a
  real 2 px outline rather than a colour change.
- Disabled state uses 50% opacity **plus** `cursor-not-allowed`; never rely on
  colour alone.

### 2. Card

```css
.card {
  @apply rounded-xl border border-line bg-surface shadow-calm;
}
```

```tsx
// components/ui/Card.tsx
import { cn } from '@/lib/cn';

export type CardTone = 'default' | 'accent' | 'warning' | 'danger';

const TONES: Record<CardTone, string> = {
  default: '',
  accent: 'border-accent/25 bg-accent-soft',
  warning: 'border-warning/30 bg-warning-soft',
  danger: 'border-danger/30 bg-danger-soft',
};

export function Card({
  tone = 'default',
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { tone?: CardTone }) {
  return <div className={cn('card', TONES[tone], className)} {...props} />;
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-start justify-between gap-3 px-4 pt-4', className)} {...props} />;
}
export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-4 py-3', className)} {...props} />;
}
export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-sm font-semibold text-ink', className)} {...props} />;
}
export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('mt-1 text-xs leading-5 text-ink-secondary', className)} {...props} />;
}
```

Usage — an inline warning panel (as in the Ollama connection state):

```tsx
<Card tone="warning" className="mx-auto max-w-xl p-5" role="status">
  <CardTitle className="text-warning">Can’t reach Ollama</CardTitle>
  <CardDescription className="text-warning">
    The local service is not responding. Start it and retry.
  </CardDescription>
</Card>
```

Use the default tone for neutral content and the tinted tones only for status.
Tinted cards must use their matching status text colour (verified above). Cards
do not animate in; they are static surfaces.

### 3. Header

```css
.app-header {
  @apply flex h-14 shrink-0 items-center gap-3 border-b border-line bg-canvas/90 px-3 sm:px-5;
  @apply supports-[backdrop-filter]:backdrop-blur-sm;
}
```

```tsx
// components/ui/Header.tsx
import { cn } from '@/lib/cn';

export interface HeaderProps extends React.HTMLAttributes<HTMLElement> {
  title: string;
  subtitle?: string;
  leading?: React.ReactNode;
  actions?: React.ReactNode;
}

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
```

Responsive behaviour: the title truncates first; `actions` never shrink. Below
`md` the sidebar toggle is passed as `leading`; the “Clear” label collapses to
its icon below `sm`.

---

## (f) Migration checklist

Use this when replacing any remaining neon/gradient/glow styling.

**Remove effects**

- [ ] Delete `ambient-glow` / `ambient-glow-sm` radial gradients and their
      `--glow-rgb` / `--glow-alpha` variables. The app now sits on flat
      `bg-canvas`.
- [ ] Delete `.logo-metallic` (background-clip gradient text). Use a solid
      `font-semibold text-ink` wordmark with an `bg-accent-soft` icon tile.
- [ ] Delete coloured glow shadows (`shadow-[0_0_6px_rgb(...)]`) and neon ring
      utilities. Replace with `shadow-calm` / `shadow-calm-md`.
- [ ] Replace `glass-panel` (`bg-panel/80 backdrop-blur-xl`) with opaque
      `bg-surface` + `border-line`. Blur is allowed only on the sticky header.
- [ ] Remove decorative gradients from buttons, cards, avatars, and scroll
      indicators. Gradients are reserved for nothing in this system.
- [ ] Remove `animate-ping`, `animate-bounce`, and shimmer/sweep animations.
      Streaming uses `animate-pulse` or `animate-dot-pulse` with
      `motion-reduce:animate-none`.

**Replace colour usage**

- [ ] `indigo-*` → `accent-*` (`text-accent`, `bg-accent`, `bg-accent-soft`,
      `border-accent`).
- [ ] `bg-overlay/[0.0x]`, `border-overlay/[...]`, `text-zinc-*` aliases →
      semantic tokens: `surface-sunken`, `surface-hover`, `line`, `ink`,
      `ink-secondary`, `ink-muted`.
- [ ] `amber-*` → `warning` / `warning-soft`; `red-*` → `danger` / `danger-soft`;
      `emerald-*` → `success` / `success-soft`.
- [ ] Structural borders: `line` for separators, **`line-strong` for inputs and
      control boundaries** (3:1).
- [ ] Solid primary actions use `bg-accent text-accent-fg`; never white text on
      a light accent in dark mode (`accent-fg` flips).
- [ ] Update `<meta name="theme-color">` to `#F7F7F4` light / `#121514` dark.

**Typography & spacing**

- [ ] Replace arbitrary `text-[13.5px]` / `text-[12.5px]` values with
      `text-sm` / `text-xs` tokens.
- [ ] Replace `rounded-[26px]` and mixed radii with the radius scale (composer:
      `rounded-xl`).
- [ ] Replace `border-overlay/[0.06]` on cards with `border-line` and, if needed,
      `shadow-calm` — not a bigger shadow.

**Motion**

- [ ] Keep `@media (prefers-reduced-motion: reduce)` at the end of
      `globals.css`; it collapses animation/transition durations globally.
- [ ] Keep the `[data-motion="reduced"]` hook so a future in-app toggle can opt
      out without touching components.
- [ ] Any new animation must have `motion-reduce:animate-none` (or be covered by
      the global media query) and must never convey information by motion alone.
- [ ] Smooth scrolling must fall back to `auto` (see `scrollToApproval`).

**Verification**

- [ ] Toggle light and dark; confirm no hard-coded `zinc`/`indigo` remains
      outside the always-dark code block.
- [ ] Check every text/background pair against the tables above (target ≥ 4.5:1
      for text, ≥ 3:1 for control borders and focus).
- [ ] Keyboard pass: Tab through sidebar, composer, menus, and approval buttons;
      focus must be visible on every control.
- [ ] Responsive pass at 360, 768, 1024, 1440 px: sidebar drawer, truncation,
      one-column suggestions.
- [ ] Enable “Reduce motion” in the OS; confirm dots/caret/spinners are static
      and scrolling is instant.
- [ ] `npm run typecheck && npm run lint && npm run build`.

### Quick grep for leftovers

```bash
grep -rnE "indigo|glow|gradient|animate-ping|animate-bounce|glass-panel|bg-overlay|text-zinc-" \
  app components --include="*.tsx" --include="*.css"
```

The only expected hits are inside `components/CodeBlock.tsx` and the always-dark
code chrome in `MessageBubble`, where zinc greys are intentionally used on the
theme-independent code surface.
