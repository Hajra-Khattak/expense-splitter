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
| role | string | `admin` or `member` |
| joinedAt | timestamp | |

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

Types: `group_created`, `member_joined`, `member_left`, `expense_added`, `expense_edited`, `expense_deleted`, `settlement_added`, `group_renamed`, `group_archived`.

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
| createdBy | string | |
| createdAt | timestamp | |

Lets a non-member find a group from a code without listing groups. Rules allow create and `get`, never `list`, update or delete.

## Queries and indexes

| Screen | Query | Index |
| --- | --- | --- |
| Dashboard | `groups` where `memberIds` array-contains uid, orderBy `createdAt` desc | Composite: `memberIds` (Arrays), `createdAt` (Descending) |
| Group page | `groups/{id}` document, then its subcollections | None |
| Join | `invites/{code}` single `get` | None |

The first run of the dashboard query logs an error with a link that creates the index. It takes a few minutes to build. Every new Firebase project needs it too.

## Who can write what

- **groups:** read if your uid is in `memberIds`. Create if `createdBy` is you and `memberIds` is exactly `[you]`. No update or delete yet.
- **members:** read by members. Create only your own doc as `admin`, and only if you are the creator of the group in the same batch (`getAfter`).
- **activity:** read by members. Create only with your own `actorId`. Never update or delete.
- **invites:** `get` for signed-in users, never `list`. Create if `createdBy` is you and the group is yours. Never update or delete.

## Decisions and limits

- **Members as a subcollection** with `memberIds` on the group. `memberIds` is the source for membership checks and queries. Member docs hold the name, role and join date.
- **Invite written after the group.** If the second write fails, the group exists without a joinable invite. A later "create invite" action on the Members tab is the fix. The code is pre-checked with a `getDoc`, and a rare race can still fail the second write.
- **Dashboard ordering in the query**, with a composite index.
- **No stored balances.** They would drift, and rules could not stop one member from editing another's balance.
- **One admin (`createdBy`)** until an admin-transfer feature exists, so there is no `admins` array.
- Renaming yourself later should update your member doc in each group (one write per group).