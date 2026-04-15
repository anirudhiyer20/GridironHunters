import { FANTASY_TERMS, TRIBE_NAMES } from "@gridiron/shared";

import { HeroLink } from "@/components/hero-link";
import { PageShell } from "@/components/page-shell";
import { Panel } from "@/components/panel";
import { getProjectHost, hasSupabaseEnv } from "@/lib/env";
import { appName } from "@/lib/mock-data";

export default function Home() {
  const projectHost = getProjectHost();

  return (
    <PageShell
      eyebrow="Closed Beta / World Shell"
      title={appName}
    >
      <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <Panel
          title="What Changed"
          description="The project is no longer aiming for a futuristic console aesthetic. The new direction is a warm medieval world shell with object-driven navigation and stronger fantasy language."
        >
          <ul className="grid gap-4">
            {[
              `League becomes ${FANTASY_TERMS.league} in player-facing UI.`,
              `Each player belongs to a House and manages a ${FANTASY_TERMS.roster}.`,
              `The House now leads into the ${FANTASY_TERMS.league}, Dungeon, and ${FANTASY_TERMS.pvp}.`,
              `${FANTASY_TERMS.type} replaces type in player-facing language.`,
            ].map((check) => (
              <li
                key={check}
                className="flex items-start gap-3 rounded-[1.4rem] border border-[#9e8455]/18 bg-black/20 px-4 py-4"
              >
                <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#d6a24d]/20 text-sm text-[#f4d28d]">
                  ?
                </span>
                <span className="text-sm leading-6 text-[#efe2c9] sm:text-base">
                  {check}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-wrap gap-3">
            <HeroLink href="/auth/signup">Create Account</HeroLink>
            <HeroLink href="/app" tone="secondary">
              Enter House
            </HeroLink>
          </div>
        </Panel>

        <Panel
          title="World Shell Snapshot"
          description="The first pass establishes the navigation shell and terminology foundation so deeper Draft, Hunt, and Arena systems can slot into the right rooms."
        >
          <div className="grid gap-3">
            <StatusCard label="Supabase Env" value={hasSupabaseEnv ? "Configured" : "Missing"} />
            <StatusCard label="Project Host" value={projectHost ?? "Add apps/web/.env.local"} />
            <StatusCard label="Rooms" value="House / Guild / Dungeon / Arena" />
            <StatusCard label="Tribes" value={TRIBE_NAMES.join(", ")} />
          </div>
        </Panel>
      </div>
    </PageShell>
  );
}

function StatusCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[14rem] rounded-[1.5rem] border border-[#9e8455]/18 bg-black/20 px-4 py-4">
      <p className="fantasy-kicker text-[0.7rem] text-[#c6ad7d]">
        {label}
      </p>
      <p className="mt-2 break-all text-base font-medium text-[#fff4d8]">{value}</p>
    </div>
  );
}
