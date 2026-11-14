import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { getAuthError } from '../../utils/authErrors'
import { useAuth } from '../../hooks/useAuth'
import ThemeToggle from '../../components/ThemeToggle'

const signupSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters'),
    email: z
      .string()
      .trim()
      .min(1, 'Email is required')
      .email('Enter a valid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export default function Signup() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const navigate = useNavigate()
  const { user, loading: authLoading, signup, loginWithGoogle } = useAuth()

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(signupSchema),
  })

  const busy = isSubmitting || googleLoading

  const onSubmit = async (data) => {
    try {
      await signup(data.name, data.email, data.password)
    } catch (err) {
      setError('root.serverError', { message: getAuthError(err) })
    }
  }

  const handleGoogle = async () => {
    clearErrors('root.serverError')
    setGoogleLoading(true)
    try {
      await loginWithGoogle()
    } catch (err) {
      const message = getAuthError(err)
      // empty message means "ignore" (for example, a cancelled popup request)
      if (message) setError('root.serverError', { message })
    } finally {
      setGoogleLoading(false)
    }
  }

//   useEffect(() => {
//     if (!authLoading && user) navigate('/app', { replace: true })
//   }, [authLoading, user, navigate])

  const inputClass =
    'w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-green-300/40 dark:focus:border-emerald-500 dark:focus:bg-white/10 dark:focus:ring-emerald-500/20'

  const labelClass = 'mb-2 block text-sm font-medium text-gray-700 dark:text-green-100'
  const errorClass = 'mt-1 text-sm text-red-600 dark:text-red-400'
  const toggleBtn =
    'absolute right-4 top-3.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-300 dark:hover:text-emerald-200'

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-green-50 p-4 dark:bg-[#06150f]">
      {/* Theme toggle */}
     

      <div className="grid w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-xl dark:bg-[#0c1f17] dark:shadow-none dark:ring-1 dark:ring-white/5 md:grid-cols-2">
        {/* Left Section */}
        <div className="hidden flex-col justify-between bg-gradient-to-br from-emerald-700 to-green-950 p-12 text-white md:flex">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">SplitEase.</h1>
            <p className="mt-3 text-sm text-green-200">
              Split expenses. Share memories.
            </p>
          </div>

          <div>
            <div className="mb-8 rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-sm">
              <p className="text-sm text-green-200">GROUP EXPENSES</p>

              <h2 className="mt-2 text-3xl font-bold">
                Everything shared,
                <br />
                fairly settled.
              </h2>

              <p className="mt-4 text-sm leading-6 text-green-200">
                Manage group expenses, track who owes what, and settle up
                without the awkward calculations.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex -space-x-3">
                {['A', 'S', 'H', 'M'].map((letter) => (
                  <div
                    key={letter}
                    className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-emerald-800 bg-white text-sm font-bold text-emerald-700"
                  >
                    {letter}
                  </div>
                ))}
              </div>

              <p className="text-sm text-green-200">
                Better together, easier with SplitEase.
              </p>
            </div>
          </div>

          <p className="text-xs text-green-300">
            © 2026 SplitEase. All rights reserved. Hajra Khattak
          </p>
        </div>

        {/* Right Section */}
        <div className="relative flex items-center justify-center px-6 py-10 sm:px-12">
            
             <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>
          <div className=" w-full max-w-md">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                Create an account
              </h2>
              <p className="mt-2 text-sm text-gray-500 dark:text-green-300/70">
                Start splitting expenses with your friends.
              </p>
            </div>

            {/* Google Signup */}
            <button
              type="button"
              onClick={handleGoogle}
              disabled={busy}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-200 py-3 font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:text-green-100 dark:hover:bg-white/5"
            >
              <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.72 7.18l7.3 5.66c4.26-3.94 6.7-9.74 6.7-17.31Z" />
                <path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.9.94 7.59 2.56 10.78l7.97-6.19Z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.79l-7.3-5.66c-2.02 1.36-4.6 2.16-8.61 2.16-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 43.62 14.62 48 24 48Z" />
              </svg>

              {googleLoading ? 'Connecting...' : 'Continue with Google'}
            </button>

            <div className="my-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-gray-200 dark:bg-white/10" />
              <span className="text-xs text-gray-400 dark:text-green-300/50">
                OR SIGN UP WITH EMAIL
              </span>
              <div className="h-px flex-1 bg-gray-200 dark:bg-white/10" />
            </div>

            <form
              onSubmit={handleSubmit(onSubmit)}
              noValidate
              className="space-y-4"
            >
              {/* Name */}
              <div>
                <label htmlFor="name" className={labelClass}>
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  placeholder="Enter your full name"
                  aria-invalid={!!errors.name}
                  className={inputClass}
                  {...register('name')}
                />
                {errors.name && (
                  <p role="alert" className={errorClass}>
                    {errors.name.message}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className={labelClass}>
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
                  <p role="alert" className={errorClass}>
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className={labelClass}>
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Create a password"
                    aria-invalid={!!errors.password}
                    className={`${inputClass} pr-16`}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className={toggleBtn}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                {errors.password && (
                  <p role="alert" className={errorClass}>
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className={labelClass}>
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Confirm your password"
                    aria-invalid={!!errors.confirmPassword}
                    className={`${inputClass} pr-16`}
                    {...register('confirmPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((s) => !s)}
                    className={toggleBtn}
                  >
                    {showConfirmPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p role="alert" className={errorClass}>
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              {/* Server / Firebase error */}
              {errors.root?.serverError && (
                <p
                  role="alert"
                  className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300"
                >
                  {errors.root.serverError.message}
                </p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-emerald-600 py-3.5 font-semibold text-white shadow-lg shadow-emerald-100 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 dark:shadow-none dark:hover:bg-emerald-500"
              >
                {isSubmitting ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-500 dark:text-green-300/70">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-300 dark:hover:text-emerald-200"
              >
                Sign in
              </Link>
            </p>

            <p className="mt-8 text-center text-xs text-gray-400 dark:text-green-300/40">
              By signing up, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}