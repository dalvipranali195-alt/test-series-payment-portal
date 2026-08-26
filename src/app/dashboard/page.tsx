import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single<Profile>();

  return (
    <div>
      <h1 className="text-xl font-semibold">
        Welcome, {profile?.full_name ?? user?.email}
      </h1>
      <p className="mt-2 text-sm text-gray-600">
        Role: {profile?.role.replace("_", " ")}
      </p>
      <p className="mt-6 text-sm text-gray-500">
        Record modules, the approval workflow, and reports land in the next
        build stages — see SPEC.md for the full plan.
      </p>
    </div>
  );
}
