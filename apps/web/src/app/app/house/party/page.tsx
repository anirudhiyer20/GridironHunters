import { FANTASY_TERMS } from "@gridiron/shared";

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

  return (
    <PageShell
      eyebrow="House / Party Chest"
      title="Party Chest"
      description="The Party Chest is where your House inspects the creatures already gathered, checks role balance, and prepares for the next Draft or Hunt."
    >
      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <Panel title="House Summary" description="A clean read on where this House stands before we expand Party management into richer drag-and-drop or loadout flows.">
          <div className="grid gap-3">
            <InfoCard label="House" value={houseName} />
            <InfoCard label={FANTASY_TERMS.league} value={currentGuild?.name ?? "No Guild Yet"} />
            <InfoCard label={FANTASY_TERMS.roster} value={`${party.length} Players`} />
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <HeroLink href="/app">Return Home</HeroLink>
            <HeroLink href="/app/guild" tone="secondary">Open Guild Hall</HeroLink>
          </div>
        </Panel>

        <Panel title="Current Party" description="The current Party is sourced from the Draft results for the active Guild. Later this chamber can add loadouts, drops, and role planning.">
          {party.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-2">
              {Object.entries(groupedByPosition).map(([position, picksForPosition]) => (
                <section key={position} className="rounded-[1.4rem] border border-[#9e8455]/18 bg-black/20 px-4 py-4">
                  <p className="fantasy-kicker text-[0.68rem] text-[#c6ad7d]">{position}</p>
                  <div className="mt-3 grid gap-3">
                    {picksForPosition.map((pick) => (
                      <div key={pick.id} className="rounded-[1.1rem] border border-white/8 bg-white/6 px-4 py-3">
                        <p className="text-base font-semibold text-[#fff4d8]">{pick.picked_player_name ?? "Unknown Player"}</p>
                        <p className="mt-1 text-sm text-[#d8c6a7]">Draft pick #{pick.pick_number}</p>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-[#9e8455]/20 bg-black/15 px-5 py-8 text-sm text-[#efe2c9]">
              Your Party Chest is empty until the House completes a Draft.
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
