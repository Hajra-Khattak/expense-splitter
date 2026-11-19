import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import { generateInviteCode } from "../utils/inviteCode";
import { getMemberBalance } from "../utils/memberBalance";

const MAX_CODE_ATTEMPTS = 3;

const nameOf = (user) => user.displayName || user.email;

function codeError(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

// One activity entry. The caller adds it to a batch.
function activityData(user, type, targetId, summary) {
  return { type, actorId: user.uid, targetId, summary, createdAt: serverTimestamp() };
}

/* ------------------------------------------------------------------ */
/* Create                                                             */
/* ------------------------------------------------------------------ */

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
  const displayName = nameOf(user);

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

  batch.set(
    activityRef,
    activityData(user, "group_created", null, `${displayName} created the group "${name}"`)
  );

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

/* ------------------------------------------------------------------ */
/* Join by link                                                       */
/* ------------------------------------------------------------------ */

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
  if (!invite) throw codeError("invalid-invite", "Invalid invite link");

  const { groupId, code } = invite;
  const displayName = nameOf(user);

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
  batch.set(activityRef, activityData(user, "member_joined", user.uid, `${displayName} joined the group`));

  await batch.commit();
  return groupId;
}

/* ------------------------------------------------------------------ */
/* Balance check (used before remove and leave)                       */
/* ------------------------------------------------------------------ */

// Reads the group's expenses and settlements and returns one member's net balance.
// If a read fails, this throws, so the caller stops (the safe default).
export async function getUnsettledBalance(groupId, uid) {
  const [expenseSnap, settlementSnap] = await Promise.all([
    getDocs(collection(db, "groups", groupId, "expenses")),
    getDocs(collection(db, "groups", groupId, "settlements")),
  ]);

  return getMemberBalance(
    uid,
    expenseSnap.docs.map((d) => d.data()),
    settlementSnap.docs.map((d) => d.data())
  );
}

async function assertSettled(groupId, uid) {
  const balance = await getUnsettledBalance(groupId, uid);
  if (balance !== 0) throw codeError("unsettled-balance", "The balance is not settled");
}

/* ------------------------------------------------------------------ */
/* Members                                                            */
/* ------------------------------------------------------------------ */

// An admin adds one friend. For several friends, call this once per friend:
// each person is one atomic batch.  friend = { otherId, name }
export async function addFriendToGroup(admin, group, friend) {
  const groupRef = doc(db, "groups", group.id);
  const memberRef = doc(db, "groups", group.id, "members", friend.otherId);
  const activityRef = doc(collection(db, "groups", group.id, "activity"));

  const batch = writeBatch(db);
  batch.update(groupRef, { memberIds: arrayUnion(friend.otherId) });
  batch.set(memberRef, { name: friend.name, role: "member", joinedAt: serverTimestamp() });
  batch.set(
    activityRef,
    activityData(admin, "member_added", friend.otherId, `${nameOf(admin)} added ${friend.name}`)
  );
  await batch.commit();
}

// An admin removes a plain member. Allowed only when that member's balance is 0.
export async function removeMember(admin, group, member) {
  await assertSettled(group.id, member.id);

  const groupRef = doc(db, "groups", group.id);
  const memberRef = doc(db, "groups", group.id, "members", member.id);
  const activityRef = doc(collection(db, "groups", group.id, "activity"));

  const batch = writeBatch(db);
  batch.update(groupRef, { memberIds: arrayRemove(member.id) });
  batch.delete(memberRef);
  batch.set(
    activityRef,
    activityData(admin, "member_removed", member.id, `${nameOf(admin)} removed ${member.name}`)
  );
  await batch.commit();
}

// I leave the group. Allowed only when my balance is 0.
// The caller makes sure I am not the last admin. An admin steps down first,
// because the rules let only a plain member delete their own member doc.
export async function leaveGroup(user, group, myRole) {
  await assertSettled(group.id, user.uid);

  const groupRef = doc(db, "groups", group.id);
  const memberRef = doc(db, "groups", group.id, "members", user.uid);
  const activityRef = doc(collection(db, "groups", group.id, "activity"));

  if (myRole === "admin") {
    await updateDoc(memberRef, { role: "member" });
  }

  const batch = writeBatch(db);
  batch.update(groupRef, { memberIds: arrayRemove(user.uid) });
  batch.delete(memberRef);
  batch.set(activityRef, activityData(user, "member_left", user.uid, `${nameOf(user)} left the group`));
  await batch.commit();
}

// Make a member an admin, or an admin a plain member. Only admins may do this.
export async function setMemberRole(admin, group, member, role) {
  const memberRef = doc(db, "groups", group.id, "members", member.id);
  const activityRef = doc(collection(db, "groups", group.id, "activity"));

  const summary =
    role === "admin"
      ? `${nameOf(admin)} made ${member.name} an admin`
      : `${nameOf(admin)} made ${member.name} a member`;

  const batch = writeBatch(db);
  batch.update(memberRef, { role });
  batch.set(activityRef, activityData(admin, "role_changed", member.id, summary));
  await batch.commit();
}

/* ------------------------------------------------------------------ */
/* Group settings                                                     */
/* ------------------------------------------------------------------ */

// Rename and/or change the description. If the name changes, the copy on the invite doc follows.
export async function updateGroupDetails(admin, group, { name, description }) {
  const changes = {};
  if (name !== group.name) changes.name = name;
  if (description !== (group.description ?? "")) changes.description = description;
  if (Object.keys(changes).length === 0) return;

  const groupRef = doc(db, "groups", group.id);
  const batch = writeBatch(db);
  batch.update(groupRef, changes);

  if (changes.name) {
    // Groups whose invite step failed have no invite doc, so check first.
    const inviteRef = doc(db, "invites", group.inviteCode);
    const inviteSnap = await getDoc(inviteRef);
    if (inviteSnap.exists()) batch.update(inviteRef, { groupName: name });

    const activityRef = doc(collection(db, "groups", group.id, "activity"));
    batch.set(
      activityRef,
      activityData(admin, "group_renamed", group.id, `${nameOf(admin)} renamed the group to "${name}"`)
    );
  }

  await batch.commit();
}

// Archive = read-only for everyone. An admin can un-archive it.
export async function setGroupArchived(admin, group, archived) {
  const groupRef = doc(db, "groups", group.id);
  const activityRef = doc(collection(db, "groups", group.id, "activity"));

  const batch = writeBatch(db);
  batch.update(groupRef, { archived });
  batch.set(
    activityRef,
    activityData(
      admin,
      archived ? "group_archived" : "group_unarchived",
      group.id,
      archived ? `${nameOf(admin)} archived the group` : `${nameOf(admin)} unarchived the group`
    )
  );
  await batch.commit();
}