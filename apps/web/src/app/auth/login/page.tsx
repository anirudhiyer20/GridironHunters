import Link from "next/link";

import { PageShell } from "@/components/page-shell";
import { Panel } from "@/components/panel";
import { login } from "@/app/auth/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;

  return (
    <PageShell
      eyebrow="Auth"
      title="Log back in"
      description="Sprint 1 uses email and password auth. This screen is the route foundation for the real login flow we’ll wire to Supabase next."
    >
      <div className="grid gap-8 lg:grid-cols-[1fr_0.8fr]">
        <Panel title="Login">
          <form action={login} className="grid gap-4">
            {message ? (
              <p className="rounded-2xl border border-[#f2bf5e]/30 bg-[#f2bf5e]/10 px-4 py-3 text-sm text-[#f7dca6]">
                {message}
              </p>
            ) : null}
            <label className="grid gap-2 text-sm text-stone-200">
              Email
              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                className="rounded-2xl border border-white/12 bg-white/6 px-4 py-3 outline-none placeholder:text-stone-500"
              />
            </label>
            <label className="grid gap-2 text-sm text-stone-200">
              Password
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                className="rounded-2xl border border-white/12 bg-white/6 px-4 py-3 outline-none placeholder:text-stone-500"
              />
            </label>
            <button
              type="submit"
              className="mt-2 rounded-full bg-[#f2bf5e] px-5 py-3 text-sm font-medium text-[#102117]"
            >
              Log in
            </button>
          </form>
        </Panel>

        <Panel
          title="What Happens Next"
          description="Once we wire the real auth flow, this route will create a session, require email verification, and route users into the /app namespace."
        >
          <ul className="grid gap-3 text-sm leading-6 text-stone-300">
            <li>Human users use email and password only.</li>
            <li>Email verification is required.</li>
            <li>Platform admins will later gain impersonation support.</li>
          </ul>
          <p className="mt-5 text-sm text-stone-400">
            Need an account?{" "}
            <Link href="/auth/signup" className="text-[#f2bf5e]">
              Sign up here
            </Link>
          </p>
        </Panel>
      </div>
    </PageShell>
  );
}
