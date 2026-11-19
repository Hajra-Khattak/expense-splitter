import { useState } from "react";
import { useOutletContext } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useAuth } from "../../hooks/useAuth";
import { groupSchema } from "../../utils/groupSchema";
import { setGroupArchived, updateGroupDetails } from "../../services/groupService";

// Same rules as the create form, without the currency (it never changes after creation).
const detailsSchema = groupSchema.pick({ name: true, description: true });

const card =
  "rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#0c1f17] dark:shadow-none";
const title = "font-semibold text-gray-900 dark:text-white";
const muted = "text-gray-500 dark:text-green-300/60";
const labelClass = "mb-2 block text-sm font-medium text-gray-700 dark:text-green-100";
const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 read-only:opacity-60 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-green-300/40 dark:focus:border-emerald-500 dark:focus:bg-white/10 dark:focus:ring-emerald-500/20";
const errorClass = "mt-1 text-sm text-red-600 dark:text-red-400";
const primaryBtn =
  "rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-100 transition hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 dark:shadow-none dark:hover:bg-emerald-500";

export default function SettingsTab() {
  const { group, isAdmin, membersLoading } = useOutletContext();
  const { user } = useAuth();
  const [archiving, setArchiving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    resolver: zodResolver(detailsSchema),
    defaultValues: { name: group.name, description: group.description ?? "" },
  });

  if (membersLoading) {
    return <p className={`mt-6 text-sm ${muted}`}>Loading...</p>;
  }

  if (!isAdmin) {
    return (
      <p className={`mt-6 rounded-2xl ${card} text-sm ${muted}`}>
        Only admins can change the group settings.
      </p>
    );
  }

  const onSubmit = async (values) => {
    clearErrors("root.serverError");
    try {
      await updateGroupDetails(user, group, values);
      toast.success("Group updated");
      reset(values); // the saved values become the new starting point
    } catch (err) {
      console.error(err.code, err.message);
      setError("root.serverError", { message: "Could not save the changes. Please try again." });
    }
  };

  const toggleArchive = async () => {
    const next = !group.archived;
    const question = next
      ? "Archive this group? It becomes read-only for everyone. You can unarchive it later."
      : "Unarchive this group?";
    if (!window.confirm(question)) return;

    setArchiving(true);
    try {
      await setGroupArchived(user, group, next);
      toast.success(next ? "Group archived" : "Group unarchived");
    } catch (err) {
      console.error(err.code, err.message);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setArchiving(false);
    }
  };

  return (
    <div className="mt-6 space-y-5">
      <section className={card}>
        <h2 className={title}>Group details</h2>
        {group.archived && (
          <p className={`mt-1 text-sm ${muted}`}>This group is archived. Unarchive it to edit.</p>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-4 space-y-5">
          <div>
            <label htmlFor="group-name" className={labelClass}>Group name</label>
            <input
              id="group-name"
              readOnly={group.archived}
              aria-invalid={!!errors.name}
              className={inputClass}
              {...register("name")}
            />
            {errors.name && <p role="alert" className={errorClass}>{errors.name.message}</p>}
          </div>

          <div>
            <label htmlFor="group-description" className={labelClass}>Description</label>
            <textarea
              id="group-description"
              rows={3}
              readOnly={group.archived}
              aria-invalid={!!errors.description}
              className={inputClass}
              {...register("description")}
            />
            {errors.description && (
              <p role="alert" className={errorClass}>{errors.description.message}</p>
            )}
          </div>

          {errors.root?.serverError && (
            <p
              role="alert"
              className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300"
            >
              {errors.root.serverError.message}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !isDirty || group.archived}
            className={primaryBtn}
          >
            {isSubmitting ? "Saving..." : "Save changes"}
          </button>
        </form>
      </section>

      <section className={card}>
        <h2 className={title}>{group.archived ? "Unarchive group" : "Archive group"}</h2>
        <p className={`mb-4 mt-1 text-sm ${muted}`}>
          {group.archived
            ? "Unarchiving lets everyone add expenses and change the group again."
            : "An archived group is read-only for everyone. Nothing is deleted, and you can unarchive it later."}
        </p>
        <button
          type="button"
          onClick={toggleArchive}
          disabled={archiving}
          className="rounded-xl border border-amber-300 px-5 py-2.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-amber-500/30 dark:text-amber-300 dark:hover:bg-white/5"
        >
          {archiving ? "Please wait..." : group.archived ? "Unarchive group" : "Archive group"}
        </button>
      </section>
    </div>
  );
}