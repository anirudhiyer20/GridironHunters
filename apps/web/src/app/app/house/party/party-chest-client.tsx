"use client";

import { useMemo, useState } from "react";

import { DRAFT_POSITIONS, TRIBE_NAMES, type DraftPosition, type TribeName } from "@gridiron/shared";

import { HeroLink } from "@/components/hero-link";

export type PartyChestPlayer = {
  id: string;
  pickNumber: number;
  name: string;
  position: DraftPosition | "Unknown";
  nflTeam: string;
  tribe: TribeName | "Unclaimed";
};

type PartyChestClientProps = {
  party: PartyChestPlayer[];
  lineup: Array<{
    id: string;
    position: DraftPosition | "FLEX";
    player: PartyChestPlayer | null;
  }>;
  dungeonParty: PartyChestPlayer[];
};

type PositionFilter = "ALL" | DraftPosition;
type TribeFilter = "ALL" | TribeName | "Unclaimed";

export function PartyChestClient({ party, lineup, dungeonParty }: PartyChestClientProps) {
  const [positionFilter, setPositionFilter] = useState<PositionFilter>("ALL");
  const [tribeFilter, setTribeFilter] = useState<TribeFilter>("ALL");

  const tribeOptions = useMemo(() => {
    const playerTribes = new Set(party.map((player) => player.tribe));
    return ["ALL", ...TRIBE_NAMES.filter((tribe) => playerTribes.has(tribe)), ...(playerTribes.has("Unclaimed") ? ["Unclaimed" as const] : [])] as const;
  }, [party]);

  const filteredParty = party.filter((player) => {
    if (positionFilter !== "ALL" && player.position !== positionFilter) {
      return false;
    }

    if (tribeFilter !== "ALL" && player.tribe !== tribeFilter) {
      return false;
    }

    return true;
  });
  const inventorySlots = Array.from({ length: Math.max(30, filteredParty.length) }, (_, index) => filteredParty[index] ?? null);

  return (
    <section className="party-chest-shell">
      <div className="party-chest-left">
        <div className="party-chest-actions">
          <HeroLink href="/app/arena">Confirm Squad</HeroLink>
        </div>

        <div className="party-lineup-stage" aria-label="Current Arena lineup">
          {lineup.slice(0, 6).map((slot) => (
            <LineupSlot key={slot.id} slot={slot} />
          ))}
        </div>

        <div className="party-dungeon-row" aria-label="Dungeon assignments">
          {Array.from({ length: 3 }, (_, index) => dungeonParty[index] ?? null).map((player, index) => (
            <DungeonSlot key={player?.id ?? `dungeon-empty-${index}`} player={player} index={index} />
          ))}
        </div>
      </div>

      <div className="party-chest-right">
        <div className="party-chest-filter-bar">
          <label>
            <span>Tribe</span>
            <select value={tribeFilter} onChange={(event) => setTribeFilter(event.target.value as TribeFilter)}>
              {tribeOptions.map((tribe) => (
                <option key={tribe} value={tribe}>
                  {tribe}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Position</span>
            <select value={positionFilter} onChange={(event) => setPositionFilter(event.target.value as PositionFilter)}>
              <option value="ALL">ALL</option>
              {DRAFT_POSITIONS.map((position) => (
                <option key={position} value={position}>
                  {position}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="party-inventory-window">
          <div className="party-inventory-grid">
            {inventorySlots.map((player, index) => (
              <InventorySlot key={player?.id ?? `inventory-empty-${index}`} player={player} index={index} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function LineupSlot({
  slot,
}: {
  slot: {
    id: string;
    position: DraftPosition | "FLEX";
    player: PartyChestPlayer | null;
  };
}) {
  return (
    <div className="party-lineup-slot">
      <span>{slot.position}</span>
      <strong>{slot.player?.name ?? "Empty"}</strong>
    </div>
  );
}

function DungeonSlot({ player, index }: { player: PartyChestPlayer | null; index: number }) {
  return (
    <div className="party-dungeon-slot">
      <span>Dungeon {index + 1}</span>
      <strong>{player?.name ?? "Unassigned"}</strong>
      <small>{player ? `${player.position} | ${player.tribe}` : "Awaiting fighter"}</small>
    </div>
  );
}

function InventorySlot({ player, index }: { player: PartyChestPlayer | null; index: number }) {
  return (
    <div className={`party-inventory-slot ${player ? "party-inventory-slot--filled" : ""}`}>
      {player ? (
        <>
          <span>{player.position}</span>
          <strong>{player.name}</strong>
          <small>{player.tribe} | {player.nflTeam}</small>
        </>
      ) : (
        <span className="party-inventory-slot__empty">{index + 1}</span>
      )}
    </div>
  );
}
