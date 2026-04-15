"use client";

import { useMemo, useState, type CSSProperties } from "react";

import { DRAFT_POSITIONS, TRIBE_COLORS, type DraftPosition, type TribeName } from "@gridiron/shared";

import { HeroLink } from "@/components/hero-link";

import { queueHuntTarget, unqueueHuntTarget } from "../hunt-actions";

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
  attempt: HuntAttemptSummary | null;
};

export type HuntAttemptSummary = {
  id: string;
  status: "submitted" | "resolved";
  result: "captured" | "escaped" | null;
  battleKeysSpent: number;
  targetScore: number | null;
  bestChallengerScore: number | null;
  challengerDraftPickIds: string[];
};

export type QueuedHuntChallenger = {
  queueChallengerId: string;
  challengerSlot: 1 | 2;
  draftPickId: string;
  name: string;
  position: DraftPosition;
  nflTeam: string;
  tribe: TribeName | "Unclaimed";
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

type PositionFilter = "ALL" | DraftPosition | "FLEX";

export function HuntBoardClient({
  tribe,
  mappedTeams,
  leagueId,
  participantId,
  message,
  availableTargets,
  queuedTargets,
}: HuntBoardClientProps) {
  const [positionFilter, setPositionFilter] = useState<PositionFilter>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const colors = TRIBE_COLORS[tribe];
  const queuedTargetIds = useMemo(() => new Set(queuedTargets.map((target) => target.id)), [queuedTargets]);
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredTargets = availableTargets.filter((target) => {
    if (positionFilter === "FLEX" && !(target.position === "RB" || target.position === "WR" || target.position === "TE")) {
      return false;
    }

    if (positionFilter !== "ALL" && positionFilter !== "FLEX" && target.position !== positionFilter) {
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

  return (
    <section className="hunt-board-shell" style={shellStyle}>
      <div className="hunt-board-frame">
        <div className="hunt-board-topbar">
          <div className="hunt-board-title-group">
            <span className="hunt-board-sigil" aria-hidden="true" />
            <div>
              <h1 className="fantasy-title">{tribe} Wild Player Board</h1>
            </div>
          </div>
          <HeroLink href="/app/dungeon" tone="secondary">Close</HeroLink>
        </div>

        {message ? <div className="hunt-board-message">{message}</div> : null}

        <div className="hunt-board-content">
          <aside className="hunt-board-left-rail">
            <section className="hunt-board-card hunt-board-card--sighting">
              <p className="fantasy-kicker">Mythical Sightings</p>
              <h2>Week X</h2>
              <div className="hunt-board-sighting-empty" aria-label={`No ${tribe} mythical sightings this week`} />
            </section>

            <section className="hunt-board-card hunt-board-card--mapped-teams">
              <p className="fantasy-kicker">Mapped Teams</p>
              <div className="hunt-board-mapped-team-list">
                {mappedTeams.map((team) => (
                  <strong key={team}>{team}</strong>
                ))}
              </div>
            </section>
          </aside>

          <main className="hunt-board-card hunt-board-card--targets">
            <div className="hunt-board-tabs" aria-label="Filter Wild Players by position">
              {(["ALL", ...DRAFT_POSITIONS, "FLEX"] as const).map((position) => (
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
                      <small>{target.position} | {target.nflTeam} | {getAttemptLabel(target.attempt)}</small>
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
            <div className="hunt-board-queue-action">
              <HeroLink href="/app/dungeon/hunts">Send To Hunt Slate</HeroLink>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function getAttemptLabel(attempt: HuntAttemptSummary | null) {
  if (!attempt) return "Not Submitted";
  if (attempt.status === "resolved") {
    return attempt.result === "captured" ? "Captured" : "Escaped";
  }

  return "Pending Scores";
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
