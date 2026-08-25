import { logout } from '@/app/(auth)/login/actions';

export default function SignOutButton({ className }: { className?: string }) {
  return (
    <form action={logout}>
      <button
        type="submit"
        className={
          className ??
          'w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100'
        }
      >
        Sign out
      </button>
    </form>
  );
}
