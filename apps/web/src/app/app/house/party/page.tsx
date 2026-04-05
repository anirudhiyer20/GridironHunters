import { FANTASY_TERMS, MVP_DRAFT_ROSTER_SIZE, MVP_REQUIRED_POSITION_COUNTS } from "@gridiron/shared";

import { HeroLink } from "@/components/hero-link";
import { PageShell } from "@/components/page-shell";
import { Panel } from "@/components/panel";
import { createClient } from "@/lib/supabase/server";

function houseNameFromEmail(email: string | null | undefined) {
  if (!email) return "The Ember House";

  const root = email.split("@")[0]?.replace(/[^a-zA-Z0-9]+/g, " ").trim() || "Ember";
  const proper = root
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return `House of ${proper}`;
}

type DraftPick = {
  id: string;
  pick_number: number;
  picked_player_name: string | null;
  picked_position: string | null;
  status: string;
};

export default async function PartyChestPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const houseName = houseNameFromEmail(user?.email);

  const { data: memberships } = await supabase
    .from("league_members")
    .select("joined_at, leagues!inner(id, name, slug, season, status)")
    .eq("user_id", user?.id ?? "")
    .order("joined_at", { ascending: false });

  const currentGuild = memberships?.[0]
    ? Array.isArray(memberships[0].leagues)
      ? memberships[0].leagues[0]
      : memberships[0].leagues
    : null;

  const { data: participant } = currentGuild
    ? await supabase
        .from("league_participants")
        .select("id")
        .eq("league_id", currentGuild.id)
        .eq("user_id", user?.id ?? "")
        .maybeSingle()
    : { data: null };

  const { data: picks } = participant?.id
    ? await supabase
        .from("draft_picks")
        .select("id, pick_number, picked_player_name, picked_position, status")
        .eq("participant_id", participant.id)
        .in("status", ["made", "autopicked"])
        .order("pick_number", { ascending: true })
    : { data: [] };

  const party = (picks ?? []) as DraftPick[];
  const groupedByPosition = party.reduce<Record<string, DraftPick[]>>((acc, pick) => {
    const key = pick.picked_position ?? "Unknown";
    acc[key] = [...(acc[key] ?? []), pick];
    return acc;
  }, {});
  const coveredPositions = new Set(party.map((pick) => pick.picked_position).filter(Boolean));
  const uncoveredRequiredPositions = Object.entries(MVP_REQUIRED_POSITION_COUNTS)
    .filter(([position]) => !coveredPositions.has(position))
    .map(([position]) => position);
  const formationCards = ["QB", "RB", "WR", "TE"].map((position) => {
    const picksForPosition = groupedByPosition[position] ?? [];
    const requiredCount = MVP_REQUIRED_POSITION_COUNTS[position as keyof typeof MVP_REQUIRED_POSITION_COUNTS] ?? 0;
    return {
      position,
      count: picksForPosition.length,
      status: picksForPosition.length >= requiredCount ? "Covered" : requiredCount > 0 ? "Needed" : "Depth",
    };
  });

  return (
    <PageShell
      eyebrow="House / Party Chest"
      title="Party Chest"
      description="The Party Chest is where a House checks who has already been gathered, sees which formation needs still remain, and prepares for the next Draft or Hunt."
    >
      <div className="grid gap-8 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="grid gap-6">
          <Panel title="Chest Summary" description="A quick read on how far this House has progressed from Draft into an actual Party.">
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoCard label="House" value={houseName} />
              <InfoCard label={FANTASY_TERMS.league} value={currentGuild?.name ?? "No Guild Yet"} />
              <InfoCard label={FANTASY_TERMS.roster} value={`${party.length} / ${MVP_DRAFT_ROSTER_SIZE}`} />
              <InfoCard label="Needed Roles" value={uncoveredRequiredPositions.length ? uncoveredRequiredPositions.join(", ") : "Core Set Covered"} />
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <HeroLink href="/app">Return Home</HeroLink>
              <HeroLink href="/app/guild" tone="secondary">Open Guild Hall</HeroLink>
            </div>
          </Panel>

          <Panel title="Formation" description="This readout makes it easier to see where the Party is thin before richer loadout controls arrive.">
            <div className="grid gap-3 sm:grid-cols-2">
              {formationCards.map((card) => (
                <div key={card.position} className="rounded-[1.4rem] border border-[#9e8455]/18 bg-black/20 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="fantasy-title text-xl text-[#fff4d8]">{card.position}</p>
                    <span className={`rounded-full px-3 py-1 text-[0.68rem] uppercase tracking-[0.18em] ${card.status === "Covered" ? "border border-[#6f915f]/30 bg-[#2e4527]/70 text-[#dceccf]" : "border border-[#9e8455]/25 bg-[#3f2d17]/70 text-[#f1d9a6]"}`}>
                      {card.status}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-[#e6d6b7]">{card.count} gathered</p>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <Panel title="Current Party" description="The current Party is sourced from Draft results in the active Guild. Each lane below represents a role inside the House chest.">
          {party.length > 0 ? (
            <div className="grid gap-5 xl:grid-cols-2">
              {Object.entries(groupedByPosition)
                .sort(([left], [right]) => left.localeCompare(right))
                .map(([position, picksForPosition]) => (
                  <section key={position} className="rounded-[1.5rem] border border-[#9e8455]/18 bg-black/20 px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="fantasy-title text-xl text-[#fff4d8]">{position}</p>
                      <span className="rounded-full border border-[#9e8455]/18 bg-black/20 px-3 py-1 text-[0.68rem] uppercase tracking-[0.18em] text-[#d6bf90]">
                        {picksForPosition.length} In Chest
                      </span>
                    </div>
                    <div className="mt-4 grid gap-3">
                      {picksForPosition.map((pick) => (
                        <div key={pick.id} className="rounded-[1.1rem] border border-white/8 bg-white/6 px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-base font-semibold text-[#fff4d8]">{pick.picked_player_name ?? "Unknown Player"}</p>
                            <span className="rounded-full border border-[#9e8455]/18 bg-black/20 px-3 py-1 text-[0.66rem] uppercase tracking-[0.18em] text-[#d6bf90]">
                              Pick {pick.pick_number}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-[#d8c6a7]">Bound to the {houseName} Party through the Draft.</p>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-[#9e8455]/20 bg-black/15 px-5 py-8 text-sm leading-7 text-[#efe2c9]">
              Your Party Chest is empty until the House completes a Draft. Once picks start landing, this chamber becomes the quickest way to understand the shape of your Party.
            </div>
          )}
        </Panel>
      </div>
    </PageShell>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.4rem] border border-[#9e8455]/18 bg-black/20 px-4 py-4">
      <p className="fantasy-kicker text-[0.68rem] text-[#c6ad7d]">{label}</p>
      <p className="mt-2 text-base font-semibold text-[#fff4d8]">{value}</p>
    </div>
  );
}
