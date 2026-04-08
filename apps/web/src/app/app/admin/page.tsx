import { importFantasyCalcPlayers } from "./actions";

import { PageShell } from "@/components/page-shell";
import { Panel } from "@/components/panel";

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Promise<{ message?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const message = resolvedSearchParams?.message;

  return (
    <PageShell
      eyebrow="Admin / Steward Tools"
      title="Steward Console"
      description="Admin tools remain practical and low-fantasy on purpose, but they now sit inside the same medieval shell as the rest of the world."
    >
      <Panel
        title="Player Import"
        description="Run a manual one-time sync from FantasyCalc, write the normalized players into Supabase, and deactivate the original seed pool."
      >
        {message ? (
          <p className="rounded-[1.15rem] border border-[#c6ad7d]/30 bg-[#201913] px-4 py-3 text-sm leading-6 text-[#efe2c9]">
            {message}
          </p>
        ) : null}
        <form action={importFantasyCalcPlayers} className="flex flex-wrap items-center gap-4">
          <button
            type="submit"
            className="rounded-full border border-[#c6ad7d]/35 bg-[#2e2419] px-5 py-3 text-sm uppercase tracking-[0.2em] text-[#fff4d8] transition-colors hover:bg-[#3a2e21]"
          >
            Import FantasyCalc Players
          </button>
          <p className="max-w-2xl text-sm leading-7 text-[#efe2c9]">
            This fetches the current dynasty values endpoint once, upserts QB/RB/WR/TE players, and keeps the app reading from Supabase afterward.
          </p>
        </form>
      </Panel>

      <Panel
        title="Planned Admin Capabilities"
        description="These deepen through later sprints once the Guild, Draft, Hunt, and Arena loops are fully in place."
      >
        <ul className="grid gap-3 text-sm leading-6 text-[#efe2c9]">
          <li>Guild testing across multiple Guilds</li>
          <li>Draft pool and mythic override controls</li>
          <li>Score correction approvals and audit review</li>
          <li>Impersonation support for closed-beta operations</li>
        </ul>
      </Panel>
    </PageShell>
  );
}
