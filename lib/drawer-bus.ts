// Minimal singleton bus: DrawerNav registers its open handler;
// AppTopBar calls emitOpenDrawer() on burger click.
let _fn: (() => void) | null = null

export function registerOpenDrawer(fn: () => void): () => void {
  _fn = fn
  return () => { if (_fn === fn) _fn = null }
}

export function emitOpenDrawer() {
  _fn?.()
}
