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

export function generateFEC(factures: FactureForFEC[]): string {
  const lines: string[] = [FEC_HEADERS.join('\t')]
  let ecNum = 1

  for (const f of factures) {
    const dt = fecDate(f.date_emission || '')
    const tva = Math.round((f.montant_ttc - f.montant_ht) * 100) / 100
    const clientNum = f.client_id ? `411${f.client_id.substring(0, 6).toUpperCase()}` : '411000'
    const num = String(ecNum).padStart(6, '0')

    // Client debit line (411)
    lines.push([
      'VE', 'Journal des ventes', num, dt,
      clientNum, f.client_display || 'Client', clientNum, f.client_display || 'Client',
      f.numero, dt, `Facture ${f.numero}`,
      fecAmount(f.montant_ttc), fecAmount(0), '', '',
      dt, fecAmount(f.montant_ttc), 'EUR',
    ].join('\t'))

    // Revenue credit line (706)
    lines.push([
      'VE', 'Journal des ventes', num, dt,
      '706000', 'Prestations de services', '', '',
      f.numero, dt, `Facture ${f.numero}`,
      fecAmount(0), fecAmount(f.montant_ht), '', '',
      dt, fecAmount(f.montant_ht), 'EUR',
    ].join('\t'))

    // TVA credit line (44571)
    if (tva > 0) {
      const tvaCompte = f.tva_pct === 5.5 ? '445711' : f.tva_pct === 10 ? '445712' : '445713'
      lines.push([
        'VE', 'Journal des ventes', num, dt,
        tvaCompte, `TVA collectee ${f.tva_pct}%`, '', '',
        f.numero, dt, `TVA facture ${f.numero}`,
        fecAmount(0), fecAmount(tva), '', '',
        dt, fecAmount(tva), 'EUR',
      ].join('\t'))
    }

    ecNum++
  }

  return lines.join('\n')
}

export function downloadFEC(filename: string, factures: FactureForFEC[]) {
  const content = generateFEC(factures)
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
      const green: [number, number, number] = [26, 158, 82]

      doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 30)
      doc.text(title, 14, 18)
      doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(120, 120, 120)
      doc.text(`Genere le ${new Date().toLocaleDateString('fr-FR')} — TAYCOBAT`, 14, 24)
      doc.setDrawColor(...green); doc.setLineWidth(0.6); doc.line(14, 27, doc.internal.pageSize.width - 14, 27)

      const body = [...rows]
      if (totals) body.push(totals)

      autoTable(doc, {
        startY: 32,
        head: [headers],
        body,
        headStyles: { fillColor: green, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 7.5 },
        alternateRowStyles: { fillColor: [245, 250, 247] },
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
