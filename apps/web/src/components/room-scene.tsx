"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

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
  href?: string;
  actionLabel?: string;
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
                className={`room-hotspot room-hotspot--${hotspot.kind} room-hotspot--${hotspot.tone ?? "warm"} ${selectedHotspotId === hotspot.id ? "room-hotspot--selected" : ""} ${activeDoorId === hotspot.id ? "room-hotspot--active" : ""}`}
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
        <p className="fantasy-kicker">Featured Object</p>
        <h3 className="fantasy-title mt-3 text-3xl">{selectedHotspot?.label ?? "Idle"}</h3>
        <p className="mt-4 text-sm leading-7 text-[#efe2c9]">
          {selectedHotspot?.flavor ?? "Walk your avatar through the room and open the objects that matter to your House."}
        </p>

        {selectedHotspot?.href ? (
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={selectedHotspot.href} className="fantasy-button fantasy-button--gold">
              {selectedHotspot.actionLabel ?? `Enter ${selectedHotspot.label}`}
            </Link>
          </div>
        ) : null}

        <div className="mt-6 rounded-[1.4rem] border border-[#9e8455]/25 bg-black/20 p-4 text-sm text-[#e7d7ba]">
          <p className="fantasy-kicker text-[0.7rem]">Room Guidance</p>
          <p className="mt-3 leading-7">
            Click anywhere on the floor to move. Click an object to inspect it. Doors carry your House into the next chamber.
          </p>
        </div>
      </aside>
    </div>
  );
}
