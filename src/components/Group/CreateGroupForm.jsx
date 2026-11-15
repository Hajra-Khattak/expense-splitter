import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { groupSchema, CURRENCIES } from "../../utils/groupSchema";
import { createGroup } from "../../services/groupService";
import { useAuth } from "../../hooks/useAuth";

const label = "font-semibold text-gray-900 dark:text-gray-100";
const field =
  "mt-1 w-full rounded-lg border-2 border-emerald-200 bg-white px-3 py-2 text-gray-900 focus:border-emerald-600 focus:outline-none dark:border-emerald-900 dark:bg-[#08190f] dark:text-gray-100 dark:focus:border-emerald-500";
const errorText = "text-sm text-red-700 dark:text-red-400";

export default function CreateGroupForm() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(groupSchema),
    defaultValues: { name: "", description: "", currency: "PKR" },
  });

  const onSubmit = async (values) => {
    try {
      const { groupId, inviteSaved } = await createGroup(user, values);
      if (!inviteSaved) {
        toast.warning("Group created, but the invite link could not be saved yet.");
      } else {
        toast.success("Group created");
      }
      navigate(`/app/groups/${groupId}`);
    } catch (err) {
      console.error(err.code, err.message);
      setError("root.serverError", { message: "Could not create the group. Please try again." });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex max-w-md flex-col gap-4">
      <div>
        <label htmlFor="name" className={label}>Group name</label>
        <input id="name" aria-invalid={!!errors.name} className={field} {...register("name")} />
        {errors.name && <p role="alert" className={errorText}>{errors.name.message}</p>}
      </div>

      <div>
        <label htmlFor="description" className={label}>Description (optional)</label>
        <textarea
          id="description"
          rows={3}
          aria-invalid={!!errors.description}
          className={field}
          {...register("description")}
        />
        {errors.description && <p role="alert" className={errorText}>{errors.description.message}</p>}
      </div>

      <div>
        <label htmlFor="currency" className={label}>Currency</label>
        <select id="currency" className={field} {...register("currency")}>
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {errors.root?.serverError && (
        <p role="alert" className="text-red-700 dark:text-red-400">{errors.root.serverError.message}</p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 dark:bg-emerald-500 dark:text-[#06150f] dark:hover:bg-emerald-400"
      >
        {isSubmitting ? "Creating..." : "Create group"}
      </button>
    </form>
  );
}