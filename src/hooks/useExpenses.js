import { useCallback, useEffect, useRef, useState } from 'react'
import { collection, getDocs, limit, orderBy, query, startAfter } from 'firebase/firestore'
import { db } from '../services/firebase' // adjust if your export name differs

const PAGE_SIZE = 20

// Pages of expenses, newest date first. Uses getDocs (not onSnapshot), so call
// refresh() after you add, edit or delete. A single orderBy needs no composite index.
// Soft-deleted expenses are hidden here; hasMore is based on the raw page size.
export function useExpenses(groupId) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [hasMore, setHasMore] = useState(false)

  const lastDoc = useRef(null)
  const requestId = useRef(0) // ignores answers from an older request

  const load = useCallback(
    async (more = false) => {
      const id = ++requestId.current
      if (more) setLoadingMore(true)
      else setLoading(true)
      setError(null)

      try {
        const constraints = [orderBy('date', 'desc')]
        if (more && lastDoc.current) constraints.push(startAfter(lastDoc.current))
        constraints.push(limit(PAGE_SIZE))

        const snap = await getDocs(
          query(collection(db, 'groups', groupId, 'expenses'), ...constraints)
        )
        if (id !== requestId.current) return

        const page = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        if (snap.docs.length > 0) lastDoc.current = snap.docs[snap.docs.length - 1]
        setHasMore(snap.docs.length === PAGE_SIZE)
        setRows((prev) => (more ? [...prev, ...page] : page))
      } catch (err) {
        if (id === requestId.current) setError(err)
      } finally {
        if (id === requestId.current) {
          setLoading(false)
          setLoadingMore(false)
        }
      }
    },
    [groupId]
  )

  useEffect(() => {
    lastDoc.current = null
    load(false)
  }, [load])

  const refresh = useCallback(() => {
    lastDoc.current = null
    return load(false)
  }, [load])

  const loadMore = useCallback(() => load(true), [load])

  return {
    expenses: rows.filter((e) => !e.deleted),
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    refresh,
  }
}