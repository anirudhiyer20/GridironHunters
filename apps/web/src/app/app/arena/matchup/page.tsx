import Link from "next/link";
import { TRIBE_COLORS } from "@gridiron/shared";

import { PageShell } from "@/components/page-shell";

import { getArenaViewContext, type ArenaLineupEntry } from "../arena-data";
import styles from "../arena-matchup.module.css";

type ArenaMatchupPageProps = {
  searchParams: Promise<{
    opponent?: string;
  }>;
};

type SlotPosition = {
  left: string;
  top: string;
};

const LEFT_SLOT_POSITIONS: Record<ArenaLineupEntry["slotKey"], SlotPosition> = {
  "flex-1": { left: "28%", top: "9%" },
  wr: { left: "23%", top: "26%" },
  rb: { left: "18%", top: "43%" },
  qb: { left: "31%", top: "43%" },
  te: { left: "23%", top: "60%" },
  "flex-2": { left: "28%", top: "77%" },
};

const RIGHT_SLOT_POSITIONS: Record<ArenaLineupEntry["slotKey"], SlotPosition> = {
  "flex-1": { left: "66%", top: "9%" },
  wr: { left: "71%", top: "26%" },
  rb: { left: "76%", top: "43%" },
  qb: { left: "63%", top: "43%" },
  te: { left: "71%", top: "60%" },
  "flex-2": { left: "66%", top: "77%" },
};

function formatScore(value: number) {
  return value.toFixed(2).padStart(5, "0");
}

function SlotCard({
  entry,
  side,
}: {
  entry: ArenaLineupEntry;
  side: "left" | "right";
}) {
  const position = side === "left" ? LEFT_SLOT_POSITIONS[entry.slotKey] : RIGHT_SLOT_POSITIONS[entry.slotKey];
  const tribeColors = entry.tribe ? TRIBE_COLORS[entry.tribe] : null;

  return (
    <div
      className={`${styles.slot} ${entry.playerName ? styles.slotFilled : ""}`}
      style={{ left: position.left, top: position.top }}
    >
      {entry.tribe ? (
        <span
          className={styles.slotBadge}
          style={{
            backgroundColor: tribeColors?.background,
            color: tribeColors?.text,
          }}
        >
          {entry.tribe}
        </span>
      ) : (
        <span className={styles.slotPosition}>{entry.slotLabel}</span>
      )}

      {entry.playerName ? (
        <>
          <span className={styles.slotName}>{entry.playerName}</span>
          <span className={styles.slotTeam}>{entry.playerTeam ?? "FA"}</span>
        </>
      ) : null}

      <span className={styles.slotScore}>{formatScore(entry.actualScore)}</span>
    </div>
  );
}

export default async function ArenaMatchupPage({ searchParams }: ArenaMatchupPageProps) {
  const params = await searchParams;
  const context = await getArenaViewContext(params.opponent);

  if (!context) {
    return (
      <PageShell eyebrow="Arena / Matchup Card" title="Matchup Card">
        <section className="rounded-[1.5rem] border border-white/10 bg-black/20 px-5 py-6 text-sm text-[#f1e4c9]">
          No active Arena matchup is available yet.
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell eyebrow="Arena / Matchup Card" title="Lineup Card">
      <section className={styles.shell}>
        <Link
          href={`/app/arena?opponent=${encodeURIComponent(context.selectedOpponentId)}`}
          className={styles.close}
          aria-label="Close matchup card"
        >
          ×
        </Link>

        <div className={styles.board}>
          <span className={`${styles.sideLabel} ${styles.sideLabelLeft}`}>
            {context.userFighter.displayName}
          </span>
          <span className={`${styles.sideLabel} ${styles.sideLabelRight}`}>
            {context.opponentFighter.displayName}
          </span>

          <div className={`${styles.totals} ${styles.totalsTopLeft}`}>
            <span className={styles.totalsLabel}>Actual</span>
            <span className={styles.totalsValue}>{formatScore(context.userFighter.actualTotal)}</span>
          </div>
          <div className={`${styles.totals} ${styles.totalsBottomLeft}`}>
            <span className={styles.totalsLabel}>Proj.</span>
            <span className={styles.totalsValue}>{formatScore(context.userFighter.projectedTotal)}</span>
          </div>
          <div className={`${styles.totals} ${styles.totalsTopRight}`}>
            <span className={styles.totalsLabel}>Actual</span>
            <span className={styles.totalsValue}>{formatScore(context.opponentFighter.actualTotal)}</span>
          </div>
          <div className={`${styles.totals} ${styles.totalsBottomRight}`}>
            <span className={styles.totalsLabel}>Proj.</span>
            <span className={styles.totalsValue}>{formatScore(context.opponentFighter.projectedTotal)}</span>
          </div>

          <div className={styles.versus}>VS</div>

          <div className={styles.lane}>
            {context.userFighter.lineup.map((entry) => (
              <SlotCard key={`left-${entry.slotKey}`} entry={entry} side="left" />
            ))}
            {context.opponentFighter.lineup.map((entry) => (
              <SlotCard key={`right-${entry.slotKey}`} entry={entry} side="right" />
            ))}
          </div>

          <div className={styles.ctaWrap}>
            <Link href="/app/house/party" className={styles.setSquad}>
              Set Squad
            </Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
