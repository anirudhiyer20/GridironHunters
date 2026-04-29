import { FANTASY_TERMS } from "@gridiron/shared";

import { PageShell } from "@/components/page-shell";
import { RoomScene } from "@/components/room-scene";
import { createClient } from "@/lib/supabase/server";
import { getRoomAvatarAppearance, normalizeCharacter } from "../house/wardrobe/wardrobe-model";

function prettifyStatus(status: string | null | undefined) {
  if (!status) return "Unclaimed";
  return status.replaceAll("_", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

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
  const { data: characterRow } = user
    ? await supabase.from("user_characters").select("*").eq("user_id", user.id).maybeSingle()
    : { data: null };
  const character = normalizeCharacter(characterRow);

  const guildCount = memberships?.length ?? 0;
  const currentGuild = memberships?.[0]
    ? Array.isArray(memberships[0].leagues)
      ? memberships[0].leagues[0]
      : memberships[0].leagues
    : null;
  const guildRole = memberships?.[0]?.role === "commissioner" ? FANTASY_TERMS.commissioner : FANTASY_TERMS.member;
  const guildStatus = prettifyStatus(currentGuild?.status);

  return (
    <PageShell
      eyebrow="Guild / Hall"
      title="Guild Hall"
    >
      <RoomScene
        roomName="Guild Hall Chamber"
        roomMood="A brick-lined chamber where Houses gather at the center table, read quests, and choose the next route."
        avatarName={currentGuild?.name ?? "Guild Hall"}
        avatarAppearance={getRoomAvatarAppearance(character)}
        sceneClassName="room-scene--guild room-scene--guild-chamber room-scene--full"
        showHud={false}
        defaultSelectedHotspotId="war-table"
        hotspots={[
          {
            id: "podium",
            label: "Podium",
            flavor: "The standings podium where weekly placement and Guild rankings are displayed.",
            kind: "object",
            tone: "warm",
            displayStyle: "podium",
            interactionMode: "direct",
            x: 8,
            y: 16,
            width: 16,
            height: 20,
            href: "/app/arena/standings",
          },
          {
            id: "guild-center",
            label: "Guild Center",
            flavor: "The Guild Center holds key rules, league settings, and house-level context.",
            kind: "object",
            tone: "warm",
            displayStyle: "guild-center",
            interactionMode: "direct",
            x: 38,
            y: 10,
            width: 24,
            height: 25,
            href: "/app/guild/ledger",
          },
          {
            id: "quest-board",
            label: "Quest Board",
            flavor: "The weekly quest board for mythical sightings and hunt-focused targets.",
            kind: "object",
            tone: "forest",
            displayStyle: "quest-board",
            interactionMode: "direct",
            x: 74,
            y: 10,
            width: 20,
            height: 24,
            href: "/app/dungeon",
          },
          {
            id: "war-table",
            label: "War Table",
            flavor: "The central draft table for draft preparation, room controls, and active draft management.",
            kind: "object",
            tone: "ember",
            displayStyle: "war-table",
            interactionMode: "direct",
            x: 43,
            y: 47,
            width: 14,
            height: 18,
            href: "/app/guild/drafts",
          },
          {
            id: "home-door",
            label: "Home",
            flavor: "Return to your House.",
            kind: "door",
            tone: "warm",
            displayStyle: "door",
            interactionMode: "direct",
            x: 4,
            y: 72,
            width: 12,
            height: 18,
            href: "/app",
          },
        ]}
      />

      <div className="mt-8">
        <div className="rounded-[1.9rem] border border-[#9e8455]/18 bg-black/20 px-6 py-5">
          {error ? (
            <p className="rounded-[1.4rem] border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
              Unable to load guilds: {error.message}
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-4">
              <GuildStatCard label="Current Guild" value={currentGuild?.name ?? "No Guild Yet"} />
              <GuildStatCard label="House Role" value={guildRole ?? FANTASY_TERMS.member} />
              <GuildStatCard label="Guild Status" value={guildStatus} />
              <GuildStatCard label="Bound Guilds" value={String(guildCount)} />
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}

function GuildStatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.4rem] border border-[#9e8455]/18 bg-black/20 px-4 py-4">
      <p className="fantasy-kicker text-[0.68rem] text-[#c6ad7d]">{label}</p>
      <p className="mt-2 text-base font-semibold text-[#fff4d8]">{value}</p>
    </div>
  );
}
