// Anti-fraud TVA compliance — SHA-256 hash chain for audit log

export async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export interface AuditEntry {
  id: string
  action: string
  document_type: string
  document_id: string
  document_numero: string
  montant_ttc: number
  user_id: string
  timestamp: string
  hash: string
  previous_hash: string
}

export async function createAuditHash(entry: Omit<AuditEntry, 'hash'>, previousHash: string): Promise<string> {
  const payload = `${previousHash}|${entry.action}|${entry.document_type}|${entry.document_numero}|${entry.montant_ttc}|${entry.timestamp}`
  return sha256(payload)
}

// FEC export format (Fichier des Ecritures Comptables)
export interface FECLine {
  JournalCode: string
  JournalLib: string
  EcritureNum: string
  EcritureDate: string
  CompteNum: string
  CompteLib: string
  CompAuxNum: string
  CompAuxLib: string
  PieceRef: string
  PieceDate: string
  EcritureLib: string
  Debit: string
  Credit: string
  EcritureLet: string
  DateLet: string
  ValidDate: string
  Montantdevise: string
  Idevise: string
}

export function generateFECLine(params: {
  numero: string; date: string; compte: string; compteLib: string
  pieceRef: string; libelle: string; debit: number; credit: number
}): string {
  const d = new Date(params.date)
  const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  return [
    'VE', 'Ventes', params.numero, dateStr, params.compte, params.compteLib,
    '', '', params.pieceRef, dateStr, params.libelle,
    params.debit.toFixed(2).replace('.', ','), params.credit.toFixed(2).replace('.', ','),
    '', '', dateStr, '', 'EUR'
  ].join('\t')
}

export const FEC_HEADER = 'JournalCode\tJournalLib\tEcritureNum\tEcritureDate\tCompteNum\tCompteLib\tCompAuxNum\tCompAuxLib\tPieceRef\tPieceDate\tEcritureLib\tDebit\tCredit\tEcritureLet\tDateLet\tValidDate\tMontantdevise\tIdevise'
