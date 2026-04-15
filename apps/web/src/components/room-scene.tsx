"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type CSSProperties } from "react";

export type RoomHotspotAction = {
  href: string;
  label: string;
  tone?: "gold" | "stone";
};

export type RoomHotspotStat = {
  label: string;
  value: string;
};

export type RoomHotspot = {
  id: string;
  label: string;
  displayLabel?: string;
  flavor: string;
  x: number;
  y: number;
  width: number;
  height: number;
  kind: "door" | "object";
  tone?: "warm" | "stone" | "ember" | "forest";
  displayStyle?: "board" | "wardrobe" | "cabinet" | "chest" | "door" | "mailbox" | "dungeon-door" | "portal";
  accentColor?: string;
  accentTextColor?: string;
  href?: string;
  actionLabel?: string;
  interactionMode?: "modal" | "direct";
  stats?: RoomHotspotStat[];
  notes?: string[];
  actions?: RoomHotspotAction[];
};

export type RoomAvatarAppearance = {
  skinColor: string;
  hairColor: string;
  shirtColor: string;
  pantsColor: string;
  hairStyle: "cropped" | "waves" | "braids" | "hooded";
  bodyFrame: "Balanced" | "Sturdy" | "Swift";
};

export function RoomScene({
  avatarName,
  avatarAppearance,
  sceneClassName,
  hotspots,
  defaultSelectedHotspotId,
  showHud = true,
}: {
  roomName: string;
  roomMood: string;
  avatarName: string;
  avatarAppearance?: RoomAvatarAppearance;
  sceneClassName?: string;
  hotspots: RoomHotspot[];
  defaultSelectedHotspotId?: string;
  showHud?: boolean;
}) {
  const defaultHotspot = useMemo(
    () => hotspots.find((hotspot) => hotspot.id === defaultSelectedHotspotId) ?? hotspots[0] ?? null,
    [defaultSelectedHotspotId, hotspots],
  );
  const initialAvatarPosition = useMemo(
    () => ({
      x: defaultHotspot ? Math.min(92, defaultHotspot.x + defaultHotspot.width / 2) : 48,
      y: defaultHotspot ? Math.min(88, defaultHotspot.y + defaultHotspot.height + 9) : 78,
    }),
    [defaultHotspot],
  );
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null);
  const [avatarPosition, setAvatarPosition] = useState(initialAvatarPosition);
  const router = useRouter();

  const selectedHotspot = hotspots.find((hotspot) => hotspot.id === selectedHotspotId) ?? null;
  const selectedActions = selectedHotspot?.actions?.length
    ? selectedHotspot.actions
    : selectedHotspot?.href
      ? [{ href: selectedHotspot.href, label: selectedHotspot.actionLabel ?? `Enter ${selectedHotspot.label}`, tone: "gold" as const }]
      : [];
  const selectedKindLabel = selectedHotspot?.kind === "door" ? "Doorway" : "Object";

  function moveAvatarTo(x: number, y: number) {
    setAvatarPosition({
      x: Math.min(94, Math.max(6, x)),
      y: Math.min(88, Math.max(18, y)),
    });
  }

  function handleHotspotClick(hotspot: RoomHotspot) {
    moveAvatarTo(hotspot.x + hotspot.width / 2, hotspot.y + hotspot.height + 10);

    const interactionMode = hotspot.interactionMode ?? (hotspot.kind === "door" ? "direct" : "modal");

    if (interactionMode === "direct" && hotspot.href) {
      setSelectedHotspotId(null);
      router.push(hotspot.href);
      return;
    }

    setSelectedHotspotId(hotspot.id);
  }

  return (
    <div className="relative">
      <div
        className={`room-scene ${sceneClassName ?? "room-scene--house"}`}
        onClick={(event) => {
          const target = event.currentTarget;
          const rect = target.getBoundingClientRect();
          const clickX = ((event.clientX - rect.left) / rect.width) * 100;
          const clickY = ((event.clientY - rect.top) / rect.height) * 100;
          moveAvatarTo(clickX, clickY);
        }}
        >
          {showHud ? (
            <div className="room-scene__hud">
              <h2 className="room-scene__title">{avatarName}</h2>
            </div>
          ) : null}

        <div className="room-scene__playfield">
          {hotspots.map((hotspot) => (
            <button
              key={hotspot.id}
              type="button"
              aria-label={hotspot.label}
              onClick={(event) => {
                event.stopPropagation();
                handleHotspotClick(hotspot);
              }}
              className={`room-hotspot room-hotspot--${hotspot.kind} room-hotspot--${hotspot.tone ?? "warm"} room-hotspot--${hotspot.displayStyle ?? (hotspot.kind === "door" ? "door" : "board")} ${selectedHotspotId === hotspot.id ? "room-hotspot--selected" : ""}`}
              style={{
                left: `${hotspot.x}%`,
                top: `${hotspot.y}%`,
                width: `${hotspot.width}%`,
                height: `${hotspot.height}%`,
                "--room-hotspot-accent": hotspot.accentColor,
                "--room-hotspot-accent-text": hotspot.accentTextColor,
              } as CSSProperties}
            >
              <span className="room-hotspot__label">{hotspot.displayLabel ?? hotspot.label}</span>
              <span className="room-hotspot__hover-label">{hotspot.label}</span>
            </button>
          ))}

          <div
            className={`room-avatar ${avatarAppearance ? "room-avatar--custom" : ""} ${avatarAppearance ? `room-avatar--${avatarAppearance.bodyFrame.toLowerCase()}` : ""}`}
            style={{
              left: `${avatarPosition.x}%`,
              top: `${avatarPosition.y}%`,
              "--room-avatar-skin": avatarAppearance?.skinColor,
              "--room-avatar-hair": avatarAppearance?.hairColor,
              "--room-avatar-shirt": avatarAppearance?.shirtColor,
              "--room-avatar-pants": avatarAppearance?.pantsColor,
            } as CSSProperties}
          >
            {avatarAppearance ? (
              <>
                <div className={`room-avatar__hair room-avatar__hair--${avatarAppearance.hairStyle}`} />
                <div className="room-avatar__head" />
                <div className="room-avatar__shirt" />
                <div className="room-avatar__belt" />
                <div className="room-avatar__pants" />
              </>
            ) : (
              <>
                <div className="room-avatar__head" />
                <div className="room-avatar__body" />
              </>
            )}
            <div className="room-avatar__shadow" />
          </div>
        </div>
      </div>

      {selectedHotspot ? (
        <div className="room-scene-modal" onClick={() => setSelectedHotspotId(null)}>
          <div className="room-scene-modal__backdrop" />
          <div
            className="room-scene-modal__panel fantasy-panel fantasy-panel--stone"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="fantasy-kicker">Featured Object</p>
                  <span className="rounded-full border border-[#9e8455]/22 bg-black/20 px-3 py-1 text-[0.68rem] uppercase tracking-[0.2em] text-[#d6bf90]">
                    {selectedKindLabel}
                  </span>
                </div>
                <h3 className="fantasy-title mt-3 text-3xl">{selectedHotspot.label}</h3>
              </div>
              <button type="button" className="room-scene-modal__close" onClick={() => setSelectedHotspotId(null)}>
                Close
              </button>
            </div>

            <p className="mt-4 text-sm leading-7 text-[#efe2c9]">{selectedHotspot.flavor}</p>

            {selectedHotspot.stats?.length ? (
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {selectedHotspot.stats.map((stat) => (
                  <div key={stat.label} className="rounded-[1.2rem] border border-[#9e8455]/20 bg-black/20 px-4 py-3">
                    <p className="fantasy-kicker text-[0.68rem] text-[#c6ad7d]">{stat.label}</p>
                    <p className="mt-2 text-base font-semibold text-[#fff4d8]">{stat.value}</p>
                  </div>
                ))}
              </div>
            ) : null}

            {selectedHotspot.notes?.length ? (
              <div className="mt-6 rounded-[1.4rem] border border-[#9e8455]/25 bg-black/20 p-4 text-sm text-[#e7d7ba]">
                <ul className="grid gap-3 leading-7">
                  {selectedHotspot.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {selectedActions.length ? (
              <div className="mt-6 flex flex-wrap gap-3">
                {selectedActions.map((action) => (
                  <Link
                    key={`${selectedHotspot.id}-${action.href}-${action.label}`}
                    href={action.href}
                    className={`fantasy-button ${action.tone === "stone" ? "fantasy-button--stone" : "fantasy-button--gold"}`}
                  >
                    {action.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
