import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../services/firebase";

export function useMembers(groupId) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!groupId) return;

   
    const q = query(collection(db, "groups", groupId, "members"), orderBy("joinedAt"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {

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

    return unsubscribe; 
  }, [groupId]);

  return { members, loading, error };
}