import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from './firebase' // adjust if your firebase.js exports db under another name

// Only these fields are ever sent, so a stray key can never reach Firestore
// (the rules use hasOnly and would deny it anyway).
const FIELDS = [
  'description',
  'amountMinor',
  'category',
  'date',
  'paidBy',
  'participants',
  'splitType',
  'splits',
  'note',
]

function pickFields(data) {
  const out = {}
  for (const key of FIELDS) out[key] = data[key]
  out.note = data.note ?? ''
  return out
}

function activityRef(groupId) {
  return doc(collection(db, 'groups', groupId, 'activity'))
}

// Adjust "summary" if your existing activity entries use a different wording style.
function activityEntry(type, user, expenseId, summary) {
  return {
    type,
    actorId: user.uid,
    targetId: expenseId,
    summary,
    createdAt: serverTimestamp(),
  }
}

// One batch: expense + activity. Balances are NOT stored, so nothing else to update.
export async function addExpense(groupId, user, data) {
  const ref = doc(collection(db, 'groups', groupId, 'expenses'))
  const batch = writeBatch(db)

  batch.set(ref, {
    ...pickFields(data),
    deleted: false,
    createdBy: user.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  batch.set(
    activityRef(groupId),
    activityEntry('expense_added', user, ref.id, `added "${data.description}"`)
  )

  await batch.commit()
  return ref.id
}

// One batch: update the expense + activity.
export async function editExpense(groupId, user, expenseId, data) {
  const ref = doc(db, 'groups', groupId, 'expenses', expenseId)
  const batch = writeBatch(db)

  batch.update(ref, { ...pickFields(data), updatedAt: serverTimestamp() })
  batch.set(
    activityRef(groupId),
    activityEntry('expense_edited', user, expenseId, `edited "${data.description}"`)
  )

  await batch.commit()
}

// Soft delete: the document stays, balances ignore it.
export async function deleteExpense(groupId, user, expense) {
  const ref = doc(db, 'groups', groupId, 'expenses', expense.id)
  const batch = writeBatch(db)

  batch.update(ref, { deleted: true, deletedBy: user.uid, updatedAt: serverTimestamp() })
  batch.set(
    activityRef(groupId),
    activityEntry('expense_deleted', user, expense.id, `deleted "${expense.description}"`)
  )

  await batch.commit()
}