import LoginForm from './LoginForm';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Test Series Payment Portal</h1>
        <p className="mt-1 text-sm text-slate-500">Sign in to continue</p>

        <div className="mt-6">
          <LoginForm next={next ?? '/dashboard'} />
        </div>
      </div>
    </div>
  );
}
