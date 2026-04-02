import Link from "next/link";

import { PageShell } from "@/components/page-shell";
import { Panel } from "@/components/panel";

export default function LoginPage() {
  return (
    <PageShell
      eyebrow="Auth"
      title="Log back in"
      description="Sprint 1 uses email and password auth. This screen is the route foundation for the real login flow we’ll wire to Supabase next."
    >
      <div className="grid gap-8 lg:grid-cols-[1fr_0.8fr]">
        <Panel title="Login">
          <form className="grid gap-4">
            <label className="grid gap-2 text-sm text-stone-200">
              Email
              <input
                type="email"
                placeholder="you@example.com"
                className="rounded-2xl border border-white/12 bg-white/6 px-4 py-3 outline-none placeholder:text-stone-500"
              />
            </label>
            <label className="grid gap-2 text-sm text-stone-200">
              Password
              <input
                type="password"
                placeholder="••••••••"
                className="rounded-2xl border border-white/12 bg-white/6 px-4 py-3 outline-none placeholder:text-stone-500"
              />
            </label>
            <button
              type="button"
              className="mt-2 rounded-full bg-[#f2bf5e] px-5 py-3 text-sm font-medium text-[#102117]"
            >
              Login flow next
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
