import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { toast } from "sonner";
import { useAuth } from "../../hooks/useAuth";
import { useFriendships } from "../../hooks/useFriendships";
import { acceptFriendRequest, getProfile, sendFriendRequest } from "../../services/friendService";
import ThemeToggle from "../../components/ThemeToggle";

const primaryBtn =
  "block w-full rounded-xl bg-emerald-600 py-3.5 text-center font-semibold text-white shadow-lg shadow-emerald-100 transition hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 dark:shadow-none dark:hover:bg-emerald-500";
const linkClass =
  "inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 transition hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200";
const heading = "text-3xl font-bold text-gray-900 dark:text-white";
const body = "mb-8 mt-3 text-sm leading-6 text-gray-500 dark:text-green-300/70";

export default function AddFriend() {
  const { uid: targetUid } = useParams();
  const { user } = useAuth();
  const { relations, loading: relationsLoading } = useFriendships();

  const [status, setStatus] = useState("loading"); // loading | ready | notfound | error
  const [profile, setProfile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    let cancelled = false;
    getProfile(targetUid)
      .then((result) => {
        if (cancelled) return;
        setProfile(result);
        setStatus(result ? "ready" : "notfound");
      })
      .catch((err) => {
        console.error(err.code, err.message);
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [targetUid]);

  const relation = relations[targetUid]; // "friend" | "incoming" | "outgoing" | undefined
  const name = profile?.name ?? "this person";

  const act = async (action, successMessage) => {
    setBusy(true);
    setActionError("");
    try {
      await action();
      toast.success(successMessage);
    } catch (err) {
      console.error(err.code, err.message);
      setActionError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  let content;

  if (status === "loading" || (status === "ready" && relationsLoading)) {
    content = (
      <p className="text-sm text-gray-500 dark:text-green-300/70" aria-busy="true">
        Checking the link...
      </p>
    );
  } else if (status === "error") {
    content = (
      <p
        role="alert"
        className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300"
      >
        Could not check this link. Please refresh and try again.
      </p>
    );
  } else if (status === "notfound") {
    content = (
      <>
        <h1 className={heading}>Link not valid</h1>
        <p className={body}>
          We could not find this person. Ask them to open SplitEase once, then send the link again.
        </p>
        <Link to="/app" className={linkClass}>
          <span aria-hidden="true">←</span> Go to dashboard
        </Link>
      </>
    );
  } else if (targetUid === user.uid) {
    content = (
      <>
        <h1 className={heading}>This is your own link</h1>
        <p className={body}>Share it with a friend so they can send you a request.</p>
        <Link to="/app/friends" className={primaryBtn}>Open friends</Link>
      </>
    );
  } else if (relation === "friend") {
    content = (
      <>
        <h1 className={heading}>You and {name} are friends</h1>
        <p className={body}>You can add each other to groups.</p>
        <Link to="/app/friends" className={primaryBtn}>Open friends</Link>
      </>
    );
  } else if (relation === "outgoing") {
    content = (
      <>
        <h1 className={heading}>Request sent</h1>
        <p className={body}>{name} needs to accept it on their Friends page.</p>
        <Link to="/app/friends" className={primaryBtn}>Open friends</Link>
      </>
    );
  } else if (relation === "incoming") {
    content = (
      <>
        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Friend request</p>
        <h1 className={`mt-1 ${heading}`}>{name} already sent you a request</h1>
        <p className={body}>Accept it to become friends.</p>
        {actionError && (
          <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
            {actionError}
          </p>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => act(() => acceptFriendRequest(user, targetUid), `You and ${name} are friends`)}
          className={primaryBtn}
        >
          {busy ? "Accepting..." : "Accept request"}
        </button>
      </>
    );
  } else {
    content = (
      <>
        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Add friend</p>
        <h1 className={`mt-1 ${heading}`}>{name}</h1>
        <p className={body}>
          Send a friend request. Once {name} accepts, you can add each other to groups.
        </p>
        {actionError && (
          <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
            {actionError}
          </p>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            act(() => sendFriendRequest(user, { uid: targetUid, name: profile.name }), `Request sent to ${name}`)
          }
          className={primaryBtn}
        >
          {busy ? "Sending..." : "Send friend request"}
        </button>
        <div className="mt-6 text-center">
          <Link to="/app" className={linkClass}>Not now</Link>
        </div>
      </>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-green-50 p-4 dark:bg-[#06150f]">
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl dark:bg-[#0c1f17] dark:shadow-none dark:ring-1 dark:ring-white/5">
        {content}
      </div>
    </div>
  );
}