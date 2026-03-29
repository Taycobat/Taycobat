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

const GREFFE_RCS: Record<string, string> = {
  '01': 'Bourg-en-Bresse', '02': 'Laon', '03': 'Cusset', '04': 'Digne-les-Bains',
  '05': 'Gap', '06': 'Nice', '07': 'Aubenas', '08': 'Sedan',
  '09': 'Foix', '10': 'Troyes', '11': 'Carcassonne', '12': 'Rodez',
  '13': 'Marseille', '14': 'Caen', '15': 'Aurillac', '16': 'Angouleme',
  '17': 'La Rochelle', '18': 'Bourges', '19': 'Brive-la-Gaillarde', '2A': 'Ajaccio',
  '2B': 'Bastia', '21': 'Dijon', '22': 'Saint-Brieuc', '23': 'Gueret',
  '24': 'Perigueux', '25': 'Besancon', '26': 'Romans-sur-Isere', '27': 'Evreux',
  '28': 'Chartres', '29': 'Brest', '30': 'Nimes', '31': 'Toulouse',
  '32': 'Auch', '33': 'Bordeaux', '34': 'Montpellier', '35': 'Rennes',
  '36': 'Chateauroux', '37': 'Tours', '38': 'Grenoble', '39': 'Lons-le-Saunier',
  '40': 'Dax', '41': 'Blois', '42': 'Saint-Etienne', '43': 'Le Puy-en-Velay',
  '44': 'Nantes', '45': 'Orleans', '46': 'Cahors', '47': 'Agen',
  '48': 'Mende', '49': 'Angers', '50': 'Coutances', '51': 'Reims',
  '52': 'Chaumont', '53': 'Laval', '54': 'Nancy', '55': 'Bar-le-Duc',
  '56': 'Vannes', '57': 'Metz', '58': 'Nevers', '59': 'Lille',
  '60': 'Compiegne', '61': 'Alencon', '62': 'Arras', '63': 'Clermont-Ferrand',
  '64': 'Pau', '65': 'Tarbes', '66': 'Perpignan', '67': 'Strasbourg',
  '68': 'Colmar', '69': 'Lyon', '70': 'Vesoul', '71': 'Chalon-sur-Saone',
  '72': 'Le Mans', '73': 'Chambery', '74': 'Annecy', '75': 'Paris',
  '76': 'Rouen', '77': 'Meaux', '78': 'Versailles', '79': 'Niort',
  '80': 'Amiens', '81': 'Castres', '82': 'Montauban', '83': 'Draguignan',
  '84': 'Avignon', '85': 'La Roche-sur-Yon', '86': 'Poitiers', '87': 'Limoges',
  '88': 'Epinal', '89': 'Sens', '90': 'Belfort', '91': 'Evry',
  '92': 'Nanterre', '93': 'Bobigny', '94': 'Creteil', '95': 'Pontoise',
  '971': 'Pointe-a-Pitre', '972': 'Fort-de-France', '973': 'Cayenne',
  '974': 'Saint-Denis', '976': 'Mamoudzou',
}

function greffeFromCodePostal(cp: string): string {
  if (!cp || cp.length < 2) return ''
  // DOM-TOM: 3 first digits
  if (cp.startsWith('97') && cp.length >= 3) {
    return GREFFE_RCS[cp.substring(0, 3)] || ''
  }
  return GREFFE_RCS[cp.substring(0, 2)] || ''
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
      rcs: siege.code_postal ? `RCS ${greffeFromCodePostal(siege.code_postal)}` : '',
      tvaIntracom: computeTvaIntracom(siren),
      capitalSocial,
    }
  } catch {
    return null
  }
}
