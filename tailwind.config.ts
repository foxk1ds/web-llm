import type { Config } from 'tailwindcss';
// @ts-ignore
import typography from '@tailwindcss/typography';

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
<<<<<<< HEAD
        overlay: 'rgb(var(--overlay) / <alpha-value>)',
        app: 'rgb(var(--app-bg) / <alpha-value>)',
        panel: 'rgb(var(--panel-bg) / <alpha-value>)',
        elevated: 'rgb(var(--elevated-bg) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        'muted-foreground': 'rgb(var(--muted-foreground) / <alpha-value>)',
        foreground: 'rgb(var(--foreground) / <alpha-value>)',
=======
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
        success: {
          DEFAULT: 'rgb(var(--success) / <alpha-value>)',
          soft: 'rgb(var(--success-soft) / <alpha-value>)',
        },
        warning: {
          DEFAULT: 'rgb(var(--warning) / <alpha-value>)',
          soft: 'rgb(var(--warning-soft) / <alpha-value>)',
        },
        danger: {
          DEFAULT: 'rgb(var(--danger) / <alpha-value>)',
          soft: 'rgb(var(--danger-soft) / <alpha-value>)',
          fg: 'rgb(var(--danger-fg) / <alpha-value>)',
        },
        code: 'rgb(var(--code-bg) / <alpha-value>)',
>>>>>>> origin/main
      },
      fontFamily: {
        sans: [
          'Inter',
          'InterVariable',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Consolas',
          'Liberation Mono',
          'monospace',
        ],
      },
      fontSize: {
        '2xs': ['11px', { lineHeight: '16px' }],
        xs: ['12px', { lineHeight: '16px' }],
        sm: ['13px', { lineHeight: '20px' }],
        base: ['15px', { lineHeight: '24px' }],
        md: ['16px', { lineHeight: '26px' }],
        lg: ['18px', { lineHeight: '28px' }],
        xl: ['22px', { lineHeight: '30px', letterSpacing: '-0.01em' }],
        '2xl': ['28px', { lineHeight: '36px', letterSpacing: '-0.015em' }],
        '3xl': ['34px', { lineHeight: '42px', letterSpacing: '-0.02em' }],
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: '8px',
        md: '10px',
        lg: '14px',
        xl: '18px',
        '2xl': '22px',
      },
      boxShadow: {
        calm: '0 1px 2px rgb(var(--shadow-color) / 0.06)',
        'calm-md': '0 12px 32px -16px rgb(var(--shadow-color) / 0.28)',
      },
      borderRadius: {
        DEFAULT: '0.5rem',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.35' },
        },
<<<<<<< HEAD
=======
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
>>>>>>> origin/main
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'scale-in': {
<<<<<<< HEAD
          from: { opacity: '0', transform: 'scale(0.98)' },
          to: { opacity: '1', transform: 'scale(1)' },
=======
          from: { opacity: '0', transform: 'translateY(-2px) scale(0.99)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
>>>>>>> origin/main
        },
        'dot-pulse': {
          '0%, 100%': { opacity: '0.35', transform: 'translateY(0)' },
          '50%': { opacity: '1', transform: 'translateY(-1px)' },
        },
      },
      animation: {
<<<<<<< HEAD
        blink: 'blink 1.1s step-end infinite',
        'fade-in': 'fade-in 0.15s ease-out both',
        'scale-in': 'scale-in 0.12s ease-out both',
=======
        blink: 'blink 1.1s ease-in-out infinite',
        'fade-up': 'fade-up 0.2s ease-out both',
        'fade-in': 'fade-in 0.16s ease-out both',
        'scale-in': 'scale-in 0.14s ease-out both',
        'dot-pulse': 'dot-pulse 1.2s ease-in-out infinite',
>>>>>>> origin/main
      },
    },
  },
  plugins: [typography],
};

export default config;
