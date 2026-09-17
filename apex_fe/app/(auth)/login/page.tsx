import { signIn } from "./actions";

interface LoginPageProps {
  searchParams: Promise<{ error?: string; next?: string; email?: string }>;
}

export const metadata = { title: "Sign in — Apex" };

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, next, email: prefillEmail } = await searchParams;

  return (
    <div className="flex min-h-full flex-col justify-center px-6 py-24 lg:px-8 bg-[#f9f8f6]">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Apex Lead Tracker
        </h1>
        <p className="mt-1 text-sm text-zinc-500">Sign in to your account</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-sm">
        {error && (
          <div
            role="alert"
            className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {humaniseError(error)}
          </div>
        )}

        <form action={signIn} className="space-y-5">
          {/* Pass `next` through so the server action can honour it */}
          {next && (
            <input type="hidden" name="next" value={next} />
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-zinc-700"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              defaultValue={prefillEmail ?? ''}
              className="mt-1 block w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus-visible:border-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-zinc-700"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="mt-1 block w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus-visible:border-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Map raw Supabase / auth error strings to readable copy
// ---------------------------------------------------------------------------
function humaniseError(code: string): string {
  switch (code) {
    case "Invalid login credentials":
      return "Email or password is incorrect.";
    case "Email not confirmed":
      return "Check your inbox and confirm your email before signing in.";
    case "auth_callback_failed":
      return "The sign-in link has expired or was already used. Request a new one.";
    case "session_missing":
      return "Session could not be established. Try signing in again.";
    default:
      return code;
  }
}
