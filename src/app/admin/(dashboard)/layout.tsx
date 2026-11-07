import AdminShell from '@/components/admin/AdminShell'
import { requireAdmin } from '@/lib/admin'

export const metadata = {
  title: 'لوحة المسؤول | You&Me Cosmetics',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin()

  return <AdminShell userEmail={user.email ?? ''}>{children}</AdminShell>
}
