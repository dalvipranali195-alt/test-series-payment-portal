import { getCurrentProfile } from '@/lib/auth';

export default async function DashboardPage() {
  const profile = await getCurrentProfile();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
      <p className="mt-1 text-sm text-slate-600">
        Welcome back, {profile?.full_name}. Aggregate cards and filters land in Phase 5 — this
        is the Phase 1 foundation shell.
      </p>
    </div>
  );
}
