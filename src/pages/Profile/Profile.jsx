import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useAuth } from '../../hooks/useAuth'
import { getInitials } from '../../utils/getInitials'

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(40, 'Name must be 40 characters or fewer'),
})

export default function Profile() {
  const { user, updateName } = useAuth()

  const {
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: user?.displayName ?? '' },
  })


  const liveName = watch('name')

  const onSubmit = async ({ name }) => {
    clearErrors('root.serverError')
    try {
      await updateName(name)
      reset({ name }) // the saved value becomes the new baseline, so isDirty is false again
      toast.success('Profile updated')
    } catch (err) {
      console.error(err)
      setError('root.serverError', {
        message: 'Could not save your name. Please try again.',
      })
    }
  }

  const inputClass =
    'w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-green-300/40 dark:focus:border-emerald-500 dark:focus:bg-white/10 dark:focus:ring-emerald-500/20'

  const labelClass = 'mb-2 block text-sm font-medium text-gray-700 dark:text-green-100'

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-green-300/70">
        This is how you appear to the people in your groups.
      </p>

      <div className="mt-6 rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-[#0c1f17] dark:shadow-none">
        {/* Avatar */}
        <div className="mb-6 flex items-center gap-4">
          <div
            aria-hidden="true"
            className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-600 text-2xl font-bold text-white"
          >
            {getInitials(liveName)}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-gray-900 dark:text-white">
              {user?.displayName || 'No name yet'}
            </p>
            <p className="truncate text-sm text-gray-500 dark:text-green-300/70">
              {user?.email}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          <div>
            <label htmlFor="name" className={labelClass}>
              Display name
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              placeholder="Your full name"
              aria-invalid={!!errors.name}
              className={inputClass}
              {...register('name')}
            />
            {errors.name && (
              <p role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.name.message}
              </p>
            )}
          </div>

      
          <div>
            <label htmlFor="email" className={labelClass}>
              Email
            </label>
            <input
              id="email"
              type="email"
              value={user?.email ?? ''}
              readOnly
              disabled
              className={`${inputClass} cursor-not-allowed opacity-60`}
            />
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
            disabled={!isDirty || isSubmitting}
            className="rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-emerald-500"
          >
            {isSubmitting ? 'Saving...' : 'Save changes'}
          </button>
        </form>
      </div>
    </div>
  )
}