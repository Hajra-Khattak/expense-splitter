import { createContext, useEffect, useMemo, useState } from 'react'
import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { auth } from '../services/firebase'
import {
  createUserDocIfMissing,
  getUserProfile,
  updateUserDoc,
} from '../services/userService'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null) 
  const [loading, setLoading] = useState(true)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let active = true

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)

      if (!firebaseUser) {
        setProfile(null)
        return
      }

      // Page reload: load the saved profile. The doc is created in
      // signup/login below, so a null result here is simply ignored.
      try {
        const saved = await getUserProfile(firebaseUser.uid)
        if (active && saved) setProfile(saved)
      } catch (err) {
        console.error('Could not load profile', err)
      }
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  // Auth already succeeded at this point, so a Firestore problem must not
  // turn into a failed login. The doc is created on the next login instead.
  async function ensureProfile(firebaseUser, name) {
    try {
      setProfile(await createUserDocIfMissing(firebaseUser, name))
    } catch (err) {
      console.error('Could not create profile doc', err)
    }
  }

  async function signup(name, email, password) {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(cred.user, { displayName: name })
    await ensureProfile(cred.user, name)
    setVersion((v) => v + 1)
  }

  async function login(email, password, remember = true) {
    await setPersistence(
      auth,
      remember ? browserLocalPersistence : browserSessionPersistence
    )
    const cred = await signInWithEmailAndPassword(auth, email, password)
    await ensureProfile(cred.user, cred.user.displayName)
    return cred
  }

  async function loginWithGoogle() {
    const result = await signInWithPopup(auth, new GoogleAuthProvider())
    await ensureProfile(result.user, result.user.displayName)
    return result
  }

  function resetPassword(email) {
    return sendPasswordResetEmail(auth, email)
  }

  function logout() {
    return signOut(auth)
  }

  // Saves fields to users/{uid} and mirrors them in local state.
  async function updateProfileData(fields) {
    const current = auth.currentUser
    if (!current) return
    await updateUserDoc(current.uid, fields)
    setProfile((p) => ({ ...(p || {}), ...fields }))
  }

  // The name lives in two places (Auth displayName and the profile doc): keep both in sync.
  async function updateName(name) {
    const current = auth.currentUser
    if (!current) return
    await updateProfile(current, { displayName: name })
    await updateProfileData({ name })
    setVersion((v) => v + 1) // same trick as signup: the user object is mutated, not replaced
  }

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      signup,
      login,
      loginWithGoogle,
      resetPassword,
      logout,
      updateProfileData,
      updateName,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, profile, loading, version]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}