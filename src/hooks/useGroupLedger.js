import { useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../services/firebase' 


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