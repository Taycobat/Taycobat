export interface SiretResult {
  raisonSociale: string
  adresse: string
  codePostal: string
  ville: string
  formeJuridique: string
  siret: string
  siren: string
  codeNaf: string
}

const NATURE_JURIDIQUE: Record<string, string> = {
  '1000': 'EI', '5499': 'SARL', '5710': 'SAS', '5720': 'SASU',
  '5498': 'EURL', '6540': 'SCI', '5599': 'SA', '1300': 'Auto-entrepreneur',
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

    return {
      raisonSociale: r.nom_raison_sociale || r.nom_complet || '',
      adresse: siege.adresse || siege.geo_adresse || '',
      codePostal: siege.code_postal || '',
      ville: siege.libelle_commune || '',
      formeJuridique: NATURE_JURIDIQUE[nature] || nature,
      siret: siege.siret || clean,
      siren: r.siren || clean.substring(0, 9),
      codeNaf: siege.activite_principale || r.activite_principale || '',
    }
  } catch {
    return null
  }
}
