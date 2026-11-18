import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../services/firebase";

export function useMembers(groupId) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!groupId) return;

    // One orderBy on a single field: no composite index needed
    const q = query(collection(db, "groups", groupId, "members"), orderBy("joinedAt"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        // the doc id is the member's uid
        setMembers(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        setError(null);
        setLoading(false);
      },
      (err) => {
        console.error(err.code, err.message);
        setError(err);
        setLoading(false);
      }
    );

    return unsubscribe; // stop listening on unmount or when groupId changes
  }, [groupId]);

  return { members, loading, error };
}