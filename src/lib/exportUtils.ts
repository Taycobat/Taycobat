// --- PDF text sanitizer ---
// jsPDF's default Helvetica uses WinAnsiEncoding (cp1252).
// Characters outside that range render as garbled glyphs.
// This function normalises problematic Unicode into cp1252-safe equivalents.
export function sanitizePdfText(text: string): string {
  return text
    // Normalise Unicode to NFC (composed form) so accented chars stay single codepoints
    .normalize('NFC')
    // Non-breaking / narrow / em spaces → regular space
    .replace(/[\u00A0\u2007\u202F\u2009\u200A\u2003\u2002]/g, ' ')
    // Fancy plus signs → ASCII +
    .replace(/[\uFF0B\u207A\u208A\u2795]/g, '+')
    // Fancy hyphens / dashes → ASCII -
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\uFE58\uFE63\uFF0D]/g, '-')
    // Curly quotes → straight quotes
    .replace(/[\u2018\u2019\u201A]/g, "'")
    .replace(/[\u201C\u201D\u201E]/g, '"')
    // Ellipsis → three dots
    .replace(/\u2026/g, '...')
    // Bullet → *
    .replace(/\u2022/g, '*')
    // Trademark / registered / copyright symbols
    .replace(/\u2122/g, 'TM')
    .replace(/\u00AE/g, '(R)')
    // OE ligatures (outside cp1252 on some builds)
    .replace(/\u0152/g, 'OE')
    .replace(/\u0153/g, 'oe')
    // Strip any remaining non-cp1252 chars (keep basic Latin + Latin-1 Supplement)
    // cp1252 printable range: 0x20-0x7E, 0xA0-0xFF, plus selected 0x80-0x9F slots
    .replace(/[^\x20-\x7E\xA0-\xFF\x80\x82-\x8C\x8E\x91-\x9C\x9E\x9F\n\r\t]/g, '')
}

// Wraps jsPDF doc.text so every string is auto-sanitized.
// Call once after creating the jsPDF instance: wrapDocText(doc)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function wrapDocText(doc: any) {
  const original = doc.text.bind(doc)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc.text = (text: any, ...args: any[]) => {
    if (typeof text === 'string') text = sanitizePdfText(text)
    else if (Array.isArray(text)) text = text.map((t: unknown) => typeof t === 'string' ? sanitizePdfText(t) : t)
    return original(text, ...args)
  }
}

// --- CSV export ---
export function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const bom = '\uFEFF'
  const csv = bom + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// --- FEC Provisoire (format DGFiP, .txt tab-separated) ---
export interface FECLine {
  journalCode: string; journalLib: string; ecritureNum: string; ecritureDate: string
  compteNum: string; compteLib: string; compAuxNum: string; compAuxLib: string
  pieceRef: string; pieceDate: string; ecritureLib: string
  debit: string; credit: string; ecritureLet: string; dateLet: string
  validDate: string; montantDevise: string; idevise: string
}

const FEC_HEADERS = [
  'JournalCode', 'JournalLib', 'EcritureNum', 'EcritureDate',
  'CompteNum', 'CompteLib', 'CompAuxNum', 'CompAuxLib',
  'PieceRef', 'PieceDate', 'EcritureLib',
  'Debit', 'Credit', 'EcritureLet', 'DateLet',
  'ValidDate', 'Montantdevise', 'Idevise',
]

function fecDate(d: string): string {
  const p = d.split('-')
  return p.length === 3 ? `${p[0]}${p[1]}${p[2]}` : d.replace(/-/g, '')
}

function fecAmount(n: number): string {
  return n.toFixed(2).replace('.', ',')
}

export interface FactureForFEC {
  numero: string; date_emission: string; montant_ht: number; montant_ttc: number
  tva_pct: number; client_display: string; client_id: string | null; statut: string
}

import { venteCompte as vc, tvaCompte as tc, PLAN_DEFAUT, type PlanComptable } from './planComptable'

export function generateFEC(factures: FactureForFEC[], pc?: PlanComptable): string {
  const plan = pc ?? PLAN_DEFAUT
  const lines: string[] = [FEC_HEADERS.join('\t')]
  let ecNum = 1

  for (const f of factures) {
    const dt = fecDate(f.date_emission || '')
    const tva = Math.round((f.montant_ttc - f.montant_ht) * 100) / 100
    const clientNum = f.client_id ? `${plan.client.substring(0, 3)}${f.client_id.substring(0, 6).toUpperCase()}` : plan.client
    const num = String(ecNum).padStart(6, '0')
    const vente = vc(plan, f.tva_pct)

    // Client debit line
    lines.push([
      plan.journal_ventes, 'Journal des ventes', num, dt,
      clientNum, f.client_display || 'Client', clientNum, f.client_display || 'Client',
      f.numero, dt, `Facture ${f.numero}`,
      fecAmount(f.montant_ttc), fecAmount(0), '', '',
      dt, fecAmount(f.montant_ttc), 'EUR',
    ].join('\t'))

    // Revenue credit line
    lines.push([
      plan.journal_ventes, 'Journal des ventes', num, dt,
      vente.num, vente.lib, '', '',
      f.numero, dt, `Facture ${f.numero}`,
      fecAmount(0), fecAmount(f.montant_ht), '', '',
      dt, fecAmount(f.montant_ht), 'EUR',
    ].join('\t'))

    // TVA credit line
    if (tva > 0) {
      const tvaC = tc(plan, f.tva_pct)
      lines.push([
        plan.journal_ventes, 'Journal des ventes', num, dt,
        tvaC.num, tvaC.lib, '', '',
        f.numero, dt, `TVA facture ${f.numero}`,
        fecAmount(0), fecAmount(tva), '', '',
        dt, fecAmount(tva), 'EUR',
      ].join('\t'))
    }

    ecNum++
  }

  return lines.join('\n')
}

export function downloadFEC(filename: string, factures: FactureForFEC[], pc?: PlanComptable) {
  const content = generateFEC(factures, pc)
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// --- PDF table export ---
export function downloadPDFTable(
  filename: string,
  title: string,
  headers: string[],
  rows: string[][],
  totals?: string[],
) {
  import('jspdf').then(({ default: jsPDF }) => {
    import('jspdf-autotable').then(({ default: autoTable }) => {
      const doc = new jsPDF({ orientation: rows[0]?.length > 6 ? 'landscape' : 'portrait' })
      wrapDocText(doc)
      const blue: [number, number, number] = [30, 64, 175]

      doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 30)
      doc.text(title, 14, 18)
      doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(120, 120, 120)
      doc.text(`Genere le ${new Date().toLocaleDateString('fr-FR')} — TAYCOBAT`, 14, 24)
      doc.setDrawColor(...blue); doc.setLineWidth(0.6); doc.line(14, 27, doc.internal.pageSize.width - 14, 27)

      const body = [...rows]
      if (totals) body.push(totals)

      autoTable(doc, {
        startY: 32,
        head: [headers],
        body,
        headStyles: { fillColor: blue, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 7.5 },
        alternateRowStyles: { fillColor: [239, 246, 255] },
        margin: { left: 14, right: 14 },
        didParseCell: (data) => {
          if (totals && data.section === 'body' && data.row.index === rows.length) {
            data.cell.styles.fontStyle = 'bold'
            data.cell.styles.fillColor = [240, 253, 244]
          }
        },
      })

      doc.setFontSize(6); doc.setTextColor(160, 160, 160)
      doc.text('TAYCOBAT — Rapport comptable', doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 8, { align: 'center' })
      doc.save(filename)
    })
  })
}
