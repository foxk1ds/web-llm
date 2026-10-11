import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        overlay: 'rgb(var(--overlay) / <alpha-value>)',
        app: 'rgb(var(--app-bg) / <alpha-value>)',
        panel: 'rgb(var(--panel-bg) / <alpha-value>)',
        elevated: 'rgb(var(--elevated-bg) / <alpha-value>)',
      },
      fontFamily: {
        sans: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'Liberation Mono', 'monospace'],
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'translateY(-4px) scale(0.985)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        blink: 'blink 1.1s step-end infinite',
        'fade-up': 'fade-up 0.22s ease-out both',
        'fade-in': 'fade-in 0.18s ease-out both',
        'scale-in': 'scale-in 0.14s ease-out both',
      },
    },
  },
  plugins: [typography],
};

export default config;
