import { FANTASY_TERMS, TRIBE_DETAILS, TRIBE_NAMES, type TribeName } from "@gridiron/shared";
import { notFound } from "next/navigation";

import { HeroLink } from "@/components/hero-link";
import { PageShell } from "@/components/page-shell";

const tribeBySlug = Object.fromEntries(
  TRIBE_NAMES.map((tribe) => [TRIBE_DETAILS[tribe].slug, tribe]),
) as Record<string, TribeName>;

export function generateStaticParams() {
  return TRIBE_NAMES.map((tribe) => ({ tribe: TRIBE_DETAILS[tribe].slug }));
}

export default async function DungeonTribePage({
  params,
}: {
  params: Promise<{ tribe: string }>;
}) {
  const { tribe: tribeSlug } = await params;
  const tribe = tribeBySlug[tribeSlug];

  if (!tribe) {
    notFound();
  }

  const details = TRIBE_DETAILS[tribe];

  return (
    <PageShell
      eyebrow={`Dungeon / ${tribe}`}
      title={details.chamberTitle}
      description={`${details.summary} This is the first real tribe-chamber destination, designed so Hunt-specific content can plug in here without reshaping the Dungeon later.`}
    >
      <section className="fantasy-panel fantasy-panel--dungeon rounded-[1.9rem] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="fantasy-kicker text-[0.68rem] text-[#9ec2af]">Tribe Chamber</p>
            <h2 className="fantasy-title mt-2 text-3xl text-[#f2f7f4]">{tribe} Hunt Board</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <HeroLink href="/app/dungeon">Return to Dungeon</HeroLink>
            <HeroLink href="/app/guild" tone="secondary">Enter Guild</HeroLink>
            <HeroLink href="/app/arena" tone="secondary">Enter Arena</HeroLink>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <InfoCard label="Tribe" value={tribe} />
          <InfoCard label="Door Tone" value={toTitleCase(details.tone)} />
          <InfoCard label="Current Role" value="Hunt Entry" />
          <InfoCard label="Status" value="Shell Ready" />
        </div>

        <div className="mt-5 rounded-[1.4rem] border border-[#7a8d80]/22 bg-black/20 px-4 py-4">
          <p className="fantasy-kicker text-[0.68rem] text-[#9ec2af]">Mapped Teams</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {details.teams.map((team) => (
              <span key={team} className="rounded-full border border-[#9e8455]/18 bg-white/6 px-3 py-2 text-sm text-[#f7efd5]">
                {team}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-4">
          <NoticeCard
            title="Wild Player Board"
            body={`Wild Player discovery for the ${tribe} Tribe will live here. This board should eventually show available targets, mythology weight, and challenge-ready Hunt cards.`}
          />
          <NoticeCard
            title="Next Build Step"
            body={`The next Dungeon pass should connect tribe chambers like this one to real ${FANTASY_TERMS.captureBattle.toLowerCase()} selection, battle keys, and Wild Player detail views.`}
          />
        </div>
      </section>
    </PageShell>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.4rem] border border-[#7a8d80]/22 bg-black/20 px-4 py-4">
      <p className="fantasy-kicker text-[0.68rem] text-[#9ec2af]">{label}</p>
      <p className="mt-2 text-base font-semibold text-[#fff4d8]">{value}</p>
    </div>
  );
}

function NoticeCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[1.4rem] border border-[#7a8d80]/22 bg-black/20 px-4 py-4">
      <p className="fantasy-title text-xl text-[#fff4d8]">{title}</p>
      <p className="mt-2 text-sm leading-7 text-[#efe2c9]">{body}</p>
    </div>
  );
}

function toTitleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}
