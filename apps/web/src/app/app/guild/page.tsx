import Link from "next/link";
import { FANTASY_TERMS } from "@gridiron/shared";

import { PageShell } from "@/components/page-shell";
import { Panel } from "@/components/panel";
import { RoomScene } from "@/components/room-scene";
import { createClient } from "@/lib/supabase/server";

export default async function GuildPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: memberships, error } = await supabase
    .from("league_members")
    .select(
      "role, joined_at, leagues!inner(id, name, slug, season, status, draft_starts_at, max_members)",
    )
    .eq("user_id", user?.id ?? "")
    .order("joined_at", { ascending: false });

  const guildCount = memberships?.length ?? 0;
  const currentGuild = memberships?.[0]
    ? Array.isArray(memberships[0].leagues)
      ? memberships[0].leagues[0]
      : memberships[0].leagues
    : null;
  const guildRole = memberships?.[0]?.role === "commissioner" ? FANTASY_TERMS.commissioner : FANTASY_TERMS.member;

  return (
    <PageShell
      eyebrow="Guild / Hall"
      title="Guild Hall"
      description="The Guild Hall gathers the strategic, social, and Draft-facing systems of the season into one communal chamber."
    >
      <RoomScene
        roomName="Guild Hall"
        roomMood="Warm torchlight, hanging banners, and a long planning table make this the place where Guilds organize before the road turns competitive."
        avatarName="Hall Navigation"
        sceneClassName="room-scene--guild"
        defaultSelectedHotspotId="planning-table"
        hotspots={[
          {
            id: "planning-table",
            label: "Guild Table",
            flavor: "The long table is where Guild Masters organize Draft timing, invite codes, and the shape of the season.",
            kind: "object",
            tone: "warm",
            x: 38,
            y: 36,
            width: 24,
            height: 14,
            href: "/app/guild/ledger",
            actionLabel: "Open Guild Ledger",
            stats: [
              { label: "Guilds", value: String(guildCount) },
              { label: "Current Role", value: guildRole ?? "Free Wanderer" },
            ],
            notes: [
              "Use the Guild Table for records, membership context, and the practical ledger of the season.",
              "This is the clearest room surface for found/join flows and Guild-by-Guild inspection.",
            ],
          },
          {
            id: "draft-banner",
            label: "Draft Banner",
            flavor: "Draft still keeps its name in this world. The banner leads toward preparation, Draft controls, and the live Draft Room for each Guild.",
            kind: "object",
            tone: "forest",
            x: 69,
            y: 20,
            width: 15,
            height: 26,
            href: "/app/guild/drafts",
            actionLabel: "Open Draft Command",
            stats: [
              { label: "Current Guild", value: currentGuild?.name ?? "No Guild Yet" },
              { label: "Draft State", value: currentGuild?.status?.replaceAll("_", " ") ?? "Awaiting Guild" },
            ],
            notes: [
              "This room should become the strategic preface to the Draft Room, not a replacement for it.",
              "Later it can also absorb Draft history and broader preparation context.",
            ],
          },
          {
            id: "notice-board",
            label: "Hall Board",
            flavor: "A large board for communal notices, season state, and Guild-facing reminders that should not live in the House alone.",
            kind: "object",
            tone: "warm",
            x: 14,
            y: 18,
            width: 16,
            height: 18,
            href: "/app/guild/board",
            actionLabel: "Read Hall Board",
            stats: [
              { label: "Current Guild", value: currentGuild?.name ?? "No Guild Yet" },
              { label: "Season", value: currentGuild ? String(currentGuild.season) : "Unclaimed" },
            ],
          },
          {
            id: "house-door",
            label: "House Door",
            flavor: "Return to your House to manage your Party, wardrobe, and home-bound objects.",
            kind: "door",
            tone: "warm",
            x: 10,
            y: 66,
            width: 16,
            height: 18,
            href: "/app",
            stats: [
              { label: "Destination", value: "House" },
              { label: "Purpose", value: "Party + Identity" },
            ],
          },
          {
            id: "dungeon-door",
            label: "Dungeon Door",
            flavor: "Head toward the torchlit halls below the Guild to choose a Tribe chamber and begin future Hunts.",
            kind: "door",
            tone: "stone",
            x: 40,
            y: 66,
            width: 16,
            height: 18,
            href: "/app/dungeon",
            stats: [
              { label: "Destination", value: "Dungeon" },
              { label: "Purpose", value: "Hunts" },
            ],
          },
          {
            id: "arena-door",
            label: "Arena Door",
            flavor: "Cross the side passage to reach the Arena, where duels, standings, and season results unfold.",
            kind: "door",
            tone: "ember",
            x: 70,
            y: 66,
            width: 16,
            height: 18,
            href: "/app/arena",
            stats: [
              { label: "Destination", value: "Arena" },
              { label: "Purpose", value: "Duels + Results" },
            ],
          },
        ]}
      />

      <div className="mt-8">
        <Panel title="Your Guilds" description="The room handles the navigation now. This ledger stays only to show which Guilds this House is currently bound to.">
          {error ? (
            <p className="rounded-[1.4rem] border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
              Unable to load guilds: {error.message}
            </p>
          ) : memberships && memberships.length > 0 ? (
            <div className="grid gap-4">
              {memberships.map((membership) => {
                const guild = Array.isArray(membership.leagues) ? membership.leagues[0] : membership.leagues;
                const roleName = membership.role === "commissioner" ? FANTASY_TERMS.commissioner : FANTASY_TERMS.member;

                return (
                  <Link
                    key={guild.id}
                    href={`/app/leagues/${guild.slug}`}
                    className="rounded-[1.5rem] border border-[#9e8455]/18 bg-black/20 px-5 py-5 transition-colors hover:bg-white/6"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="fantasy-kicker text-[0.7rem] text-[#c6ad7d]">{roleName}</p>
                        <h2 className="mt-2 text-xl font-semibold text-[#fff4d8]">{guild.name}</h2>
                        <p className="mt-2 text-sm text-[#efe2c9]">
                          Season {guild.season} | {guild.status.replaceAll("_", " ")}
                        </p>
                      </div>
                      <div className="text-right text-sm text-[#d8c6a7]">
                        <p>{guild.slug}</p>
                        <p className="mt-1">
                          Draft: {guild.draft_starts_at ? new Date(guild.draft_starts_at).toLocaleString() : "Not set"}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-[#9e8455]/20 bg-black/15 px-5 py-8 text-sm text-[#efe2c9]">
              Your House has not joined a Guild yet. Found one, or claim a new hall and invite Guildmates.
            </div>
          )}
        </Panel>
      </div>
    </PageShell>
  );
}
