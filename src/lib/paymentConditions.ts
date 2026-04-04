import { supabase } from './supabase'

// --- Types ---

export type PaymentDelayType = 'reception' | '30df' | '30fm' | '45fm' | '60df' | 'acompte' | 'custom'
export type PenaltyType = '3x' | 'bce' | 'custom'
export type PaymentMethod = 'virement' | 'cheque' | 'cb' | 'prelevement' | 'especes' | 'lettre'

export interface CompanyPaymentSettings {
  payment_delay_type: PaymentDelayType
  payment_delay_days: number
  payment_methods: PaymentMethod[]
  late_penalty_type: PenaltyType
  late_penalty_rate: number
  late_recovery_fee: number
}

export const DEFAULT_SETTINGS: CompanyPaymentSettings = {
  payment_delay_type: '30df',
  payment_delay_days: 30,
  payment_methods: ['virement', 'cheque', 'cb'],
  late_penalty_type: '3x',
  late_penalty_rate: 0,
  late_recovery_fee: 40,
}

// --- Labels ---

export const DELAY_OPTIONS: { value: PaymentDelayType; label: string }[] = [
  { value: 'reception', label: 'Paiement a reception de facture' },
  { value: '30df', label: '30 jours date de facture' },
  { value: '30fm', label: '30 jours fin de mois' },
  { value: '45fm', label: '45 jours fin de mois' },
  { value: '60df', label: '60 jours date de facture (plafond legal)' },
  { value: 'acompte', label: 'Acompte a la commande + solde a reception' },
  { value: 'custom', label: 'Personnalise' },
]

export const METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'virement', label: 'Virement bancaire' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'prelevement', label: 'Prelevement automatique' },
  { value: 'cb', label: 'Carte bancaire' },
  { value: 'especes', label: 'Especes' },
  { value: 'lettre', label: 'Lettre de change' },
]

export const PENALTY_OPTIONS: { value: PenaltyType; label: string }[] = [
  { value: '3x', label: '3 fois le taux d\'interet legal (minimum legal)' },
  { value: 'bce', label: 'Taux BCE + 10 points (standard BTP)' },
  { value: 'custom', label: 'Taux personnalise' },
]

// --- Text generation ---

export function getDelayText(type: PaymentDelayType, days?: number): string {
  switch (type) {
    case 'reception': return 'Paiement a reception de facture'
    case '30df': return 'Paiement a 30 jours a compter de la date de facture'
    case '30fm': return 'Paiement a 30 jours fin de mois suivant la date de facture'
    case '45fm': return 'Paiement a 45 jours fin de mois suivant la date de facture'
    case '60df': return 'Paiement a 60 jours a compter de la date de facture'
    case 'acompte': return 'Paiement selon les modalites d\'acompte convenues au devis'
    case 'custom': return `Paiement a ${days ?? 30} jours a compter de la date de facture`
  }
}

export function getMethodsText(methods: PaymentMethod[]): string {
  if (!methods.length) return ''
  const labels = methods.map((m) => METHOD_OPTIONS.find((o) => o.value === m)?.label ?? m)
  return `Mode(s) de reglement accepte(s) : ${labels.join(', ')}.`
}

export function getPenaltyText(type: PenaltyType, rate?: number, fee = 40): string {
  let penaltyStr: string
  switch (type) {
    case '3x': penaltyStr = '3 fois le taux d\'interet legal en vigueur'; break
    case 'bce': penaltyStr = 'au taux directeur de la BCE majore de 10 points'; break
    case 'custom': penaltyStr = `au taux de ${rate ?? 0}%`; break
  }
  return `Tout retard de paiement entraine de plein droit l'application de penalites ${penaltyStr}, ainsi qu'une indemnite forfaitaire pour frais de recouvrement de ${fee} EUR (art. L441-10 du Code de commerce).`
}

export function generateLegalBlock(settings: CompanyPaymentSettings, override?: { delay?: string; methods?: string[] }): {
  delayText: string
  methodsText: string
  penaltyText: string
} {
  const delayType = (override?.delay as PaymentDelayType) || settings.payment_delay_type
  const methods = (override?.methods as PaymentMethod[]) || settings.payment_methods
  return {
    delayText: getDelayText(delayType, settings.payment_delay_days),
    methodsText: getMethodsText(methods),
    penaltyText: getPenaltyText(settings.late_penalty_type, settings.late_penalty_rate, settings.late_recovery_fee),
  }
}

// --- Supabase CRUD ---

export async function loadCompanySettings(userId: string): Promise<CompanyPaymentSettings> {
  const { data } = await supabase
    .from('company_settings')
    .select('payment_delay_type, payment_delay_days, payment_methods, late_penalty_type, late_penalty_rate, late_recovery_fee')
    .eq('user_id', userId)
    .single()
  if (!data) return { ...DEFAULT_SETTINGS }
  return {
    payment_delay_type: data.payment_delay_type || DEFAULT_SETTINGS.payment_delay_type,
    payment_delay_days: data.payment_delay_days ?? DEFAULT_SETTINGS.payment_delay_days,
    payment_methods: data.payment_methods || DEFAULT_SETTINGS.payment_methods,
    late_penalty_type: data.late_penalty_type || DEFAULT_SETTINGS.late_penalty_type,
    late_penalty_rate: data.late_penalty_rate ?? DEFAULT_SETTINGS.late_penalty_rate,
    late_recovery_fee: data.late_recovery_fee ?? DEFAULT_SETTINGS.late_recovery_fee,
  }
}

export async function saveCompanySettings(userId: string, settings: CompanyPaymentSettings): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('company_settings')
    .upsert({ user_id: userId, ...settings }, { onConflict: 'user_id' })
  return { error: error?.message ?? null }
}
