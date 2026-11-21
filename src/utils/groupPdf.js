import { currencyDigits } from './minorUnits'

// Standard PDF fonts have no Urdu or other non-Latin letters. Such names print as
// garbled text. Embedding a font is a later step.
export async function downloadMemberPdf({  group, me, nameOf, net, suggestions, expenses, settlements = [] }) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])

  const digits = currencyDigits(group.currency)
  const money = (minor) =>
    `${group.currency} ${(minor / 10 ** digits).toLocaleString('en', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    })}`

  const myNet = net[me.id] ?? 0
  const pay = suggestions.filter((p) => p.from === me.id)
  const receive = suggestions.filter((p) => p.to === me.id)
  const mine = expenses
    .filter((e) => !e.deleted && e.splits?.[me.id] !== undefined)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))

    const myPayments = settlements
        .filter((s) => s.from === me.id || s.to === me.id)
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  const doc = new jsPDF()
  doc.setFontSize(18)
  doc.text(group.name, 14, 18)
  doc.setFontSize(11)
  doc.text(`Statement for ${me.name}`, 14, 26)
  doc.text(`Created ${new Date().toLocaleDateString('en-GB')}`, 14, 32)

  const status =
    myNet > 0 ? `You are owed ${money(myNet)}` : myNet < 0 ? `You owe ${money(-myNet)}` : 'You are settled up'
  doc.setFontSize(13)
  doc.text(status, 14, 42)

  const tableY = () => (doc.lastAutoTable?.finalY ?? 42) + 10

  if (pay.length > 0) {
    autoTable(doc, {
      startY: 48,
      head: [['You pay', 'Amount']],
      body: pay.map((p) => [nameOf(p.to), money(p.amountMinor)]),
      headStyles: { fillColor: [225, 29, 72] },
    })
  }
  if (receive.length > 0) {
    autoTable(doc, {
      startY: pay.length > 0 ? tableY() : 48,
      head: [['Pays you', 'Amount']],
      body: receive.map((p) => [nameOf(p.from), money(p.amountMinor)]),
      headStyles: { fillColor: [5, 150, 105] },
    })
  }
  if (pay.length === 0 && receive.length === 0) {
    doc.setFontSize(11)
    doc.text('Nothing to pay and nothing to receive.', 14, 52)
  }

  if (myPayments.length > 0) {
  autoTable(doc, {
    startY: tableY(),
    head: [['Date', 'Paid by', 'Paid to', 'Amount', 'Note']],
    body: myPayments.map((s) => [s.date, nameOf(s.from), nameOf(s.to), money(s.amountMinor), s.note ?? '']),
    headStyles: { fillColor: [14, 116, 144] },
    styles: { fontSize: 9 },
  })
}

  if (mine.length > 0) {
    autoTable(doc, {
      startY: tableY(),
      head: [['Date', 'Expense', 'Paid by', 'Total', 'Your share']],
      body: mine.map((e) => [
        e.date,
        e.description,
        nameOf(e.paidBy),
        money(e.amountMinor),
        money(e.splits[me.id]),
      ]),
      headStyles: { fillColor: [100, 116, 139] },
      styles: { fontSize: 9 },
    })
  }

  const safe = group.name.replace(/[^\w-]+/g, '_')
  doc.save(`${safe}-${me.name.replace(/[^\w-]+/g, '_')}.pdf`)
}