"use client";

import { useState, type CSSProperties } from "react";

import { TRIBE_COLORS, type TribeName } from "@gridiron/shared";

import { HeroLink } from "@/components/hero-link";

import { assignHuntChallenger, clearHuntChallenger, submitHuntSlate } from "../hunt-actions";
import type {
  HuntAttemptSummary,
  HuntChallengerCandidate,
  QueuedHuntChallenger,
  QueuedHuntTarget,
} from "../[tribe]/hunt-board-client";

type HuntSlateClientProps = {
  leagueId: string | null;
  participantId: string | null;
  message?: string;
  queuedTargets: QueuedHuntTarget[];
  challengerCandidates: HuntChallengerCandidate[];
  battleKeyTotal: number;
};

export function HuntSlateClient({
  leagueId,
  participantId,
  message,
  queuedTargets,
  challengerCandidates,
  battleKeyTotal,
}: HuntSlateClientProps) {
  const [challengerPicker, setChallengerPicker] = useState<{
    target: QueuedHuntTarget;
    slotNumber: 1 | 2;
  } | null>(null);
  const battleKeysInUse = queuedTargets.reduce(
    (total, target) => total + target.challengers.filter(Boolean).length,
    0,
  );
  const unspentBattleKeys = Math.max(battleKeyTotal - battleKeysInUse, 0);
  const readyTargets = queuedTargets.filter((target) => target.challengers.some(Boolean));
  const hasSubmittedTargets = queuedTargets.some((target) => target.attempt);
  const needsResubmission = queuedTargets.some(isHuntTargetOutOfSync);
  const slateStatus = getSlateStatus({
    readyCount: readyTargets.length,
    hasSubmittedTargets,
    needsResubmission,
  });
  const completedHunts = queuedTargets.filter((target) => target.attempt?.status === "resolved");
  const shellStyle = {
    "--hunt-color": "#7a8d80",
    "--hunt-text": "#f7efd5",
  } as CSSProperties;

  return (
    <section className="hunt-board-shell" style={shellStyle}>
      <div className="hunt-board-frame">
        <div className="hunt-board-topbar">
          <div className="hunt-board-title-group">
            <span className="hunt-board-sigil" aria-hidden="true" />
            <div>
              <h1 className="fantasy-title">Global Hunt Slate</h1>
            </div>
          </div>
          <HeroLink href="/app/dungeon" tone="secondary">Return To Dungeon</HeroLink>
        </div>

        {message ? <div className="hunt-board-message">{message}</div> : null}

        <section className="hunt-slate-command-bar" aria-label="Hunt Slate controls">
          <div className="hunt-key-card">
            <h2 className="fantasy-title">Battle Keys</h2>
            <div className="hunt-slate-metrics">
              <KeyMetric label="Total" value={battleKeyTotal} />
              <KeyMetric label="At Work" value={battleKeysInUse} />
              <KeyMetric label="Unspent" value={unspentBattleKeys} />
            </div>
          </div>
          <div className="hunt-key-card">
            <h2 className="fantasy-title">Hunt Submission</h2>
            <form action={submitHuntSlate} className="hunt-slate-submit">
              <input type="hidden" name="league_id" value={leagueId ?? ""} />
              <input type="hidden" name="participant_id" value={participantId ?? ""} />
              <input type="hidden" name="return_to" value="/app/dungeon/hunts" />
              <button type="submit" disabled={!leagueId || !participantId || readyTargets.length < 1}>
                {needsResubmission ? "Resubmit Hunt Slate" : "Submit Hunt Slate"}
              </button>
              <span>{slateStatus}</span>
            </form>
          </div>
        </section>

        <div className="hunt-squad-layout">
          <main className="hunt-squad-card">
            <div className="hunt-squad-header">
              <div>
                <h2 className="fantasy-title">Queued Hunts</h2>
              </div>
            </div>

            <div className="hunt-squad-table">
              {queuedTargets.length ? (
                queuedTargets.map((target) => (
                  <HuntSquadRow
                    key={target.queueEntryId}
                    target={target}
                    leagueId={leagueId}
                    participantId={participantId}
                    canSetHunts={Boolean(leagueId && participantId)}
                    onOpenChallengerPicker={(selectedTarget, slotNumber) => setChallengerPicker({ target: selectedTarget, slotNumber })}
                  />
                ))
              ) : (
                <div className="hunt-board-empty hunt-board-empty--wide">
                  No queued Hunts yet. Enter a Tribe door, queue Wild Players, then return here to assign battlers.
                </div>
              )}
            </div>
          </main>
        </div>

        <section className="hunt-key-card hunt-history-section">
          <h2 className="fantasy-title">Hunt History</h2>
          <div className="hunt-history-list">
            {completedHunts.length ? completedHunts.map((target) => (
              <article key={target.queueEntryId}>
                <strong>{target.fullName}</strong>
                <small>{target.tribe} | {getAttemptLabel(target.attempt)} | {target.attempt?.battleKeysSpent ?? 0} Keys</small>
              </article>
            )) : (
              <article>
                <strong>No Completed Hunts</strong>
                <small>Pending Hunts will move here after scores resolve.</small>
              </article>
            )}
          </div>
        </section>

        {challengerPicker ? (
          <ChallengerPickerModal
            leagueId={leagueId}
            participantId={participantId}
            target={challengerPicker.target}
            slotNumber={challengerPicker.slotNumber}
            candidates={challengerCandidates}
            onClose={() => setChallengerPicker(null)}
          />
        ) : null}
      </div>
    </section>
  );
}

function HuntSquadRow({
  target,
  leagueId,
  participantId,
  canSetHunts,
  onOpenChallengerPicker,
}: {
  target: QueuedHuntTarget;
  leagueId: string | null;
  participantId: string | null;
  canSetHunts: boolean;
  onOpenChallengerPicker: (target: QueuedHuntTarget, slotNumber: 1 | 2) => void;
}) {
  const colors = TRIBE_COLORS[target.tribe];
  const assignedDraftPickIds = new Set(
    target.challengers
      .map((challenger) => challenger?.draftPickId)
      .filter((id): id is string => Boolean(id)),
  );
  const rowStyle = {
    "--hunt-color": colors.background,
    "--hunt-text": colors.text,
  } as CSSProperties;

  return (
    <article className="hunt-squad-row" style={rowStyle}>
      <div className="hunt-squad-position">{target.position}</div>
      <div className="hunt-squad-target">
        <TribeBadge tribe={target.tribe} />
        <strong>{target.fullName}</strong>
        <span>{target.nflTeam}</span>
      </div>
      <ScoreBox label="Wild" value={formatScore(target.attempt?.targetScore)} />
      <div className="hunt-squad-versus" aria-hidden="true">VS</div>
      <ScoreBox label="Best" value={formatScore(target.attempt?.bestChallengerScore)} />
      <div className="hunt-squad-challengers">
        {[1, 2].map((slotNumber) => {
          const challenger = target.challengers[slotNumber - 1];

          return (
            <ChallengerSlot
              key={slotNumber}
              slotNumber={slotNumber as 1 | 2}
              challenger={challenger}
              target={target}
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
  leagueId,
  participantId,
  assignedDraftPickIds,
  canSetHunts,
  onOpenPicker,
}: {
  slotNumber: 1 | 2;
  challenger: QueuedHuntChallenger | null;
  target: QueuedHuntTarget;
  leagueId: string | null;
  participantId: string | null;
  assignedDraftPickIds: Set<string>;
  canSetHunts: boolean;
  onOpenPicker: () => void;
}) {
  const isTakenByOtherSlot = challenger ? false : assignedDraftPickIds.size >= 2;
  const challengerColors = challenger && challenger.tribe !== "Unclaimed" ? TRIBE_COLORS[challenger.tribe] : null;
  const slotStyle = challengerColors
    ? ({
        "--challenger-tribe-color": challengerColors.background,
        "--challenger-tribe-text": challengerColors.text,
      } as CSSProperties)
    : undefined;

  return (
    <div className="hunt-squad-challenger-slot" style={slotStyle}>
      {challenger ? (
        <>
          <TribeBadge tribe={challenger.tribe} />
          <strong>{challenger.name}</strong>
          <div className="hunt-squad-challenger-slot__footer">
            <span>{challenger.nflTeam}</span>
            <form action={clearHuntChallenger}>
              <input type="hidden" name="league_id" value={leagueId ?? ""} />
              <input type="hidden" name="participant_id" value={participantId ?? ""} />
              <input type="hidden" name="target_tribe" value={target.tribe} />
              <input type="hidden" name="queue_entry_id" value={target.queueEntryId} />
              <input type="hidden" name="challenger_slot" value={slotNumber} />
              <input type="hidden" name="return_to" value="/app/dungeon/hunts" />
              <button type="submit" disabled={!canSetHunts}>Clear</button>
            </form>
          </div>
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
  leagueId,
  participantId,
  target,
  slotNumber,
  candidates,
  onClose,
}: {
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
                    <input type="hidden" name="target_tribe" value={target.tribe} />
                    <input type="hidden" name="queue_entry_id" value={target.queueEntryId} />
                    <input type="hidden" name="challenger_slot" value={slotNumber} />
                    <input type="hidden" name="challenger_draft_pick_id" value={candidate.draftPickId} />
                    <input type="hidden" name="return_to" value="/app/dungeon/hunts" />
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

function formatScore(score: number | null | undefined) {
  return typeof score === "number" ? score.toFixed(2) : "0.00";
}

function getAttemptLabel(attempt: HuntAttemptSummary | null) {
  if (!attempt) return "Not Submitted";
  if (attempt.status === "resolved") {
    return attempt.result === "captured" ? "Captured" : "Escaped";
  }

  return "Pending Scores";
}

function getSlateStatus({
  readyCount,
  hasSubmittedTargets,
  needsResubmission,
}: {
  readyCount: number;
  hasSubmittedTargets: boolean;
  needsResubmission: boolean;
}) {
  if (readyCount < 1) return "Assign at least one battler";
  if (needsResubmission) return "Changes Need Resubmission";
  if (hasSubmittedTargets) return "Slate Submitted";
  return `${readyCount} Ready To Submit`;
}

function isHuntTargetOutOfSync(target: QueuedHuntTarget) {
  if (!target.attempt) return false;

  const currentChallengerIds = target.challengers
    .map((challenger) => challenger?.draftPickId)
    .filter((id): id is string => Boolean(id))
    .sort();
  const submittedChallengerIds = [...target.attempt.challengerDraftPickIds].sort();

  if (currentChallengerIds.length !== submittedChallengerIds.length) return true;

  return currentChallengerIds.some((id, index) => id !== submittedChallengerIds[index]);
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
