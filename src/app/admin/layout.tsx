import React from 'react';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { ADMIN_SESSION_COOKIE, isValidAdminSession } from '@/lib/admin-session';
import { AdminLoginForm } from './AdminLoginForm';

export const metadata: Metadata = {
  title: 'Admin — LashAgenda',
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  const isAuthenticated = isValidAdminSession(session);

  if (!isAuthenticated) {
    return <AdminLoginForm />;
  }

  return <>{children}</>;
}
