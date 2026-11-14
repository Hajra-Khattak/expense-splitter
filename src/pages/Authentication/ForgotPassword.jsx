import { useState } from 'react'
import { Link } from 'react-router'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { getAuthError } from '../../utils/authErrors'
import { useAuth } from '../../hooks/useAuth'
import ThemeToggle from '../../components/ThemeToggle'

const schema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Enter a valid email address'),
})

export default function ForgotPassword() {
  const { resetPassword } = useAuth()
  const [sentTo, setSentTo] = useState('')

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  })

  const onSubmit = async ({ email }) => {
    clearErrors('root.serverError')
    setSentTo('')
    try {
      await resetPassword(email)
      setSentTo(email)
    } catch (err) {
      // Do not reveal whether an email has an account: treat "not found" as success.
      if (err?.code === 'auth/user-not-found') {
        setSentTo(email)
        return
      }
      setError('root.serverError', { message: getAuthError(err) })
    }
  }

  const inputClass =
    'w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-green-300/40 dark:focus:border-emerald-500 dark:focus:bg-white/10 dark:focus:ring-emerald-500/20'

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-green-50 p-4 dark:bg-[#06150f]">
      {/* Theme toggle */}
    

      <div className="grid w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-xl dark:bg-[#0c1f17] dark:shadow-none dark:ring-1 dark:ring-white/5 md:grid-cols-2">
        {/* Left Section */}
        <div className="hidden flex-col justify-between bg-gradient-to-br from-emerald-700 to-green-950 p-12 text-white md:flex">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">SplitEase.</h1>
            <p className="mt-3 text-sm text-emerald-100">
              Split expenses. Share memories.
            </p>
          </div>

          <div className="mb-8 rounded-2xl border border-white/20 bg-white/10 p-7 backdrop-blur-sm">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/20 text-3xl">
              🔐
            </div>

            <p className="text-sm font-medium text-emerald-200">ACCOUNT SECURITY</p>

            <h2 className="mt-3 text-4xl font-bold leading-tight">
              Your account,
              <br />
              always secure.
            </h2>

            <p className="mt-5 text-sm leading-7 text-emerald-100">
              Forgot your password? Don't worry. We'll help you get back to
              managing your shared expenses in just a few steps.
            </p>
          </div>

          <p className="text-xs text-emerald-200">
            © 2026 SplitEase. All rights reserved. Hajra Khattak
          </p>
        </div>

        {/* Right Section */}
        <div className=" relative flex items-center justify-center px-6 py-16 sm:px-12">
              <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>
          <div className="w-full max-w-md">
            {/* Icon */}
            <div className="mb-7 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.7}
                stroke="currentColor"
                className="h-8 w-8"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 10.5V6.75a4.5 4.5 0 0 0-9 0v3.75m-1.5 0h12a1.5 1.5 0 0 1 1.5 1.5v8.25a1.5 1.5 0 0 1-1.5 1.5h-12a1.5 1.5 0 0 1-1.5-1.5V12a1.5 1.5 0 0 1 1.5-1.5Z"
                />
              </svg>
            </div>

            {/* Heading */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                Forgot password?
              </h2>
              <p className="mt-3 text-sm leading-6 text-gray-500 dark:text-green-300/70">
                No worries! Enter the email address associated with your account
                and we'll send you a link to reset your password.
              </p>
            </div>

            {/* Form */}
            <form
              onSubmit={handleSubmit(onSubmit)}
              noValidate
              className="space-y-5"
            >
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-gray-700 dark:text-green-100"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  aria-invalid={!!errors.email}
                  className={inputClass}
                  {...register('email')}
                />
                {errors.email && (
                  <p role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Firebase error */}
              {errors.root?.serverError && (
                <p
                  role="alert"
                  className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300"
                >
                  {errors.root.serverError.message}
                </p>
              )}

              {/* Success */}
              {sentTo && (
                <div
                  role="status"
                  className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200"
                >
                  If an account exists for <strong>{sentTo}</strong>, a reset link is
                  on its way. Check your spam folder too.
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-emerald-600 py-3.5 font-semibold text-white shadow-lg shadow-emerald-100 transition hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 dark:shadow-none dark:hover:bg-emerald-500"
              >
                {isSubmitting ? 'Sending...' : sentTo ? 'Send again' : 'Send reset link'}
              </button>
            </form>

            {/* Back to Login */}
            <div className="mt-8 text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 transition hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200"
              >
                <span aria-hidden="true">←</span>
                Back to login
              </Link>
            </div>

            <p className="mt-12 text-center text-xs text-gray-400 dark:text-green-300/40">
              Secure login. Your expenses stay organized.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}