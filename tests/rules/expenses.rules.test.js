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
import { netFromExpenses } from '../../src/utils/splits.js'

const G = 'g1'
let env

// Own project id so clearFirestore() here cannot wipe the data of your other rules test file
// (vitest runs test files in parallel).
beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-expenses-rules',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  })
})

afterAll(async () => {
  await env?.cleanup()
})

const as = (uid) => env.authenticatedContext(uid).firestore()
const anon = () => env.unauthenticatedContext().firestore()
const expRef = (db, id) => doc(db, 'groups', G, 'expenses', id)

// The user-editable part of an expense.
const content = (o = {}) => ({
  description: 'Dinner',
  amountMinor: 3000,
  category: 'food',
  date: '2026-11-19',
  paidBy: 'bob',
  participants: ['alice', 'bob', 'dave'],
  splitType: 'equal',
  splits: { alice: 1000, bob: 1000, dave: 1000 },
  note: '',
  ...o,
})

// A full new expense document as the service writes it.
const newDoc = (uid, o = {}) => ({
  ...content(o),
  deleted: false,
  createdBy: uid,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
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
    // e1: created by bob
    await setDoc(doc(db, 'groups', G, 'expenses', 'e1'), {
      ...content(),
      deleted: false,
      createdBy: 'bob',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    })
  })
})

describe('read', () => {
  it('members can read expenses', async () => {
    await assertSucceeds(getDoc(expRef(as('dave'), 'e1')))
  })
  it('outsiders cannot read', async () => {
    await assertFails(getDoc(expRef(as('carol'), 'e1')))
  })
  it('signed-out people cannot read', async () => {
    await assertFails(getDoc(expRef(anon(), 'e1')))
  })
})

describe('create', () => {
  it('a member can add a valid expense', async () => {
    await assertSucceeds(setDoc(expRef(as('bob'), 'n1'), newDoc('bob')))
  })
  it('a member can add an expense paid by another member', async () => {
    await assertSucceeds(setDoc(expRef(as('bob'), 'n2'), newDoc('bob', { paidBy: 'dave' })))
  })
  it('an outsider cannot add', async () => {
    await assertFails(setDoc(expRef(as('carol'), 'n3'), newDoc('carol')))
  })
  it('signed-out people cannot add', async () => {
    await assertFails(setDoc(expRef(anon(), 'n4'), newDoc('bob')))
  })
  it('cannot pretend someone else created it', async () => {
    await assertFails(setDoc(expRef(as('bob'), 'n5'), newDoc('alice')))
  })
  it('amount must be greater than 0', async () => {
    await assertFails(setDoc(expRef(as('bob'), 'n6'), newDoc('bob', { amountMinor: 0 })))
    await assertFails(setDoc(expRef(as('bob'), 'n7'), newDoc('bob', { amountMinor: -500 })))
  })
  it('amount must be an integer (no floats, no strings)', async () => {
    await assertFails(setDoc(expRef(as('bob'), 'n8'), newDoc('bob', { amountMinor: 12.5 })))
    await assertFails(setDoc(expRef(as('bob'), 'n9'), newDoc('bob', { amountMinor: '3000' })))
  })
  it('payer must be a member', async () => {
    await assertFails(setDoc(expRef(as('bob'), 'n10'), newDoc('bob', { paidBy: 'carol' })))
  })
  it('participants must all be members', async () => {
    await assertFails(
      setDoc(
        expRef(as('bob'), 'n11'),
        newDoc('bob', {
          participants: ['bob', 'carol'],
          splits: { bob: 1500, carol: 1500 },
        })
      )
    )
  })
  it('splits must have exactly the participants as keys', async () => {
    await assertFails(
      setDoc(expRef(as('bob'), 'n12'), newDoc('bob', { splits: { alice: 1500, bob: 1500 } }))
    )
  })
  it('category and splitType must be allowed values', async () => {
    await assertFails(setDoc(expRef(as('bob'), 'n13'), newDoc('bob', { category: 'gambling' })))
    await assertFails(setDoc(expRef(as('bob'), 'n14'), newDoc('bob', { splitType: 'weird' })))
  })
  it('empty description is rejected', async () => {
    await assertFails(setDoc(expRef(as('bob'), 'n15'), newDoc('bob', { description: '' })))
  })
  it('unknown extra fields are rejected', async () => {
    await assertFails(setDoc(expRef(as('bob'), 'n16'), { ...newDoc('bob'), hacked: true }))
  })
  it('cannot be created already deleted', async () => {
    await assertFails(setDoc(expRef(as('bob'), 'n17'), { ...newDoc('bob'), deleted: true }))
  })
  it('is denied when the group is archived', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), 'groups', G), { archived: true })
    })
    await assertFails(setDoc(expRef(as('bob'), 'n18'), newDoc('bob')))
  })
})

describe('edit', () => {
  const edit = (o = {}) => ({ ...content(o), updatedAt: serverTimestamp() })

  it('the creator can edit', async () => {
    await assertSucceeds(
      updateDoc(
        expRef(as('bob'), 'e1'),
        edit({ amountMinor: 6000, splits: { alice: 2000, bob: 2000, dave: 2000 } })
      )
    )
  })
  it('an admin can edit someone else\'s expense', async () => {
    await assertSucceeds(updateDoc(expRef(as('alice'), 'e1'), edit({ description: 'Fixed' })))
  })
  it('another normal member cannot edit', async () => {
    await assertFails(updateDoc(expRef(as('dave'), 'e1'), edit({ description: 'Nope' })))
  })
  it('an outsider cannot edit', async () => {
    await assertFails(updateDoc(expRef(as('carol'), 'e1'), edit()))
  })
  it('cannot change who created it', async () => {
    await assertFails(
      updateDoc(expRef(as('bob'), 'e1'), { ...edit(), createdBy: 'dave' })
    )
  })
  it('an edit must still be valid', async () => {
    await assertFails(updateDoc(expRef(as('bob'), 'e1'), edit({ amountMinor: 0 })))
    await assertFails(updateDoc(expRef(as('bob'), 'e1'), edit({ paidBy: 'carol' })))
  })
  it('cannot sneak in deleted: true through a normal edit', async () => {
    await assertFails(updateDoc(expRef(as('bob'), 'e1'), { ...edit(), deleted: true }))
  })
  it('is denied when the group is archived', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), 'groups', G), { archived: true })
    })
    await assertFails(updateDoc(expRef(as('bob'), 'e1'), edit({ description: 'Late' })))
  })
})

describe('soft delete', () => {
  const del = (uid, o = {}) => ({
    deleted: true,
    deletedBy: uid,
    updatedAt: serverTimestamp(),
    ...o,
  })

  it('the creator can soft delete', async () => {
    await assertSucceeds(updateDoc(expRef(as('bob'), 'e1'), del('bob')))
  })
  it('an admin can soft delete', async () => {
    await assertSucceeds(updateDoc(expRef(as('alice'), 'e1'), del('alice')))
  })
  it('another normal member cannot', async () => {
    await assertFails(updateDoc(expRef(as('dave'), 'e1'), del('dave')))
  })
  it('deletedBy must be yourself', async () => {
    await assertFails(updateDoc(expRef(as('bob'), 'e1'), del('alice')))
  })
  it('a delete cannot change other fields', async () => {
    await assertFails(updateDoc(expRef(as('bob'), 'e1'), del('bob', { amountMinor: 1 })))
  })
  it('hard delete is never allowed', async () => {
    await assertFails(deleteDoc(expRef(as('alice'), 'e1')))
    await assertFails(deleteDoc(expRef(as('bob'), 'e1')))
  })
  it('a deleted expense cannot be edited or restored', async () => {
    await assertSucceeds(updateDoc(expRef(as('bob'), 'e1'), del('bob')))
    await assertFails(
      updateDoc(expRef(as('bob'), 'e1'), { ...content(), updatedAt: serverTimestamp() })
    )
    await assertFails(
      updateDoc(expRef(as('alice'), 'e1'), { deleted: false, updatedAt: serverTimestamp() })
    )
  })
})

describe('concurrency (no lost update)', () => {
  // Balances are computed from expenses, never stored, so two writers cannot overwrite
  // each other's balance. This test proves both writes survive and the totals are right.
  const addWithActivity = (db, uid, id, o) => {
    const batch = writeBatch(db)
    batch.set(expRef(db, id), newDoc(uid, o))
    batch.set(doc(collection(db, 'groups', G, 'activity')), {
      type: 'expense_added',
      actorId: uid,
      targetId: id,
      summary: `added ${id}`,
      createdAt: serverTimestamp(),
    })
    return batch.commit()
  }

  it('two simultaneous adds both persist and balances are correct', async () => {
    await assertSucceeds(
      Promise.all([
        addWithActivity(as('bob'), 'bob', 'x1', { paidBy: 'bob' }),
        addWithActivity(as('dave'), 'dave', 'x2', { paidBy: 'dave' }),
      ])
    )

    let rows = []
    await env.withSecurityRulesDisabled(async (ctx) => {
      const snap = await getDocs(collection(ctx.firestore(), 'groups', G, 'expenses'))
      rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    })

    expect(rows).toHaveLength(3) // e1 + x1 + x2, nothing lost
    const net = netFromExpenses(rows)
    expect(net).toEqual({ alice: -3000, bob: 3000, dave: 0 })
    expect(Object.values(net).reduce((s, v) => s + v, 0)).toBe(0)
  })
})