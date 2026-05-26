import Link from "next/link";
import { TRIBE_COLORS } from "@gridiron/shared";
import { type CSSProperties } from "react";

import { PageShell } from "@/components/page-shell";

import { getArenaViewContext, type ArenaLineupEntry } from "./arena-data";
import styles from "./arena-stage.module.css";

type ArenaPageProps = {
  searchParams: Promise<{
    opponent?: string;
    week?: string;
    scoreboard?: string;
  }>;
};

function formatScore(value: number) {
  return value.toFixed(2).padStart(5, "0");
}

function buildDiamondColors(lineup: ArenaLineupEntry[]) {
  return lineup.map((entry) => (entry.tribe ? TRIBE_COLORS[entry.tribe].background : "#f3f5fb"));
}

function toArenaHref({
  opponentId,
  weekNumber,
  scoreboardOpen = false,
}: {
  opponentId?: string | null;
  weekNumber?: number | null;
  scoreboardOpen?: boolean;
}) {
  const query = new URLSearchParams();
  if (opponentId) {
    query.set("opponent", opponentId);
  }
  if (weekNumber && Number.isFinite(weekNumber)) {
    query.set("week", String(weekNumber));
  }
  if (scoreboardOpen) {
    query.set("scoreboard", "1");
  }
  const serialized = query.toString();
  return serialized ? `/app/arena?${serialized}` : "/app/arena";
}

function toDetailsHref(opponentId: string, weekNumber: number) {
  return `/app/arena/matchup?opponent=${encodeURIComponent(opponentId)}&week=${encodeURIComponent(String(weekNumber))}`;
}

function FighterCard({
  displayName,
  score,
  lineup,
  appearance,
  detailsHref,
}: {
  displayName: string;
  score: number;
  lineup: ArenaLineupEntry[];
  appearance: {
    skinColor: string;
    hairColor: string;
    shirtColor: string;
    pantsColor: string;
    hairStyle: "cropped" | "waves" | "braids" | "hooded";
    bodyFrame: "Balanced" | "Sturdy" | "Swift";
  };
  detailsHref?: string;
}) {
  const diamondColors = buildDiamondColors(lineup);
  const sprite = (
    <div className={styles.spriteWrap}>
      <div className={styles.diamonds} aria-hidden="true">
        {diamondColors.map((color, index) => (
          <span key={`${displayName}-diamond-${index}`} className={styles.diamond} style={{ backgroundColor: color }} />
        ))}
      </div>
      <PixelCharacter appearance={appearance} />
    </div>
  );

  return (
    <article className={styles.fighter}>
      {detailsHref ? (
        <Link href={detailsHref} className={styles.avatarLink} aria-label={`Open ${displayName} lineup matchup card`}>
          {sprite}
        </Link>
      ) : (
        sprite
      )}
      <p className={styles.fighterName}>- {displayName} -</p>
      <p className={styles.fighterScore}>{formatScore(score)}</p>
    </article>
  );
}

export default async function ArenaPage({ searchParams }: ArenaPageProps) {
  const params = await searchParams;
  const parsedWeek = params.week ? Number.parseInt(params.week, 10) : null;
  const requestedWeekNumber = parsedWeek && Number.isFinite(parsedWeek) ? parsedWeek : null;
  const isScoreboardOpen = params.scoreboard === "1";
  const context = await getArenaViewContext(params.opponent, requestedWeekNumber);

  if (!context) {
    return (
      <PageShell eyebrow="Arena / Matchups" title="Arena">
        <section className="rounded-[1.5rem] border border-white/10 bg-black/20 px-5 py-6 text-sm text-[#f1e4c9]">
          Join a Guild with at least one opponent to open the Arena.
        </section>
      </PageShell>
    );
  }

  const selectedWeek = context.selectedScoreboardWeekNumber;
  const selectedWeekMatchups =
    context.scoreboardWeeks.find((week) => week.weekNumber === selectedWeek)?.matchups ?? [];
  const closeScoreboardHref = toArenaHref({
    opponentId: context.selectedOpponentId,
    weekNumber: selectedWeek,
    scoreboardOpen: false,
  });

  return (
    <PageShell eyebrow="Arena / Matchups" title="Arena">
      <section className={styles.stage}>
        {context.prevOpponentId ? (
          <Link
            href={toArenaHref({
              opponentId: context.prevOpponentId,
              weekNumber: selectedWeek,
              scoreboardOpen: isScoreboardOpen,
            })}
            className={`${styles.nav} ${styles.navLeft}`}
            aria-label="View previous matchup"
          >
            {"<"}
          </Link>
        ) : (
          <span className={`${styles.nav} ${styles.navLeft} ${styles.navDisabled}`} aria-hidden="true">
            {"<"}
          </span>
        )}
        {context.nextOpponentId ? (
          <Link
            href={toArenaHref({
              opponentId: context.nextOpponentId,
              weekNumber: selectedWeek,
              scoreboardOpen: isScoreboardOpen,
            })}
            className={`${styles.nav} ${styles.navRight}`}
            aria-label="View next matchup"
          >
            {">"}
          </Link>
        ) : (
          <span className={`${styles.nav} ${styles.navRight} ${styles.navDisabled}`} aria-hidden="true">
            {">"}
          </span>
        )}

        <div className={styles.matchupChip} aria-label={`Matchup ${context.matchupIndex} of ${context.matchupCount}`}>
          Week {context.currentWeekNumber} - Matchup {context.matchupIndex} / {context.matchupCount}
        </div>

        <Link
          href={toArenaHref({
            opponentId: context.selectedOpponentId,
            weekNumber: selectedWeek,
            scoreboardOpen: true,
          })}
          className={styles.historTree}
          aria-label="Open Histor-Tree scoreboard"
        >
          <p className={styles.historTreeTitle}>Histor-Tree</p>
        </Link>

        <Link href="/app" className={styles.houseDoor} aria-label="Return to House">
          <span className={styles.houseDoorLabel}>House</span>
        </Link>

        <div className={styles.fighters}>
          <FighterCard
            displayName={context.userFighter.displayName}
            score={context.userFighter.actualTotal}
            lineup={context.userFighter.lineup}
            appearance={context.userFighter.appearance}
            detailsHref={
              context.selectedUserOpponentId
                ? toDetailsHref(context.selectedUserOpponentId, selectedWeek)
                : undefined
            }
          />
          <div className={styles.versus}>VS</div>
          <FighterCard
            displayName={context.opponentFighter.displayName}
            score={context.opponentFighter.actualTotal}
            lineup={context.opponentFighter.lineup}
            appearance={context.opponentFighter.appearance}
          />
        </div>
      </section>

      {isScoreboardOpen ? (
        <div className={styles.scoreboardModal}>
          <Link href={closeScoreboardHref} className={styles.scoreboardModalBackdrop} aria-label="Close scoreboard" />
          <section className={`${styles.scoreboardShell} ${styles.scoreboardModalPanel}`}>
            <div className={styles.scoreboardHeader}>
              <p className={styles.scoreboardTitle}>Histor-Tree Scoreboard</p>
              <div className={styles.scoreboardWeekNav}>
                {selectedWeek > 1 ? (
                  <Link
                    href={toArenaHref({
                      opponentId: context.selectedOpponentId,
                      weekNumber: selectedWeek - 1,
                      scoreboardOpen: true,
                    })}
                    className={styles.scoreboardWeekButton}
                  >
                    Prev Week
                  </Link>
                ) : (
                  <span className={`${styles.scoreboardWeekButton} ${styles.scoreboardWeekButtonDisabled}`}>Prev Week</span>
                )}
                <span className={styles.scoreboardWeekLabel}>
                  Week {selectedWeek} / {context.seasonWeekCount}
                </span>
                {selectedWeek < context.seasonWeekCount ? (
                  <Link
                    href={toArenaHref({
                      opponentId: context.selectedOpponentId,
                      weekNumber: selectedWeek + 1,
                      scoreboardOpen: true,
                    })}
                    className={styles.scoreboardWeekButton}
                  >
                    Next Week
                  </Link>
                ) : (
                  <span className={`${styles.scoreboardWeekButton} ${styles.scoreboardWeekButtonDisabled}`}>Next Week</span>
                )}
                <Link href={closeScoreboardHref} className={styles.scoreboardClose}>
                  Close
                </Link>
              </div>
            </div>

            <div className={styles.scoreboardRows}>
              {selectedWeekMatchups.map((matchup) => (
                <div
                  key={`${selectedWeek}-${matchup.leftParticipantId}-${matchup.rightParticipantId}`}
                  className={`${styles.scoreboardRow} ${matchup.isUserMatchup ? styles.scoreboardRowUser : ""} ${matchup.isSelectedMatchup ? styles.scoreboardRowSelected : ""}`}
                >
                  <span className={styles.scoreboardStatus}>{matchup.status.toUpperCase()}</span>
                  <span className={styles.scoreboardTeam}>{matchup.leftName}</span>
                  <span className={styles.scoreboardScore}>
                    {matchup.leftScore === null ? "--" : formatScore(matchup.leftScore)}
                  </span>
                  <span className={styles.scoreboardVs}>vs</span>
                  <span className={styles.scoreboardScore}>
                    {matchup.rightScore === null ? "--" : formatScore(matchup.rightScore)}
                  </span>
                  <span className={styles.scoreboardTeam}>{matchup.rightName}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </PageShell>
  );
}

function PixelCharacter({
  appearance,
}: {
  appearance: {
    skinColor: string;
    hairColor: string;
    shirtColor: string;
    pantsColor: string;
    hairStyle: "cropped" | "waves" | "braids" | "hooded";
    bodyFrame: "Balanced" | "Sturdy" | "Swift";
  };
}) {
  return (
    <div
      className={`pixel-character pixel-character--${appearance.bodyFrame.toLowerCase()} pixel-character--ready`}
      style={
        {
          "--skin": appearance.skinColor,
          "--hair": appearance.hairColor,
          "--shirt": appearance.shirtColor,
          "--pants": appearance.pantsColor,
        } as CSSProperties
      }
    >
      <div className={`pixel-character__hair pixel-character__hair--${appearance.hairStyle}`} />
      <div className="pixel-character__head" />
      <div className="pixel-character__torso" />
      <div className="pixel-character__belt" />
      <div className="pixel-character__legs" />
      <div className="pixel-character__shadow" />
    </div>
  );
}
