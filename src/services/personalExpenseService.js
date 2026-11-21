import {
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { db } from './firebase'

const FIELDS = ['description', 'amountMinor', 'category', 'date', 'currency', 'note']


function pickFields(data) {
  const out = {}
  for (const key of FIELDS) out[key] = data[key]
  out.note = data.note ?? ''
  return out
}

export async function addPersonalExpense(uid, data) {
  const ref = doc(collection(db, 'users', uid, 'expenses'))
  await setDoc(ref, {
    ...pickFields(data),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function editPersonalExpense(uid, expenseId, data) {
  await updateDoc(doc(db, 'users', uid, 'expenses', expenseId), {
    ...pickFields(data),
    updatedAt: serverTimestamp(),
  })
}

export async function deletePersonalExpense(uid, expenseId) {
  await deleteDoc(doc(db, 'users', uid, 'expenses', expenseId))
}


export async function importPersonalExpenses(uid, rows) {
  if (rows.length === 0 || rows.length > 500) throw new Error('Import 1 to 500 rows at a time')
  const batch = writeBatch(db)
  for (const data of rows) {
    batch.set(doc(collection(db, 'users', uid, 'expenses')), {
      ...pickFields(data),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  }
  await batch.commit()
}