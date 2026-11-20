import { useEffect, useState } from 'react'
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../services/firebase'

// Latest activity of ONE group, newest first, in real time.
// limit() protects the free read quota. One orderBy needs no composite index.
export function useActivity(groupId, max = 50) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!groupId) return undefined
    setLoading(true)
    setError(null)

    const q = query(
      collection(db, 'groups', groupId, 'activity'),
      orderBy('createdAt', 'desc'),
      limit(max)
    )
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setItems(
          // 'estimate' avoids a null createdAt while the server time is pending
          snap.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }))
        )
        setLoading(false)
      },
      (err) => {
        console.error('load activity failed', err.code, err.message)
        setError(err)
        setLoading(false)
      }
    )
    return unsubscribe
  }, [groupId, max])

  return { items, loading, error }
}