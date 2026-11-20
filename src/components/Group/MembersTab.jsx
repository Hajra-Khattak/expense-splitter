import { useState } from "react";
import { useNavigate, useOutletContext } from "react-router";
import { toast } from "sonner";
import { useAuth } from "../../hooks/useAuth";
import { useFriendships } from "../../hooks/useFriendships";
import { acceptFriendRequest, sendFriendRequest } from "../../services/friendService";
import { leaveGroup, removeMember, setMemberRole } from "../../services/groupService";
import { initials } from "../../utils/initials";
import AddMembersDialog from "./AddMembersDialog";
import ConfirmDialog from "../ConfirmDialog";

const card =
  "rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#0c1f17] dark:shadow-none";
const title = "font-semibold text-gray-900 dark:text-white";
const muted = "text-gray-500 dark:text-green-300/60";
const row = "rounded-xl bg-green-50 dark:bg-white/[0.03]";
const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-emerald-500 dark:focus:bg-white/10 dark:focus:ring-emerald-500/20";
const primaryBtn =
  "shrink-0 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-100 transition hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 dark:shadow-none dark:hover:bg-emerald-500";
const smallPrimary =
  "rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-emerald-500";
const smallGhost =
  "rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-transparent dark:text-emerald-300 dark:hover:bg-white/5";
const smallDanger =
  "rounded-lg px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:text-rose-400 dark:hover:bg-white/5";

function formatJoined(joinedAt) {
  // joinedAt is null for a moment right after a write (pending server timestamp)
  if (!joinedAt?.toDate) return "";
  return joinedAt.toDate().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// What I can do about another member as a person: nothing, add them as a friend, or accept.
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

function MemberList({ members, loading, error, uid, relations, busyId, canManage, actions }) {
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
        const busy = busyId === m.id;

        return (
          <li key={m.id} className={`flex flex-col gap-2 p-3 ${row}`}>
            <div className="flex items-center justify-between gap-3">
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

              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  m.role === "admin"
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                    : "bg-gray-200 text-gray-600 dark:bg-white/10 dark:text-green-100"
                }`}
              >
                {m.role === "admin" ? "Admin" : "Member"}
              </span>
            </div>

            {!isMe && (
              <div className="flex flex-wrap items-center justify-end gap-2">
                <FriendAction
                  relation={relations[m.id]}
                  busy={busy}
                  onAdd={() => actions.addFriend(m)}
                  onAccept={() => actions.acceptFriend(m)}
                />
                {canManage && m.role === "member" && (
                  <>
                    <button type="button" disabled={busy} onClick={() => actions.makeAdmin(m)} className={smallGhost}>
                      Make admin
                    </button>
                    <button type="button" disabled={busy} onClick={() => actions.remove(m)} className={smallDanger}>
                      Remove
                    </button>
                  </>
                )}
                {canManage && m.role === "admin" && (
                  <button type="button" disabled={busy} onClick={() => actions.makeMember(m)} className={smallGhost}>
                    Make member
                  </button>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default function MembersTab() {
  const { group, members, membersLoading, membersError, isAdmin, myRole } = useOutletContext();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { friends, relations } = useFriendships();

  const [busyId, setBusyId] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  // The action waiting for confirmation: { title, message, label, busyLabel, run }
  const [confirm, setConfirm] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  // An archived group is read-only: no inviting, adding, removing or role changes.
  const canManage = isAdmin && !group.archived;
  const adminCount = members.filter((m) => m.role === "admin").length;
  const iAmLastAdmin = isAdmin && adminCount <= 1;
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

  // Runs one action for one member and disables that member's buttons meanwhile.
  const runFor = async (member, action, successMessage) => {
    setBusyId(member.id);
    try {
      await action();
      toast.success(successMessage);
    } catch (err) {
      console.error(err.code, err.message);
      toast.error(
        err.code === "unsettled-balance"
          ? `${member.name} still has an unsettled balance. Settle up first.`
          : "Something went wrong. Please try again."
      );
    } finally {
      setBusyId(null);
    }
  };

  // Runs the confirmed action. The action handles its own errors with a toast.
  const runConfirmed = async () => {
    if (!confirm) return;
    setConfirmBusy(true);
    try {
      await confirm.run();
    } finally {
      setConfirmBusy(false);
      setConfirm(null);
    }
  };

  const doLeave = async () => {
    setLeaving(true);
    try {
      await leaveGroup(user, group, myRole);
      toast.success("You left the group");
      navigate("/app");
    } catch (err) {
      console.error(err.code, err.message);
      toast.error(
        err.code === "unsettled-balance"
          ? "You still have an unsettled balance. Settle up before leaving."
          : "Could not leave the group. Please try again."
      );
      setLeaving(false);
    }
  };

  const actions = {
    addFriend: (m) =>
      runFor(m, () => sendFriendRequest(user, { uid: m.id, name: m.name }), `Request sent to ${m.name}`),
    acceptFriend: (m) =>
      runFor(m, () => acceptFriendRequest(user, m.id), `You and ${m.name} are friends`),
    makeAdmin: (m) =>
      runFor(m, () => setMemberRole(user, group, m, "admin"), `${m.name} is now an admin`),
    makeMember: (m) =>
      setConfirm({
        title: "Make a regular member?",
        message: `${m.name} will lose admin rights.`,
        label: "Make member",
        busyLabel: "Saving...",
        run: () => runFor(m, () => setMemberRole(user, group, m, "member"), `${m.name} is now a member`),
      }),
    remove: (m) =>
      setConfirm({
        title: "Remove this member?",
        message: `${m.name} will be removed from ${group.name}. This works only when their balance is settled.`,
        label: "Remove",
        busyLabel: "Removing...",
        run: () => runFor(m, () => removeMember(user, group, m), `${m.name} was removed`),
      }),
  };

  const onLeave = () => {
    if (iAmLastAdmin) return;
    setConfirm({
      title: "Leave this group?",
      message: `You will leave ${group.name}. This works only when your balance is settled.`,
      label: "Leave",
      busyLabel: "Leaving...",
      run: doLeave,
    });
  };

  return (
    <div className="mt-6 space-y-5">
      {/* Only admins add people, and not while the group is archived */}
      {canManage && (
        <section className={card}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className={title}>Add people</h2>
              <p className={`mt-1 text-sm ${muted}`}>
                Add your friends directly, or share the link with anyone who has an account.
              </p>
            </div>
            <button type="button" onClick={() => setAddOpen(true)} className={primaryBtn}>
              Add from friends
            </button>
          </div>

          <div className="mt-5 border-t border-emerald-100 pt-5 dark:border-white/5">
            <div className="flex flex-col gap-3 sm:flex-row">
              <label htmlFor="invite-link" className="sr-only">Invite link</label>
              <input
                id="invite-link"
                readOnly
                value={inviteLink}
                onFocus={(e) => e.target.select()}
                className={inputClass}
              />
              <button type="button" onClick={copyLink} className={primaryBtn}>
                Copy link
              </button>
            </div>
            <p className={`mt-3 text-xs ${muted}`}>
              Code: <span className="font-mono font-semibold">{group.inviteCode}</span>
            </p>
          </div>
        </section>
      )}

      <section className={card}>
        <h2 className={`mb-4 ${title}`}>
          Members
          {!membersLoading && !membersError && ` (${members.length})`}
        </h2>
        <MemberList
          members={members}
          loading={membersLoading}
          error={membersError}
          uid={user?.uid}
          relations={relations}
          busyId={busyId}
          canManage={canManage}
          actions={actions}
        />
      </section>

      <section className={card}>
        <h2 className={title}>Leave group</h2>
        <p className={`mb-4 mt-1 text-sm ${muted}`}>
          You can leave only when your balance is settled.
          {iAmLastAdmin && " You are the only admin. Make another member admin first."}
        </p>
        <button
          type="button"
          onClick={onLeave}
          disabled={leaving || !myRole || iAmLastAdmin}
          className="rounded-xl border border-rose-200 px-5 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-500/30 dark:text-rose-400 dark:hover:bg-white/5"
        >
          {leaving ? "Leaving..." : "Leave group"}
        </button>
      </section>

      <AddMembersDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        group={group}
        friends={friends}
      />

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title ?? ""}
        message={confirm?.message ?? ""}
        confirmLabel={confirm?.label ?? "Confirm"}
        busyLabel={confirm?.busyLabel}
        busy={confirmBusy}
        onConfirm={runConfirmed}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}