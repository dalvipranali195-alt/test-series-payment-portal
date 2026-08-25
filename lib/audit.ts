import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

/**
 * Records one audit_logs row via the log_audit() Postgres function. That
 * function is the only write path into audit_logs (see
 * supabase/migrations/0003_paper_checker.sql) — there's no insert RLS
 * policy for the table itself, so every mutating action must call this
 * instead of writing to audit_logs directly.
 */
export async function logAudit(
  supabase: SupabaseClient<Database>,
  params: {
    tableName: string;
    recordId: string;
    action: string;
    fieldChanged?: string;
    previousValue?: string;
    newValue?: string;
    reason?: string;
  }
) {
  const { error } = await supabase.rpc('log_audit', {
    p_table_name: params.tableName,
    p_record_id: params.recordId,
    p_action: params.action,
    p_field_changed: params.fieldChanged ?? null,
    p_previous_value: params.previousValue ?? null,
    p_new_value: params.newValue ?? null,
    p_reason: params.reason ?? null,
  });

  if (error) {
    throw new Error(`Failed to write audit log: ${error.message}`);
  }
}
