import { useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../services/firebase' // same import path as useExpenses.js

// ALL expenses and settlements of one group, in real time. Balances need the full
// history, so there is no pagination here. Use this hook only on the Balances and
// Settle Up tabs (one read per document each time the tab opens) to protect the
// free read quota.
export function useGroupLedger(groupId) {
  const [expenses, setExpenses] = useState([])
  const [settlements, setSettlements] = useState([])
  const [expensesLoaded, setExpensesLoaded] = useState(false)
  const [settlementsLoaded, setSettlementsLoaded] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    setExpensesLoaded(false)
    setSettlementsLoaded(false)
    setError(null)

    const unsubExpenses = onSnapshot(
      collection(db, 'groups', groupId, 'expenses'),
      (snap) => {
        setExpenses(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
        setExpensesLoaded(true)
      },
      (err) => setError(err)
    )
    const unsubSettlements = onSnapshot(
      collection(db, 'groups', groupId, 'settlements'),
      (snap) => {
        setSettlements(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
        setSettlementsLoaded(true)
      },
      (err) => setError(err)
    )

    return () => {
      unsubExpenses()
      unsubSettlements()
    }
  }, [groupId])

  return {
    expenses: expenses.filter((e) => !e.deleted),
    settlements,
    loading: !error && !(expensesLoaded && settlementsLoaded),
    error,
  }
}