import { HeroLink } from "@/components/hero-link";
import { PageShell } from "@/components/page-shell";
import { Panel } from "@/components/panel";

const achievements = [
  { title: "Perfect Sweep", status: "Locked" },
  { title: "Mythic Hunter", status: "Locked" },
  { title: "Dungeon Delver", status: "Locked" },
  { title: "Banner Breaker", status: "Locked" },
  { title: "Arena Wall", status: "Locked" },
  { title: "First Blood", status: "Locked" },
];

const trophyFinishes = [
  { title: "Gold Finish", tone: "gold", seasons: "No Titles Yet" },
  { title: "Silver Finish", tone: "silver", seasons: "No Finals Yet" },
  { title: "Bronze Finish", tone: "bronze", seasons: "No Podiums Yet" },
];

export default function TrophyCabinetPage() {
  return (
    <PageShell
      eyebrow="House / Trophy Cabinet"
      title="Trophy Cabinet"
      description="A House should remember what it has done. The Trophy Cabinet is where achievements and championship history gain a physical place in the home."
    >
      <div className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="grid gap-6">
          <Panel title="Cabinet Purpose" description="This object gives the House long-term memory without turning the room into a cluttered archive.">
            <div className="grid gap-3 text-sm leading-7 text-[#efe2c9]">
              <p>The top shelf is for achievement icons and one-off feats like sweeping a duel or capturing a mythical player.</p>
              <p>The lower shelf is for seasonal finish trophies, with bronze, silver, and gold resting side by side.</p>
              <p>Keeping both in one cabinet makes House progress feel visible and ceremonial.</p>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <HeroLink href="/app">Return Home</HeroLink>
              <HeroLink href="/app/house/board" tone="secondary">Open Strategy Center</HeroLink>
            </div>
          </Panel>

          <Panel title="Cabinet Notes" description="This is enough structure for MVP while leaving room for real unlocks later.">
            <div className="grid gap-3 sm:grid-cols-2">
              <ShelfNote title="Achievement Shelf" body="Leave icon slots ready so new House feats can be added without rethinking layout." />
              <ShelfNote title="Finish Shelf" body="Gold, silver, and bronze should always have a stable place for prior-year finishes." />
              <ShelfNote title="Cabinet Mood" body="Glass, wood, and felt backing should do the work rather than too many labels." />
              <ShelfNote title="Future Depth" body="Later seasons can add richer trophy history without changing the basic cabinet skeleton." />
            </div>
          </Panel>
        </div>

        <Panel title="Cabinet Display" description="A visual shelf structure makes this object feel like furniture instead of another menu.">
          <div className="rounded-[1.9rem] border border-[#7f5328] bg-[linear-gradient(180deg,#5a381b_0%,#3a2311_100%)] p-5 shadow-[0_18px_36px_rgba(0,0,0,0.28),inset_0_0_0_2px_rgba(243,214,158,0.05)]">
            <div className="rounded-[1.5rem] border border-[#b7d0d2]/22 bg-[linear-gradient(180deg,rgba(170,210,218,0.12)_0%,rgba(255,255,255,0.04)_100%)] p-4">
              <div className="rounded-[1.1rem] border border-[#8a6132]/24 bg-[#1e130b]/55 px-4 py-4">
                <p className="fantasy-kicker text-[0.68rem] text-[#e8d0a2]">Achievement Shelf</p>
                <div className="mt-4 border-t border-[#8a6132]/24 pt-5">
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                    {achievements.map((achievement) => (
                      <div key={achievement.title} className="rounded-[1rem] border border-[#c4a46b]/18 bg-[#f0dfbe] px-3 py-3 text-center shadow-[0_8px_14px_rgba(0,0,0,0.12)]">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[0.9rem] border border-dashed border-[#977043]/35 bg-[#ead4aa] text-xl text-[#84582c]">
                          ?
                        </div>
                        <p className="mt-3 text-xs leading-5 text-[#54361a]">{achievement.title}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5 h-4 rounded-full bg-[linear-gradient(180deg,#8b5a30_0%,#5d381a_100%)] shadow-[0_6px_12px_rgba(0,0,0,0.24)]" />

              <div className="mt-5 rounded-[1.1rem] border border-[#8a6132]/24 bg-[#1e130b]/55 px-4 py-4">
                <p className="fantasy-kicker text-[0.68rem] text-[#e8d0a2]">Previous Year Finishes</p>
                <div className="mt-4 border-t border-[#8a6132]/24 pt-5">
                  <div className="grid gap-4 sm:grid-cols-3">
                    {trophyFinishes.map((finish) => (
                      <div key={finish.title} className="rounded-[1rem] border border-[#c4a46b]/18 bg-[#f0dfbe] px-3 py-4 text-center shadow-[0_8px_14px_rgba(0,0,0,0.12)]">
                        <div className={`mx-auto h-16 w-12 rounded-t-full border ${finish.tone === "gold" ? "border-[#d5ac44] bg-[linear-gradient(180deg,#f2d47b_0%,#bb8226_100%)]" : finish.tone === "silver" ? "border-[#b9c2ca] bg-[linear-gradient(180deg,#dde3e8_0%,#8994a2_100%)]" : "border-[#b2794d] bg-[linear-gradient(180deg,#d2a172_0%,#8f5527_100%)]"}`} />
                        <div className={`mx-auto h-5 w-16 rounded-b-lg border ${finish.tone === "gold" ? "border-[#c1912e] bg-[#9e6b1d]" : finish.tone === "silver" ? "border-[#8994a2] bg-[#67707c]" : "border-[#8f5527] bg-[#6a3d19]"}`} />
                        <p className="fantasy-title mt-4 text-lg text-[#3f2512]">{finish.title}</p>
                        <p className="mt-2 text-sm text-[#6a4a25]">{finish.seasons}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </PageShell>
  );
}

function ShelfNote({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[1.4rem] border border-[#9e8455]/18 bg-black/20 px-4 py-4">
      <p className="fantasy-title text-lg text-[#fff4d8]">{title}</p>
      <p className="mt-2 text-sm leading-7 text-[#eadbbd]">{body}</p>
    </div>
  );
}
