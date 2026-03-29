import { supabase } from '../lib/supabase'

export type LigneType = 'prestation' | 'section' | 'texte' | 'saut_page'

export interface FactureLigne {
  id: string
  facture_id: string
  type: LigneType
  description: string
  quantite: number
  unite: string
  prix_unitaire: number
  tva_pct: number
  total_ht: number
  ordre: number
}

export const UNITES = ['u', 'h', 'm\u00b2', 'ml', 'm\u00b3', 'forfait', 'jour', 'semaine', 'kg', 'lot']
export const TVA_RATES = [
  { value: 20, label: '20%' },
  { value: 10, label: '10%' },
  { value: 5.5, label: '5,5%' },
  { value: 0, label: '0% Auto.' },
]

export function emptyLigne(ordre: number, type: LigneType = 'prestation'): Omit<FactureLigne, 'id' | 'facture_id'> {
  return { type, description: '', quantite: type === 'prestation' ? 1 : 0, unite: 'u', prix_unitaire: 0, tva_pct: 10, total_ht: 0, ordre }
}

export async function saveLignes(factureId: string, lignes: Omit<FactureLigne, 'id' | 'facture_id'>[]) {
  await supabase.from('factures_lignes').delete().eq('facture_id', factureId)
  if (lignes.length === 0) return
  const rows = lignes.map((l, i) => ({
    facture_id: factureId,
    type: l.type,
    description: l.description,
    quantite: l.quantite,
    unite: l.unite,
    prix_unitaire: l.prix_unitaire,
    tva_pct: l.tva_pct,
    total_ht: l.type === 'prestation' ? Math.round(l.quantite * l.prix_unitaire * 100) / 100 : 0,
    ordre: i,
  }))
  await supabase.from('factures_lignes').insert(rows)
}

export async function loadLignes(factureId: string): Promise<Omit<FactureLigne, 'id' | 'facture_id'>[]> {
  const { data } = await supabase.from('factures_lignes').select('*').eq('facture_id', factureId).order('ordre')
  if (!data || data.length === 0) return [emptyLigne(0)]
  return data.map((r) => ({
    type: r.type || 'prestation',
    description: r.description || '',
    quantite: r.quantite ?? 0,
    unite: r.unite || 'u',
    prix_unitaire: r.prix_unitaire ?? 0,
    tva_pct: r.tva_pct ?? 10,
    total_ht: r.total_ht ?? 0,
    ordre: r.ordre ?? 0,
  }))
}
