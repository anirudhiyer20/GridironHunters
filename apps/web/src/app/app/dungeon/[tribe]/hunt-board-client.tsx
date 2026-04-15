"use client";

import { useMemo, useState, type CSSProperties } from "react";

import { DRAFT_POSITIONS, TRIBE_COLORS, type DraftPosition, type TribeName } from "@gridiron/shared";

import { HeroLink } from "@/components/hero-link";

import { assignHuntChallenger, clearHuntChallenger, queueHuntTarget, unqueueHuntTarget } from "./actions";

export type HuntTargetPlayer = {
  id: string;
  fullName: string;
  position: DraftPosition;
  nflTeam: string;
  tribe: TribeName;
  providerValue: number | null;
  providerOverallRank: number | null;
};

export type QueuedHuntTarget = HuntTargetPlayer & {
  queueEntryId: string;
  queueRank: number;
  challengers: Array<QueuedHuntChallenger | null>;
};

export type QueuedHuntChallenger = {
  queueChallengerId: string;
  challengerSlot: 1 | 2;
  draftPickId: string;
  name: string;
  position: DraftPosition;
  nflTeam: string;
};

export type HuntChallengerCandidate = {
  draftPickId: string;
  name: string;
  position: DraftPosition;
  nflTeam: string;
  tribe: TribeName | "Unclaimed";
  isInArenaLineup: boolean;
};

type HuntBoardClientProps = {
  tribe: TribeName;
  mappedTeams: readonly string[];
  leagueId: string | null;
  participantId: string | null;
  message?: string;
  availableTargets: HuntTargetPlayer[];
  queuedTargets: QueuedHuntTarget[];
  challengerCandidates: HuntChallengerCandidate[];
  battleKeyTotal: number;
};

type PositionFilter = "ALL" | DraftPosition | "FLX";

export function HuntBoardClient({
  tribe,
  mappedTeams,
  leagueId,
  participantId,
  message,
  availableTargets,
  queuedTargets,
  challengerCandidates,
  battleKeyTotal,
}: HuntBoardClientProps) {
  const [activeView, setActiveView] = useState<"board" | "squad">("board");
  const [challengerPicker, setChallengerPicker] = useState<{
    target: QueuedHuntTarget;
    slotNumber: 1 | 2;
  } | null>(null);
  const [positionFilter, setPositionFilter] = useState<PositionFilter>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const colors = TRIBE_COLORS[tribe];
  const queuedTargetIds = useMemo(() => new Set(queuedTargets.map((target) => target.id)), [queuedTargets]);
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredTargets = availableTargets.filter((target) => {
    if (positionFilter === "FLX" && !(target.position === "RB" || target.position === "WR" || target.position === "TE")) {
      return false;
    }

    if (positionFilter !== "ALL" && positionFilter !== "FLX" && target.position !== positionFilter) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    return `${target.fullName} ${target.position} ${target.nflTeam}`.toLowerCase().includes(normalizedSearch);
  });
  const canQueueTargets = Boolean(leagueId && participantId);
  const shellStyle = {
    "--hunt-color": colors.background,
    "--hunt-text": colors.text,
  } as CSSProperties;
  const battleKeysInUse = queuedTargets.reduce(
    (total, target) => total + target.challengers.filter(Boolean).length,
    0,
  );
  const unspentBattleKeys = Math.max(battleKeyTotal - battleKeysInUse, 0);

  return (
    <section className="hunt-board-shell" style={shellStyle}>
      <div className="hunt-board-frame">
        <div className="hunt-board-topbar">
          <div className="hunt-board-title-group">
            <span className="hunt-board-sigil" aria-hidden="true" />
            <div>
              <p className="fantasy-kicker">Dungeon Hunt</p>
              <h1 className="fantasy-title">{tribe} Wild Player Board</h1>
            </div>
          </div>
          <HeroLink href="/app/dungeon" tone="secondary">Close</HeroLink>
        </div>

        {message ? <div className="hunt-board-message">{message}</div> : null}

        {activeView === "board" ? (
          <div className="hunt-board-content">
            <aside className="hunt-board-left-rail">
              <section className="hunt-board-card hunt-board-card--sighting">
                <p className="fantasy-kicker">Mythical Sightings</p>
                <h2>Week X</h2>
                <div className="hunt-board-sighting-empty" aria-label={`No ${tribe} mythical sightings this week`} />
              </section>

              <section className="hunt-board-card hunt-board-card--challenger">
                <p className="fantasy-kicker">Your Battlers</p>
                <h2>Available Party</h2>
                <p className="hunt-board-card__copy">
                  Queue a target, then choose eligible non-lineup Party members from the Hunt setup screen.
                </p>
                <div className="hunt-board-fighter-list">
                  {challengerCandidates.length ? (
                    challengerCandidates.slice(0, 4).map((fighter) => (
                      <div key={fighter.draftPickId} className={fighter.isInArenaLineup ? "hunt-board-fighter hunt-board-fighter--locked" : "hunt-board-fighter"}>
                        <TribeBadge tribe={fighter.tribe} />
                        <strong>{fighter.name}</strong>
                        <span>{fighter.position} | {fighter.nflTeam}{fighter.isInArenaLineup ? " | Arena" : ""}</span>
                      </div>
                    ))
                  ) : (
                    <div className="hunt-board-empty">No Party players available yet.</div>
                  )}
                </div>
                <HeroLink href="/app/house/party" tone="secondary">Open Party Chest</HeroLink>
              </section>
            </aside>

            <main className="hunt-board-card hunt-board-card--targets">
              <div className="hunt-board-tabs" aria-label="Filter Wild Players by position">
                {(["ALL", ...DRAFT_POSITIONS, "FLX"] as const).map((position) => (
                  <button
                    key={position}
                    type="button"
                    className={positionFilter === position ? "hunt-board-tab hunt-board-tab--active" : "hunt-board-tab"}
                    onClick={() => setPositionFilter(position)}
                  >
                    {position}
                  </button>
                ))}
              </div>
              <label className="hunt-board-search">
                <span className="sr-only">Search Wild Players</span>
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Enter Player Name"
                />
              </label>
              <div className="hunt-board-target-list">
                {filteredTargets.length ? (
                  filteredTargets.map((target) => (
                    <TargetRow
                      key={target.id}
                      target={target}
                      tribe={tribe}
                      leagueId={leagueId}
                      participantId={participantId}
                      canQueue={canQueueTargets}
                      isQueued={queuedTargetIds.has(target.id)}
                    />
                  ))
                ) : (
                  <div className="hunt-board-empty hunt-board-empty--wide">
                    No available {tribe} Wild Players match this view.
                  </div>
                )}
              </div>
            </main>

            <aside className="hunt-board-card hunt-board-card--queue">
              <p className="fantasy-kicker">Week X Hunt</p>
              <h2>Hunt Queue</h2>
              <div className="hunt-board-queue-list">
                {queuedTargets.length ? (
                  queuedTargets.map((target) => (
                    <div key={target.queueEntryId} className="hunt-board-queue-item">
                      <span>{target.queueRank}</span>
                      <div>
                        <strong>{target.fullName}</strong>
                        <small>{target.position} | {target.nflTeam}</small>
                      </div>
                      <form action={unqueueHuntTarget}>
                        <input type="hidden" name="league_id" value={leagueId ?? ""} />
                        <input type="hidden" name="participant_id" value={participantId ?? ""} />
                        <input type="hidden" name="target_tribe" value={tribe} />
                        <input type="hidden" name="queue_entry_id" value={target.queueEntryId} />
                        <button type="submit" aria-label={`Remove ${target.fullName} from Hunt Queue`}>
                          -
                        </button>
                      </form>
                    </div>
                  ))
                ) : (
                  <div className="hunt-board-empty">Queue Wild Players before spending Battle Keys.</div>
                )}
              </div>
              <button
                type="button"
                className="hunt-board-prepare"
                disabled={!queuedTargets.length}
                onClick={() => setActiveView("squad")}
              >
                Prepare For The Hunt
              </button>
            </aside>
          </div>
        ) : (
          <HuntSquadPanel
            tribe={tribe}
            leagueId={leagueId}
            participantId={participantId}
            queuedTargets={queuedTargets}
            battleKeyTotal={battleKeyTotal}
            battleKeysInUse={battleKeysInUse}
            unspentBattleKeys={unspentBattleKeys}
            onReturnToBoard={() => setActiveView("board")}
            onOpenChallengerPicker={(target, slotNumber) => setChallengerPicker({ target, slotNumber })}
          />
        )}

        {challengerPicker ? (
          <ChallengerPickerModal
            tribe={tribe}
            leagueId={leagueId}
            participantId={participantId}
            target={challengerPicker.target}
            slotNumber={challengerPicker.slotNumber}
            candidates={challengerCandidates}
            onClose={() => setChallengerPicker(null)}
          />
        ) : null}

        <div className="hunt-board-footer">
          <span>Mapped Teams</span>
          {mappedTeams.map((team) => (
            <strong key={team}>{team}</strong>
          ))}
        </div>
      </div>
    </section>
  );
}

function HuntSquadPanel({
  tribe,
  leagueId,
  participantId,
  queuedTargets,
  battleKeyTotal,
  battleKeysInUse,
  unspentBattleKeys,
  onReturnToBoard,
  onOpenChallengerPicker,
}: {
  tribe: TribeName;
  leagueId: string | null;
  participantId: string | null;
  queuedTargets: QueuedHuntTarget[];
  battleKeyTotal: number;
  battleKeysInUse: number;
  unspentBattleKeys: number;
  onReturnToBoard: () => void;
  onOpenChallengerPicker: (target: QueuedHuntTarget, slotNumber: 1 | 2) => void;
}) {
  const canSetHunts = Boolean(leagueId && participantId);

  return (
    <div className="hunt-squad-layout">
      <main className="hunt-squad-card">
        <div className="hunt-squad-header">
          <div className="hunt-board-title-group">
            <span className="hunt-board-sigil" aria-hidden="true" />
            <div>
              <p className="fantasy-kicker">Hunt Setup</p>
              <h1 className="fantasy-title">{tribe} Beast Hunt Squad</h1>
            </div>
          </div>
          <button type="button" className="hunt-squad-close" onClick={onReturnToBoard}>
            X
          </button>
        </div>

        <div className="hunt-squad-table">
          {queuedTargets.length ? (
            queuedTargets.map((target) => (
              <HuntSquadRow
                key={target.queueEntryId}
                target={target}
                tribe={tribe}
                leagueId={leagueId}
                participantId={participantId}
                canSetHunts={canSetHunts}
                onOpenChallengerPicker={onOpenChallengerPicker}
              />
            ))
          ) : (
            <div className="hunt-board-empty hunt-board-empty--wide">No queued Wild Players yet.</div>
          )}
        </div>
      </main>

      <aside className="hunt-key-card">
        <p className="fantasy-kicker">Battle Keys</p>
        <KeyMetric label="Battle Key Count" value={battleKeyTotal} />
        <KeyMetric label="Battle Keys At Work" value={battleKeysInUse} />
        <KeyMetric label="Battle Keys To Spend" value={unspentBattleKeys} />
        <button type="button" className="fantasy-button fantasy-button--stone" onClick={onReturnToBoard}>
          Return To Tribe
        </button>
      </aside>
    </div>
  );
}

function HuntSquadRow({
  target,
  tribe,
  leagueId,
  participantId,
  canSetHunts,
  onOpenChallengerPicker,
}: {
  target: QueuedHuntTarget;
  tribe: TribeName;
  leagueId: string | null;
  participantId: string | null;
  canSetHunts: boolean;
  onOpenChallengerPicker: (target: QueuedHuntTarget, slotNumber: 1 | 2) => void;
}) {
  const assignedDraftPickIds = new Set(
    target.challengers
      .map((challenger) => challenger?.draftPickId)
      .filter((id): id is string => Boolean(id)),
  );

  return (
    <article className="hunt-squad-row">
      <div className="hunt-squad-position">{target.position}</div>
      <div className="hunt-squad-target">
        <strong>{target.fullName}</strong>
        <span>{target.nflTeam}</span>
      </div>
      <ScoreBox label="Wild" value="0.00" />
      <ScoreBox label="Keys" value={String(target.challengers.filter(Boolean).length)} />
      <ScoreBox label="Best" value="0.00" />
      <div className="hunt-squad-challengers">
        {[1, 2].map((slotNumber) => {
          const challenger = target.challengers[slotNumber - 1];

          return (
            <ChallengerSlot
              key={slotNumber}
              slotNumber={slotNumber as 1 | 2}
              challenger={challenger}
              target={target}
              tribe={tribe}
              leagueId={leagueId}
              participantId={participantId}
              assignedDraftPickIds={assignedDraftPickIds}
              canSetHunts={canSetHunts}
              onOpenPicker={() => onOpenChallengerPicker(target, slotNumber as 1 | 2)}
            />
          );
        })}
      </div>
    </article>
  );
}

function ChallengerSlot({
  slotNumber,
  challenger,
  target,
  tribe,
  leagueId,
  participantId,
  assignedDraftPickIds,
  canSetHunts,
  onOpenPicker,
}: {
  slotNumber: 1 | 2;
  challenger: QueuedHuntChallenger | null;
  target: QueuedHuntTarget;
  tribe: TribeName;
  leagueId: string | null;
  participantId: string | null;
  assignedDraftPickIds: Set<string>;
  canSetHunts: boolean;
  onOpenPicker: () => void;
}) {
  const isTakenByOtherSlot = challenger ? false : assignedDraftPickIds.size >= 2;

  return (
    <div className="hunt-squad-challenger-slot">
      {challenger ? (
        <>
          <strong>{challenger.name}</strong>
          <span>{challenger.nflTeam}</span>
          <form action={clearHuntChallenger}>
            <input type="hidden" name="league_id" value={leagueId ?? ""} />
            <input type="hidden" name="participant_id" value={participantId ?? ""} />
            <input type="hidden" name="target_tribe" value={tribe} />
            <input type="hidden" name="queue_entry_id" value={target.queueEntryId} />
            <input type="hidden" name="challenger_slot" value={slotNumber} />
            <button type="submit" disabled={!canSetHunts}>Clear</button>
          </form>
        </>
      ) : (
        <button type="button" disabled={!canSetHunts || isTakenByOtherSlot} onClick={onOpenPicker}>
          Choose Battler {slotNumber}
        </button>
      )}
    </div>
  );
}

function ChallengerPickerModal({
  tribe,
  leagueId,
  participantId,
  target,
  slotNumber,
  candidates,
  onClose,
}: {
  tribe: TribeName;
  leagueId: string | null;
  participantId: string | null;
  target: QueuedHuntTarget;
  slotNumber: 1 | 2;
  candidates: HuntChallengerCandidate[];
  onClose: () => void;
}) {
  const [tribeFilter, setTribeFilter] = useState<TribeName | "ALL">("ALL");
  const alreadyAssignedIds = new Set(
    target.challengers
      .map((challenger) => challenger?.draftPickId)
      .filter((id): id is string => Boolean(id)),
  );
  const samePositionCandidates = candidates.filter((candidate) => candidate.position === target.position);
  const visibleCandidates = samePositionCandidates
    .filter((candidate) => tribeFilter === "ALL" || candidate.tribe === tribeFilter)
    .sort((a, b) => Number(a.isInArenaLineup) - Number(b.isInArenaLineup) || a.name.localeCompare(b.name));

  return (
    <div className="hunt-picker-modal" role="dialog" aria-modal="true" aria-label="Choose your battlers">
      <button type="button" className="hunt-picker-modal__backdrop" onClick={onClose} aria-label="Close battler picker" />
      <div className="hunt-picker-modal__panel">
        <div className="hunt-picker-header">
          <h2 className="fantasy-title">Choose Your Battlers</h2>
          <button type="button" onClick={onClose}>X</button>
        </div>
        <div className="hunt-picker-body">
          <aside className="hunt-picker-tribes" aria-label="Filter by Tribe">
            <button type="button" className={tribeFilter === "ALL" ? "hunt-picker-tribe hunt-picker-tribe--active" : "hunt-picker-tribe"} onClick={() => setTribeFilter("ALL")}>
              All
            </button>
            {Object.entries(TRIBE_COLORS).map(([tribeName, colors]) => (
              <button
                key={tribeName}
                type="button"
                className={tribeFilter === tribeName ? "hunt-picker-tribe hunt-picker-tribe--active" : "hunt-picker-tribe"}
                style={{ backgroundColor: colors.background, color: colors.text }}
                onClick={() => setTribeFilter(tribeName as TribeName)}
              >
                {tribeName}
              </button>
            ))}
          </aside>

          <div className="hunt-picker-list">
            <div className="hunt-picker-list__title">
              <span>{target.position} Battlers</span>
              <strong>{target.fullName}</strong>
            </div>
            <div className="hunt-picker-grid">
              {visibleCandidates.length ? visibleCandidates.map((candidate) => {
                const isDisabled = candidate.isInArenaLineup || alreadyAssignedIds.has(candidate.draftPickId);

                return (
                  <form key={candidate.draftPickId} action={assignHuntChallenger}>
                    <input type="hidden" name="league_id" value={leagueId ?? ""} />
                    <input type="hidden" name="participant_id" value={participantId ?? ""} />
                    <input type="hidden" name="target_tribe" value={tribe} />
                    <input type="hidden" name="queue_entry_id" value={target.queueEntryId} />
                    <input type="hidden" name="challenger_slot" value={slotNumber} />
                    <input type="hidden" name="challenger_draft_pick_id" value={candidate.draftPickId} />
                    <button
                      type="submit"
                      className={isDisabled ? "hunt-picker-player hunt-picker-player--disabled" : "hunt-picker-player"}
                      disabled={isDisabled}
                    >
                      <TribeBadge tribe={candidate.tribe} />
                      <strong>{candidate.name}</strong>
                      <span>{candidate.nflTeam}{candidate.isInArenaLineup ? " | In Lineup" : ""}</span>
                    </button>
                  </form>
                );
              }) : (
                <div className="hunt-board-empty hunt-board-empty--wide">No {target.position} battlers found.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScoreBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="hunt-squad-score">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function KeyMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="hunt-key-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function TargetRow({
  target,
  tribe,
  leagueId,
  participantId,
  canQueue,
  isQueued,
}: {
  target: HuntTargetPlayer;
  tribe: TribeName;
  leagueId: string | null;
  participantId: string | null;
  canQueue: boolean;
  isQueued: boolean;
}) {
  return (
    <div className={isQueued ? "hunt-board-target hunt-board-target--queued" : "hunt-board-target"}>
      <form action={queueHuntTarget}>
        <input type="hidden" name="league_id" value={leagueId ?? ""} />
        <input type="hidden" name="participant_id" value={participantId ?? ""} />
        <input type="hidden" name="target_tribe" value={tribe} />
        <input type="hidden" name="target_player_id" value={target.id} />
        <button type="submit" disabled={!canQueue || isQueued} aria-label={`Queue ${target.fullName}`}>
          +
        </button>
      </form>
      <div className="hunt-board-target__badge" aria-hidden="true" />
      <div className="hunt-board-target__main">
        <strong>{target.fullName}</strong>
        <span>{target.position} | {target.nflTeam}</span>
      </div>
      <dl>
        <div>
          <dt>Avg.</dt>
          <dd>{target.providerValue ?? "--"}</dd>
        </div>
        <div>
          <dt>Rank</dt>
          <dd>{target.providerOverallRank ?? "--"}</dd>
        </div>
      </dl>
    </div>
  );
}

function TribeBadge({ tribe }: { tribe: TribeName | "Unclaimed" }) {
  const colors = tribe === "Unclaimed" ? null : TRIBE_COLORS[tribe];

  return (
    <span
      className="dungeon-tribe-pill"
      style={{
        backgroundColor: colors?.background ?? "#5f5549",
        color: colors?.text ?? "#f7efd5",
      }}
    >
      {tribe}
    </span>
  );
}
