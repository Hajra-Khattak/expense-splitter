import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import { generateInviteCode } from "../utils/inviteCode";

const MAX_CODE_ATTEMPTS = 3;

// Pre-check: pick a code that has no invites/{code} doc yet.
async function findFreeInviteCode() {
  for (let i = 0; i < MAX_CODE_ATTEMPTS; i++) {
    const code = generateInviteCode();
    const snap = await getDoc(doc(db, "invites", code));
    if (!snap.exists()) return code;
  }
  throw new Error("Could not find a free invite code");
}

// Returns { groupId, inviteSaved }.
// Step 1: one batch (group + creator member + activity). Step 2: the invite doc.
export async function createGroup(user, { name, description, currency }) {
  const inviteCode = await findFreeInviteCode();
  const displayName = user.displayName || user.email;

  const groupRef = doc(collection(db, "groups")); // id generated up front
  const memberRef = doc(db, "groups", groupRef.id, "members", user.uid);
  const activityRef = doc(collection(db, "groups", groupRef.id, "activity"));

  const batch = writeBatch(db);

  batch.set(groupRef, {
    name,
    description,
    currency,
    createdBy: user.uid,
    createdAt: serverTimestamp(),
    archived: false,
    inviteCode,
    memberIds: [user.uid],
  });

  batch.set(memberRef, {
    name: displayName,
    role: "admin",
    joinedAt: serverTimestamp(),
  });

  batch.set(activityRef, {
    type: "group_created",
    actorId: user.uid,
    targetId: null,
    summary: `${displayName} created the group "${name}"`,
    createdAt: serverTimestamp(),
  });

  await batch.commit(); // all three writes succeed together, or none do

  // Step 2: the group already exists, so a failure here must not hide it.
  let inviteSaved = true;
  try {
    await setDoc(doc(db, "invites", inviteCode), {
      groupId: groupRef.id,
      groupName: name, // non-members cannot read the group doc, so the join page needs this copy
      createdBy: user.uid,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.error("Group created, but the invite doc failed", err.code, err.message);
    inviteSaved = false;
  }

  return { groupId: groupRef.id, inviteSaved };
}

// Reads the invite doc for the join page. Returns null when the code does not exist.
export async function getInvite(rawCode) {
  const code = rawCode.trim().toUpperCase();
  const snap = await getDoc(doc(db, "invites", code));
  if (!snap.exists()) return null;
  const { groupId, groupName } = snap.data();
  return { code, groupId, groupName: groupName ?? null };
}

// One batch: add the uid to memberIds, create the member doc, write an activity entry.
// The rules check the invite code that is sent inside the member doc.
export async function joinGroup(user, rawCode) {
  const invite = await getInvite(rawCode);
  if (!invite) {
    const err = new Error("Invalid invite link");
    err.code = "invalid-invite";
    throw err;
  }

  const { groupId, code } = invite;
  const displayName = user.displayName || user.email;

  const groupRef = doc(db, "groups", groupId);
  const memberRef = doc(db, "groups", groupId, "members", user.uid);
  const activityRef = doc(collection(db, "groups", groupId, "activity"));

  const batch = writeBatch(db);

  batch.update(groupRef, { memberIds: arrayUnion(user.uid) });

  batch.set(memberRef, {
    name: displayName,
    role: "member",
    joinedAt: serverTimestamp(),
    inviteCode: code, // proof for the rules
  });

  batch.set(activityRef, {
    type: "member_joined",
    actorId: user.uid,
    targetId: user.uid,
    summary: `${displayName} joined the group`,
    createdAt: serverTimestamp(),
  });

  await batch.commit();
  return groupId;
}