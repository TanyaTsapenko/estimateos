'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Download } from 'lucide-react'
import AppTopBar from '@/components/AppTopBar'

export default function PdfViewerPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const url = searchParams.get('url') ?? ''
  const label = searchParams.get('label') ?? 'Document'

  const isValidUrl = (() => { try { const u = new URL(url); return u.protocol === 'https:' || u.protocol === 'http:' } catch { return false } })()

  if (!isValidUrl) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: '#94A3B8', fontSize: 13, fontFamily: 'Inter, sans-serif' }}>
      <div>No document to display.</div>
      <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#2563EB', cursor: 'pointer', fontSize: 13 }}>← Go back</button>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - env(safe-area-inset-top) - 52px)', background: '#1a1a1a', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <AppTopBar
        variant="dark"
        onBack={() => router.back()}
        backLabel="Back"
        right={<a
          href={url}
          download
          style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none', padding: '6px 0' }}
        >
          <Download size={16} /> Save
        </a>}
      />

      {/* PDF iframe */}
      <iframe
        src={url}
        style={{ flex: 1, width: '100%', border: 'none', background: '#1a1a1a' }}
        title={label}
      />
    </div>
  )
}
