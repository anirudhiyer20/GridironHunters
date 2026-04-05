"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

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
  flavor: string;
  x: number;
  y: number;
  width: number;
  height: number;
  kind: "door" | "object";
  tone?: "warm" | "stone" | "ember" | "forest";
  displayStyle?: "board" | "wardrobe" | "cabinet" | "chest" | "door";
  href?: string;
  actionLabel?: string;
  stats?: RoomHotspotStat[];
  notes?: string[];
  actions?: RoomHotspotAction[];
};

export function RoomScene({
  roomName,
  roomMood,
  avatarName,
  sceneClassName,
  hotspots,
  defaultSelectedHotspotId,
}: {
  roomName: string;
  roomMood: string;
  avatarName: string;
  sceneClassName?: string;
  hotspots: RoomHotspot[];
  defaultSelectedHotspotId?: string;
}) {
  const router = useRouter();
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
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(defaultHotspot?.id ?? null);
  const [avatarPosition, setAvatarPosition] = useState(initialAvatarPosition);
  const [activeDoorId, setActiveDoorId] = useState<string | null>(null);

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
    setSelectedHotspotId(hotspot.id);
    moveAvatarTo(hotspot.x + hotspot.width / 2, hotspot.y + hotspot.height + 10);

    if (hotspot.kind === "door" && hotspot.href) {
      setActiveDoorId(hotspot.id);
      window.setTimeout(() => {
        router.push(hotspot.href!);
      }, 420);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <div>
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
          <div className="room-scene__hud">
            <div>
              <p className="room-scene__eyebrow">{roomName}</p>
              <h2 className="room-scene__title">{avatarName}</h2>
            </div>
            <p className="room-scene__mood">{roomMood}</p>
          </div>

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
                className={`room-hotspot room-hotspot--${hotspot.kind} room-hotspot--${hotspot.tone ?? "warm"} room-hotspot--${hotspot.displayStyle ?? (hotspot.kind === "door" ? "door" : "board")} ${selectedHotspotId === hotspot.id ? "room-hotspot--selected" : ""} ${activeDoorId === hotspot.id ? "room-hotspot--active" : ""}`}
                style={{
                  left: `${hotspot.x}%`,
                  top: `${hotspot.y}%`,
                  width: `${hotspot.width}%`,
                  height: `${hotspot.height}%`,
                }}
              >
                <span>{hotspot.label}</span>
              </button>
            ))}

            <div
              className={`room-avatar ${activeDoorId ? "room-avatar--walking" : ""}`}
              style={{ left: `${avatarPosition.x}%`, top: `${avatarPosition.y}%` }}
            >
              <div className="room-avatar__head" />
              <div className="room-avatar__body" />
              <div className="room-avatar__shadow" />
            </div>
          </div>
        </div>
      </div>

      <aside className="fantasy-panel fantasy-panel--stone h-full rounded-[1.8rem] p-5">
        <div className="flex flex-wrap items-center gap-3">
          <p className="fantasy-kicker">Featured Object</p>
          {selectedHotspot ? (
            <span className="rounded-full border border-[#9e8455]/22 bg-black/20 px-3 py-1 text-[0.68rem] uppercase tracking-[0.2em] text-[#d6bf90]">
              {selectedKindLabel}
            </span>
          ) : null}
        </div>
        <h3 className="fantasy-title mt-3 text-3xl">{selectedHotspot?.label ?? "Idle"}</h3>
        <p className="mt-4 text-sm leading-7 text-[#efe2c9]">
          {selectedHotspot?.flavor ?? "Walk your avatar through the room and open the objects that matter to your House."}
        </p>

        {selectedHotspot?.stats?.length ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {selectedHotspot.stats.map((stat) => (
              <div key={stat.label} className="rounded-[1.2rem] border border-[#9e8455]/20 bg-black/20 px-4 py-3">
                <p className="fantasy-kicker text-[0.68rem] text-[#c6ad7d]">{stat.label}</p>
                <p className="mt-2 text-base font-semibold text-[#fff4d8]">{stat.value}</p>
              </div>
            ))}
          </div>
        ) : null}

        {selectedActions.length ? (
          <div className="mt-6 flex flex-wrap gap-3">
            {selectedActions.map((action) => (
              <Link
                key={`${selectedHotspot?.id ?? "idle"}-${action.href}-${action.label}`}
                href={action.href}
                className={`fantasy-button ${action.tone === "stone" ? "fantasy-button--stone" : "fantasy-button--gold"}`}
              >
                {action.label}
              </Link>
            ))}
          </div>
        ) : null}

        {selectedHotspot?.notes?.length ? (
          <div className="mt-6 rounded-[1.4rem] border border-[#9e8455]/25 bg-black/20 p-4 text-sm text-[#e7d7ba]">
            <p className="fantasy-kicker text-[0.7rem]">Object Notes</p>
            <ul className="mt-3 grid gap-3 leading-7">
              {selectedHotspot.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[1.2rem] border border-[#9e8455]/18 bg-black/20 px-4 py-3 text-sm text-[#e7d7ba]">
            <p className="fantasy-kicker text-[0.66rem]">Move</p>
            <p className="mt-2 leading-6">Click the floor.</p>
          </div>
          <div className="rounded-[1.2rem] border border-[#9e8455]/18 bg-black/20 px-4 py-3 text-sm text-[#e7d7ba]">
            <p className="fantasy-kicker text-[0.66rem]">Inspect</p>
            <p className="mt-2 leading-6">Select an object.</p>
          </div>
          <div className="rounded-[1.2rem] border border-[#9e8455]/18 bg-black/20 px-4 py-3 text-sm text-[#e7d7ba]">
            <p className="fantasy-kicker text-[0.66rem]">Travel</p>
            <p className="mt-2 leading-6">Use the door actions.</p>
          </div>
        </div>
      </aside>
    </div>
  );
}
