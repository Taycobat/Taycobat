import { supabase } from '../lib/supabase'

export function useEmail() {
  async function sendWelcome(email: string, name: string) {
    return supabase.functions.invoke('send-email', {
      body: { type: 'welcome', to: email, data: { name } },
    })
  }

  async function sendDevis(clientEmail: string, data: {
    clientName: string
    devisNumero: string
    montantTTC: string
    artisanName: string
  }) {
    return supabase.functions.invoke('send-email', {
      body: { type: 'devis', to: clientEmail, data },
    })
  }

  async function sendRelance(clientEmail: string, data: {
    clientName: string
    factureNumero: string
    montantTTC: string
    joursRetard: number
    artisanName: string
  }) {
    return supabase.functions.invoke('send-email', {
      body: { type: 'relance', to: clientEmail, data },
    })
  }

  return { sendWelcome, sendDevis, sendRelance }
}
