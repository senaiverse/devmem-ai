import { useStatus } from '@powersync/react'

/**
 * Thin wrapper around PowerSync's useStatus hook.
 * Exposes connection state as a simple `isOnline` boolean.
 */
export function useSyncStatus() {
  const status = useStatus()

  return {
    /** Whether the PowerSync client is connected to the sync service. */
    isOnline: status.connected,
    /** Raw PowerSync sync status object for advanced use. */
    status,
  }
}
