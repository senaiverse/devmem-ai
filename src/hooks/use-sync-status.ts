import { useSyncExternalStore } from 'react'
import { useStatus } from '@powersync/react'

/** Subscribes to the browser's online/offline events. */
function subscribeBrowserOnline(onStoreChange: () => void) {
  window.addEventListener('online', onStoreChange)
  window.addEventListener('offline', onStoreChange)
  return () => {
    window.removeEventListener('online', onStoreChange)
    window.removeEventListener('offline', onStoreChange)
  }
}

function getBrowserOnline() {
  return navigator.onLine
}

/**
 * Combines PowerSync's sync status with the browser's navigator.onLine.
 * Both must be true for `isOnline` to be true — this ensures instant
 * detection when DevTools toggles offline (navigator.onLine reacts
 * immediately) while also catching PowerSync-specific disconnections.
 */
export function useSyncStatus() {
  const status = useStatus()
  const browserOnline = useSyncExternalStore(subscribeBrowserOnline, getBrowserOnline)

  return {
    /** True only when both the browser has network AND PowerSync is connected. */
    isOnline: status.connected && browserOnline,
    /** Raw PowerSync sync status object for advanced use. */
    status,
  }
}
