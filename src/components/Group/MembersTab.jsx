import { useState } from "react";
import { useOutletContext } from "react-router";
import { toast } from "sonner";
import { useAuth } from "../../hooks/useAuth";
import { useMembers } from "../../hooks/useMembers";
import { useFriendships } from "../../hooks/useFriendships";
import { acceptFriendRequest, sendFriendRequest } from "../../services/friendService";
import { initials } from "../../utils/initials";

const card =
  "rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#0c1f17] dark:shadow-none";
const title = "font-semibold text-gray-900 dark:text-white";
const muted = "text-gray-500 dark:text-green-300/60";
const row = "rounded-xl bg-green-50 dark:bg-white/[0.03]";
const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-emerald-500 dark:focus:bg-white/10 dark:focus:ring-emerald-500/20";
const smallPrimary =
  "rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-emerald-500";
const smallGhost =
  "rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-transparent dark:text-emerald-300 dark:hover:bg-white/5";

function formatJoined(joinedAt) {
  // joinedAt is null for a moment right after a write (pending server timestamp)
  if (!joinedAt?.toDate) return "";
  return joinedAt.toDate().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// What I can do about another member: nothing, add them, or accept their request.
function FriendAction({ relation, busy, onAdd, onAccept }) {
  if (relation === "friend") {
    return <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Friend</span>;
  }
  if (relation === "outgoing") {
    return <span className={`text-xs ${muted}`}>Request sent</span>;
  }
  if (relation === "incoming") {
    return (
      <button type="button" disabled={busy} onClick={onAccept} className={smallPrimary}>
        Accept request
      </button>
    );
  }
  return (
    <button type="button" disabled={busy} onClick={onAdd} className={smallGhost}>
      Add friend
    </button>
  );
}

function MemberList({ members, loading, error, uid, relations, busyId, onAdd, onAccept }) {
  if (loading) {
    return (
      <ul className="space-y-3" aria-busy="true" aria-label="Loading members">
        {[0, 1, 2].map((i) => (
          <li key={i} className="h-14 animate-pulse rounded-xl bg-emerald-100/60 dark:bg-white/5" />
        ))}
      </ul>
    );
  }

  if (error) {
    return (
      <p
        role="alert"
        className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300"
      >
        Could not load the members. Please refresh and try again.
      </p>
    );
  }

  if (members.length === 0) {
    return <p className={`text-sm ${muted}`}>No members yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {members.map((m) => {
        const joined = formatJoined(m.joinedAt);
        const isMe = m.id === uid;
        return (
          <li key={m.id} className={`flex items-center justify-between gap-3 p-3 ${row}`}>
            <div className="flex min-w-0 items-center gap-3">
              <div
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
              >
                {initials(m.name)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                  {m.name}
                  {isMe && <span className={`ml-2 text-xs font-normal ${muted}`}>(You)</span>}
                </p>
                {joined && <p className={`text-xs ${muted}`}>Joined {joined}</p>}
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  m.role === "admin"
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                    : "bg-gray-200 text-gray-600 dark:bg-white/10 dark:text-green-100"
                }`}
              >
                {m.role === "admin" ? "Admin" : "Member"}
              </span>
              {!isMe && (
                <FriendAction
                  relation={relations[m.id]}
                  busy={busyId === m.id}
                  onAdd={() => onAdd(m)}
                  onAccept={() => onAccept(m)}
                />
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default function MembersTab() {
  const { group } = useOutletContext(); // GroupPage already loaded the group
  const { user } = useAuth();
  const { members, loading, error } = useMembers(group.id);
  const { relations } = useFriendships();
  const [busyId, setBusyId] = useState(null);

  const isAdmin = group.createdBy === user?.uid;
  const inviteLink = `${window.location.origin}/join/${group.inviteCode}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success("Link copied");
    } catch {
      // clipboard can be blocked; the link is selectable in the box
      toast.error("Could not copy. Select the link and copy it by hand.");
    }
  };

  const runFor = async (member, action, successMessage) => {
    setBusyId(member.id);
    try {
      await action();
      toast.success(successMessage);
    } catch (err) {
      console.error(err.code, err.message);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  const addFriend = (m) =>
    runFor(m, () => sendFriendRequest(user, { uid: m.id, name: m.name }), `Request sent to ${m.name}`);

  const acceptFriend = (m) =>
    runFor(m, () => acceptFriendRequest(user, m.id), `You and ${m.name} are friends`);

  return (
    <div className="mt-6 space-y-5">
      {/* Only the admin sees the invite link */}
      {isAdmin && (
        <section className={card}>
          <h2 className={title}>Invite people</h2>
          <p className={`mb-4 mt-1 text-sm ${muted}`}>
            Anyone with an account can join with this link.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <label htmlFor="invite-link" className="sr-only">Invite link</label>
            <input
              id="invite-link"
              readOnly
              value={inviteLink}
              onFocus={(e) => e.target.select()}
              className={inputClass}
            />
            <button
              type="button"
              onClick={copyLink}
              className="shrink-0 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-100 transition hover:bg-emerald-700 active:scale-[0.98] dark:shadow-none dark:hover:bg-emerald-500"
            >
              Copy link
            </button>
          </div>
          <p className={`mt-3 text-xs ${muted}`}>
            Code: <span className="font-mono font-semibold">{group.inviteCode}</span>
          </p>
        </section>
      )}

      <section className={card}>
        <h2 className={`mb-4 ${title}`}>
          Members
          {!loading && !error && ` (${members.length})`}
        </h2>
        <MemberList
          members={members}
          loading={loading}
          error={error}
          uid={user?.uid}
          relations={relations}
          busyId={busyId}
          onAdd={addFriend}
          onAccept={acceptFriend}
        />
      </section>
    </div>
  );
}