# Firestore Data Model

## Conventions

- Money is stored as integer minor units (paisa, cents). 12.50 is `1250`. Field names end in `Minor`.
- Dates that belong to the user (expense date) are `YYYY-MM-DD` strings. Timestamps use `serverTimestamp()`.
- Doc ids are auto-generated, except `members/{uid}` (the uid) and `invites/{code}` (the code).
- Balances are **never stored**. They are computed from expenses and settlements by `utils/balances.js`.

## Collections

### users/{uid}
Written by: `createUserDocIfMissing`, `updateProfileData`.

| Field | Type | Notes |
| --- | --- | --- |
| name | string | 2 to 40 characters |
| email | string | |
| photoURL | string | May be empty |
| currency | string | Default PKR |
| theme | string | `light` or `dark` |
| createdAt | timestamp | |

### groups/{groupId}
Written by: `createGroup` (batched write).

| Field | Type | Notes |
| --- | --- | --- |
| name | string | 2 to 40 characters |
| description | string | 0 to 200 characters, may be empty |
| currency | string | PKR, USD, EUR, GBP, AED, SAR or INR |
| createdBy | string | Admin's uid. This is the only admin for now |
| createdAt | timestamp | |
| archived | boolean | `false` on creation |
| inviteCode | string | 8 characters, copy of the `invites/{code}` doc id |
| memberIds | string[] | Used by the dashboard query and by security rules |

```json
{
  "name": "Lahore trip",
  "description": "Hotel, food and fuel",
  "currency": "PKR",
  "createdBy": "uid_hajra",
  "createdAt": "<serverTimestamp>",
  "archived": false,
  "inviteCode": "CL5U9PAC",
  "memberIds": ["uid_hajra"]
}
```

### groups/{groupId}/members/{uid}
Written by: `createGroup` (creator, role admin), later `joinGroup` and `leaveGroup`.

| Field | Type | Notes |
| --- | --- | --- |
| name | string | Copy of the display name when joining |
| role | string | `admin` or `member`. This is the only place that says who is an admin |
| joinedAt | timestamp | |
| inviteCode | string | Only on members who joined by link. Proof of the invite for the rules; not shown in the UI |

```json
{ "name": "Hajra", "role": "admin", "joinedAt": "<serverTimestamp>" }
```

**Sync rule:** `memberIds` on the group and the docs in `members` must always change together, in one batch. Rules cannot check that they agree, so only the service functions may change membership.

### groups/{groupId}/activity/{activityId}
Written by: every service that changes the group. Never edited or deleted.

| Field | Type | Notes |
| --- | --- | --- |
| type | string | See the list below |
| actorId | string | Who did it |
| targetId | string or null | Who or what it affects (member uid, expense id) |
| summary | string | Readable sentence, built when the entry is written |
| createdAt | timestamp | |

Types: `group_created`, `group_renamed`, `group_archived`, `group_unarchived`, `member_joined`, `member_added`, `member_removed`, `member_left`, `role_changed`, `expense_added`, `expense_edited`, `expense_deleted`, `settlement_added`.

### groups/{groupId}/expenses/{expenseId}
Written by: `expenseService` (Phase 4).

| Field | Type | Notes |
| --- | --- | --- |
| description | string | 1 to 80 characters |
| amountMinor | integer | Above 0 |
| category | string | Food, Groceries, Rent, Utilities, Transport, Travel, Entertainment, Shopping, Health, Other |
| date | string | `YYYY-MM-DD` |
| paidBy | string | Member uid (one payer) |
| participants | string[] | Member uids |
| splitType | string | `equal`, `exact` or `percent` |
| splits | map | uid to share in minor units, adding up to `amountMinor` |
| note | string | Optional, up to 200 characters |
| createdBy, createdAt, updatedAt | | |

The final split amounts are stored, so history stays correct if the algorithm changes. Expenses are deleted for real (the activity entry keeps the record).

### groups/{groupId}/settlements/{settlementId}
Written by: `settlementService` (Phase 5). Fields: `from`, `to`, `amountMinor`, `date`, `note`, `createdBy`, `createdAt`.

### invites/{code}
Written by: `createGroup`, as a **second step after the group batch**.

| Field | Type | Notes |
| --- | --- | --- |
| groupId | string | |
| groupName | string | Copy of the group name, because non-members cannot read the group doc |
| createdBy | string | |
| createdAt | timestamp | |

Lets a non-member find a group from a code without listing groups. Rules allow create and `get`, never `list`, update or delete.

### profiles/{uid}
Written by: `ensureProfile` (once per login, from `AppLayout`). A public name card, because `users/{uid}` stays private.

| Field | Type | Notes |
| --- | --- | --- |
| name | string | 1 to 80 characters |
| photoURL | string | May be empty |
| updatedAt | timestamp | |

Signed-in users can `get` one by uid, never `list`. Used by the friend link page.

### emailLookup/{email}
Written by: `ensureProfile`. The doc id is the lowercase email.

| Field | Type | Notes |
| --- | --- | --- |
| uid | string | |
| name | string | |

Lets a person be found by exact email. `get` only, never `list`. Only the owner of that email can write it. **Privacy cost:** anyone signed in can check whether an email is registered.

### friendships/{pairId}
Written by: `friendService`. The id is the two uids sorted and joined with `_` (`utils/pairId.js`), so a pair has one doc.

| Field | Type | Notes |
| --- | --- | --- |
| userIds | string[] | Exactly two uids, used by the query and the rules |
| requestedBy | string | The sender's uid |
| status | string | `pending` or `accepted` |
| names | map | uid to display name, copied when the request is sent |
| createdAt | timestamp | |
| acceptedAt | timestamp | Added when accepted |

Create: the sender, as `pending`. Accept: only the other person. Delete (decline, cancel, unfriend): either person.

## Queries and indexes

| Screen | Query | Index |
| --- | --- | --- |
| Dashboard | `groups` where `memberIds` array-contains uid, orderBy `createdAt` desc | Composite: `memberIds` (Arrays), `createdAt` (Descending) |
| Group page | `groups/{id}` document, then its subcollections | None |
| Join | `invites/{code}` single `get` | None |
| Friends | `friendships` where `userIds` array-contains uid | None |
| Friend link | `profiles/{uid}` single `get` | None |
| Find by email | `emailLookup/{email}` single `get` | None |

The first run of the dashboard query logs an error with a link that creates the index. It takes a few minutes to build. Every new Firebase project needs it too.

## Who can write what

Everything not listed here is **denied** (the last rule in `firestore.rules` closes all other paths).

| Path | Read | Create | Update | Delete |
| --- | --- | --- | --- | --- |
| `users/{uid}` | the owner | the owner | the owner | the owner |
| `profiles/{uid}` | `get` by anyone signed in, no `list` | the owner | the owner | never |
| `emailLookup/{email}` | `get` by anyone signed in, no `list` | the owner of that email | the owner | never |
| `friendships/{pair}` | the two people | the sender, as `pending` | only the other person, to `accepted` | either person |
| `groups/{id}` | members | the creator, with `memberIds == [creator]` | **admin:** name, description, archived (an archived group can only be unarchived). **Join or add:** exactly one uid appended. **Leave or remove:** exactly one uid removed | never |
| `members/{uid}` | members | creator as admin (same batch as the group); join as member with the invite code; admin adds an accepted friend | **admin only, `role` only** | a plain member deletes themselves; an admin deletes a plain member |
| `activity/{id}` | members | as yourself (`actorId`), if you are a member before or after the batch | never | never |
| `expenses`, `settlements` | members | not yet (Phase 4 and 5) | not yet | not yet |
| `invites/{code}` | `get` by anyone signed in, no `list` | the creator of the group | an admin, `groupName` only | never |

Rules the batches rely on:

- **Joining or adding** appends exactly one uid to `memberIds` and creates that person's member doc in the same batch (`existsAfter`). Either I join myself with the code inside my member doc, or an admin adds one of their accepted friends. Both are blocked while the group is archived.
- **Leaving or removing** removes exactly one uid. Either I delete my own member doc in the same batch, or an admin removes someone else.
- **Admins are never removed or left behind by accident:** the member doc can only be deleted while its role is `member`. An admin must be made a member first (the Members tab does that for leaving).

## Balance checks (client only)

Removing a member and leaving a group are allowed only when that person's balance is 0. The balance is computed in the browser from the group's expenses and settlements (`utils/memberBalance.js`, to be replaced by your tested `balances.js`). Security rules cannot compute it, so a hand-made request could skip the check. This is a known limit.

## Testing the rules

`tests/rules/firestore.rules.test.js` runs against the Firestore emulator with `@firebase/rules-unit-testing`:

```
npm run test:rules
```

It covers: deny by default, an outsider is denied everything, a member can read but not do admin actions, an admin can edit and manage roles, create, join, add a friend, remove, leave, own profile only, and friendships. Run it after every change to `firestore.rules`, and publish the rules only when it passes.

## Decisions and limits

- **Members as a subcollection** with `memberIds` on the group. `memberIds` is the source for membership checks and queries. Member docs hold the name, role and join date.
- **Invite written after the group.** If the second write fails, the group exists without a joinable invite. A later "create invite" action on the Members tab is the fix. The code is pre-checked with a `getDoc`, and a rare race can still fail the second write.
- **Joining by link.** The rules cannot read the code from the URL, so the client sends it inside the member doc (`inviteCode`), and the rule compares it with the group's code. The group update is only allowed together with that member doc in the same batch.
- **Friends.** Added in three ways: friend link, exact email, or the Add friend button on a group member. The other person must accept. Names are copied into the friendship doc, so a rename is not reflected until a later update.
- **Dashboard ordering in the query**, with a composite index.
- **No stored balances.** They would drift, and rules could not stop one member from editing another's balance.
- **Admin = role on the member doc.** There is no `admins` array on the group. `createdBy` only records who created the group. Rules check admin with one `get()` on the member doc.
- **At least one admin** is enforced by the Members tab only: the last admin cannot leave or step down. The rules cannot count admins.
- **Adding several friends** is one batch per friend. A batch can only append one uid, so each person is atomic and a failure does not undo the others.
- **Admins trust each other.** An admin cannot remove another admin without demoting them first, but any admin can demote another admin.
- **Archive = read-only.** An archived group cannot be renamed, joined, or have people added. Expense and settlement writes will check the same flag in Phase 4 and 5. Leaving stays possible.
- Renaming yourself later should update your member doc in each group (one write per group).