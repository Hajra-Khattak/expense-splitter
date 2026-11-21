import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "../services/firebase";
import { useAuth } from "./useAuth";

export function useGroups() {
  const { user } = useAuth();
  const uid = user?.uid; 
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!uid) return; 


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
        
        console.error(err.code, err.message);
        setError(err);
        setLoading(false);
      }
    );

    return unsubscribe; 
  }, [uid]);

  return { groups, loading, error };
}