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

const lineupOrder = ["QB", "RB", "WR", "TE"] as const;

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
  const lineup = lineupOrder.map((position) => ({
    position,
    player: (groupedByPosition[position] ?? [])[0] ?? null,
  }));
  const dungeonParty = party.slice(0, 3);
  const inventorySlots = Array.from({ length: Math.max(MVP_DRAFT_ROSTER_SIZE, party.length) }, (_, index) => party[index] ?? null);

  return (
    <PageShell
      eyebrow="House / Party Chest"
      title="Party Chest"
      description="The Party Chest should feel like a chest inventory first: gathered players, lineup readiness, and dungeon assignments all in one place."
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

          <Panel title="Current Lineup" description="This is the weekly Arena-facing lineup surface. If the House has not set a lineup yet, make that obvious and actionable.">
            <div className="grid gap-3 sm:grid-cols-2">
              {lineup.map((slot) => (
                <div key={slot.position} className="rounded-[1.4rem] border border-[#9e8455]/18 bg-black/20 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="fantasy-title text-xl text-[#fff4d8]">{slot.position}</p>
                    <span className={`rounded-full px-3 py-1 text-[0.68rem] uppercase tracking-[0.18em] ${slot.player ? "border border-[#6f915f]/30 bg-[#2e4527]/70 text-[#dceccf]" : "border border-[#b97456]/30 bg-[#49261d]/75 text-[#ffd6bf]"}`}>
                      {slot.player ? "Set" : "Missing"}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-[#e6d6b7]">{slot.player?.picked_player_name ?? "No player assigned yet"}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-[1.4rem] border border-[#b97456]/20 bg-[#321c13]/75 px-4 py-4 text-sm leading-7 text-[#f0d8c7]">
              {lineup.every((slot) => slot.player)
                ? "Your Arena lineup has a player in each core slot. Use the Arena to refine this once weekly duel management is built out."
                : "Your Arena lineup is not fully set for the week. The Arena will be the place to finalize this."}
            </div>
            <div className="mt-5">
              <HeroLink href="/app/arena">Set Arena Lineup</HeroLink>
            </div>
          </Panel>

          <Panel title="Dungeon Assignment" description="Choose which fighters the House is sending into the Dungeon branch.">
            <div className="grid gap-3 sm:grid-cols-3">
              {Array.from({ length: 3 }, (_, index) => dungeonParty[index] ?? null).map((pick, index) => (
                <div key={`dungeon-slot-${index}`} className="rounded-[1.4rem] border border-[#7a8d80]/24 bg-black/20 px-4 py-4">
                  <p className="fantasy-kicker text-[0.68rem] text-[#a9c8b6]">Fighter {index + 1}</p>
                  <p className="mt-2 text-base font-semibold text-[#fff4d8]">{pick?.picked_player_name ?? "Unassigned"}</p>
                  <p className="mt-2 text-sm text-[#d9d4c8]">{pick?.picked_position ?? "Awaiting selection"}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-[1.4rem] border border-[#7a8d80]/22 bg-[#1d2723]/75 px-4 py-4 text-sm leading-7 text-[#dfe8e1]">
              {dungeonParty.length > 0
                ? "The Dungeon assignment is a light MVP preview for now. The Dungeon gate is still the best route for tribe chambers and future hunt setup."
                : "No Dungeon fighters have been assigned yet. Send your House into the Dungeon once hunt selection deepens."}
            </div>
            <div className="mt-5">
              <HeroLink href="/app/dungeon" tone="secondary">Assign Dungeon Fighters</HeroLink>
            </div>
          </Panel>
        </div>

        <Panel title="Chest Inventory" description="The Party inventory should feel like a real chest: slot-based, sortable by position, and easy to scan at a glance.">
          <div className="flex flex-wrap gap-3">
            <FilterChip label="All Party" active />
            {lineupOrder.map((position) => (
              <FilterChip key={position} label={position} />
            ))}
          </div>

          <div className="mt-5 rounded-[1.8rem] border border-[#8e5d2b]/22 bg-[linear-gradient(180deg,#6c421e_0%,#4a2d15_100%)] p-4 shadow-[0_16px_28px_rgba(0,0,0,0.26),inset_0_0_0_2px_rgba(243,214,158,0.05)]">
            <div className="rounded-[1.3rem] border border-[#b7884d]/18 bg-[linear-gradient(180deg,#d7b57b_0%,#b98645_100%)] p-4">
              <div className="grid gap-3 sm:grid-cols-4">
                {inventorySlots.map((pick, index) => (
                  <InventorySlot key={pick?.id ?? `empty-${index}`} pick={pick} index={index} />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {lineupOrder.map((position) => (
              <section key={position} className="rounded-[1.4rem] border border-[#9e8455]/18 bg-black/20 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="fantasy-title text-xl text-[#fff4d8]">{position}</p>
                  <span className="rounded-full border border-[#9e8455]/18 bg-black/20 px-3 py-1 text-[0.68rem] uppercase tracking-[0.18em] text-[#d6bf90]">
                    {(groupedByPosition[position] ?? []).length} In Chest
                  </span>
                </div>
                <div className="mt-4 grid gap-3">
                  {(groupedByPosition[position] ?? []).length > 0 ? (
                    (groupedByPosition[position] ?? []).map((pick) => (
                      <div key={pick.id} className="rounded-[1.1rem] border border-white/8 bg-white/6 px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-base font-semibold text-[#fff4d8]">{pick.picked_player_name ?? "Unknown Player"}</p>
                          <span className="rounded-full border border-[#9e8455]/18 bg-black/20 px-3 py-1 text-[0.66rem] uppercase tracking-[0.18em] text-[#d6bf90]">
                            Pick {pick.pick_number}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[1.1rem] border border-dashed border-[#9e8455]/20 bg-black/15 px-4 py-5 text-sm text-[#e9dcc0]">
                      No {position} gathered yet.
                    </div>
                  )}
                </div>
              </section>
            ))}
          </div>
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

function FilterChip({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <span className={`rounded-full border px-4 py-2 text-[0.72rem] uppercase tracking-[0.16em] ${active ? "border-[#d3ad69]/34 bg-[#4c3218] text-[#fff0cf]" : "border-[#9e8455]/18 bg-black/20 text-[#d4c09a]"}`}>
      {label}
    </span>
  );
}

function InventorySlot({ pick, index }: { pick: DraftPick | null; index: number }) {
  return (
    <div className="rounded-[1rem] border border-[#7d5126]/30 bg-[#e6cb97] px-3 py-3 shadow-[inset_0_0_0_2px_rgba(255,244,215,0.25)]">
      <div className="flex items-center justify-between gap-2 text-[#714b23]">
        <span className="text-[0.68rem] uppercase tracking-[0.16em]">Slot {index + 1}</span>
        <span className="rounded-full border border-[#8e663c]/25 bg-[#d8bb84] px-2 py-1 text-[0.62rem] uppercase tracking-[0.12em]">
          {pick?.picked_position ?? "Empty"}
        </span>
      </div>
      <div className="mt-3 min-h-14 rounded-[0.8rem] border border-[#9b7448]/20 bg-[#f0dfbe] px-3 py-3 text-sm text-[#4d3016]">
        {pick ? pick.picked_player_name ?? "Unknown Player" : "Open Slot"}
      </div>
    </div>
  );
}
