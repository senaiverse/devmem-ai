import { PowerSyncContext } from '@powersync/react';
import { PowerSyncDatabase } from '@powersync/web';
import { type ReactNode, useEffect, useState } from 'react';
import { appSchema } from './schema';
import { SupabaseConnector } from './connector';

/** Singleton PowerSync database instance. */
const db = new PowerSyncDatabase({
  schema: appSchema,
  database: { dbFilename: 'dev-memory-ledger.db' },
});

/**
 * Wraps children in a PowerSyncContext.
 * Connects on mount, disconnects on unmount.
 */
export function PowerSyncProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const connector = new SupabaseConnector();
    // connect() is fire-and-forget — do NOT await it
    db.connect(connector);
    setReady(true);

    return () => {
      db.disconnect();
    };
  }, []);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Initializing...</div>
      </div>
    );
  }

  return (
    <PowerSyncContext.Provider value={db}>
      {children}
    </PowerSyncContext.Provider>
  );
}

/** Export the db instance for use outside React (e.g., in services). */
export { db };
