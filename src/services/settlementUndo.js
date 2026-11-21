import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from './firebase'

const today = () => new Date().toLocaleDateString('en-CA') 


export async function reverseSettlement(groupId, user, settlement) {
  const ref = doc(collection(db, 'groups', groupId, 'settlements'))
  const batch = writeBatch(db)

  batch.set(ref, {
    from: settlement.to,
    to: settlement.from,
    amountMinor: settlement.amountMinor,
    date: today(),
    note: `Reversal of payment ${settlement.id}`,
    createdBy: user.uid,
    createdAt: serverTimestamp(),
  })

  batch.set(doc(collection(db, 'groups', groupId, 'activity')), {
    type: 'settlement_added',
    actorId: user.uid,
    targetId: ref.id,
    summary: 'reversed a payment',
    createdAt: serverTimestamp(),
  })

  await batch.commit()
  return ref.id
}