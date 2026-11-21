import { useEffect, useState } from 'react'
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../services/firebase'


export function usePersonalExpenses(uid, max = 200) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!uid) return undefined
    setLoading(true)
    setError(null)

    const q = query(collection(db, 'users', uid, 'expenses'), orderBy('date', 'desc'), limit(max))
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) })))
        setLoading(false)
      },
      (err) => {
        console.error('load personal expenses failed', err.code, err.message)
        setError(err)
        setLoading(false)
      }
    )
    return unsubscribe
  }, [uid, max])

  return { items, loading, error }
}