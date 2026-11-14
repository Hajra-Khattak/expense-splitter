import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from './firebase'

const userRef = (uid) => doc(db, 'users', uid)

function readLocalTheme() {
  try {
    const saved = localStorage.getItem('theme')
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // storage can be blocked
  }
  return 'light'
}

// Returns the profile data, or null if the document does not exist.
export async function getUserProfile(uid) {
  const snap = await getDoc(userRef(uid))
  return snap.exists() ? snap.data() : null
}

// Creates users/{uid} only if it is missing, and never overwrites an existing one
// (so a later login does not reset the person's currency or theme).
// `name` is passed in because firebaseUser.displayName can still be null
// right after email signup, before updateProfile has finished.
export async function createUserDocIfMissing(firebaseUser, name) {
  const existing = await getUserProfile(firebaseUser.uid)
  if (existing) return existing

  const email = firebaseUser.email ?? ''
  const data = {
    name: (name || firebaseUser.displayName || email.split('@')[0] || '').trim(),
    email,
    photoURL: firebaseUser.photoURL ?? '',
    currency: 'PKR',
    theme: readLocalTheme(),
  }

  await setDoc(userRef(firebaseUser.uid), { ...data, createdAt: serverTimestamp() })
  return data
}

// Merges fields into users/{uid} (creates it if it is somehow missing).
export function updateUserDoc(uid, fields) {
  return setDoc(userRef(uid), fields, { merge: true })
}