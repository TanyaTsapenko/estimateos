'use client'
import { ApexMark } from './ApexScaleLogo'
import { emitOpenDrawer } from '@/lib/drawer-bus'

export default function MobileTopBar() {
  function openSidebar() {
    emitOpenDrawer()
  }

  return (
    <div className="mobile-topbar">
      <button onClick={openSidebar} className="mobile-topbar-btn" aria-label="Open navigation">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <rect x="1" y="2.5"  width="16" height="2" rx="1" fill="currentColor" />
          <rect x="1" y="8"    width="16" height="2" rx="1" fill="currentColor" />
          <rect x="1" y="13.5" width="16" height="2" rx="1" fill="currentColor" />
        </svg>
      </button>
      <ApexMark theme="dark" size={28} />
    </div>
  )
}
