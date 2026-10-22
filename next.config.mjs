const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['react-syntax-highlighter'],
  // PDF.js must load through Node's own module system: its iterator polyfill
  // relies on globals that Turbopack's bundled module scope does not expose.
  serverExternalPackages: ['unpdf'],
};

export default nextConfig;
