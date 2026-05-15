import type { Metadata, Viewport } from 'next'
import './globals.css'

export const dynamic = 'force-dynamic'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: 'EstimateOS',
  description: 'Estimate software for W&D contractors in Canada',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'EstimateOS',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="EstimateOS" />
        <meta name="theme-color" content="#0A0E1A" />
      </head>
      <body>
        <div className="app">
          {children}
        </div>
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js').then(function(reg) {
                reg.addEventListener('updatefound', function() {
                  var newSW = reg.installing;
                  if (newSW) {
                    newSW.addEventListener('statechange', function() {
                      if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
                        newSW.postMessage({ type: 'SKIP_WAITING' });
                        window.location.reload();
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
