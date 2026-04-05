import { HeroLink } from "@/components/hero-link";
import { PageShell } from "@/components/page-shell";
import { Panel } from "@/components/panel";

const achievements = [
  {
    title: "Perfect Sweep",
    status: "Locked",
    body: "Awarded for winning a duel 7-0 and leaving the Arena without dropping a single bout.",
  },
  {
    title: "Mythic Hunter",
    status: "Locked",
    body: "Awarded for capturing a mythical player and binding them to the House Party.",
  },
  {
    title: "Dungeon Delver",
    status: "Locked",
    body: "Awarded for clearing every Tribe chamber route at least once in a season.",
  },
];

const trophies = [
  {
    title: "Guild Championship Cup",
    era: "Awaiting First Run",
    body: "The cabinet will eventually preserve each season title the House wins under a Guild banner.",
  },
  {
    title: "Arena Laurel",
    era: "Future Reward",
    body: "Reserved for top Arena finishes and later competitive milestones.",
  },
];

export default function TrophyCabinetPage() {
  return (
    <PageShell
      eyebrow="House / Trophy Cabinet"
      title="Trophy Cabinet"
      description="A House should remember what it has done. The Trophy Cabinet is where achievements, sigils, and old Guild honors can live instead of disappearing into abstract menus."
    >
      <div className="grid gap-8 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="grid gap-6">
          <Panel title="Cabinet Purpose" description="This object gives the House long-term memory. It should feel ceremonial without becoming noisy or overloaded.">
            <div className="grid gap-3 text-sm leading-7 text-[#efe2c9]">
              <p>Achievement-style honors can sit beside larger seasonal trophies.</p>
              <p>Short badges can still exist as sigils, but the cabinet is where the biggest milestones feel permanent.</p>
              <p>The MVP version can start simple and still make the House feel more alive.</p>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <HeroLink href="/app">Return Home</HeroLink>
              <HeroLink href="/app/house/board" tone="secondary">Open Strategy Center</HeroLink>
            </div>
          </Panel>

          <Panel title="Cabinet Shelves" description="A few shelf types keep the cabinet understandable even as more honors appear later.">
            <div className="grid gap-3 sm:grid-cols-2">
              <ShelfCard title="Achievement Shelf" body="For one-off feats like perfect sweeps, rare captures, and dungeon milestones." />
              <ShelfCard title="Championship Shelf" body="For Guild cups, seasonal banners, and long-term House triumphs." />
              <ShelfCard title="Sigil Rail" body="For badge-style honors that support the House identity over time." />
              <ShelfCard title="Legacy Drawer" body="For retired seasons, old Party legends, and deep-history unlocks later on." />
            </div>
          </Panel>
        </div>

        <Panel title="Honors On Display" description="These are placeholder honors for now, but they define the structure the cabinet should eventually hold.">
          <div className="grid gap-4">
            <section className="rounded-[1.5rem] border border-[#9e8455]/18 bg-black/20 px-4 py-4">
              <p className="fantasy-title text-xl text-[#fff4d8]">Achievements</p>
              <div className="mt-4 grid gap-3">
                {achievements.map((achievement) => (
                  <HonorCard key={achievement.title} title={achievement.title} tag={achievement.status} body={achievement.body} />
                ))}
              </div>
            </section>

            <section className="rounded-[1.5rem] border border-[#9e8455]/18 bg-black/20 px-4 py-4">
              <p className="fantasy-title text-xl text-[#fff4d8]">Trophies</p>
              <div className="mt-4 grid gap-3">
                {trophies.map((trophy) => (
                  <HonorCard key={trophy.title} title={trophy.title} tag={trophy.era} body={trophy.body} />
                ))}
              </div>
            </section>
          </div>
        </Panel>
      </div>
    </PageShell>
  );
}

function ShelfCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[1.4rem] border border-[#9e8455]/18 bg-black/20 px-4 py-4">
      <p className="fantasy-title text-lg text-[#fff4d8]">{title}</p>
      <p className="mt-2 text-sm leading-7 text-[#eadbbd]">{body}</p>
    </div>
  );
}

function HonorCard({ title, tag, body }: { title: string; tag: string; body: string }) {
  return (
    <div className="rounded-[1.2rem] border border-[#9e8455]/18 bg-[#24170e]/85 px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <p className="fantasy-title text-lg text-[#fff4d8]">{title}</p>
        <span className="rounded-full border border-[#9e8455]/18 bg-black/20 px-3 py-1 text-[0.66rem] uppercase tracking-[0.18em] text-[#d2b887]">{tag}</span>
      </div>
      <p className="mt-2 text-sm leading-7 text-[#eadbbd]">{body}</p>
    </div>
  );
}
