import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { useAuth } from "../../hooks/useAuth";
import { useGroups } from "../../hooks/useGroups";
import { getInvite, joinGroup } from "../../services/groupService";
import ThemeToggle from "../../components/ThemeToggle";

const primaryBtn =
  "w-full rounded-xl bg-emerald-600 py-3.5 text-center font-semibold text-white shadow-lg shadow-emerald-100 transition hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 dark:shadow-none dark:hover:bg-emerald-500";
const linkClass =
  "inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 transition hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200";

export default function JoinGroup() {
  const { code } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { groups, loading: groupsLoading } = useGroups();

  const [status, setStatus] = useState("loading"); // loading | ready | invalid | error
  const [invite, setInvite] = useState(null);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");

  // Read the invite once (it holds the group id and a copy of the group name).
  useEffect(() => {
    let cancelled = false;
    getInvite(code)
      .then((result) => {
        if (cancelled) return;
        setInvite(result);
        setStatus(result ? "ready" : "invalid");
      })
      .catch((err) => {
        console.error(err.code, err.message);
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  // A non-member cannot read the member doc, so use the groups list I already listen to.
  const alreadyMember = !!invite && groups.some((g) => g.id === invite.groupId);
  const groupName = invite?.groupName ?? "this group";

  const onJoin = async () => {
    setJoining(true);
    setJoinError("");
    try {
      const groupId = await joinGroup(user, code);
      toast.success(`You joined ${groupName}`);
      navigate(`/app/groups/${groupId}`);
    } catch (err) {
      console.error(err.code, err.message);
      setJoinError(
        err.code === "invalid-invite"
          ? "This invite link is not valid."
          : "Could not join the group. Please try again."
      );
      setJoining(false);
    }
  };

  let content;

  if (status === "loading" || (status === "ready" && groupsLoading)) {
    content = (
      <p className="text-sm text-gray-500 dark:text-green-300/70" aria-busy="true">
        Checking the invite...
      </p>
    );
  } else if (status === "error") {
    content = (
      <p
        role="alert"
        className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300"
      >
        Could not check this invite. Please refresh and try again.
      </p>
    );
  } else if (status === "invalid") {
    content = (
      <>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Invalid invite link</h1>
        <p className="mt-3 text-sm leading-6 text-gray-500 dark:text-green-300/70">
          This link does not match any group. Ask the person who sent it for a new one.
        </p>
        <Link to="/app" className={`mt-8 ${linkClass}`}>
          <span aria-hidden="true">←</span>
          Go to dashboard
        </Link>
      </>
    );
  } else if (alreadyMember) {
    content = (
      <>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          You are already in {groupName}
        </h1>
        <p className="mb-8 mt-3 text-sm leading-6 text-gray-500 dark:text-green-300/70">
          There is nothing to join. Open the group to see your expenses.
        </p>
        <Link to={`/app/groups/${invite.groupId}`} className={`block ${primaryBtn}`}>
          Open group
        </Link>
      </>
    );
  } else {
    content = (
      <>
        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
          You are invited to join
        </p>
        <h1 className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">{groupName}</h1>
        <p className="mb-8 mt-3 text-sm leading-6 text-gray-500 dark:text-green-300/70">
          You will be added as a member and the group will show on your dashboard.
        </p>

        {joinError && (
          <p
            role="alert"
            className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300"
          >
            {joinError}
          </p>
        )}

        <button type="button" onClick={onJoin} disabled={joining} className={primaryBtn}>
          {joining ? "Joining..." : "Join group"}
        </button>

        <div className="mt-6 text-center">
          <Link to="/app" className={linkClass}>
            Not now
          </Link>
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