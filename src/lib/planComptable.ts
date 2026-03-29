export interface PlanComptable {
  // Ventes
  vente_autoliquidation: string
  vente_tva10: string
  vente_tva20: string
  vente_tva55: string
  // TVA collectee
  tva_collectee_10: string
  tva_collectee_20: string
  tva_collectee_55: string
  // Client / Banque / Caisse
  client: string
  banque: string
  caisse: string
  // Journaux
  journal_ventes: string
  journal_banque: string
  journal_caisse: string
}

export const PLAN_DEFAUT: PlanComptable = {
  vente_autoliquidation: '706000',
  vente_tva10: '706100',
  vente_tva20: '706200',
  vente_tva55: '706500',
  tva_collectee_10: '445710',
  tva_collectee_20: '445720',
  tva_collectee_55: '445750',
  client: '411000',
  banque: '512000',
  caisse: '530000',
  journal_ventes: 'VE',
  journal_banque: 'BQ',
  journal_caisse: 'CA',
}

export function getPlanComptable(meta: Record<string, unknown>): PlanComptable {
  const saved = (meta?.plan_comptable ?? {}) as Partial<PlanComptable>
  return { ...PLAN_DEFAUT, ...saved }
}

export function venteCompte(pc: PlanComptable, tvaPct: number): { num: string; lib: string } {
  if (tvaPct === 0) return { num: pc.vente_autoliquidation, lib: 'Travaux autoliquidation' }
  if (tvaPct === 5.5) return { num: pc.vente_tva55, lib: 'Travaux TVA 5,5%' }
  if (tvaPct === 10) return { num: pc.vente_tva10, lib: 'Travaux TVA 10%' }
  return { num: pc.vente_tva20, lib: 'Travaux TVA 20%' }
}

export function tvaCompte(pc: PlanComptable, tvaPct: number): { num: string; lib: string } {
  if (tvaPct === 5.5) return { num: pc.tva_collectee_55, lib: 'TVA collectee 5,5%' }
  if (tvaPct === 10) return { num: pc.tva_collectee_10, lib: 'TVA collectee 10%' }
  return { num: pc.tva_collectee_20, lib: 'TVA collectee 20%' }
}

export const PLAN_FIELDS: { key: keyof PlanComptable; label: string; group: string }[] = [
  { key: 'vente_autoliquidation', label: 'Travaux autoliquidation', group: 'Comptes de ventes' },
  { key: 'vente_tva10', label: 'Travaux TVA 10%', group: 'Comptes de ventes' },
  { key: 'vente_tva20', label: 'Travaux TVA 20%', group: 'Comptes de ventes' },
  { key: 'vente_tva55', label: 'Travaux TVA 5,5%', group: 'Comptes de ventes' },
  { key: 'tva_collectee_10', label: 'TVA collectee 10%', group: 'Comptes TVA collectee' },
  { key: 'tva_collectee_20', label: 'TVA collectee 20%', group: 'Comptes TVA collectee' },
  { key: 'tva_collectee_55', label: 'TVA collectee 5,5%', group: 'Comptes TVA collectee' },
  { key: 'client', label: 'Clients', group: 'Comptes tiers' },
  { key: 'banque', label: 'Banque', group: 'Comptes tiers' },
  { key: 'caisse', label: 'Caisse', group: 'Comptes tiers' },
  { key: 'journal_ventes', label: 'Journal ventes', group: 'Codes journaux' },
  { key: 'journal_banque', label: 'Journal banque', group: 'Codes journaux' },
  { key: 'journal_caisse', label: 'Journal caisse', group: 'Codes journaux' },
]
