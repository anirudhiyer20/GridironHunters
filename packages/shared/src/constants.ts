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

export const TRIBE_DETAILS = {
  Combat: {
    slug: "combat",
    teams: ["Chiefs", "Raiders", "Commanders", "Titans"],
    tone: "ember",
    chamberTitle: "Combat Chamber",
    summary: "A red-bannered hall for blunt-force lineups, bruising tempo, and Houses that want their Hunts to feel aggressive from the start.",
  },
  Forge: {
    slug: "forge",
    teams: ["Steelers", "Colts", "49ers", "Jets"],
    tone: "warm",
    chamberTitle: "Forge Chamber",
    summary: "A brass-lit forge hall built for steady steel, defensive grit, and sturdy Party construction.",
  },
  Storm: {
    slug: "storm",
    teams: ["Falcons", "Seahawks", "Eagles", "Cardinals"],
    tone: "stone",
    chamberTitle: "Storm Chamber",
    summary: "A crackling chamber for fast skies, sharp bursts, and the kind of Wild Players that can swing a week in a heartbeat.",
  },
  Tundra: {
    slug: "tundra",
    teams: ["Packers", "Vikings", "Bills", "Patriots"],
    tone: "stone",
    chamberTitle: "Tundra Chamber",
    summary: "A cold stone wing where disciplined Parties search for resilient Wild Players with winter-hardened upside.",
  },
  Halo: {
    slug: "halo",
    teams: ["Cowboys", "Rams", "Saints", "Chargers"],
    tone: "warm",
    chamberTitle: "Halo Chamber",
    summary: "A bright sanctum for polished skill players, clean edges, and Houses chasing elegant point spikes.",
  },
  Blaze: {
    slug: "blaze",
    teams: ["Browns", "Broncos", "Dolphins", "Giants"],
    tone: "ember",
    chamberTitle: "Blaze Chamber",
    summary: "An ember-lit chamber for volatility, heat checks, and the most explosive Hunt routes in the Dungeon.",
  },
  Shroud: {
    slug: "shroud",
    teams: ["Ravens", "Texans", "Buccaneers", "Panthers"],
    tone: "forest",
    chamberTitle: "Shroud Chamber",
    summary: "A shadowy vault for deceptive edges, hidden value, and Wild Players that thrive in murkier matchups.",
  },
  Prowl: {
    slug: "prowl",
    teams: ["Bengals", "Lions", "Bears", "Jaguars"],
    tone: "forest",
    chamberTitle: "Prowl Chamber",
    summary: "A hunt-focused corridor for prowling offenses, opportunistic ceilings, and Houses that like stalking upside.",
  },
} as const satisfies Record<(typeof TRIBE_NAMES)[number], {
  slug: string;
  teams: readonly string[];
  tone: "warm" | "stone" | "ember" | "forest";
  chamberTitle: string;
  summary: string;
}>;

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
