"use client";

import { useState, type CSSProperties } from "react";

import { HeroLink } from "@/components/hero-link";

import { saveCharacter } from "./actions";
import {
  BODY_FRAME_OPTIONS,
  CLOTHING_COLOR_OPTIONS,
  HAIR_COLOR_OPTIONS,
  HAIR_COLORS,
  HAIR_STYLE_OPTIONS,
  SKIN_TONE_COLORS,
  SKIN_TONE_OPTIONS,
  type CharacterClothingColor,
  type UserCharacter,
} from "./wardrobe-model";

type WardrobeEditorProps = {
  initialCharacter: UserCharacter;
  displayName: string;
  message?: string;
};

export function WardrobeEditor({ initialCharacter, displayName, message }: WardrobeEditorProps) {
  const [character, setCharacter] = useState(initialCharacter);

  function updateCharacter(update: Partial<UserCharacter>) {
    setCharacter((current) => ({
      ...current,
      ...update,
    }));
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[0.86fr_1.14fr]">
      <section className="fantasy-panel fantasy-panel--stone rounded-[1.9rem] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="fantasy-title mt-2 text-3xl text-[#fff4d8]">{character.characterName}</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <HeroLink href="/app">Return Home</HeroLink>
          </div>
        </div>

        {message ? (
          <div className="mt-5 rounded-[1.2rem] border border-[#d3ad69]/24 bg-[#2f2112]/80 px-4 py-3 text-sm text-[#fff0cf]">
            {message}
          </div>
        ) : null}

        <div className="mt-5 rounded-[1.7rem] border border-[#9e8455]/18 bg-black/20 px-6 py-6">
          <CharacterPreview character={character} displayName={displayName} />
        </div>
      </section>

      <section className="fantasy-panel fantasy-panel--stone rounded-[1.9rem] p-5">
        <div>
          <h2 className="fantasy-title mt-2 text-3xl text-[#fff4d8]">Customize Character</h2>
        </div>

        <form action={saveCharacter} className="mt-5 grid gap-5">
          <label className="wardrobe-field md:col-span-2">
            <span>Character Name</span>
            <input
              name="character_name"
              value={character.characterName}
              maxLength={40}
              onChange={(event) => updateCharacter({ characterName: event.target.value })}
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <WardrobeSelect
              label="Body Frame"
              name="body_frame"
              value={character.bodyFrame}
              options={BODY_FRAME_OPTIONS}
              onChange={(value) => updateCharacter({ bodyFrame: value })}
            />
            <WardrobeSelect
              label="Skin Tone"
              name="skin_tone"
              value={character.skinTone}
              options={SKIN_TONE_OPTIONS}
              onChange={(value) => updateCharacter({ skinTone: value })}
            />
            <WardrobeSelect
              label="Hair Style"
              name="hair_style"
              value={character.hairStyle}
              options={HAIR_STYLE_OPTIONS}
              onChange={(value) => updateCharacter({ hairStyle: value })}
            />
            <WardrobeSelect
              label="Hair Color"
              name="hair_color"
              value={character.hairColor}
              options={HAIR_COLOR_OPTIONS}
              onChange={(value) => updateCharacter({ hairColor: value })}
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <ColorSwatches
              label="Shirt Color"
              name="shirt_color"
              value={character.shirtColor}
              options={CLOTHING_COLOR_OPTIONS}
              onChange={(value) => updateCharacter({ shirtColor: value, cloakColor: value })}
            />
            <ColorSwatches
              label="Pants Color"
              name="pants_color"
              value={character.pantsColor}
              options={CLOTHING_COLOR_OPTIONS}
              onChange={(value) => updateCharacter({ pantsColor: value, accentColor: value })}
            />
          </div>

          <button type="submit" className="fantasy-button fantasy-button--gold w-fit">
            Save Character
          </button>
        </form>
      </section>
    </div>
  );
}

function CharacterPreview({ character }: { character: UserCharacter; displayName: string }) {
  return (
    <div className="wardrobe-preview wardrobe-preview--solo">
      <div className="wardrobe-preview__closet">
        <div className="wardrobe-preview__avatar">
          <PixelAvatar character={character} />
        </div>
      </div>
    </div>
  );
}

function PixelAvatar({ character }: { character: UserCharacter }) {
  return (
    <div
      className={`pixel-character pixel-character--${character.bodyFrame.toLowerCase()} pixel-character--${character.pose}`}
      style={{
        "--skin": SKIN_TONE_COLORS[character.skinTone],
        "--hair": HAIR_COLORS[character.hairColor],
        "--shirt": character.shirtColor,
        "--pants": character.pantsColor,
      } as CSSProperties}
    >
      <div className={`pixel-character__hair pixel-character__hair--${character.hairStyle}`} />
      <div className="pixel-character__head" />
      <div className="pixel-character__torso" />
      <div className="pixel-character__belt" />
      <div className="pixel-character__legs" />
      <div className="pixel-character__shadow" />
    </div>
  );
}

function ColorSwatches({
  label,
  name,
  value,
  options,
  onChange,
}: {
  label: string;
  name: string;
  value: CharacterClothingColor;
  options: readonly { value: CharacterClothingColor; label: string }[];
  onChange: (value: CharacterClothingColor) => void;
}) {
  return (
    <fieldset className="wardrobe-swatch-field">
      <legend>{label}</legend>
      <div className="wardrobe-swatches">
        {options.map((option) => (
          <label
            key={option.value}
            className={`wardrobe-swatch ${value === option.value ? "wardrobe-swatch--selected" : ""}`}
            title={option.label}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span style={{ background: option.value }} />
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function WardrobeSelect<T extends string>({
  label,
  name,
  value,
  options,
  onChange,
}: {
  label: string;
  name: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
}) {
  return (
    <label className="wardrobe-field">
      <span>{label}</span>
      <select name={name} value={value} onChange={(event) => onChange(event.target.value as T)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {toTitleCase(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function toTitleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}
