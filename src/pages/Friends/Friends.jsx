import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useAuth } from "../../hooks/useAuth";
import { useFriendships } from "../../hooks/useFriendships";
import {
  acceptFriendRequest,
  findUserByEmail,
  removeFriendship,
  sendFriendRequest,
} from "../../services/friendService";
import { initials } from "../../utils/initials";

const emailSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
});

/* ---------- shared class names (same tokens as the dashboard) ---------- */
const card =
  "rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#0c1f17] dark:shadow-none";
const title = "font-semibold text-gray-900 dark:text-white";
const muted = "text-gray-500 dark:text-green-300/60";
const row = "rounded-xl bg-green-50 dark:bg-white/[0.03]";
const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-green-300/40 dark:focus:border-emerald-500 dark:focus:bg-white/10 dark:focus:ring-emerald-500/20";
const errorClass = "mt-1 text-sm text-red-600 dark:text-red-400";
const primaryBtn =
  "shrink-0 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-100 transition hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 dark:shadow-none dark:hover:bg-emerald-500";
const smallPrimary =
  "rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-emerald-500";
const smallGhost =
  "rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-transparent dark:text-emerald-300 dark:hover:bg-white/5";
const smallDanger =
  "rounded-lg px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:text-rose-400 dark:hover:bg-white/5";

function Avatar({ name }) {
  return (
    <div
      aria-hidden="true"
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
    >
      {initials(name)}
    </div>
  );
}

function PersonRow({ name, note, children }) {
  return (
    <li className={`flex items-center justify-between gap-3 p-3 ${row}`}>
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={name} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{name}</p>
          {note && <p className={`text-xs ${muted}`}>{note}</p>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </li>
  );
}

export default function Friends() {
  const { user } = useAuth();
  const { friends, incoming, outgoing, relations, loading, error } = useFriendships();
  const [busyId, setBusyId] = useState(null);

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const friendLink = `${window.location.origin}/add-friend/${user.uid}`;

  const onSubmit = async ({ email }) => {
    clearErrors("root.serverError");
    try {
      const target = await findUserByEmail(email);
      if (!target) {
        setError("email", { message: "No account found with that email" });
        return;
      }
      if (target.uid === user.uid) {
        setError("email", { message: "That is your own email" });
        return;
      }
      const relation = relations[target.uid];
      if (relation === "friend") {
        setError("email", { message: `${target.name} is already your friend` });
        return;
      }
      if (relation === "outgoing") {
        setError("email", { message: `You already sent ${target.name} a request` });
        return;
      }
      if (relation === "incoming") {
        setError("email", { message: `${target.name} already sent you a request. Accept it below.` });
        return;
      }

      await sendFriendRequest(user, target);
      toast.success(`Request sent to ${target.name}`);
      reset();
    } catch (err) {
      console.error(err.code, err.message);
      setError("root.serverError", { message: "Could not send the request. Please try again." });
    }
  };

  // Runs one action for one person and disables that person's buttons meanwhile.
  const run = async (otherId, action, successMessage) => {
    setBusyId(otherId);
    try {
      await action();
      if (successMessage) toast.success(successMessage);
    } catch (err) {
      console.error(err.code, err.message);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(friendLink);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy. Select the link and copy it by hand.");
    }
  };

  const confirmRemove = (f) => {
    if (!window.confirm(`Remove ${f.name} from your friends?`)) return;
    run(f.otherId, () => removeFriendship(user, f.otherId), "Friend removed");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Friends</h1>
        <p className={`text-sm ${muted}`}>
          Friends can be added to your groups with one tap.
        </p>
      </header>

      {/* Add by email */}
      <section className={card}>
        <h2 className={title}>Add a friend</h2>
        <p className={`mb-4 mt-1 text-sm ${muted}`}>Type the email they used to sign up.</p>
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-3 sm:flex-row sm:items-start"
        >
          <div className="flex-1">
            <label htmlFor="friend-email" className="sr-only">Friend's email</label>
            <input
              id="friend-email"
              type="email"
              autoComplete="off"
              placeholder="friend@example.com"
              aria-invalid={!!errors.email}
              className={inputClass}
              {...register("email")}
            />
            {errors.email && <p role="alert" className={errorClass}>{errors.email.message}</p>}
          </div>
          <button type="submit" disabled={isSubmitting} className={primaryBtn}>
            {isSubmitting ? "Sending..." : "Send request"}
          </button>
        </form>
        {errors.root?.serverError && (
          <p
            role="alert"
            className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300"
          >
            {errors.root.serverError.message}
          </p>
        )}

        <div className="mt-6 border-t border-emerald-100 pt-5 dark:border-white/5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Or share your friend link</h3>
          <p className={`mb-3 mt-1 text-xs ${muted}`}>
            Anyone who opens it can send you a request. You still have to accept.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <label htmlFor="friend-link" className="sr-only">Your friend link</label>
            <input
              id="friend-link"
              readOnly
              value={friendLink}
              onFocus={(e) => e.target.select()}
              className={inputClass}
            />
            <button type="button" onClick={copyLink} className={primaryBtn}>
              Copy link
            </button>
          </div>
        </div>
      </section>

      {error && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300"
        >
          Could not load your friends. Please refresh and try again.
        </p>
      )}

      {/* Requests */}
      <section className={card}>
        <h2 className={`mb-4 ${title}`}>
          Requests
          {!loading && !error && ` (${incoming.length + outgoing.length})`}
        </h2>

        {loading ? (
          <div className="h-14 animate-pulse rounded-xl bg-emerald-100/60 dark:bg-white/5" aria-busy="true" />
        ) : incoming.length + outgoing.length === 0 ? (
          <p className={`text-sm ${muted}`}>No pending requests.</p>
        ) : (
          <ul className="space-y-3">
            {incoming.map((f) => (
              <PersonRow key={f.otherId} name={f.name} note="Wants to be your friend">
                <button
                  type="button"
                  disabled={busyId === f.otherId}
                  onClick={() =>
                    run(f.otherId, () => acceptFriendRequest(user, f.otherId), `You and ${f.name} are friends`)
                  }
                  className={smallPrimary}
                >
                  Accept
                </button>
                <button
                  type="button"
                  disabled={busyId === f.otherId}
                  onClick={() => run(f.otherId, () => removeFriendship(user, f.otherId))}
                  className={smallGhost}
                >
                  Decline
                </button>
              </PersonRow>
            ))}
            {outgoing.map((f) => (
              <PersonRow key={f.otherId} name={f.name} note="Request sent">
                <button
                  type="button"
                  disabled={busyId === f.otherId}
                  onClick={() => run(f.otherId, () => removeFriendship(user, f.otherId), "Request cancelled")}
                  className={smallGhost}
                >
                  Cancel
                </button>
              </PersonRow>
            ))}
          </ul>
        )}
      </section>

      {/* Friends */}
      <section className={card}>
        <h2 className={`mb-4 ${title}`}>
          My friends
          {!loading && !error && ` (${friends.length})`}
        </h2>

        {loading ? (
          <ul className="space-y-3" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <li key={i} className="h-14 animate-pulse rounded-xl bg-emerald-100/60 dark:bg-white/5" />
            ))}
          </ul>
        ) : friends.length === 0 ? (
          <p className={`text-sm ${muted}`}>
            No friends yet. Send a request by email or share your friend link.
          </p>
        ) : (
          <ul className="space-y-3">
            {friends.map((f) => (
              <PersonRow key={f.otherId} name={f.name}>
                <button
                  type="button"
                  disabled={busyId === f.otherId}
                  onClick={() => confirmRemove(f)}
                  className={smallDanger}
                >
                  Remove
                </button>
              </PersonRow>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}