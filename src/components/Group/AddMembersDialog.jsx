import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { useAuth } from "../../hooks/useAuth";
import { addFriendToGroup } from "../../services/groupService";
import { initials } from "../../utils/initials";

const primaryBtn =
  "rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-100 transition hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 dark:shadow-none dark:hover:bg-emerald-500";
const ghostBtn =
  "rounded-xl border border-emerald-200 bg-white px-5 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-transparent dark:text-emerald-300 dark:hover:bg-white/5";


export default function AddMembersDialog({ open, onClose, group, friends }) {
  const { user } = useAuth();
  const dialogRef = useRef(null);
  const [selected, setSelected] = useState([]); // friend uids
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const candidates = friends.filter((f) => !group.memberIds.includes(f.otherId));
  const picked = candidates.filter((f) => selected.includes(f.otherId));

  const toggle = (uid) =>
    setSelected((prev) => (prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]));

  const handleClose = () => {
    setSelected([]);
    onClose();
  };

  const onAdd = async () => {
    setAdding(true);
    let added = 0;
    const failed = [];

   
    for (const friend of picked) {
      try {
        await addFriendToGroup(user, group, friend);
        added += 1;
      } catch (err) {
        console.error(err.code, err.message);
        failed.push(friend);
      }
    }

    setAdding(false);
    if (added > 0) toast.success(`Added ${added} ${added === 1 ? "person" : "people"}`);

    if (failed.length === 0) {
      onClose();
    } else {
      toast.error(`Could not add: ${failed.map((f) => f.name).join(", ")}`);
      setSelected(failed.map((f) => f.otherId)); // keep only the ones that failed
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={handleClose}
      onClick={(e) => {
        
        if (e.target === dialogRef.current) onClose();
      }}
      aria-labelledby="add-members-title"
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl bg-white p-0 text-gray-900 shadow-xl backdrop:bg-black/50 dark:bg-[#0c1f17] dark:text-white dark:ring-1 dark:ring-white/10"
    >
      <div className="p-6">
        <h2 id="add-members-title" className="text-lg font-semibold text-gray-900 dark:text-white">
          Add from friends
        </h2>
        <p className="mb-4 mt-1 text-sm text-gray-500 dark:text-green-300/60">
          Pick one or more friends. They join the group right away.
        </p>

        {candidates.length === 0 ? (
          <p className="rounded-xl bg-green-50 px-4 py-3 text-sm text-gray-600 dark:bg-white/[0.03] dark:text-green-200/80">
            All your friends are already in this group, or you have no friends yet.{" "}
            <Link
              to="/app/friends"
              className="font-semibold text-emerald-700 underline dark:text-emerald-300"
            >
              Find friends
            </Link>
          </p>
        ) : (
          <ul className="max-h-72 space-y-2 overflow-y-auto">
            {candidates.map((f) => (
              <li key={f.otherId}>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-green-50 p-3 transition hover:bg-emerald-50 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]">
                  <input
                    type="checkbox"
                    checked={selected.includes(f.otherId)}
                    onChange={() => toggle(f.otherId)}
                    disabled={adding}
                    className="h-4 w-4 accent-emerald-600"
                  />
                  <span
                    aria-hidden="true"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                  >
                    {initials(f.name)}
                  </span>
                  <span className="min-w-0 truncate text-sm font-medium text-gray-900 dark:text-white">
                    {f.name}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={adding} className={ghostBtn}>
            Cancel
          </button>
          <button
            type="button"
            onClick={onAdd}
            disabled={adding || picked.length === 0}
            className={primaryBtn}
          >
            {adding ? "Adding..." : picked.length > 0 ? `Add ${picked.length}` : "Add"}
          </button>
        </div>
      </div>
    </dialog>
  );
}