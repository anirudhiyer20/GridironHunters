export const APP_NAME = "GridironHunters";
export const MVP_LEAGUE_SIZE = 10;
export const MVP_DRAFT_ROSTER_SIZE = 8;
export const GENERAL_USER_LEAGUE_LIMIT = 1;

export const PLATFORM_ROLES = ["user", "platform_admin"] as const;
export const LEAGUE_MEMBER_ROLES = ["commissioner", "member"] as const;
export const LEAGUE_STATUSES = ["pre_draft", "active", "completed"] as const;

export type PlatformRole = (typeof PLATFORM_ROLES)[number];
export type LeagueMemberRole = (typeof LEAGUE_MEMBER_ROLES)[number];
export type LeagueStatus = (typeof LEAGUE_STATUSES)[number];
