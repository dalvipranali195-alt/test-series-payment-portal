import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database.types';

export type Profile = Database['public']['Tables']['profiles']['Row'];

/** Current signed-in user's profile row, or null if unauthenticated. */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return profile;
}

/**
 * Guard for admin-only pages and server actions. Redirects non-admins to
 * /dashboard. RLS is still the real enforcement layer — this only keeps the
 * UI from rendering admin screens or attempting admin-only writes for
 * users who'd be rejected by the database anyway.
 */
export async function requireAdmin(): Promise<Profile> {
  const profile = await getCurrentProfile();

  if (!profile || !profile.is_active || profile.role !== 'admin') {
    redirect('/dashboard');
  }

  return profile;
}
