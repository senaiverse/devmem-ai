import { UpdateType } from '@powersync/web';
import type {
  AbstractPowerSyncDatabase,
  PowerSyncBackendConnector,
  PowerSyncCredentials,
} from '@powersync/web';
import { supabase } from '@/lib/supabase';

/**
 * Connects PowerSync to Supabase.
 * - fetchCredentials: uses Supabase anonymous auth to get a fresh JWT.
 *   PowerSync calls this automatically every few minutes, so the token
 *   never expires. No login UI needed — silent anonymous sign-in.
 * - uploadData: pushes local writes to Supabase via the JS client.
 */
export class SupabaseConnector implements PowerSyncBackendConnector {
  async fetchCredentials(): Promise<PowerSyncCredentials> {
    const powersyncUrl = import.meta.env.VITE_POWERSYNC_URL;
    if (!powersyncUrl) {
      throw new Error('Missing VITE_POWERSYNC_URL environment variable');
    }

    // Get existing session or sign in anonymously
    let { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      session = data.session!;
    }

    return {
      endpoint: powersyncUrl,
      token: session.access_token,
      expiresAt: new Date(session.expires_at! * 1000),
    };
  }

  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const transaction = await database.getNextCrudTransaction();
    if (!transaction) return;

    try {
      for (const op of transaction.crud) {
        const table = op.table;
        const opData = op.opData ? { ...op.opData } : {};
        let result: { error: { message: string } | null };

        switch (op.op) {
          case UpdateType.PUT:
            result = await supabase.from(table).upsert({ id: op.id, ...opData });
            break;
          case UpdateType.PATCH:
            result = await supabase.from(table).update(opData).eq('id', op.id);
            break;
          case UpdateType.DELETE:
            result = await supabase.from(table).delete().eq('id', op.id);
            break;
          default:
            continue;
        }

        if (result.error) {
          console.error(`[PowerSync Upload] ${op.op} on ${table}/${op.id} failed:`, result.error.message);
          throw new Error(result.error.message);
        }
      }
      await transaction.complete();
    } catch (error) {
      console.error('[PowerSync Upload] Transaction failed, will retry:', error);
      throw error;
    }
  }
}
