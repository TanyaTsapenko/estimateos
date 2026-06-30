'use client'
import { SingleHungDrawing } from '@/components/estimate-builder-v2/awning-hung-tiltturn-drawing'

export default function TestOctagon() {
  return (
    <div style={{ padding: 40, background: 'white' }}>
      <div style={{ width: 300, border: '2px solid red' }}>
        <SingleHungDrawing shape="Octagon" widthIn={36} heightIn={48} uid="test123" />
      </div>
    </div>
  )
}
