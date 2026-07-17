'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { C, type Opening } from '@/lib/v2/openingTypes'
import { EBIcon } from './icons'
import { FieldLabel } from './primitives'
import ConfirmModal from '@/components/ConfirmModal'

export type PhotoSlot = 'interior' | 'exterior' | 'photo3' | 'photo4'

const SLOTS: { slot: PhotoSlot; label: string }[] = [
  { slot: 'interior', label: 'Interior' },
  { slot: 'exterior', label: 'Exterior' },
  { slot: 'photo3',   label: 'Measurement' },
  { slot: 'photo4',   label: 'Additional' },
]

const SLOT_FIELD: Record<PhotoSlot, 'interiorPhotoUrl' | 'exteriorPhotoUrl' | 'photo3Url' | 'photo4Url'> = {
  interior: 'interiorPhotoUrl',
  exterior: 'exteriorPhotoUrl',
  photo3:   'photo3Url',
  photo4:   'photo4Url',
}

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']

const SLOT_DOWNLOAD_NAME: Record<PhotoSlot, string> = {
  interior: 'interior', exterior: 'exterior', photo3: 'measurement', photo4: 'additional',
}

function downloadName(url: string, typeId: string, slot: PhotoSlot) {
  const ext = url.split('/').pop()?.split('.').pop()?.split('?')[0] || 'jpg'
  return `${typeId}-${SLOT_DOWNLOAD_NAME[slot]}.${ext}`
}

type Props = {
  op: Opening
  userId: string
  onChange: (slot: PhotoSlot, url: string | null) => void
}

export function PhotosUpload({ op, userId, onChange }: Props) {
  const supabase = createClient()
  const [uploading, setUploading] = useState<Record<PhotoSlot, boolean>>(
    { interior: false, exterior: false, photo3: false, photo4: false }
  )
  const [photoKeys, setPhotoKeys] = useState<Record<PhotoSlot, number>>(() => {
    const t = Date.now()
    return { interior: t, exterior: t, photo3: t, photo4: t }
  })
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<PhotoSlot | null>(null)

  async function handleUpload(slot: PhotoSlot, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !userId) return
    if (!ALLOWED_TYPES.includes(file.type)) { setError('Only JPG, PNG or WebP allowed'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Max 5 MB per photo'); return }
    setError('')
    setUploading(p => ({ ...p, [slot]: true }))
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace('jpeg', 'jpg')
    const path = `${userId}/${op.tempId}/${slot}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('opening-photos')
      .upload(path, file, { upsert: true, contentType: file.type })
    if (upErr) {
      setError('Upload failed: ' + upErr.message)
      setUploading(p => ({ ...p, [slot]: false }))
      return
    }
    const { data: urlData } = supabase.storage.from('opening-photos').getPublicUrl(path)
    onChange(slot, urlData.publicUrl)
    setPhotoKeys(p => ({ ...p, [slot]: Date.now() }))
    setUploading(p => ({ ...p, [slot]: false }))
  }

  async function handleDelete(slot: PhotoSlot) {
    const url = op[SLOT_FIELD[slot]]
    if (!url) return
    const marker = '/object/public/opening-photos/'
    const markerIdx = url.indexOf(marker)
    if (markerIdx !== -1) {
      const path = decodeURIComponent(url.slice(markerIdx + marker.length).split('?')[0])
      await supabase.storage.from('opening-photos').remove([path])
    }
    onChange(slot, null)
  }

  return (
    <div>
      <FieldLabel>Photos</FieldLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {SLOTS.map(({ slot, label }) => {
          const url = op[SLOT_FIELD[slot]]
          const loading = uploading[slot]
          const inputId = `photo-${op.tempId}-${slot}`
          return (
            <div key={slot} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: C.inkSoft, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {label}
              </div>
              {url ? (
                <div style={{ position: 'relative' }}>
                  <img
                    src={`${url}?v=${photoKeys[slot]}`}
                    alt={label}
                    style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: 10, border: `1px solid ${C.border}`, display: 'block' }}
                  />
                  <div style={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: 4 }}>
                    <label htmlFor={`${inputId}-replace`}
                      style={{ background: 'rgba(0,0,0,0.52)', borderRadius: 6, padding: '7px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                        <circle cx="12" cy="13" r="3"/>
                      </svg>
                      <input id={`${inputId}-replace`} type="file" accept="image/*"
                        style={{ display: 'none' }} onChange={e => handleUpload(slot, e)} />
                    </label>
                    {/* Download — opens in new tab (iOS fallback) + triggers save on desktop */}
                    <a href={url} download={downloadName(url, op.typeId, slot)} target="_blank" rel="noopener noreferrer"
                      style={{ background: 'rgba(0,0,0,0.52)', borderRadius: 6, padding: '7px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                    </a>
                    <button onClick={() => setConfirmDelete(slot)}
                      style={{ background: 'rgba(192,52,26,0.75)', border: 'none', borderRadius: 6, padding: '7px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ) : (
                <label htmlFor={inputId} style={{
                  aspectRatio: '1 / 1', borderRadius: 10,
                  border: `2px dashed ${C.borderStrong}`,
                  background: C.bg,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  cursor: loading ? 'default' : 'pointer', gap: 5,
                  opacity: loading ? 0.55 : 1,
                }}>
                  {loading ? (
                    <div style={{ fontSize: 10, color: C.inkSoft }}>Uploading…</div>
                  ) : (
                    <>
                      <EBIcon name="camera" size={20} color={C.inkSoft} />
                      <span style={{ fontSize: 9, fontWeight: 700, color: C.inkSoft, textAlign: 'center', lineHeight: 1.2 }}>Add</span>
                    </>
                  )}
                  <input id={inputId} type="file" accept="image/*"
                    style={{ display: 'none' }} disabled={loading} onChange={e => handleUpload(slot, e)} />
                </label>
              )}
            </div>
          )
        })}
      </div>
      {error && <div style={{ fontSize: 11, color: C.red, marginTop: 6 }}>{error}</div>}
      <ConfirmModal
        open={confirmDelete !== null}
        icon="trash"
        title="Delete photo?"
        body="This photo will be permanently removed from this opening."
        confirmLabel="Delete"
        onConfirm={() => { handleDelete(confirmDelete!); setConfirmDelete(null) }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  )
}
