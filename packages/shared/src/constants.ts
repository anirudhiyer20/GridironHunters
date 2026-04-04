export const APP_NAME = "GridironHunters";
export const MVP_LEAGUE_SIZE = 10;
export const MVP_DRAFT_ROSTER_SIZE = 8;
export const GENERAL_USER_LEAGUE_LIMIT = 1;

export const PLATFORM_ROLES = ["user", "platform_admin"] as const;
export const LEAGUE_MEMBER_ROLES = ["commissioner", "member"] as const;
export const PARTICIPANT_TYPES = ["human", "bot"] as const;
export const DRAFT_CONTROL_MODES = ["manual", "autopick"] as const;
export const LEAGUE_STATUSES = [
  "pre_draft",
  "draft_ready",
  "draft_live",
  "draft_paused",
  "active",
  "completed",
] as const;
export const DRAFT_STATUSES = [
  "ready",
  "live",
  "paused",
  "completed",
] as const;
export const DRAFT_POSITIONS = ["QB", "RB", "WR", "TE"] as const;
export const MVP_REQUIRED_POSITION_COUNTS: Record<(typeof DRAFT_POSITIONS)[number], number> = {
  QB: 1,
  RB: 1,
  WR: 1,
  TE: 1,
};
export const MVP_MAX_POSITION_COUNTS: Partial<Record<(typeof DRAFT_POSITIONS)[number], number>> = {
  QB: 2,
};

export const TRIBE_NAMES = [
  "Combat",
  "Forge",
  "Storm",
  "Tundra",
  "Halo",
  "Blaze",
  "Shroud",
  "Prowl",
] as const;

export const WORLD_ROOMS = ["house", "guild", "dungeon", "arena"] as const;

export const FANTASY_TERMS = {
  league: "Guild",
  leagues: "Guilds",
  commissioner: "Guild Master",
  commissioners: "Guild Masters",
  member: "Guildmate",
  members: "Guildmates",
  teamIdentity: "House",
  homeBase: "House",
  roster: "Party",
  rosterManager: "Party Chest",
  activityFeed: "Guild Board",
  captureBattle: "Hunt",
  pvp: "Arena",
  type: "Tribe",
  badge: "Sigil",
  draft: "Draft",
  draftRoom: "Draft Room",
  draftQueue: "Draft Queue",
  wildPlayers: "Wild Players",
} as const;

export const ROOM_ROUTE_MAP: Record<(typeof WORLD_ROOMS)[number], string> = {
  house: "/app",
  guild: "/app/guild",
  dungeon: "/app/dungeon",
  arena: "/app/arena",
};

export type PlatformRole = (typeof PLATFORM_ROLES)[number];
export type LeagueMemberRole = (typeof LEAGUE_MEMBER_ROLES)[number];
export type ParticipantType = (typeof PARTICIPANT_TYPES)[number];
export type DraftControlMode = (typeof DRAFT_CONTROL_MODES)[number];
export type LeagueStatus = (typeof LEAGUE_STATUSES)[number];
export type DraftStatus = (typeof DRAFT_STATUSES)[number];
export type DraftPosition = (typeof DRAFT_POSITIONS)[number];
export type TribeName = (typeof TRIBE_NAMES)[number];
export type WorldRoom = (typeof WORLD_ROOMS)[number];
