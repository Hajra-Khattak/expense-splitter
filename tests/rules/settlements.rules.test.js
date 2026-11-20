import { readFileSync } from 'node:fs'
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing'
import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore'
import { computeBalances } from '../../src/utils/balances.js'

const G = 'g1'
let env

// Own project id so clearFirestore() cannot wipe the data of the other rules test files
// (vitest runs test files in parallel).
beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-settlements-rules',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  })
})

afterAll(async () => {
  await env?.cleanup()
})

const as = (uid) => env.authenticatedContext(uid).firestore()
const anon = () => env.unauthenticatedContext().firestore()
const setRef = (db, id) => doc(db, 'groups', G, 'settlements', id)

// A full settlement document as the service writes it.
const newDoc = (uid, o = {}) => ({
  from: 'bob',
  to: 'alice',
  amountMinor: 1500,
  date: '2026-11-19',
  note: '',
  createdBy: uid,
  createdAt: serverTimestamp(),
  ...o,
})

beforeEach(async () => {
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'groups', G), {
      name: 'Trip',
      description: '',
      currency: 'USD',
      createdBy: 'alice',
      createdAt: Timestamp.now(),
      archived: false,
      inviteCode: 'ABCD2345',
      memberIds: ['alice', 'bob', 'dave'],
    })
    for (const [uid, role] of [
      ['alice', 'admin'],
      ['bob', 'member'],
      ['dave', 'member'],
    ]) {
      await setDoc(doc(db, 'groups', G, 'members', uid), {
        name: uid,
        role,
        joinedAt: Timestamp.now(),
      })
    }
    // alice paid 3000 for bob and dave: bob and dave each owe 1500
    await setDoc(doc(db, 'groups', G, 'expenses', 'e1'), {
      description: 'Dinner',
      amountMinor: 3000,
      category: 'food',
      date: '2026-11-18',
      paidBy: 'alice',
      participants: ['bob', 'dave'],
      splitType: 'equal',
      splits: { bob: 1500, dave: 1500 },
      note: '',
      deleted: false,
      createdBy: 'alice',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    })
    // an existing settlement to test update and delete against
    await setDoc(doc(db, 'groups', G, 'settlements', 's1'), {
      from: 'bob',
      to: 'alice',
      amountMinor: 100,
      date: '2026-11-18',
      note: '',
      createdBy: 'bob',
      createdAt: Timestamp.now(),
    })
  })
})

describe('read', () => {
  it('members can read settlements', async () => {
    await assertSucceeds(getDoc(setRef(as('dave'), 's1')))
  })
  it('outsiders cannot read', async () => {
    await assertFails(getDoc(setRef(as('carol'), 's1')))
  })
  it('signed-out people cannot read', async () => {
    await assertFails(getDoc(setRef(anon(), 's1')))
  })
})

describe('create', () => {
  it('the payer can record their own payment', async () => {
    await assertSucceeds(setDoc(setRef(as('bob'), 'n1'), newDoc('bob')))
  })
  it('the receiver can record it too', async () => {
    await assertSucceeds(setDoc(setRef(as('alice'), 'n2'), newDoc('alice')))
  })
  it('an admin can record a payment between two other people', async () => {
    await assertSucceeds(
      setDoc(setRef(as('alice'), 'n3'), newDoc('alice', { from: 'bob', to: 'dave' }))
    )
  })
  it('a normal member cannot record a payment between two other people', async () => {
    await assertFails(
      setDoc(setRef(as('dave'), 'n4'), newDoc('dave', { from: 'bob', to: 'alice' }))
    )
  })
  it('an outsider cannot record', async () => {
    await assertFails(setDoc(setRef(as('carol'), 'n5'), newDoc('carol')))
  })
  it('signed-out people cannot record', async () => {
    await assertFails(setDoc(setRef(anon(), 'n6'), newDoc('bob')))
  })
  it('cannot pretend someone else created it', async () => {
    await assertFails(setDoc(setRef(as('bob'), 'n7'), newDoc('alice')))
  })
  it('payer and receiver must be different', async () => {
    await assertFails(
      setDoc(setRef(as('bob'), 'n8'), newDoc('bob', { from: 'bob', to: 'bob' }))
    )
  })
  it('both people must be members', async () => {
    await assertFails(setDoc(setRef(as('bob'), 'n9'), newDoc('bob', { to: 'carol' })))
    await assertFails(setDoc(setRef(as('bob'), 'n10'), newDoc('bob', { from: 'carol', to: 'bob' })))
  })
  it('amount must be greater than 0', async () => {
    await assertFails(setDoc(setRef(as('bob'), 'n11'), newDoc('bob', { amountMinor: 0 })))
    await assertFails(setDoc(setRef(as('bob'), 'n12'), newDoc('bob', { amountMinor: -100 })))
  })
  it('amount must be an integer (no floats, no strings)', async () => {
    await assertFails(setDoc(setRef(as('bob'), 'n13'), newDoc('bob', { amountMinor: 12.5 })))
    await assertFails(setDoc(setRef(as('bob'), 'n14'), newDoc('bob', { amountMinor: '1500' })))
  })
  it('unknown extra fields are rejected', async () => {
    await assertFails(setDoc(setRef(as('bob'), 'n15'), { ...newDoc('bob'), hacked: true }))
  })
  it('is denied when the group is archived', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), 'groups', G), { archived: true })
    })
    await assertFails(setDoc(setRef(as('bob'), 'n16'), newDoc('bob')))
  })
})

describe('update and delete', () => {
  it('a settlement can never be edited, even by an admin', async () => {
    await assertFails(updateDoc(setRef(as('bob'), 's1'), { amountMinor: 1 }))
    await assertFails(updateDoc(setRef(as('alice'), 's1'), { amountMinor: 1 }))
  })
  it('a settlement can never be deleted, even by an admin', async () => {
    await assertFails(deleteDoc(setRef(as('bob'), 's1')))
    await assertFails(deleteDoc(setRef(as('alice'), 's1')))
  })
})

describe('concurrency (no lost update)', () => {
  // Balances are computed, never stored, so two payments at the same time cannot
  // overwrite each other. Both survive and the final balances are correct.
  const addWithActivity = (db, uid, id, o) => {
    const batch = writeBatch(db)
    batch.set(setRef(db, id), newDoc(uid, o))
    batch.set(doc(collection(db, 'groups', G, 'activity')), {
      type: 'settlement_added',
      actorId: uid,
      targetId: id,
      summary: `recorded ${id}`,
      createdAt: serverTimestamp(),
    })
    return batch.commit()
  }

  it('two simultaneous payments both persist and everyone ends at 0', async () => {
    await assertSucceeds(
      Promise.all([
        addWithActivity(as('bob'), 'bob', 'x1', { from: 'bob', to: 'alice', amountMinor: 1400 }),
        addWithActivity(as('dave'), 'dave', 'x2', { from: 'dave', to: 'alice', amountMinor: 1500 }),
      ])
    )

    let expenses = []
    let settlements = []
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore()
      expenses = (await getDocs(collection(db, 'groups', G, 'expenses'))).docs.map((d) => d.data())
      settlements = (await getDocs(collection(db, 'groups', G, 'settlements'))).docs.map((d) => d.data())
    })

    expect(settlements).toHaveLength(3) // s1 + x1 + x2, nothing lost
    const net = computeBalances(expenses, settlements)
    // alice is owed 3000, receives 100 + 1400 + 1500 = 3000, bob and dave end at 0
    expect(net).toEqual({ alice: 0, bob: 0, dave: 0 })
  })
})