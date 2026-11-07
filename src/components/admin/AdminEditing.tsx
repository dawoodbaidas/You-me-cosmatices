'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react'

interface AdminEditingState {
  editing: boolean
  setEditing: (editing: boolean) => void
}

const AdminEditingContext = createContext<AdminEditingState | null>(null)

export function useAdminEditing() {
  return useContext(AdminEditingContext)
}

export const UNSAVED_ADMIN_CHANGES =
  'لديك تعديلات غير محفوظة. هل تريدين مغادرة الصفحة دون حفظها؟'

export function AdminEditingProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [editing, setEditing] = useState(false)

  const [previousPathname, setPreviousPathname] = useState(pathname)
  if (previousPathname !== pathname) {
    setPreviousPathname(pathname)
    setEditing(false)
  }

  useEffect(() => {
    if (!editing) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [editing])

  const value = useMemo(() => ({ editing, setEditing }), [editing])

  return <AdminEditingContext.Provider value={value}>{children}</AdminEditingContext.Provider>
}

/**
 * Admin-internal link that asks before discarding an open editor draft.
 * The confirmation runs before Next's client navigation begins.
 */
export function AdminLink({ onClick, ...props }: ComponentProps<typeof Link>) {
  const context = useAdminEditing()

  return (
    <Link
      {...props}
      onClick={(event) => {
        if (context?.editing) {
          if (!window.confirm(UNSAVED_ADMIN_CHANGES)) {
            event.preventDefault()
            return
          }
          context.setEditing(false)
        }
        onClick?.(event)
      }}
    />
  )
}
