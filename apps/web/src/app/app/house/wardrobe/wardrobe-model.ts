export type CharacterArchetype = "Lantern Warden" | "Moss Ranger" | "Ash Duelist";
export type CharacterBodyFrame = "Balanced" | "Sturdy" | "Swift";
export type CharacterSkinTone = "sunlit" | "umber" | "rose" | "deep";
export type CharacterHairStyle = "cropped" | "waves" | "braids" | "hooded";
export type CharacterHairColor = "chestnut" | "raven" | "copper" | "silver";
export type CharacterOutfitStyle = "tavern" | "ranger" | "duelist";
export type CharacterCrest = "Lantern Crest" | "Moss Sigil" | "Ash Banner";
export type CharacterPose = "ready" | "guard" | "scout";
export type CharacterClothingColor =
  | "#9a6a3c"
  | "#d7b46f"
  | "#496a43"
  | "#89a56f"
  | "#29415b"
  | "#3b3c45"
  | "#d37b52"
  | "#7f2f24";

export type UserCharacter = {
  characterName: string;
  archetype: CharacterArchetype;
  bodyFrame: CharacterBodyFrame;
  skinTone: CharacterSkinTone;
  hairStyle: CharacterHairStyle;
  hairColor: CharacterHairColor;
  outfitStyle: CharacterOutfitStyle;
  cloakColor: string;
  accentColor: string;
  shirtColor: CharacterClothingColor;
  pantsColor: CharacterClothingColor;
  crest: CharacterCrest;
  pose: CharacterPose;
};

export const ARCHETYPE_OPTIONS: Array<{
  value: CharacterArchetype;
  palette: string;
  role: string;
  crest: CharacterCrest;
  outfitStyle: CharacterOutfitStyle;
  cloakColor: string;
  accentColor: string;
  bodyFrame: CharacterBodyFrame;
}> = [
  {
    value: "Lantern Warden",
    palette: "Warm cloak, brass trim, tavern-keeper feel",
    role: "Balanced House stewarding",
    crest: "Lantern Crest",
    outfitStyle: "tavern",
    cloakColor: "#9a6a3c",
    accentColor: "#d7b46f",
    bodyFrame: "Balanced",
  },
  {
    value: "Moss Ranger",
    palette: "Forest green, weathered leather, expedition vibe",
    role: "Dungeon-forward scouting",
    crest: "Moss Sigil",
    outfitStyle: "ranger",
    cloakColor: "#496a43",
    accentColor: "#89a56f",
    bodyFrame: "Swift",
  },
  {
    value: "Ash Duelist",
    palette: "Charcoal tunic, ember sash, arena-ready silhouette",
    role: "Competitive Arena presence",
    crest: "Ash Banner",
    outfitStyle: "duelist",
    cloakColor: "#3b3c45",
    accentColor: "#d37b52",
    bodyFrame: "Sturdy",
  },
];

export const BODY_FRAME_OPTIONS: CharacterBodyFrame[] = ["Balanced", "Sturdy", "Swift"];
export const SKIN_TONE_OPTIONS: CharacterSkinTone[] = ["sunlit", "umber", "rose", "deep"];
export const HAIR_STYLE_OPTIONS: CharacterHairStyle[] = ["cropped", "waves", "braids", "hooded"];
export const HAIR_COLOR_OPTIONS: CharacterHairColor[] = ["chestnut", "raven", "copper", "silver"];
export const POSE_OPTIONS: CharacterPose[] = ["ready", "guard", "scout"];
export const CLOTHING_COLOR_OPTIONS: Array<{
  value: CharacterClothingColor;
  label: string;
}> = [
  { value: "#9a6a3c", label: "Oak" },
  { value: "#d7b46f", label: "Brass" },
  { value: "#496a43", label: "Moss" },
  { value: "#89a56f", label: "Sage" },
  { value: "#29415b", label: "Harbor" },
  { value: "#3b3c45", label: "Ash" },
  { value: "#d37b52", label: "Ember" },
  { value: "#7f2f24", label: "Brick" },
];

export const DEFAULT_CHARACTER: UserCharacter = {
  characterName: "House Warden",
  archetype: "Lantern Warden",
  bodyFrame: "Balanced",
  skinTone: "sunlit",
  hairStyle: "cropped",
  hairColor: "chestnut",
  outfitStyle: "tavern",
  cloakColor: "#9a6a3c",
  accentColor: "#d7b46f",
  shirtColor: "#496a43",
  pantsColor: "#3b3c45",
  crest: "Lantern Crest",
  pose: "ready",
};

export const SKIN_TONE_COLORS: Record<CharacterSkinTone, string> = {
  sunlit: "#f3c58d",
  umber: "#9b623c",
  rose: "#d99a7d",
  deep: "#5d3326",
};

export const HAIR_COLORS: Record<CharacterHairColor, string> = {
  chestnut: "#5b321b",
  raven: "#17110e",
  copper: "#a95024",
  silver: "#c6c0b5",
};

export function getArchetypeDefaults(archetype: CharacterArchetype) {
  return ARCHETYPE_OPTIONS.find((option) => option.value === archetype) ?? ARCHETYPE_OPTIONS[0];
}

export function normalizeClothingColor(value: string | null | undefined, fallback: CharacterClothingColor): CharacterClothingColor {
  const option = CLOTHING_COLOR_OPTIONS.find((color) => color.value.toLowerCase() === value?.toLowerCase());
  return option?.value ?? fallback;
}

export function normalizeCharacter(row: unknown): UserCharacter {
  if (!row || typeof row !== "object") {
    return DEFAULT_CHARACTER;
  }

  const data = row as Record<string, string | null>;

  return {
    characterName: data.character_name || DEFAULT_CHARACTER.characterName,
    archetype: (data.archetype as CharacterArchetype | null) || DEFAULT_CHARACTER.archetype,
    bodyFrame: (data.body_frame as CharacterBodyFrame | null) || DEFAULT_CHARACTER.bodyFrame,
    skinTone: (data.skin_tone as CharacterSkinTone | null) || DEFAULT_CHARACTER.skinTone,
    hairStyle: (data.hair_style as CharacterHairStyle | null) || DEFAULT_CHARACTER.hairStyle,
    hairColor: (data.hair_color as CharacterHairColor | null) || DEFAULT_CHARACTER.hairColor,
    outfitStyle: (data.outfit_style as CharacterOutfitStyle | null) || DEFAULT_CHARACTER.outfitStyle,
    cloakColor: data.cloak_color || DEFAULT_CHARACTER.cloakColor,
    accentColor: data.accent_color || DEFAULT_CHARACTER.accentColor,
    shirtColor: normalizeClothingColor(data.shirt_color, normalizeClothingColor(data.cloak_color, DEFAULT_CHARACTER.shirtColor)),
    pantsColor: normalizeClothingColor(data.pants_color, normalizeClothingColor(data.accent_color, DEFAULT_CHARACTER.pantsColor)),
    crest: (data.crest as CharacterCrest | null) || DEFAULT_CHARACTER.crest,
    pose: (data.pose as CharacterPose | null) || DEFAULT_CHARACTER.pose,
  };
}

export function getRoomAvatarAppearance(character: UserCharacter) {
  return {
    skinColor: SKIN_TONE_COLORS[character.skinTone],
    hairColor: HAIR_COLORS[character.hairColor],
    shirtColor: character.shirtColor,
    pantsColor: character.pantsColor,
    hairStyle: character.hairStyle,
    bodyFrame: character.bodyFrame,
  };
}
