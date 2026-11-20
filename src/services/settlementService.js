import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from './firebase'

// One batch: settlement + activity entry. Balances are computed, so no balance
// documents need updating (nothing can get out of sync).
export async function addSettlement(groupId, user, data) {
  const ref = doc(collection(db, 'groups', groupId, 'settlements'))
  const batch = writeBatch(db)

  batch.set(ref, {
    from: data.from,
    to: data.to,
    amountMinor: data.amountMinor,
    date: data.date,
    note: data.note ?? '',
    createdBy: user.uid,
    createdAt: serverTimestamp(),
  })

  batch.set(doc(collection(db, 'groups', groupId, 'activity')), {
    type: 'settlement_added',
    actorId: user.uid,
    targetId: ref.id,
    summary: data.summary ?? 'recorded a payment',
    createdAt: serverTimestamp(),
  })

  await batch.commit()
  return ref.id
}