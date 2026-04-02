import {
  APP_NAME,
  MVP_LEAGUE_SIZE,
  formatLeagueCapacity,
  normalizeInviteCode,
  normalizeLeagueSlug,
  seatsRemaining,
} from "@gridiron/shared";

export const appName = APP_NAME;

export const sprintOneChecklist = [
  "Email/password auth with verification",
  "League creation and joining with invite codes",
  "Pre-draft membership rules and commissioner controls",
  "Platform admin and audit foundations",
];

export const sampleLeague = {
  name: "Sunday Mythics",
  slug: normalizeLeagueSlug("Sunday Mythics"),
  memberCount: 6,
  inviteCode: normalizeInviteCode("hunt-2026"),
  draftDateLabel: "August 30, 2026 at 8:00 PM ET",
};

export const leagueSummaryCards = [
  {
    label: "Capacity",
    value: formatLeagueCapacity(sampleLeague.memberCount),
  },
  {
    label: "Open Spots",
    value: String(seatsRemaining(sampleLeague.memberCount)),
  },
  {
    label: "League Size",
    value: String(MVP_LEAGUE_SIZE),
  },
];
