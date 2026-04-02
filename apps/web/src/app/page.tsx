import { appName, getProjectHost, hasSupabaseEnv } from "@/lib/env";

const launchChecks = [
  "GitHub repo linked and pushing cleanly",
  "Hosted Supabase project linked through CLI migrations",
  "Next.js app scaffolded inside apps/web",
  "Environment variables kept local and out of Git",
];

const starterTables = [
  "profiles",
  "leagues",
  "league_members",
];

export default function Home() {
  const projectHost = getProjectHost();

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#214d3b_0%,#11251d_38%,#09120e_100%)] text-stone-50">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:2.75rem_2.75rem] opacity-15" />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#f2bf5e]/20 to-transparent" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-10 sm:px-8 lg:px-10">
        <header className="flex flex-col gap-8 border-b border-white/10 pb-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-5">
            <p className="font-mono text-xs uppercase tracking-[0.35em] text-[#f2bf5e]">
              Initial Working Project
            </p>
            <h1 className="max-w-2xl text-5xl font-semibold leading-none text-balance sm:text-6xl">
              {appName}
            </h1>
            <p className="max-w-2xl text-base leading-7 text-stone-300 sm:text-lg">
              A clean starting point for building the fantasy football app with a
              migration-first Supabase backend and a Next.js frontend that is
              ready for real features.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <StatusCard
              label="Web App"
              value="Live"
              accent="text-emerald-300"
            />
            <StatusCard
              label="Supabase Env"
              value={hasSupabaseEnv ? "Configured" : "Missing"}
              accent={hasSupabaseEnv ? "text-emerald-300" : "text-amber-300"}
            />
            <StatusCard
              label="Project Host"
              value={projectHost ?? "Add apps/web/.env.local"}
              accent="text-stone-100"
            />
            <StatusCard
              label="Schema Mode"
              value="Migrations"
              accent="text-[#f2bf5e]"
            />
          </div>
        </header>

        <section className="grid flex-1 gap-8 py-10 lg:grid-cols-[1.3fr_0.9fr]">
          <article className="rounded-[2rem] border border-white/10 bg-white/6 p-6 backdrop-blur sm:p-8">
            <SectionLabel>Current Readiness</SectionLabel>
            <ul className="mt-5 grid gap-4">
              {launchChecks.map((check) => (
                <li
                  key={check}
                  className="flex items-start gap-3 rounded-2xl border border-white/8 bg-black/15 px-4 py-4"
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

            <div className="mt-8 rounded-[1.75rem] border border-[#f2bf5e]/20 bg-[#f2bf5e]/8 p-5">
              <SectionLabel>Tiny But Real Next Step</SectionLabel>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-200 sm:text-base">
                Add the first user-facing feature by creating a new migration,
                pushing it to Supabase, and then wiring the screen inside
                <code className="mx-1 rounded bg-black/20 px-1.5 py-0.5 font-mono text-xs">
                  apps/web
                </code>
                to that schema.
              </p>
            </div>
          </article>

          <aside className="flex flex-col gap-6">
            <div className="rounded-[2rem] border border-white/10 bg-black/20 p-6">
              <SectionLabel>Starter Tables</SectionLabel>
              <div className="mt-4 flex flex-wrap gap-3">
                {starterTables.map((table) => (
                  <span
                    key={table}
                    className="rounded-full border border-white/10 bg-white/6 px-3 py-2 font-mono text-sm text-stone-100"
                  >
                    {table}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-black/20 p-6">
              <SectionLabel>Run From Repo Root</SectionLabel>
              <div className="mt-4 space-y-3 font-mono text-sm text-stone-200">
                <CommandLine>npm run web:dev</CommandLine>
                <CommandLine>npx supabase migration new add_feature</CommandLine>
                <CommandLine>npx supabase db push</CommandLine>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-black/20 p-6">
              <SectionLabel>Important Reminder</SectionLabel>
              <p className="mt-3 text-sm leading-6 text-stone-300">
                Keep real keys in local env files only. The repo tracks schema
                changes in SQL migrations, not by editing the hosted database by
                hand and hoping everyone stays in sync.
              </p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-xs uppercase tracking-[0.28em] text-stone-400">
      {children}
    </p>
  );
}

function StatusCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="min-w-[14rem] rounded-[1.5rem] border border-white/10 bg-black/20 px-4 py-4">
      <p className="font-mono text-[0.7rem] uppercase tracking-[0.28em] text-stone-500">
        {label}
      </p>
      <p className={`mt-2 text-base font-medium break-all ${accent}`}>{value}</p>
    </div>
  );
}

function CommandLine({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3">
      {children}
    </div>
  );
}
