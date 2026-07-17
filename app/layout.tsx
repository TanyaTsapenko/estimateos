import type { Metadata, Viewport } from 'next'
import './globals.css'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: 'ApexScale',
  description: 'Estimate software for W&D contractors in Canada',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ApexScale',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/logo/apexscale-appicon.svg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="ApexScale" />
        <meta name="theme-color" content="#0A0E1A" />
      </head>
      <body>
        <div className="app">
          {children}
        </div>
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            var refreshing = false;
            navigator.serviceWorker.addEventListener('controllerchange', function() {
              if (refreshing) return;
              refreshing = true;
              window.location.reload();
            });
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js').then(function(reg) {
                reg.addEventListener('updatefound', function() {
                  var newSW = reg.installing;
                  if (newSW) {
                    newSW.addEventListener('statechange', function() {
                      if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
                        newSW.postMessage({ type: 'SKIP_WAITING' });
                      }
                    });
                  }
                });
              });
            });
          }
        `}} />
      </body>
    </html>
  )
}
