import Link from "next/link";
import { TRIBE_COLORS } from "@gridiron/shared";
import { type CSSProperties } from "react";

import { PageShell } from "@/components/page-shell";

import { getArenaViewContext, type ArenaLineupEntry } from "./arena-data";
import styles from "./arena-stage.module.css";

type ArenaPageProps = {
  searchParams: Promise<{
    opponent?: string;
  }>;
};

function formatScore(value: number) {
  return value.toFixed(2).padStart(5, "0");
}

function buildDiamondColors(lineup: ArenaLineupEntry[]) {
  return lineup.map((entry) => (entry.tribe ? TRIBE_COLORS[entry.tribe].background : "#f3f5fb"));
}

function toMatchupHref(opponentId: string) {
  return `/app/arena?opponent=${encodeURIComponent(opponentId)}`;
}

function toDetailsHref(opponentId: string) {
  return `/app/arena/matchup?opponent=${encodeURIComponent(opponentId)}`;
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
  const context = await getArenaViewContext(params.opponent);

  if (!context) {
    return (
      <PageShell eyebrow="Arena / Matchups" title="Arena">
        <section className="rounded-[1.5rem] border border-white/10 bg-black/20 px-5 py-6 text-sm text-[#f1e4c9]">
          Join a Guild with at least one opponent to open the Arena.
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell eyebrow="Arena / Matchups" title="Arena">
      <section className={styles.stage}>
        <Link
          href={toMatchupHref(context.prevOpponentId)}
          className={`${styles.nav} ${styles.navLeft}`}
          aria-label="View previous matchup"
        >
          ‹
        </Link>
        <Link
          href={toMatchupHref(context.nextOpponentId)}
          className={`${styles.nav} ${styles.navRight}`}
          aria-label="View next matchup"
        >
          ›
        </Link>

        <div className={styles.historTree} aria-hidden="true">
          <p className={styles.historTreeTitle}>Histor-Tree</p>
        </div>

        <Link href="/app" className={styles.houseDoor} aria-label="Return to House">
          <span className={styles.houseDoorLabel}>House</span>
        </Link>

        <div className={styles.fighters}>
          <FighterCard
            displayName={context.userFighter.displayName}
            score={context.userFighter.actualTotal}
            lineup={context.userFighter.lineup}
            appearance={context.userFighter.appearance}
            detailsHref={toDetailsHref(context.selectedOpponentId)}
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

      <div className="mt-4 flex items-center justify-center">
        <p className="rounded-full border border-white/15 bg-black/25 px-4 py-2 text-xs uppercase tracking-[0.18em] text-[#f4e6c8]">
          Matchup {context.matchupIndex} of {context.matchupCount}
        </p>
      </div>
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
