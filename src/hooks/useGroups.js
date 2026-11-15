import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "../services/firebase";
import { useAuth } from "./useAuth";

export function useGroups() {
  const { user } = useAuth();
  const uid = user?.uid; // depend on the string, not the user object
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!uid) return; // ProtectedRoute guarantees a user on the dashboard

    // Needs the composite index: memberIds (array-contains) + createdAt (desc)
    const q = query(
      collection(db, "groups"),
      where("memberIds", "array-contains", uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setGroups(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        setError(null);
        setLoading(false);
      },
      (err) => {
        // failed-precondition = missing index; the message contains the link to create it
        console.error(err.code, err.message);
        setError(err);
        setLoading(false);
      }
    );

    return unsubscribe; // stop listening on unmount or when uid changes
  }, [uid]);

  return { groups, loading, error };
}