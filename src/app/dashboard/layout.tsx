import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/lib/types";
import { logout } from "../login/actions";

const NAV_BY_ROLE: Record<UserRole, { href: string; label: string }[]> = {
  admin: [
    { href: "/dashboard", label: "Overview" },
    { href: "/dashboard/paper-checker", label: "Paper Checker" },
    { href: "/dashboard/supervisor", label: "Supervisor" },
    { href: "/dashboard/open-day", label: "Open Day" },
    { href: "/dashboard/rates", label: "Payment Rates" },
    { href: "/dashboard/users", label: "Users" },
    { href: "/dashboard/audit-log", label: "Audit Log" },
  ],
  paper_checker: [
    { href: "/dashboard", label: "Overview" },
    { href: "/dashboard/paper-checker", label: "My Submissions" },
  ],
  supervisor: [
    { href: "/dashboard", label: "Overview" },
    { href: "/dashboard/supervisor", label: "My Submissions" },
  ],
  staff_coordinator: [
    { href: "/dashboard", label: "Overview" },
    { href: "/dashboard/paper-checker", label: "Paper Checker" },
    { href: "/dashboard/supervisor", label: "Supervisor" },
    { href: "/dashboard/open-day", label: "Open Day" },
  ],
  accounts: [
    { href: "/dashboard", label: "Overview" },
    { href: "/dashboard/payments", label: "Payments Due" },
  ],
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  const role = profile?.role ?? "paper_checker";
  const navItems = NAV_BY_ROLE[role];

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col justify-between border-r border-gray-200 p-4">
        <div>
          <p className="mb-6 text-sm font-semibold">Payment Portal</p>
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-md px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <div>
            <p className="font-medium">{profile?.full_name ?? user.email}</p>
            <p className="text-gray-500">{role.replace("_", " ")}</p>
          </div>
          <form action={logout}>
            <button type="submit" className="text-left text-gray-500 underline">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
