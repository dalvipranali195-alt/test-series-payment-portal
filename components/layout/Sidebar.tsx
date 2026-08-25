'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { UserRole } from '@/types/database.types';
import SignOutButton from './SignOutButton';

interface NavItem {
  href: string;
  label: string;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', roles: ['admin', 'paper_checker', 'supervisor', 'staff'] },
  { href: '/paper-checker', label: 'Paper Checker', roles: ['admin', 'paper_checker', 'staff'] },
  { href: '/supervisor', label: 'Supervisor', roles: ['admin', 'supervisor', 'staff'] },
  { href: '/open-day', label: 'Open Day', roles: ['admin', 'staff'] },
  { href: '/confirmation-queue', label: 'Confirmation Queue', roles: ['admin', 'staff'] },
  { href: '/payment-management', label: 'Payment Management', roles: ['admin'] },
  { href: '/reports', label: 'Reports', roles: ['admin', 'staff'] },
  { href: '/audit-history', label: 'Audit History', roles: ['admin'] },
];

const ADMIN_ITEMS: NavItem[] = [
  { href: '/admin/staff', label: 'Staff', roles: ['admin'] },
  { href: '/admin/branches', label: 'Branches', roles: ['admin'] },
  { href: '/admin/subjects', label: 'Subjects', roles: ['admin'] },
  { href: '/admin/batches', label: 'Batches', roles: ['admin'] },
  { href: '/admin/payment-rates', label: 'Payment Rates', roles: ['admin'] },
];

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <Link
      href={item.href}
      className={`block rounded-md px-3 py-2 text-sm font-medium ${
        isActive ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
      }`}
    >
      {item.label}
    </Link>
  );
}

export default function Sidebar({
  role,
  fullName,
}: {
  role: UserRole;
  fullName: string;
}) {
  const pathname = usePathname();
  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role));
  const visibleAdminItems = ADMIN_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col bg-slate-900 text-white">
      <div className="border-b border-slate-800 px-4 py-4">
        <p className="text-sm font-semibold">Test Series Portal</p>
        <p className="mt-0.5 truncate text-xs text-slate-400">{fullName}</p>
        <p className="text-xs capitalize text-slate-500">{role.replace('_', ' ')}</p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
        {visibleItems.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}

        {visibleAdminItems.length > 0 && (
          <div className="pt-4">
            <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Admin
            </p>
            {visibleAdminItems.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} />
            ))}
          </div>
        )}

        <div className="pt-4">
          <NavLink item={{ href: '/settings', label: 'Settings', roles: [] }} pathname={pathname} />
        </div>
      </nav>

      <div className="border-t border-slate-800 px-2 py-3">
        <SignOutButton className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-800 hover:text-white" />
      </div>
    </aside>
  );
}
