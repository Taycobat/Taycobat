import { supabase } from './supabase'

// Colonnes réelles de la table audit_log :
// id, user_id, action, table_name, record_id, details, created_at

export async function logAudit(params: {
  user_id: string
  action: 'create' | 'update' | 'delete'
  table_name: string
  record_id: string
  details: string
}) {
  await supabase.from('audit_log').insert({
    user_id: params.user_id,
    action: params.action,
    table_name: params.table_name,
    record_id: params.record_id,
    details: params.details,
    created_at: new Date().toISOString(),
  })
}
