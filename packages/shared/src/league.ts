import {
  GENERAL_USER_LEAGUE_LIMIT,
  MVP_LEAGUE_SIZE,
} from "./constants";

export function normalizeLeagueSlug(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function normalizeInviteCode(input: string) {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function canGeneralUserJoinAnotherLeague(activeLeagueCount: number) {
  return activeLeagueCount < GENERAL_USER_LEAGUE_LIMIT;
}

export function seatsRemaining(memberCount: number) {
  return Math.max(0, MVP_LEAGUE_SIZE - memberCount);
}

export function formatLeagueCapacity(memberCount: number) {
  return `${memberCount}/${MVP_LEAGUE_SIZE}`;
}
