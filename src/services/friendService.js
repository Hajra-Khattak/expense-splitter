import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { pairId } from "../utils/pairId";

const nameOf = (user) => user.displayName || user.email || "Unknown";


export async function ensureProfile({ uid, displayName, email, photoURL }) {
  const name = displayName || email || "Unknown";

  await setDoc(
    doc(db, "profiles", uid),
    { name, photoURL: photoURL || "", updatedAt: serverTimestamp() },
    { merge: true }
  );

  if (email) {
    await setDoc(doc(db, "emailLookup", email.toLowerCase()), { uid, name }, { merge: true });
  }
}

export async function getProfile(uid) {
  const snap = await getDoc(doc(db, "profiles", uid));
  return snap.exists() ? { uid, name: snap.data().name } : null;
}

export async function findUserByEmail(rawEmail) {
  const snap = await getDoc(doc(db, "emailLookup", rawEmail.trim().toLowerCase()));
  return snap.exists() ? { uid: snap.data().uid, name: snap.data().name } : null;
}

// target = { uid, name }
export async function sendFriendRequest(user, target) {
  if (target.uid === user.uid) {
    const err = new Error("You cannot add yourself");
    err.code = "self-request";
    throw err;
  }

  await setDoc(doc(db, "friendships", pairId(user.uid, target.uid)), {
    userIds: [user.uid, target.uid].sort(),
    requestedBy: user.uid,
    status: "pending",
    names: { [user.uid]: nameOf(user), [target.uid]: target.name },
    createdAt: serverTimestamp(),
  });
}

// Only the person who did NOT send the request may accept (the rules enforce it).
export async function acceptFriendRequest(user, otherUid) {
  await updateDoc(doc(db, "friendships", pairId(user.uid, otherUid)), {
    status: "accepted",
    acceptedAt: serverTimestamp(),
  });
}

// Decline, cancel a sent request, or unfriend: all are the same delete.
export async function removeFriendship(user, otherUid) {
  await deleteDoc(doc(db, "friendships", pairId(user.uid, otherUid)));
}