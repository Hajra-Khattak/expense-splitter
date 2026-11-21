import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'

let env

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'personal-activity-rules', // its own id, so clearFirestore() cannot wipe other files
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  })
})

afterAll(async () => {
  await env.cleanup()
})

// A group with alice (admin) and bob (member). carol is an outsider.
beforeEach(async () => {
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'groups/g1'), {
      name: 'Test group',
      description: '',
      currency: 'PKR',
      createdBy: 'alice',
      archived: false,
      inviteCode: 'ABCD1234',
      memberIds: ['alice', 'bob'],
    })
    await setDoc(doc(db, 'groups/g1/members/alice'), { name: 'Alice', role: 'admin' })
    await setDoc(doc(db, 'groups/g1/members/bob'), { name: 'Bob', role: 'member' })
  })
})

const as = (uid) => env.authenticatedContext(uid).firestore()
const signedOut = () => env.unauthenticatedContext().firestore()

// ---------------------------------------------------------------- personal expenses
const personal = (extra = {}) => ({
  description: 'Taxi to airport',
  amountMinor: 150000,
  category: 'travel',
  date: '2026-11-19',
  currency: 'PKR',
  note: '',
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...extra,
})
const personalRef = (db, uid = 'alice', id = 'e1') => doc(db, `users/${uid}/expenses/${id}`)

describe('personal expenses', () => {
  it('the owner can create, read, edit and delete', async () => {
    const db = as('alice')
    await assertSucceeds(setDoc(personalRef(db), personal()))
    await assertSucceeds(getDoc(personalRef(db)))
    await assertSucceeds(updateDoc(personalRef(db), { description: 'Taxi 2', updatedAt: serverTimestamp() }))
    await assertSucceeds(deleteDoc(personalRef(db)))
  })

  it('another signed-in user cannot read or write them', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(personalRef(ctx.firestore()), { ...personal(), createdAt: new Date(), updatedAt: new Date() })
    })
    const bob = as('bob')
    await assertFails(getDoc(personalRef(bob)))
    await assertFails(setDoc(personalRef(bob, 'alice', 'e2'), personal()))
    await assertFails(deleteDoc(personalRef(bob)))
  })

  it('a signed-out user cannot read them', async () => {
    await assertFails(getDoc(personalRef(signedOut())))
  })

  it('denies an amount that is 0, negative, a decimal or text', async () => {
    const db = as('alice')
    for (const amountMinor of [0, -5, 12.5, '100']) {
      await assertFails(setDoc(personalRef(db), personal({ amountMinor })))
    }
  })

  it('denies an unknown category or currency', async () => {
    const db = as('alice')
    await assertFails(setDoc(personalRef(db), personal({ category: 'gambling' })))
    await assertFails(setDoc(personalRef(db), personal({ currency: 'XYZ' })))
  })

  it('denies an extra key', async () => {
    await assertFails(setDoc(personalRef(as('alice')), personal({ hacked: true })))
  })

  it('denies a createdAt that is not the server time', async () => {
    await assertFails(setDoc(personalRef(as('alice')), personal({ createdAt: new Date() })))
  })
})

// ---------------------------------------------------------------- activity
const activity = (extra = {}) => ({
  type: 'expense_added',
  actorId: 'bob',
  targetId: 'x1',
  summary: 'added "Lunch"',
  createdAt: serverTimestamp(),
  ...extra,
})
const activityRef = (db, id = 'a1') => doc(db, `groups/g1/activity/${id}`)

describe('activity', () => {
  it('a member can create an entry as themselves', async () => {
    await assertSucceeds(setDoc(activityRef(as('bob')), activity()))
  })

  it("denies an entry with someone else's actorId", async () => {
    await assertFails(setDoc(activityRef(as('bob')), activity({ actorId: 'alice' })))
  })

  it('denies an extra key', async () => {
    await assertFails(setDoc(activityRef(as('bob')), activity({ hacked: true })))
  })

  it('denies a made-up type', async () => {
    await assertFails(setDoc(activityRef(as('bob')), activity({ type: 'free_money' })))
  })

  it('denies a createdAt that is not the server time', async () => {
    await assertFails(setDoc(activityRef(as('bob')), activity({ createdAt: new Date() })))
  })

  it('denies an outsider', async () => {
    await assertFails(setDoc(activityRef(as('carol')), activity({ actorId: 'carol' })))
  })

  it('denies an entry without a summary', async () => {
    const { summary, ...noSummary } = activity()
    await assertFails(setDoc(activityRef(as('bob')), noSummary))
  })

  it('nobody can update or delete an entry', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(activityRef(ctx.firestore()), { ...activity(), createdAt: new Date() })
    })
    await assertFails(updateDoc(activityRef(as('bob')), { summary: 'changed' }))
    await assertFails(deleteDoc(activityRef(as('alice'))))
  })
})