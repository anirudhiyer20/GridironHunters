import { FANTASY_TERMS } from "@gridiron/shared";

import { PageShell } from "@/components/page-shell";
import { createClient } from "@/lib/supabase/server";

import { StrategyBoardClient, type StrategyBoardPaper } from "./strategy-board-client";

function prettifyStatus(status: string | null | undefined) {
  if (!status) return "Unclaimed";
  return status.replaceAll("_", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

export default async function StrategyCenterPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: memberships } = await supabase
    .from("league_members")
    .select(
      "role, joined_at, leagues!inner(id, name, slug, season, status, draft_starts_at)",
    )
    .eq("user_id", user?.id ?? "")
    .order("joined_at", { ascending: false });

  const currentGuild = memberships?.[0]
    ? Array.isArray(memberships[0].leagues)
      ? memberships[0].leagues[0]
      : memberships[0].leagues
    : null;

  const guildRole = memberships?.[0]?.role === "commissioner" ? FANTASY_TERMS.commissioner : FANTASY_TERMS.member;
  const papers: StrategyBoardPaper[] = [
    {
      id: "lineup-warnings",
      title: "Lineup Warnings",
      summary: "Arena and Dungeon readiness",
      tone: "warning",
      body: "Quick checks for weekly setup. These will become real saved lineup and assignment checks once those systems are built.",
      rows: [
        { label: "Arena Lineup", value: "Not Set", warning: true },
        { label: "Dungeon Lineup", value: "Not Set", warning: true },
      ],
      links: [
        { href: "/app/arena", label: "Open Arena" },
        { href: "/app/dungeon", label: "Open Dungeon" },
      ],
    },
    {
      id: "guild-sheet",
      title: "Guild Sheet",
      summary: currentGuild?.name ?? "No Guild Yet",
      tone: "base",
      body: "The current Guild context for this House.",
      rows: [
        { label: FANTASY_TERMS.league, value: currentGuild?.name ?? "No Guild Yet" },
        { label: "House Role", value: guildRole ?? "Free Wanderer" },
        { label: "Season", value: currentGuild ? String(currentGuild.season) : "Unclaimed" },
        { label: "State", value: prettifyStatus(currentGuild?.status) },
      ],
      links: [{ href: "/app/guild", label: "Enter Guild Hall" }],
    },
    {
      id: "score-record",
      title: "Score & Record",
      summary: "No live duel posted",
      tone: "blue",
      body: "This note will hold current matchup score, weekly result context, and season record once Arena scoring is wired in.",
      rows: [
        { label: "League Record", value: "No Record Posted Yet" },
        { label: "Current Game Score", value: "No Live Duel Posted" },
        { label: "Next Route", value: currentGuild ? "Guild Hall" : "Join A Guild" },
      ],
      links: [{ href: "/app/arena/results", label: "View Results" }],
    },
    {
      id: "sigil-notes",
      title: "Sigil Notes",
      summary: "Badges and progress",
      tone: "green",
      body: "Sigils are the fantasy-facing achievement layer. These are placeholders until Badge/Sigil progress is backed by real events.",
      rows: [
        { label: "Storm Sigil", value: "Not Earned" },
        { label: "Arena Crest", value: "Locked" },
        { label: "Guild Banner", value: currentGuild ? "Bound" : "Unclaimed" },
      ],
      links: [{ href: "/app/house/trophies", label: "Open Trophies" }],
    },
    {
      id: "action-slips",
      title: "Action Slips",
      summary: "Quick routes",
      tone: "base",
      body: "Fast paths back into the major spaces from the Strategy Center.",
      links: [
        { href: "/app/guild", label: "Enter Guild Hall" },
        { href: "/app/arena", label: "Open Arena" },
        { href: "/app", label: "Return Home" },
      ],
    },
  ];

  return (
    <PageShell
      eyebrow="House / Strategy Center"
      title="Strategy Center"
      description="A wooden planning board where each paper opens only the details you want to inspect."
    >
      <StrategyBoardClient papers={papers} />
    </PageShell>
  );
}
