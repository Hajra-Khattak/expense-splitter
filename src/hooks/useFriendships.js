import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../services/firebase";
import { useAuth } from "./useAuth";

export function useFriendships() {
  const { user } = useAuth();
  const uid = user?.uid;
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!uid) return;

    // One array-contains filter and no orderBy: no composite index needed
    const q = query(collection(db, "friendships"), where("userIds", "array-contains", uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setDocs(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
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

  const { friends, incoming, outgoing, relations } = useMemo(() => {
    const list = docs.map((f) => {
      const otherId = f.userIds.find((id) => id !== uid);
      return {
        otherId,
        name: f.names?.[otherId] ?? "Unknown",
        status: f.status,
        requestedByMe: f.requestedBy === uid,
      };
    });

    const byName = (a, b) => a.name.localeCompare(b.name);
    const friendsList = list.filter((f) => f.status === "accepted").sort(byName);
    const incomingList = list.filter((f) => f.status === "pending" && !f.requestedByMe).sort(byName);
    const outgoingList = list.filter((f) => f.status === "pending" && f.requestedByMe).sort(byName);

    // otherUid -> "friend" | "incoming" | "outgoing"   (missing = no relation)
    const map = {};
    friendsList.forEach((f) => (map[f.otherId] = "friend"));
    incomingList.forEach((f) => (map[f.otherId] = "incoming"));
    outgoingList.forEach((f) => (map[f.otherId] = "outgoing"));

    return { friends: friendsList, incoming: incomingList, outgoing: outgoingList, relations: map };
  }, [docs, uid]);

  return { friends, incoming, outgoing, relations, loading, error };
}