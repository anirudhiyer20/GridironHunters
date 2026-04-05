import { HeroLink } from "@/components/hero-link";
import { PageShell } from "@/components/page-shell";

const styleSets = [
  {
    name: "Lantern Warden",
    palette: "Warm cloak, brass trim, tavern-keeper feel",
    role: "Balanced house stewarding",
    crest: "Lantern Crest",
    colors: ["#9a6a3c", "#d7b46f", "#29415b"],
  },
  {
    name: "Moss Ranger",
    palette: "Forest green, weathered leather, expedition vibe",
    role: "Dungeon-forward scouting",
    crest: "Moss Sigil",
    colors: ["#496a43", "#89a56f", "#4e3721"],
  },
  {
    name: "Ash Duelist",
    palette: "Charcoal tunic, ember sash, arena-ready silhouette",
    role: "Competitive arena presence",
    crest: "Ash Banner",
    colors: ["#3b3c45", "#d37b52", "#7f2f24"],
  },
];

export default function WardrobePage() {
  return (
    <PageShell
      eyebrow="House / Wardrobe"
      title="Wardrobe"
      description="The Wardrobe should feel like a physical piece of the House: sturdy wood, brass fittings, and just enough pixel-art style to imply a real identity chamber without becoming cluttered."
    >
      <div className="grid gap-8 xl:grid-cols-[0.92fr_1.08fr]">
        <section className="fantasy-panel fantasy-panel--stone rounded-[1.9rem] p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="fantasy-kicker text-[0.68rem] text-[#d1b481]">House Identity</p>
              <h2 className="fantasy-title mt-2 text-3xl text-[#fff4d8]">Pixel Wardrobe</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <HeroLink href="/app">Return Home</HeroLink>
              <HeroLink href="/app/house/party" tone="secondary">Open Party Chest</HeroLink>
            </div>
          </div>

          <div className="mt-5 rounded-[1.7rem] border border-[#9e8455]/18 bg-black/20 px-6 py-6">
            <div className="mx-auto w-full max-w-[20rem] rounded-[1.4rem] border border-[#5f3917] bg-[#20150d] p-4 shadow-[inset_0_0_0_2px_rgba(234,205,150,0.06)]">
              <div className="rounded-[1rem] border border-[#7b4d22] bg-[#4c2d13] p-3 shadow-[inset_0_0_0_2px_rgba(255,225,173,0.04)]">
                  <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-3">
                    <div className="rounded-[0.8rem] border border-[#8d5f30] bg-[linear-gradient(180deg,#8a572a_0%,#603718_100%)] px-3 py-4">
                      <div className="h-full rounded-[0.5rem] border border-[#9d7347]/40 bg-[repeating-linear-gradient(180deg,rgba(255,220,167,0.06)_0_8px,rgba(0,0,0,0)_8px_16px)]" />
                    </div>
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="h-4 w-4 rounded-sm border border-[#dabb7d]/40 bg-[#cfa45d]" />
                      <div className="h-10 w-2 rounded-full bg-[#3a2310]" />
                      <div className="h-4 w-4 rounded-sm border border-[#dabb7d]/40 bg-[#cfa45d]" />
                    </div>
                    <div className="rounded-[0.8rem] border border-[#8d5f30] bg-[linear-gradient(180deg,#8a572a_0%,#603718_100%)] px-3 py-4">
                      <div className="h-full rounded-[0.5rem] border border-[#9d7347]/40 bg-[repeating-linear-gradient(180deg,rgba(255,220,167,0.06)_0_8px,rgba(0,0,0,0)_8px_16px)]" />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-[#e4c795]">
                    <span>Oak</span>
                    <span>Brass</span>
                    <span>Pixel Readable</span>
                  </div>
              </div>
            </div>
          </div>
        </section>

        <section className="fantasy-panel fantasy-panel--stone rounded-[1.9rem] p-5">
          <div>
            <p className="fantasy-kicker text-[0.68rem] text-[#d1b481]">Starter Fits</p>
            <h2 className="fantasy-title mt-2 text-3xl text-[#fff4d8]">Starter House Fits</h2>
          </div>
          <div className="grid gap-4 xl:grid-cols-3">
            {styleSets.map((styleSet) => (
              <div key={styleSet.name} className="rounded-[1.5rem] border border-[#9e8455]/18 bg-black/20 px-4 py-5">
                <div className="mx-auto flex h-36 w-24 items-end justify-center rounded-[1.2rem] border border-[#d8bb83]/28 bg-[#1a120a] px-3 pb-3">
                  <div className="relative w-full">
                    <div className="mx-auto h-5 w-5 rounded-sm border border-[#e8c98d]/30 bg-[#f3c58d]" />
                    <div
                      className="mx-auto mt-1 h-20 w-16 rounded-t-[1rem] border border-black/30"
                      style={{ background: `linear-gradient(180deg, ${styleSet.colors[0]} 0%, ${styleSet.colors[1]} 45%, ${styleSet.colors[2]} 100%)` }}
                    />
                    <div className="absolute bottom-3 left-1/2 h-5 w-5 -translate-x-1/2 rounded-full border border-[#f5ddb1]/40 bg-black/20" />
                  </div>
                </div>
                <p className="fantasy-title mt-4 text-xl text-[#fff4d8]">{styleSet.name}</p>
                <p className="mt-2 text-sm text-[#d8c6a7]">{styleSet.palette}</p>
                <div className="mt-4 grid gap-2 rounded-[1.1rem] border border-[#9e8455]/16 bg-black/20 px-3 py-3 text-sm text-[#ebdfc5]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[#cdb585]">Role</span>
                    <span>{styleSet.role}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[#cdb585]">Crest</span>
                    <span>{styleSet.crest}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
