import { FANTASY_TERMS } from "@gridiron/shared";

import { PageShell } from "@/components/page-shell";
import { createClient } from "@/lib/supabase/server";

import { StrategyBoardClient, type StrategyBoardPaper } from "./strategy-board-client";

function prettifyStatus(status: string | null | undefined) {
  if (!status) return "Unclaimed";
  return status.replaceAll("_", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

type PartyAssignment = {
  assignment_type: "arena" | "dungeon";
  slot_key: string;
  draft_pick_id: string;
};

type BattleKeyGrantRow = {
  week_number: number;
  keys_granted: number;
};

const ARENA_SLOT_COUNT = 6;
const DUNGEON_SLOT_COUNT = 3;

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

  const { data: participant } = currentGuild
    ? await supabase
        .from("league_participants")
        .select("id")
        .eq("league_id", currentGuild.id)
        .eq("user_id", user?.id ?? "")
        .maybeSingle()
    : { data: null };
  const { data: assignmentRows } = participant?.id
    ? await supabase
        .from("party_assignments")
        .select("assignment_type, slot_key, draft_pick_id")
        .eq("participant_id", participant.id)
    : { data: [] };
  const { data: huntQueueRows } = participant?.id
    ? await supabase
        .from("hunt_challengers")
        .select("id")
        .eq("participant_id", participant.id)
    : { data: [] };
  const { data: battleKeyGrantRows } = participant?.id
    ? await supabase
        .from("battle_key_grants")
        .select("week_number, keys_granted")
        .eq("participant_id", participant.id)
        .order("week_number", { ascending: false })
        .limit(1)
    : { data: [] };
  const latestGrant = (battleKeyGrantRows?.[0] as BattleKeyGrantRow | undefined) ?? null;
  const currentWeekNumber = latestGrant?.week_number ?? 1;
  const battleKeyTotal = latestGrant?.keys_granted ?? 12;
  const assignments = (assignmentRows ?? []) as PartyAssignment[];
  const battleKeysInUse = huntQueueRows?.length ?? 0;
  const battleKeysUnspent = Math.max(battleKeyTotal - battleKeysInUse, 0);
  const arenaAssignments = assignments.filter((assignment) => assignment.assignment_type === "arena");
  const dungeonAssignments = huntQueueRows ?? [];
  const assignedPickIds = assignments.map((assignment) => assignment.draft_pick_id);
  const hasAssignmentConflicts = new Set(assignedPickIds).size !== assignedPickIds.length;
  const arenaFilledCount = arenaAssignments.length;
  const dungeonFilledCount = dungeonAssignments.length;
  const arenaIsReady = arenaFilledCount === ARENA_SLOT_COUNT;
  const dungeonIsReady = dungeonFilledCount > 0;
  const setupSummary = hasAssignmentConflicts
    ? "Assignment conflict"
    : arenaFilledCount || dungeonFilledCount
      ? `${arenaFilledCount}/${ARENA_SLOT_COUNT} Arena, ${dungeonFilledCount}/${DUNGEON_SLOT_COUNT} Dungeon`
      : "No Party assignments";
  const guildRole = memberships?.[0]?.role === "commissioner" ? FANTASY_TERMS.commissioner : FANTASY_TERMS.member;
  const papers: StrategyBoardPaper[] = [
    {
      id: "lineup-warnings",
      title: "Party Readiness",
      summary: setupSummary,
      tone: hasAssignmentConflicts || (!arenaIsReady && !dungeonIsReady) ? "warning" : "green",
      body: "Quick checks for your saved Party Chest assignments. Early weeks can lean Dungeon-heavy, so an incomplete Arena lineup is allowed for now.",
      rows: [
        {
          label: "Arena Lineup",
          value: `${arenaFilledCount} / ${ARENA_SLOT_COUNT} Slots Set`,
          previewValue: `${arenaFilledCount} / ${ARENA_SLOT_COUNT} Arena Slots Set`,
          warning: arenaFilledCount > 0 && !arenaIsReady,
        },
        {
          label: "Dungeon Assignments",
          value: `${dungeonFilledCount} / ${DUNGEON_SLOT_COUNT} Slots Set`,
          previewValue: `${dungeonFilledCount} / ${DUNGEON_SLOT_COUNT} Dungeon Slots Set`,
          warning: !dungeonIsReady,
        },
        {
          label: "Assignment Conflicts",
          value: hasAssignmentConflicts ? "Needs Cleanup" : "None",
          warning: hasAssignmentConflicts,
        },
      ],
      links: [
        { href: "/app/house/party", label: "Open Party Chest" },
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
      id: "battle-keys",
      title: "Battle Keys",
      summary: `Week ${currentWeekNumber} • ${battleKeysUnspent} Unspent`,
      tone: battleKeysUnspent > 0 ? "green" : "warning",
      body: "Battle Keys are the weekly Dungeon resource used to power Hunts. This is the House-level snapshot for the current week.",
      rows: [
        { label: "Week", value: String(currentWeekNumber) },
        { label: "Battle Key Count", value: String(battleKeyTotal) },
        { label: "Battle Keys At Work", value: String(battleKeysInUse) },
        { label: "Battle Keys To Spend", value: String(battleKeysUnspent), warning: battleKeysUnspent === 0 },
      ],
      links: [
        { href: "/app/dungeon", label: "Open Dungeon" },
        { href: "/app", label: "Return Home" },
      ],
    },
  ];

  return (
    <PageShell
      eyebrow="House / Strategy Center"
      title="Strategy Center"
    >
      <StrategyBoardClient papers={papers} />
    </PageShell>
  );
}
