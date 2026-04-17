"use client";

import { useMemo, useState } from "react";

import { DRAFT_POSITIONS, TRIBE_COLORS, TRIBE_NAMES, type DraftPosition, type TribeName } from "@gridiron/shared";

import { HeroLink } from "@/components/hero-link";

import { clearPartyAssignment, confirmPartySquad, savePartyAssignment } from "./actions";

export type PartyChestPlayer = {
  id: string;
  draftPickId: string;
  pickNumber: number;
  name: string;
  position: DraftPosition | "Unknown";
  nflTeam: string;
  tribe: TribeName | "Unclaimed";
};

type PartyChestClientProps = {
  party: PartyChestPlayer[];
  capturedRecruits: PartyChestPlayer[];
  lineup: Array<{
    id: string;
    position: DraftPosition | "FLEX";
    player: PartyChestPlayer | null;
  }>;
  huntAssignments: HuntAssignment[];
  leagueId: string | null;
  participantId: string | null;
};

export type HuntAssignment = {
  id: string;
  challengerName: string;
  challengerPosition: DraftPosition;
  challengerTeam: string;
  targetName: string;
  targetPosition: DraftPosition;
  targetTeam: string;
  targetTribe: TribeName;
};

type PositionFilter = "ALL" | DraftPosition;
type TribeFilter = "ALL" | TribeName | "Unclaimed";

export function PartyChestClient({ party, capturedRecruits, lineup, huntAssignments, leagueId, participantId }: PartyChestClientProps) {
  const [positionFilter, setPositionFilter] = useState<PositionFilter>("ALL");
  const [tribeFilter, setTribeFilter] = useState<TribeFilter>("ALL");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(party[0]?.id ?? null);

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
  const selectedPlayer = party.find((player) => player.id === selectedPlayerId) ?? null;
  const inventorySlots = Array.from({ length: Math.max(30, filteredParty.length) }, (_, index) => filteredParty[index] ?? null);
  const canSaveAssignments = Boolean(leagueId && participantId);
  const assignedPickIds = new Set(
    [
      ...lineup.map((slot) => slot.player?.draftPickId),
    ].filter((id): id is string => Boolean(id)),
  );

  return (
    <section className="party-chest-shell">
      <div className="party-chest-main">
        <div className="party-chest-left">
          <div className="party-chest-actions">
            <form action={confirmPartySquad}>
              <button type="submit" className="fantasy-button fantasy-button--gold">
                Confirm Squad
              </button>
            </form>
            <HeroLink href="/app/arena/duels" tone="secondary">Enter Duel Dais</HeroLink>
          </div>

          <div className="party-selection-ribbon">
            <span>Selected Fighter</span>
            <strong>{selectedPlayer ? `${selectedPlayer.name} (${selectedPlayer.position})` : "Choose from inventory"}</strong>
          </div>

          <div className="party-lineup-stage" aria-label="Current Arena lineup">
            {lineup.slice(0, 6).map((slot) => (
              <LineupSlot
                key={slot.id}
                slot={slot}
                selectedPlayer={selectedPlayer}
                leagueId={leagueId}
                participantId={participantId}
                canSave={canSaveAssignments}
                isSelectedAlreadyAssigned={Boolean(selectedPlayer && assignedPickIds.has(selectedPlayer.draftPickId))}
              />
            ))}
          </div>
        </div>

        <div className="party-chest-right">
          <div className="party-chest-filter-bar">
            <HeroLink href="/app" tone="secondary">Return Home</HeroLink>
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
                <InventorySlot
                  key={player?.id ?? `inventory-empty-${index}`}
                  player={player}
                  index={index}
                  isSelected={player?.id === selectedPlayerId}
                  onSelect={() => player ? setSelectedPlayerId(player.id) : undefined}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {capturedRecruits.length ? (
        <div className="party-hunt-summary" aria-label="Captured recruits">
          <div className="party-hunt-summary__header">
            <div>
              <span>Captured Recruits</span>
              <strong>{capturedRecruits.length} Captured From Hunts</strong>
            </div>
          </div>
          <div className="party-hunt-summary__list">
            {capturedRecruits.map((player) => (
              <article key={player.id} className="party-hunt-assignment">
                <TribeBadge tribe={player.tribe} />
                <span>{player.position}</span>
                <strong>{player.name}</strong>
                <small>{player.nflTeam}</small>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      <HuntAssignmentSummary huntAssignments={huntAssignments} />
    </section>
  );
}

function LineupSlot({
  slot,
  selectedPlayer,
  leagueId,
  participantId,
  canSave,
  isSelectedAlreadyAssigned,
}: {
  slot: {
    id: string;
    position: DraftPosition | "FLEX";
    player: PartyChestPlayer | null;
  };
  selectedPlayer: PartyChestPlayer | null;
  leagueId: string | null;
  participantId: string | null;
  canSave: boolean;
  isSelectedAlreadyAssigned: boolean;
}) {
  const isCurrentSlotPlayer = selectedPlayer?.draftPickId === slot.player?.draftPickId;
  const canAssign = Boolean(
    selectedPlayer &&
    canSave &&
    isEligibleForArenaSlot(selectedPlayer, slot.position) &&
    (!isSelectedAlreadyAssigned || isCurrentSlotPlayer),
  );

  return (
    <div className="party-lineup-slot">
      {slot.player ? <TribeBadge tribe={slot.player.tribe} /> : null}
      <span>{slot.position}</span>
      <strong>{slot.player?.name ?? "Empty"}</strong>
      <AssignmentForm
        assignmentType="arena"
        slotKey={slot.id}
        selectedPlayer={selectedPlayer}
        leagueId={leagueId}
        participantId={participantId}
        disabled={!canAssign}
        label={getAssignLabel(canAssign, selectedPlayer, isSelectedAlreadyAssigned, isCurrentSlotPlayer, "Select Eligible")}
      />
      <ClearAssignmentForm
        assignmentType="arena"
        slotKey={slot.id}
        leagueId={leagueId}
        participantId={participantId}
        disabled={!slot.player || !canSave}
      />
    </div>
  );
}

function HuntAssignmentSummary({ huntAssignments }: { huntAssignments: HuntAssignment[] }) {
  return (
    <div className="party-hunt-summary" aria-label="Dungeon Hunt assignments">
      <div className="party-hunt-summary__header">
        <div>
          <span>Dungeon Hunts</span>
          <strong>{huntAssignments.length ? `${huntAssignments.length} Battle Keys At Work` : "No Hunts Assigned"}</strong>
        </div>
        <HeroLink href="/app/dungeon/hunts" tone="secondary">Open Hunt Slate</HeroLink>
      </div>
      <div className="party-hunt-summary__list">
        {huntAssignments.length ? huntAssignments.map((assignment) => (
          <article key={assignment.id} className="party-hunt-assignment">
            <TribeBadge tribe={assignment.targetTribe} />
            <span>{assignment.challengerPosition}</span>
            <strong>{assignment.challengerName}</strong>
            <small>
              vs {assignment.targetName} | {assignment.targetTeam}
            </small>
          </article>
        )) : (
          <div className="party-dungeon-slot party-dungeon-slot--empty">
            <span>Dungeon</span>
            <strong>No Active Hunt Assignments</strong>
            <small>Queue a Wild Player in the Dungeon, then choose battlers on the Hunt Slate.</small>
          </div>
        )}
      </div>
    </div>
  );
}

function InventorySlot({
  player,
  index,
  isSelected,
  onSelect,
}: {
  player: PartyChestPlayer | null;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`party-inventory-slot ${player ? "party-inventory-slot--filled" : ""} ${isSelected ? "party-inventory-slot--selected" : ""}`}
      onClick={onSelect}
      disabled={!player}
    >
      {player ? (
        <>
          <TribeBadge tribe={player.tribe} />
          <span>{player.position}</span>
          <strong>{player.name}</strong>
          <small>{player.nflTeam}</small>
        </>
      ) : (
        <span className="party-inventory-slot__empty">{index + 1}</span>
      )}
    </button>
  );
}

function TribeBadge({ tribe }: { tribe: TribeName | "Unclaimed" }) {
  const colors = tribe === "Unclaimed" ? null : TRIBE_COLORS[tribe];

  return (
    <span
      className="party-tribe-badge"
      style={{
        backgroundColor: colors?.background ?? "#5f5549",
        color: colors?.text ?? "#f7efd5",
      }}
    >
      {tribe}
    </span>
  );
}

function AssignmentForm({
  assignmentType,
  slotKey,
  selectedPlayer,
  leagueId,
  participantId,
  disabled,
  label,
}: {
  assignmentType: "arena" | "dungeon";
  slotKey: string;
  selectedPlayer: PartyChestPlayer | null;
  leagueId: string | null;
  participantId: string | null;
  disabled: boolean;
  label: string;
}) {
  return (
    <form action={savePartyAssignment}>
      <input type="hidden" name="league_id" value={leagueId ?? ""} />
      <input type="hidden" name="participant_id" value={participantId ?? ""} />
      <input type="hidden" name="assignment_type" value={assignmentType} />
      <input type="hidden" name="slot_key" value={slotKey} />
      <input type="hidden" name="draft_pick_id" value={selectedPlayer?.draftPickId ?? ""} />
      <button type="submit" className="party-assign-button" disabled={disabled}>
        {label}
      </button>
    </form>
  );
}

function ClearAssignmentForm({
  assignmentType,
  slotKey,
  leagueId,
  participantId,
  disabled,
}: {
  assignmentType: "arena" | "dungeon";
  slotKey: string;
  leagueId: string | null;
  participantId: string | null;
  disabled: boolean;
}) {
  return (
    <form action={clearPartyAssignment}>
      <input type="hidden" name="league_id" value={leagueId ?? ""} />
      <input type="hidden" name="participant_id" value={participantId ?? ""} />
      <input type="hidden" name="assignment_type" value={assignmentType} />
      <input type="hidden" name="slot_key" value={slotKey} />
      <button type="submit" className="party-clear-button" disabled={disabled}>
        Clear
      </button>
    </form>
  );
}

function getAssignLabel(
  canAssign: boolean,
  selectedPlayer: PartyChestPlayer | null,
  isSelectedAlreadyAssigned: boolean,
  isCurrentSlotPlayer: boolean,
  fallback: string,
) {
  if (canAssign) return "Assign";
  if (!selectedPlayer) return fallback;
  if (isSelectedAlreadyAssigned && !isCurrentSlotPlayer) return "Already Set";
  return fallback;
}

function isEligibleForArenaSlot(player: PartyChestPlayer | null, position: DraftPosition | "FLEX") {
  if (!player) return false;
  if (position === "FLEX") {
    return player.position === "RB" || player.position === "WR" || player.position === "TE";
  }

  return player.position === position;
}
