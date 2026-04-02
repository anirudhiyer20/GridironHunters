import Link from "next/link";

import { PageShell } from "@/components/page-shell";
import { Panel } from "@/components/panel";
import { signup } from "@/app/auth/actions";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;

  return (
    <PageShell
      eyebrow="Auth"
      title="Create your beta account"
      description="This route is the foundation for closed-beta onboarding. The real implementation will create a verified human account before the user joins or creates a league."
    >
      <div className="grid gap-8 lg:grid-cols-[1fr_0.8fr]">
        <Panel title="Sign Up">
          <form action={signup} className="grid gap-4">
            {message ? (
              <p className="rounded-2xl border border-[#f2bf5e]/30 bg-[#f2bf5e]/10 px-4 py-3 text-sm text-[#f7dca6]">
                {message}
              </p>
            ) : null}
            <label className="grid gap-2 text-sm text-stone-200">
              Display name
              <input
                type="text"
                name="display_name"
                placeholder="Anirudh"
                className="rounded-2xl border border-white/12 bg-white/6 px-4 py-3 outline-none placeholder:text-stone-500"
              />
            </label>
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
                placeholder="Choose a secure password"
                className="rounded-2xl border border-white/12 bg-white/6 px-4 py-3 outline-none placeholder:text-stone-500"
              />
            </label>
            <button
              type="submit"
              className="mt-2 rounded-full bg-[#f2bf5e] px-5 py-3 text-sm font-medium text-[#102117]"
            >
              Create account
            </button>
          </form>
        </Panel>

        <Panel
          title="Closed Beta Notes"
          description="Invite codes are league-scoped for MVP, while account creation remains available so verified users can later join by code or create a league."
        >
          <ul className="grid gap-3 text-sm leading-6 text-stone-300">
            <li>Users can participate in one league at a time.</li>
            <li>Commissioners create leagues and share reusable invite codes.</li>
            <li>Admins can join multiple leagues for testing and backtesting.</li>
          </ul>
          <p className="mt-5 text-sm text-stone-400">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-[#f2bf5e]">
              Log in
            </Link>
          </p>
        </Panel>
      </div>
    </PageShell>
  );
}
