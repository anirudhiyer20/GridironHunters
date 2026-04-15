"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import {
  BODY_FRAME_OPTIONS,
  CLOTHING_COLOR_OPTIONS,
  DEFAULT_CHARACTER,
  HAIR_COLOR_OPTIONS,
  HAIR_STYLE_OPTIONS,
  SKIN_TONE_OPTIONS,
  type CharacterBodyFrame,
  type CharacterClothingColor,
  type CharacterHairColor,
  type CharacterHairStyle,
  type CharacterSkinTone,
} from "./wardrobe-model";

function encodeMessage(message: string) {
  return encodeURIComponent(message);
}

function readOption<T extends string>(formData: FormData, key: string, options: readonly T[], fallback: T): T {
  const value = String(formData.get(key) ?? "");
  return options.includes(value as T) ? (value as T) : fallback;
}

function readCharacterName(formData: FormData) {
  const value = String(formData.get("character_name") ?? "").trim();
  return value.slice(0, 40) || "House Warden";
}

export async function saveCharacter(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?message=" + encodeMessage("Log in before editing your Wardrobe."));
  }

  const bodyFrame = readOption<CharacterBodyFrame>(
    formData,
    "body_frame",
    BODY_FRAME_OPTIONS,
    DEFAULT_CHARACTER.bodyFrame,
  );
  const skinTone = readOption<CharacterSkinTone>(formData, "skin_tone", SKIN_TONE_OPTIONS, "sunlit");
  const hairStyle = readOption<CharacterHairStyle>(formData, "hair_style", HAIR_STYLE_OPTIONS, "cropped");
  const hairColor = readOption<CharacterHairColor>(formData, "hair_color", HAIR_COLOR_OPTIONS, "chestnut");
  const shirtColor = readOption<CharacterClothingColor>(
    formData,
    "shirt_color",
    CLOTHING_COLOR_OPTIONS.map((option) => option.value),
    DEFAULT_CHARACTER.shirtColor,
  );
  const pantsColor = readOption<CharacterClothingColor>(
    formData,
    "pants_color",
    CLOTHING_COLOR_OPTIONS.map((option) => option.value),
    DEFAULT_CHARACTER.pantsColor,
  );

  const { error } = await supabase.from("user_characters").upsert({
    user_id: user.id,
    character_name: readCharacterName(formData),
    archetype: DEFAULT_CHARACTER.archetype,
    body_frame: bodyFrame,
    skin_tone: skinTone,
    hair_style: hairStyle,
    hair_color: hairColor,
    outfit_style: DEFAULT_CHARACTER.outfitStyle,
    cloak_color: shirtColor,
    accent_color: pantsColor,
    shirt_color: shirtColor,
    pants_color: pantsColor,
    crest: DEFAULT_CHARACTER.crest,
    pose: DEFAULT_CHARACTER.pose,
  });

  if (error) {
    redirect("/app/house/wardrobe?message=" + encodeMessage(error.message));
  }

  revalidatePath("/app");
  revalidatePath("/app/house/wardrobe");
  redirect("/app/house/wardrobe?message=" + encodeMessage("Character saved."));
}
