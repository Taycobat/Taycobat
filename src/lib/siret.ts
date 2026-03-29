export interface SiretResult {
  raisonSociale: string
  adresse: string
  codePostal: string
  ville: string
  formeJuridique: string
  siret: string
  siren: string
  codeNaf: string
  rcs: string
  tvaIntracom: string
  capitalSocial: string
}

const NATURE_JURIDIQUE: Record<string, string> = {
  '1000': 'EI', '1200': 'Commercant', '1300': 'Auto-entrepreneur',
  '5410': 'SARL', '5499': 'SARL', '5498': 'EURL',
  '5710': 'SAS', '5720': 'SASU',
  '5599': 'SA', '6540': 'SCI', '6599': 'SCI',
  '5800': 'SE', '9220': 'Association',
}

function computeTvaIntracom(siren: string): string {
  const n = parseInt(siren, 10)
  if (isNaN(n)) return ''
  const key = (12 + 3 * (n % 97)) % 97
  return `FR${String(key).padStart(2, '0')}${siren}`
}

export async function searchSiret(query: string): Promise<SiretResult | null> {
  const clean = query.replace(/\s/g, '')
  if (clean.length < 9) return null

  try {
    const res = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${clean}`)
    if (!res.ok) return null
    const data = await res.json()
    const r = data.results?.[0]
    if (!r) return null

    const siege = r.siege ?? {}
    const nature = r.nature_juridique || ''
    const siren = r.siren || clean.substring(0, 9)
    const ville = siege.libelle_commune || ''

    // Capital from finances if available
    let capitalSocial = ''
    if (r.finances) {
      const years = Object.keys(r.finances).sort().reverse()
      if (years.length > 0 && r.finances[years[0]]?.ca) {
        // API doesn't expose capital directly — leave empty
      }
    }

    return {
      raisonSociale: r.nom_raison_sociale || r.nom_complet || '',
      adresse: siege.adresse || siege.geo_adresse || '',
      codePostal: siege.code_postal || '',
      ville,
      formeJuridique: NATURE_JURIDIQUE[nature] || '',
      siret: siege.siret || clean,
      siren,
      codeNaf: siege.activite_principale || r.activite_principale || '',
      rcs: ville ? `RCS ${ville}` : '',
      tvaIntracom: computeTvaIntracom(siren),
      capitalSocial,
    }
  } catch {
    return null
  }
}
