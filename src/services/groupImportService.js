import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from './firebase'

const FIELDS = [
  'description', 'amountMinor', 'category', 'date', 'paidBy',
  'participants', 'splitType', 'splits', 'note',
]

// One batch: all the expenses + ONE activity entry. All or nothing.
export async function importGroupExpenses(groupId, user, rows) {
  if (rows.length === 0 || rows.length > 200) throw new Error('Import 1 to 200 rows at a time')
  const batch = writeBatch(db)

  for (const data of rows) {
    const expense = {}
    for (const key of FIELDS) expense[key] = data[key]
    batch.set(doc(collection(db, 'groups', groupId, 'expenses')), {
      ...expense,
      deleted: false,
      createdBy: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  }

  batch.set(doc(collection(db, 'groups', groupId, 'activity')), {
    type: 'expense_added',
    actorId: user.uid,
    summary: `imported ${rows.length} expenses`,
    createdAt: serverTimestamp(),
  })

  await batch.commit()
}