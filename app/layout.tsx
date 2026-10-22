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
    { media: '(prefers-color-scheme: light)', color: '#FFFFFF' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
};

const FONT_SIZES = { sm: '14px', default: '15px', lg: '17px', xl: '19px' };

const THEME_SCRIPT = `
(function () {
  var root = document.documentElement;
  try {
    var raw = localStorage.getItem('web-llm:settings:v1');
    var settings = raw ? JSON.parse(raw) || {} : {};
    var theme = settings.theme;
    if (theme !== 'light' && theme !== 'dark') {
      theme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    // colorScheme is owned by React (inline style on <html>); only the class
    // is toggled here so hydration patches it instead of clobbering it.
    root.classList.toggle('dark', theme === 'dark');
    var sizes = ${JSON.stringify(FONT_SIZES)};
    root.style.setProperty('--chat-font-size', sizes[settings.fontSize] || sizes.default);
    root.dataset.density = settings.density === 'compact' ? 'compact' : 'comfortable';
  } catch (e) {
    root.classList.add('dark');
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
