import { HeroLink } from "@/components/hero-link";
import { PageShell } from "@/components/page-shell";
import { Panel } from "@/components/panel";

const styleSets = [
  {
    name: "Lantern Warden",
    palette: "Warm cloak, brass trim, tavern-keeper feel",
    role: "Balanced house stewarding",
  },
  {
    name: "Moss Ranger",
    palette: "Forest green, weathered leather, expedition vibe",
    role: "Dungeon-forward scouting",
  },
  {
    name: "Ash Duelist",
    palette: "Charcoal tunic, ember sash, arena-ready silhouette",
    role: "Competitive arena presence",
  },
];

export default function WardrobePage() {
  return (
    <PageShell
      eyebrow="House / Wardrobe"
      title="Wardrobe"
      description="The Wardrobe is the first dedicated chamber for House identity. The deeper customization system can come later without losing the room fantasy now."
    >
      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <Panel title="Current Direction" description="Avatar customization is still early, so this chamber focuses on style language and House identity rather than saved equipment yet.">
          <ul className="grid gap-3 text-sm leading-7 text-[#efe2c9]">
            <li>House identity should feel cozy in the home, not hyper-heroic.</li>
            <li>Dungeon and Arena later need alternate visual moods, but the House look should remain readable and welcoming.</li>
            <li>The avatar shell is local-only in MVP, so customization starts as presentation-first rather than multiplayer-facing.</li>
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <HeroLink href="/app">Return Home</HeroLink>
            <HeroLink href="/app/house/party" tone="secondary">Open Party Chest</HeroLink>
          </div>
        </Panel>

        <Panel title="Starter House Fits" description="These are first-pass identity kits that can inform later saved appearance data once customization becomes durable.">
          <div className="grid gap-4 md:grid-cols-3">
            {styleSets.map((styleSet) => (
              <div key={styleSet.name} className="rounded-[1.5rem] border border-[#9e8455]/18 bg-black/20 px-4 py-5">
                <div className="mx-auto h-28 w-20 rounded-[1.2rem] border border-[#d8bb83]/28 bg-gradient-to-b from-[#5b6f8d] via-[#384862] to-[#1b2435]" />
                <p className="fantasy-title mt-4 text-xl text-[#fff4d8]">{styleSet.name}</p>
                <p className="mt-2 text-sm text-[#d8c6a7]">{styleSet.palette}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.2em] text-[#c6ad7d]">{styleSet.role}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </PageShell>
  );
}
