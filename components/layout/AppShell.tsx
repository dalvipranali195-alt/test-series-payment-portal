'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import type { UserRole } from '@/types/database.types';

export default function AppShell({
  role,
  fullName,
  children,
}: {
  role: UserRole;
  fullName: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {open && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-40 transform transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar role={role} fullName={fullName} onNavigate={() => setOpen(false)} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="rounded-md p-2 text-slate-700 hover:bg-slate-100"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M2.5 5h15M2.5 10h15M2.5 15h15" strokeLinecap="round" />
            </svg>
          </button>
          <p className="text-sm font-semibold text-slate-900">Test Series Portal</p>
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
