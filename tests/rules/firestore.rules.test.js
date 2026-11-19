// @vitest-environment node
//
// Run with the Firestore emulator:   npm run test:rules
//
// People used in the tests:
//   alice = admin of group g1        bob  = plain member of g1
//   carol = outsider                 dave = outsider, accepted friend of alice
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it, vi } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
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
  deleteDoc,
  writeBatch,
} from "firebase/firestore";

vi.setConfig({ testTimeout: 20000 });

const A = "alice";
const B = "bob";
const C = "carol";
const D = "dave";

let testEnv;

// A Firestore instance that acts as this signed-in user
const as = (uid, token = {}) => testEnv.authenticatedContext(uid, token).firestore();
const anon = () => testEnv.unauthenticatedContext().firestore();

// Writes test data with the rules switched off
async function seed(extra = async () => {}) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const now = new Date();

    await setDoc(doc(db, "groups/g1"), {
      name: "Trip",
      description: "Hotel and food",
      currency: "PKR",
      createdBy: A,
      createdAt: now,
      archived: false,
      inviteCode: "ABCD1234",
      memberIds: [A, B],
    });
    await setDoc(doc(db, "groups/g1/members/alice"), { name: "Alice", role: "admin", joinedAt: now });
    await setDoc(doc(db, "groups/g1/members/bob"), { name: "Bob", role: "member", joinedAt: now });
    await setDoc(doc(db, "groups/g1/activity/a1"), {
      type: "group_created", actorId: A, targetId: null, summary: "Alice created the group", createdAt: now,
    });
    await setDoc(doc(db, "groups/g1/expenses/e1"), { description: "Dinner", amountMinor: 3000 });
    await setDoc(doc(db, "groups/g1/settlements/s1"), { from: B, to: A, amountMinor: 1000 });
    await setDoc(doc(db, "invites/ABCD1234"), { groupId: "g1", groupName: "Trip", createdBy: A });
    await setDoc(doc(db, "friendships/alice_dave"), {
      userIds: [A, D], requestedBy: A, status: "accepted",
      names: { alice: "Alice", dave: "Dave" }, createdAt: now,
    });
    await setDoc(doc(db, "users/alice"), { name: "Alice" });
    await setDoc(doc(db, "users/bob"), { name: "Bob" });

    await extra(db);
  });
}

// Small helpers to build the same batches the app builds
function activity(db, groupId, id, actorId, type = "member_added", targetId = null) {
  return [
    doc(db, `groups/${groupId}/activity/${id}`),
    { type, actorId, targetId, summary: "x", createdAt: serverTimestamp() },
  ];
}

function joinBatch(db, uid, code = "ABCD1234") {
  const batch = writeBatch(db);
  batch.update(doc(db, "groups/g1"), { memberIds: arrayUnion(uid) });
  batch.set(doc(db, `groups/g1/members/${uid}`), {
    name: uid, role: "member", joinedAt: serverTimestamp(), inviteCode: code,
  });
  batch.set(...activity(db, "g1", "j1", uid, "member_joined", uid));
  return batch;
}

function addFriendBatch(db, adderUid, friendUid) {
  const batch = writeBatch(db);
  batch.update(doc(db, "groups/g1"), { memberIds: arrayUnion(friendUid) });
  batch.set(doc(db, `groups/g1/members/${friendUid}`), {
    name: friendUid, role: "member", joinedAt: serverTimestamp(),
  });
  batch.set(...activity(db, "g1", "ad1", adderUid, "member_added", friendUid));
  return batch;
}

function removeBatch(db, actorUid, targetUid) {
  const batch = writeBatch(db);
  batch.update(doc(db, "groups/g1"), { memberIds: arrayRemove(targetUid) });
  batch.delete(doc(db, `groups/g1/members/${targetUid}`));
  batch.set(...activity(db, "g1", "rm1", actorUid, "member_removed", targetUid));
  return batch;
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "splitease-rules-test",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await seed();
});

/* ------------------------------------------------------------------ */
describe("deny by default", () => {
  it("signed-out people cannot read or write anything", async () => {
    await assertFails(getDoc(doc(anon(), "groups/g1")));
    await assertFails(getDoc(doc(anon(), "users/alice")));
    await assertFails(setDoc(doc(anon(), "groups/g9"), { name: "x" }));
  });

  it("an unknown collection is closed, even for a signed-in user", async () => {
    await assertFails(getDoc(doc(as(A), "secrets/x")));
    await assertFails(setDoc(doc(as(A), "secrets/x"), { a: 1 }));
  });

  it("nobody can delete a group", async () => {
    await assertFails(deleteDoc(doc(as(A), "groups/g1")));
  });
});

/* ------------------------------------------------------------------ */
describe("outsider (carol) is denied", () => {
  it("cannot read the group or anything inside it", async () => {
    const db = as(C);
    await assertFails(getDoc(doc(db, "groups/g1")));
    await assertFails(getDoc(doc(db, "groups/g1/members/alice")));
    await assertFails(getDoc(doc(db, "groups/g1/activity/a1")));
    await assertFails(getDoc(doc(db, "groups/g1/expenses/e1")));
    await assertFails(getDoc(doc(db, "groups/g1/settlements/s1")));
    await assertFails(getDocs(collection(db, "groups/g1/members")));
  });

  it("cannot edit the group, change roles or add herself without the code", async () => {
    const db = as(C);
    await assertFails(updateDoc(doc(db, "groups/g1"), { name: "Hacked" }));
    await assertFails(updateDoc(doc(db, "groups/g1"), { memberIds: arrayUnion(C) }));
    await assertFails(setDoc(doc(db, "groups/g1/members/carol"), { name: "Carol", role: "admin", joinedAt: serverTimestamp() }));
  });
});

/* ------------------------------------------------------------------ */
describe("member (bob) is allowed to read", () => {
  it("reads the group, members, activity, expenses and settlements", async () => {
    const db = as(B);
    await assertSucceeds(getDoc(doc(db, "groups/g1")));
    await assertSucceeds(getDocs(collection(db, "groups/g1/members")));
    await assertSucceeds(getDoc(doc(db, "groups/g1/activity/a1")));
    await assertSucceeds(getDoc(doc(db, "groups/g1/expenses/e1")));
    await assertSucceeds(getDoc(doc(db, "groups/g1/settlements/s1")));
  });

  it("cannot write expenses yet (Phase 4)", async () => {
    await assertFails(setDoc(doc(as(B), "groups/g1/expenses/e2"), { description: "x", amountMinor: 1 }));
  });
});

/* ------------------------------------------------------------------ */
describe("non-admin (bob) is denied admin actions", () => {
  it("cannot rename, change the description or archive the group", async () => {
    const db = as(B);
    await assertFails(updateDoc(doc(db, "groups/g1"), { name: "Bob's group" }));
    await assertFails(updateDoc(doc(db, "groups/g1"), { description: "x" }));
    await assertFails(updateDoc(doc(db, "groups/g1"), { archived: true }));
  });

  it("cannot change roles, not even his own", async () => {
    const db = as(B);
    await assertFails(updateDoc(doc(db, "groups/g1/members/bob"), { role: "admin" }));
    await assertFails(updateDoc(doc(db, "groups/g1/members/alice"), { role: "member" }));
  });

  it("cannot remove another member", async () => {
    await assertFails(removeBatch(as(B), B, A).commit());
  });

  it("cannot add a friend to the group", async () => {
    await assertFails(addFriendBatch(as(B), B, D).commit());
  });

  it("cannot change the invite doc", async () => {
    await assertFails(updateDoc(doc(as(B), "invites/ABCD1234"), { groupName: "Hacked" }));
  });
});

/* ------------------------------------------------------------------ */
describe("admin (alice)", () => {
  it("can rename, change the description and archive", async () => {
    const db = as(A);
    await assertSucceeds(updateDoc(doc(db, "groups/g1"), { name: "New name", description: "New text" }));
    await assertSucceeds(updateDoc(doc(db, "groups/g1"), { archived: true }));
  });

  it("cannot change anything else on the group", async () => {
    const db = as(A);
    await assertFails(updateDoc(doc(db, "groups/g1"), { currency: "USD" }));
    await assertFails(updateDoc(doc(db, "groups/g1"), { createdBy: B }));
    await assertFails(updateDoc(doc(db, "groups/g1"), { inviteCode: "ZZZZ9999" }));
  });

  it("cannot rename an archived group, but can unarchive it", async () => {
    await seed(async (db) => {
      await updateDoc(doc(db, "groups/g1"), { archived: true });
    });
    const db = as(A);
    await assertFails(updateDoc(doc(db, "groups/g1"), { name: "Renamed" }));
    await assertSucceeds(updateDoc(doc(db, "groups/g1"), { archived: false }));
  });

  it("can change another member's role", async () => {
    await assertSucceeds(updateDoc(doc(as(A), "groups/g1/members/bob"), { role: "admin" }));
  });

  it("cannot change anything except the role on a member doc", async () => {
    await assertFails(updateDoc(doc(as(A), "groups/g1/members/bob"), { name: "Renamed" }));
  });

  it("can update the group name copy on the invite doc", async () => {
    await assertSucceeds(updateDoc(doc(as(A), "invites/ABCD1234"), { groupName: "New name" }));
    await assertFails(updateDoc(doc(as(A), "invites/ABCD1234"), { groupId: "g2" }));
  });
});

/* ------------------------------------------------------------------ */
describe("creating a group", () => {
  const newGroupBatch = (db, uid, { role = "admin", createdBy = uid } = {}) => {
    const batch = writeBatch(db);
    batch.set(doc(db, "groups/g9"), {
      name: "New group", description: "", currency: "PKR", createdBy,
      createdAt: serverTimestamp(), archived: false, inviteCode: "ZZZZ9999", memberIds: [uid],
    });
    batch.set(doc(db, `groups/g9/members/${uid}`), { name: uid, role, joinedAt: serverTimestamp() });
    batch.set(...activity(db, "g9", "c1", uid, "group_created"));
    return batch;
  };

  it("works for the creator as admin, in one batch", async () => {
    await assertSucceeds(newGroupBatch(as(C), C).commit());
  });

  it("fails when the creator makes themselves a plain member", async () => {
    await assertFails(newGroupBatch(as(C), C, { role: "member" }).commit());
  });

  it("fails when createdBy is somebody else", async () => {
    await assertFails(newGroupBatch(as(C), C, { createdBy: A }).commit());
  });

  it("fails when the member doc is for another person", async () => {
    const db = as(C);
    const batch = writeBatch(db);
    batch.set(doc(db, "groups/g9"), {
      name: "New group", description: "", currency: "PKR", createdBy: C,
      createdAt: serverTimestamp(), archived: false, inviteCode: "ZZZZ9999", memberIds: [C],
    });
    batch.set(doc(db, "groups/g9/members/alice"), { name: "Alice", role: "admin", joinedAt: serverTimestamp() });
    await assertFails(batch.commit());
  });
});

/* ------------------------------------------------------------------ */
describe("joining with an invite code", () => {
  it("works with the right code", async () => {
    await assertSucceeds(joinBatch(as(C), C).commit());
  });

  it("fails with a wrong code", async () => {
    await assertFails(joinBatch(as(C), C, "WRONG000").commit());
  });

  it("fails while the group is archived", async () => {
    await seed(async (db) => {
      await updateDoc(doc(db, "groups/g1"), { archived: true });
    });
    await assertFails(joinBatch(as(C), C).commit());
  });

  it("fails when someone joins in another person's name", async () => {
    const db = as(C);
    const batch = writeBatch(db);
    batch.update(doc(db, "groups/g1"), { memberIds: arrayUnion(D) });
    batch.set(doc(db, "groups/g1/members/dave"), {
      name: "Dave", role: "member", joinedAt: serverTimestamp(), inviteCode: "ABCD1234",
    });
    await assertFails(batch.commit());
  });

  it("fails when someone joins as an admin", async () => {
    const db = as(C);
    const batch = writeBatch(db);
    batch.update(doc(db, "groups/g1"), { memberIds: arrayUnion(C) });
    batch.set(doc(db, "groups/g1/members/carol"), {
      name: "Carol", role: "admin", joinedAt: serverTimestamp(), inviteCode: "ABCD1234",
    });
    await assertFails(batch.commit());
  });
});

/* ------------------------------------------------------------------ */
describe("adding friends (admin)", () => {
  it("admin can add an accepted friend", async () => {
    await assertSucceeds(addFriendBatch(as(A), A, D).commit());
  });

  it("admin cannot add someone who is not a friend", async () => {
    await assertFails(addFriendBatch(as(A), A, C).commit());
  });

  it("admin cannot add a friend while the group is archived", async () => {
    await seed(async (db) => {
      await updateDoc(doc(db, "groups/g1"), { archived: true });
    });
    await assertFails(addFriendBatch(as(A), A, D).commit());
  });

  it("a pending friendship is not enough", async () => {
    await seed(async (db) => {
      await updateDoc(doc(db, "friendships/alice_dave"), { status: "pending" });
    });
    await assertFails(addFriendBatch(as(A), A, D).commit());
  });
});

/* ------------------------------------------------------------------ */
describe("removing and leaving", () => {
  it("admin can remove a plain member", async () => {
    await assertSucceeds(removeBatch(as(A), A, B).commit());
  });

  it("admin cannot remove another admin (demote first)", async () => {
    await seed(async (db) => {
      await updateDoc(doc(db, "groups/g1/members/bob"), { role: "admin" });
    });
    await assertFails(removeBatch(as(A), A, B).commit());
  });

  it("a plain member can leave", async () => {
    await assertSucceeds(removeBatch(as(B), B, B).commit());
  });

  it("an admin cannot leave while still an admin, but can after stepping down", async () => {
    await assertFails(removeBatch(as(A), A, A).commit());
    await assertSucceeds(updateDoc(doc(as(A), "groups/g1/members/alice"), { role: "member" }));
    await assertSucceeds(removeBatch(as(A), A, A).commit());
  });

  it("a member cannot remove themselves from memberIds without deleting their member doc", async () => {
    await assertFails(updateDoc(doc(as(B), "groups/g1"), { memberIds: arrayRemove(B) }));
  });
});

/* ------------------------------------------------------------------ */
describe("users edit only their own profile", () => {
  it("own private doc: read and write", async () => {
    const db = as(A);
    await assertSucceeds(getDoc(doc(db, "users/alice")));
    await assertSucceeds(setDoc(doc(db, "users/alice"), { name: "Alice P" }));
  });

  it("someone else's private doc: denied", async () => {
    const db = as(A);
    await assertFails(getDoc(doc(db, "users/bob")));
    await assertFails(setDoc(doc(db, "users/bob"), { name: "Hacked" }));
  });

  it("public name card: write only your own", async () => {
    const db = as(A);
    const card = { name: "Alice", photoURL: "", updatedAt: serverTimestamp() };
    await assertSucceeds(setDoc(doc(db, "profiles/alice"), card));
    await assertFails(setDoc(doc(db, "profiles/bob"), card));
    await assertFails(setDoc(doc(db, "profiles/alice"), { ...card, admin: true }));
  });

  it("public name card: anyone signed in can get one, nobody can list", async () => {
    await seed(async (db) => {
      await setDoc(doc(db, "profiles/bob"), { name: "Bob", photoURL: "" });
    });
    await assertSucceeds(getDoc(doc(as(C), "profiles/bob")));
    await assertFails(getDocs(collection(as(C), "profiles")));
    await assertFails(getDoc(doc(anon(), "profiles/bob")));
  });

  it("email lookup: only the owner of the email writes it", async () => {
    const db = as(A, { email: "Alice@Example.com" });
    await assertSucceeds(setDoc(doc(db, "emailLookup/alice@example.com"), { uid: A, name: "Alice" }));
    await assertFails(setDoc(doc(db, "emailLookup/bob@example.com"), { uid: A, name: "Alice" }));
    await assertFails(setDoc(doc(db, "emailLookup/alice@example.com"), { uid: B, name: "Alice" }));
    await assertFails(getDocs(collection(db, "emailLookup")));
  });
});

/* ------------------------------------------------------------------ */
describe("friendships", () => {
  const request = (db, from, to) =>
    setDoc(doc(db, `friendships/${[from, to].sort().join("_")}`), {
      userIds: [from, to].sort(), requestedBy: from, status: "pending",
      names: { [from]: from, [to]: to }, createdAt: serverTimestamp(),
    });

  it("a person can send a request as pending", async () => {
    await assertSucceeds(request(as(A), A, C));
  });

  it("the sender cannot accept their own request, the other person can", async () => {
    await assertSucceeds(request(as(A), A, C));
    const accept = { status: "accepted", acceptedAt: serverTimestamp() };
    await assertFails(updateDoc(doc(as(A), "friendships/alice_carol"), accept));
    await assertSucceeds(updateDoc(doc(as(C), "friendships/alice_carol"), accept));
  });

  it("a request cannot be created as already accepted, or for two other people", async () => {
    const db = as(C);
    await assertFails(
      setDoc(doc(db, "friendships/alice_carol"), {
        userIds: [A, C], requestedBy: C, status: "accepted",
        names: { alice: "A", carol: "C" }, createdAt: serverTimestamp(),
      })
    );
    await assertFails(request(db, A, B));
  });

  it("only the two people can read or delete it", async () => {
    await assertSucceeds(getDoc(doc(as(D), "friendships/alice_dave")));
    await assertFails(getDoc(doc(as(C), "friendships/alice_dave")));
    await assertFails(deleteDoc(doc(as(C), "friendships/alice_dave")));
    await assertSucceeds(deleteDoc(doc(as(D), "friendships/alice_dave")));
  });
});