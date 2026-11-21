import { parseCsv } from './csv'

export const MAX_SHEET_BYTES = 2 * 1024 * 1024


export async function readSpreadsheetRows(file) {
  if (file.size > MAX_SHEET_BYTES) throw new Error('File is too large (maximum 2 MB).')
  const name = file.name.toLowerCase()

  if (name.endsWith('.csv')) return parseCsv(await file.text())

  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const XLSX = await import('xlsx') // loaded only now, so it stays out of the main bundle
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    if (!sheet) throw new Error('The file has no sheets.')
    const rows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: false,
      defval: '',
      dateNF: 'yyyy-mm-dd',
    })
    return rows
      .map((r) => r.map((c) => String(c ?? '')))
      .filter((r) => r.some((c) => c.trim() !== ''))
  }

  throw new Error('Use a .csv, .xls or .xlsx file.')
}


export async function downloadGroupTemplate(members) {
  const XLSX = await import('xlsx')
  const first = members[0]?.name ?? 'Name'
  const second = members[1]?.name ?? first

  const ws = XLSX.utils.aoa_to_sheet([
    ['Date', 'Description', 'Amount', 'Category', 'Paid by', 'Split between', 'Note'],
    ['2026-11-19', 'Hostel food', 20000, 'Food', first, 'all', ''],
    ['2026-11-20', 'Taxi', 1500, 'Travel', second, `${first};${second}`, ''],
  ])
  ws['!cols'] = [{ wch: 14 }, { wch: 24 }, { wch: 12 }, { wch: 16 }, { wch: 20 }, { wch: 30 }, { wch: 24 }]

  const names = XLSX.utils.aoa_to_sheet([['Member names (use exactly)'], ...members.map((m) => [m.name])])
  names['!cols'] = [{ wch: 30 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Expenses') // the importer reads the FIRST sheet only
  XLSX.utils.book_append_sheet(wb, names, 'Members')
  XLSX.writeFile(wb, 'group-expenses-template.xlsx')
}