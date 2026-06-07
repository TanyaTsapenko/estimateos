'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Download } from 'lucide-react'

export default function PdfViewerPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const url = searchParams.get('url') ?? ''
  const label = searchParams.get('label') ?? 'Document'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - env(safe-area-inset-top) - 52px)', background: '#1a1a1a', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div className="page-hd" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'max(48px, calc(env(safe-area-inset-top) + 12px)) 16px 12px',
        background: '#111', flexShrink: 0,
      }}>
        <button
          onClick={() => router.back()}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', padding: '6px 0' }}
        >
          <ArrowLeft size={18} /> Back
        </button>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.7)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {label}
        </span>
        <a
          href={url}
          download
          style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none', padding: '6px 0' }}
        >
          <Download size={16} /> Save
        </a>
      </div>

      {/* PDF iframe */}
      <iframe
        src={url}
        style={{ flex: 1, width: '100%', border: 'none', background: '#1a1a1a' }}
        title={label}
      />
    </div>
  )
}
