import { HeroLink } from "@/components/hero-link";
import { PageShell } from "@/components/page-shell";
import { Panel } from "@/components/panel";
import { getProjectHost, hasSupabaseEnv } from "@/lib/env";
import { appName, sprintOneChecklist } from "@/lib/mock-data";

export default function Home() {
  const projectHost = getProjectHost();

  return (
    <PageShell
      eyebrow="Closed Beta Foundation"
      title={appName}
      description="Sprint 1 is focused on auth, leagues, roles, and invite-driven onboarding. The routes now follow the long-term /auth and /app structure so we can grow into drafts, capture, gauntlet, and admin tooling without flattening everything into one level."
    >
      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <Panel
          title="Where We Are"
          description="The project now has a real frontend shell, a migration-first backend, and the first route namespaces in place."
        >
          <ul className="grid gap-4">
            {sprintOneChecklist.map((check) => (
              <li
                key={check}
                className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/6 px-4 py-4"
              >
                <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400/20 text-sm text-emerald-300">
                  V
                </span>
                <span className="text-sm leading-6 text-stone-200 sm:text-base">
                  {check}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-wrap gap-3">
            <HeroLink href="/auth/signup">Create Account</HeroLink>
            <HeroLink href="/app/leagues" tone="secondary">
              Explore League Flows
            </HeroLink>
          </div>
        </Panel>

        <Panel
          title="Current Runtime"
          description="These are lightweight checks from the app environment, useful while the shared auth and league flows are still being built."
        >
          <div className="grid gap-3">
            <StatusCard label="Supabase Env" value={hasSupabaseEnv ? "Configured" : "Missing"} />
            <StatusCard
              label="Project Host"
              value={projectHost ?? "Add apps/web/.env.local"}
            />
            <StatusCard label="Route Shape" value="/auth + /app" />
          </div>
        </Panel>
      </div>
    </PageShell>
  );
}

function StatusCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[14rem] rounded-[1.5rem] border border-white/10 bg-black/20 px-4 py-4">
      <p className="font-mono text-[0.7rem] uppercase tracking-[0.28em] text-stone-500">
        {label}
      </p>
      <p className="mt-2 break-all text-base font-medium text-stone-100">{value}</p>
    </div>
  );
}
