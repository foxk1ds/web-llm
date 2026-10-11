import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Web-LLM',
  description:
    'Web-LLM is a fast, private web interface for the language models running on your own machine via Ollama.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#09090b' },
  ],
};

const THEME_SCRIPT = `
(function () {
  try {
    var raw = localStorage.getItem('web-llm:settings:v1');
    var theme = raw && JSON.parse(raw).theme;
    if (theme !== 'light' && theme !== 'dark') {
      theme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
  } catch (e) {
    document.documentElement.classList.add('dark');
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="h-full overflow-hidden font-sans">{children}</body>
    </html>
  );
}
