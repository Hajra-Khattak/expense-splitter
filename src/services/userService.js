import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from './firebase'

const userRef = (uid) => doc(db, 'users', uid)

function readLocalTheme() {
  try {
    const saved = localStorage.getItem('theme')
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
   
  }
  return 'light'
}


export async function getUserProfile(uid) {
  const snap = await getDoc(userRef(uid))
  return snap.exists() ? snap.data() : null
}


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


export function updateUserDoc(uid, fields) {
  return setDoc(userRef(uid), fields, { merge: true })
}