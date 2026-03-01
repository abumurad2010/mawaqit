import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* PWA manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* iOS PWA */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Mawaqit" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* Theme */}
        <meta name="theme-color" content="#1a7a4a" />
        <meta name="msapplication-TileColor" content="#1a5c38" />
        <meta name="msapplication-TileImage" content="/icon-192.png" />

        {/* SEO */}
        <meta name="description" content="Free Islamic prayer times, Qibla compass, and full Quran with transliteration. Works completely offline." />
        <meta name="keywords" content="prayer times, salah, quran, qibla, islamic app, adhan, mawaqit" />

        {/* Open Graph */}
        <meta property="og:title" content="Mawaqit – Prayer Times & Quran" />
        <meta property="og:description" content="Free Islamic prayer times, Qibla compass, and full Quran with transliteration. Works completely offline." />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="/icon-512.png" />

        <ScrollViewStyleReset />

        <style dangerouslySetInnerHTML={{
          __html: `
            html, body, #root { height: 100%; }
            body { margin: 0; background: #1a5c38; overflow: hidden; }
          `
        }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
