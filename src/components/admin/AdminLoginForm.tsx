'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from '@/app/admin/actions'

export default function AdminLoginForm() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await signIn(email, password)
      if (result.ok) {
        router.push('/admin')
        router.refresh()
        return
      }
      setError(result.message)
    })
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-3">
      <label className="block">
        <span className="mb-1 block text-[12px] font-bold text-cocoa/70">البريد الإلكتروني</span>
        <input
          type="email"
          required
          autoComplete="email"
          dir="ltr"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-full border border-sand bg-[#FFFBF8] px-4 py-3 text-[14px] outline-none transition focus:border-rose focus:ring-2 focus:ring-rose/20"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-[12px] font-bold text-cocoa/70">كلمة السر</span>
        <input
          type="password"
          required
          autoComplete="current-password"
          dir="ltr"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-full border border-sand bg-[#FFFBF8] px-4 py-3 text-[14px] font-bold outline-none transition focus:border-rose focus:ring-2 focus:ring-rose/20"
        />
      </label>

      {error && (
        <p role="alert" className="rounded-full bg-blush px-4 py-2 text-[12px] font-bold text-rose">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-cocoa py-3 text-[14px] font-bold text-white transition hover:bg-rose disabled:opacity-60"
      >
        {pending ? 'جارٍ الدخول…' : 'دخول'}
      </button>
    </form>
  )
}
