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


function activityData(user, type, targetId, summary) {
  return { type, actorId: user.uid, targetId, summary, createdAt: serverTimestamp() };
}

/* ------------------------------------------------------------------ */
/* Create                                                             */
/* ------------------------------------------------------------------ */

async function findFreeInviteCode() {
  for (let i = 0; i < MAX_CODE_ATTEMPTS; i++) {
    const code = generateInviteCode();
    const snap = await getDoc(doc(db, "invites", code));
    if (!snap.exists()) return code;
  }
  throw new Error("Could not find a free invite code");
}


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

  await batch.commit(); 


  let inviteSaved = true;
  try {
    await setDoc(doc(db, "invites", inviteCode), {
      groupId: groupRef.id,
      groupName: name, 
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


export async function getInvite(rawCode) {
  const code = rawCode.trim().toUpperCase();
  const snap = await getDoc(doc(db, "invites", code));
  if (!snap.exists()) return null;
  const { groupId, groupName } = snap.data();
  return { code, groupId, groupName: groupName ?? null };
}


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
    inviteCode: code, 
  });
  batch.set(activityRef, activityData(user, "member_joined", user.uid, `${displayName} joined the group`));

  await batch.commit();
  return groupId;
}

/* ------------------------------------------------------------------ */
/* Balance check (used before remove and leave)                       */
/* ------------------------------------------------------------------ */


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



export async function updateGroupDetails(admin, group, { name, description }) {
  const changes = {};
  if (name !== group.name) changes.name = name;
  if (description !== (group.description ?? "")) changes.description = description;
  if (Object.keys(changes).length === 0) return;

  const groupRef = doc(db, "groups", group.id);
  const batch = writeBatch(db);
  batch.update(groupRef, changes);

  if (changes.name) {
  
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