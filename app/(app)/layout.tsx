import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/auth';
import AppShell from '@/components/layout/AppShell';
import SignOutButton from '@/components/layout/SignOutButton';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect('/login');
  }

  if (!profile.is_active) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4 text-center">
        <h1 className="text-lg font-semibold text-slate-900">Account pending activation</h1>
        <p className="max-w-sm text-sm text-slate-600">
          Your account has been created but is not active yet. An admin needs to assign your
          role and branch before you can use the portal.
        </p>
        <div className="w-40">
          <SignOutButton />
        </div>
      </div>
    );
  }

  return (
    <AppShell role={profile.role} fullName={profile.full_name}>
      {children}
    </AppShell>
  );
}
