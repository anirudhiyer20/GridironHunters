import { FANTASY_TERMS } from "@gridiron/shared";

import { HeroLink } from "@/components/hero-link";
import { PageShell } from "@/components/page-shell";
import { createClient } from "@/lib/supabase/server";

function prettifyStatus(status: string | null | undefined) {
  if (!status) return "Unclaimed";
  return status.replaceAll("_", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

export default async function StrategyCenterPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: memberships } = await supabase
    .from("league_members")
    .select(
      "role, joined_at, leagues!inner(id, name, slug, season, status, draft_starts_at)",
    )
    .eq("user_id", user?.id ?? "")
    .order("joined_at", { ascending: false });

  const currentGuild = memberships?.[0]
    ? Array.isArray(memberships[0].leagues)
      ? memberships[0].leagues[0]
      : memberships[0].leagues
    : null;

  const guildRole = memberships?.[0]?.role === "commissioner" ? FANTASY_TERMS.commissioner : FANTASY_TERMS.member;
  const weeklyWarnings = [
    { label: "Arena Lineup", value: "Not Set", warning: true },
    { label: "Dungeon Lineup", value: "Not Set", warning: true },
    { label: "League Record", value: "No Record Posted Yet", warning: false },
    { label: "Current Game Score", value: "No Live Duel Posted", warning: false },
  ];
  const sigils = [
    { title: "Storm Sigil", status: "Not Earned", body: "Earned through tribe-focused progress later in the season." },
    { title: "Arena Crest", status: "Locked", body: "Reserved for strong Arena streaks and House performance." },
    { title: "Guild Banner", status: currentGuild ? "Bound" : "Unclaimed", body: "Tied to the current Guild identity of the House." },
  ];

  return (
    <PageShell
      eyebrow="House / Strategy Center"
      title="Strategy Center"
      description="A wooden planning board pinned with papers, scouting scraps, and weekly reminders. This is the House-facing hub for current-week activity."
    >
      <section className="rounded-[2rem] border border-[#7c5229] bg-[linear-gradient(180deg,#6a4321_0%,#4e3018_100%)] p-4 shadow-[0_18px_36px_rgba(0,0,0,0.28),inset_0_0_0_2px_rgba(243,214,158,0.06)]">
        <div className="rounded-[1.6rem] border border-[#8f6437] bg-[repeating-linear-gradient(90deg,rgba(168,116,63,0.18)_0_26px,rgba(118,76,38,0.18)_26px_52px),linear-gradient(180deg,#5b381c_0%,#3f2613_100%)] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="fantasy-kicker text-[0.68rem] text-[#f0d39b]">Pinned Papers</p>
              <h2 className="fantasy-title mt-2 text-3xl text-[#fff2d2]">This Week&apos;s Board</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <span className="rounded-full border border-[#dfc18a]/25 bg-black/20 px-4 py-2 text-[0.68rem] uppercase tracking-[0.18em] text-[#f2ddb0]">
                House Weekly Hub
              </span>
              <span className="rounded-full border border-[#dfc18a]/18 bg-black/20 px-4 py-2 text-[0.68rem] uppercase tracking-[0.18em] text-[#ead7b0]">
                War Table
              </span>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <InfoChip label={FANTASY_TERMS.league} value={currentGuild?.name ?? "No Guild Yet"} />
            <InfoChip label="House Role" value={guildRole ?? "Free Wanderer"} />
            <InfoChip label="Season" value={currentGuild ? String(currentGuild.season) : "Unclaimed"} />
            <InfoChip label="State" value={prettifyStatus(currentGuild?.status)} />
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <PinnedPaper title="Lineup Warnings" tone="warning">
              <div className="grid gap-3">
                {weeklyWarnings.slice(0, 2).map((item) => (
                  <PaperRow key={item.label} label={item.label} value={item.value} warning={item.warning} />
                ))}
              </div>
            </PinnedPaper>

            <PinnedPaper title="Guild Sheet">
              <div className="grid gap-3">
                <PaperRow label="League Record" value="No Record Posted Yet" />
                <PaperRow label="Current Game Score" value="No Live Duel Posted" />
                <PaperRow label="Next Route" value={currentGuild ? "Guild Hall" : "Join A Guild"} />
              </div>
            </PinnedPaper>

            <PinnedPaper title="Sigil Notes">
              <div className="grid gap-3">
                {sigils.map((sigil) => (
                  <div key={sigil.title} className="rounded-[1rem] border border-[#caa86f]/18 bg-black/8 px-3 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="fantasy-title text-lg text-[#3f2512]">{sigil.title}</p>
                      <span className="text-[0.68rem] uppercase tracking-[0.16em] text-[#8a6132]">{sigil.status}</span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[#4e331a]">{sigil.body}</p>
                  </div>
                ))}
              </div>
            </PinnedPaper>

            <PinnedPaper title="Action Slips">
              <div className="flex flex-wrap gap-3">
                <HeroLink href="/app/guild">Enter Guild Hall</HeroLink>
                <HeroLink href="/app/arena" tone="secondary">Open Arena</HeroLink>
                <HeroLink href="/app" tone="secondary">Return Home</HeroLink>
              </div>
            </PinnedPaper>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full border border-[#9e8455]/18 bg-black/20 px-4 py-3">
      <p className="fantasy-kicker text-[0.64rem] text-[#c6ad7d]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#fff4d8]">{value}</p>
    </div>
  );
}

function PinnedPaper({ title, children, tone = "base" }: { title: string; children: React.ReactNode; tone?: "base" | "warning" }) {
  return (
    <div className={`relative rounded-[1.45rem] border p-4 shadow-[0_10px_18px_rgba(0,0,0,0.18)] ${tone === "warning" ? "border-[#c48e70]/26 bg-[linear-gradient(180deg,#ead6b5_0%,#d8bc90_100%)]" : "border-[#c9a86e]/22 bg-[linear-gradient(180deg,#efddbc_0%,#e0c79e_100%)]"}`}>
      <div className="absolute left-5 top-3 h-3 w-3 rounded-full border border-[#8f6437]/35 bg-[#b64b3d]" />
      <p className="fantasy-title pl-5 text-xl text-[#3f2512]">{title}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function PaperRow({ label, value, warning = false }: { label: string; value: string; warning?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[1rem] border border-[#caa86f]/18 bg-black/8 px-3 py-3">
      <p className="text-sm uppercase tracking-[0.14em] text-[#7e582d]">{label}</p>
      <p className={`text-sm font-semibold ${warning ? "text-[#9c3f2c]" : "text-[#3b2413]"}`}>{value}</p>
    </div>
  );
}
