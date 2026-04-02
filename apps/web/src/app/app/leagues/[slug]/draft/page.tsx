import { notFound } from "next/navigation";

import { PageShell } from "@/components/page-shell";
import { Panel } from "@/components/panel";
import { createClient } from "@/lib/supabase/server";

type DraftRoomPick = {
  participant_id: string;
  pick_number: number;
  round_number: number;
  slot_number: number;
  status: string;
};

type LeagueParticipant = {
  id: string;
  user_id: string | null;
  participant_type: "human" | "bot";
  display_name: string;
};

export default async function DraftRoomPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: league, error } = await supabase
    .from("leagues")
    .select("id, name, slug, status")
    .eq("slug", slug)
    .single();

  if (error || !league) {
    notFound();
  }

  const [{ data: draft }, { data: picks }, { data: participants }, { data: myParticipant }] =
    await Promise.all([
      supabase
        .from("drafts")
        .select("id, status, current_round, current_pick_number, scheduled_start_at")
        .eq("league_id", league.id)
        .maybeSingle(),
      supabase
        .from("draft_picks")
        .select("participant_id, pick_number, round_number, slot_number, status")
        .eq("league_id", league.id)
        .order("pick_number", { ascending: true }),
      supabase
        .from("league_participants")
        .select("id, user_id, participant_type, display_name")
        .eq("league_id", league.id),
      supabase
        .from("league_participants")
        .select("id, user_id, participant_type, display_name")
        .eq("league_id", league.id)
        .eq("user_id", user?.id ?? "")
        .maybeSingle(),
    ]);

  const participantsById = new Map(
    ((participants ?? []) as LeagueParticipant[]).map((participant) => [
      participant.id,
      participant,
    ]),
  );
  const groupedPicks = groupPicksByRound((picks ?? []) as DraftRoomPick[]);

  return (
    <PageShell
      eyebrow="App / Leagues / Draft"
      title={`${league.name} draft room`}
      description="This room now renders draft order through league participants so human teams and bot teams can share the same structure."
    >
      <div className="grid gap-8">
        <Panel
          title="Draft status"
          description="For now, order is published when the commissioner prepares the draft room. Later this publication trigger can move to a timed window before draft start."
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <InfoRow
              label="League State"
              value={league.status.replaceAll("_", " ")}
            />
            <InfoRow
              label="Draft State"
              value={draft?.status?.replaceAll("_", " ") ?? "not prepared"}
            />
            <InfoRow
              label="Current Pick"
              value={
                draft
                  ? `Round ${draft.current_round}, Pick ${draft.current_pick_number}`
                  : "Not started"
              }
            />
          </div>
        </Panel>

        <Panel
          title="Draft order"
          description="Outside the room we keep the summary compact. Inside the room, we show the full snake order grouped by round."
        >
          {groupedPicks.length > 0 ? (
            <div className="grid gap-6 lg:grid-cols-2">
              {groupedPicks.map(([roundNumber, roundPicks]) => (
                <section
                  key={roundNumber}
                  className="rounded-[1.5rem] border border-white/10 bg-white/6 px-5 py-5"
                >
                  <h2 className="text-lg font-semibold text-stone-100">
                    Round {roundNumber}
                  </h2>
                  <div className="mt-4 grid gap-3">
                    {roundPicks.map((pick) => {
                      const participant = participantsById.get(pick.participant_id);
                      const isCurrentPick =
                        draft?.current_pick_number === pick.pick_number;
                      const isMyPick = pick.participant_id === myParticipant?.id;

                      return (
                        <div
                          key={pick.pick_number}
                          className={`rounded-2xl border px-4 py-4 ${
                            isCurrentPick
                              ? "border-[#f2bf5e]/45 bg-[#f2bf5e]/10"
                              : isMyPick
                                ? "border-emerald-300/25 bg-emerald-400/10"
                                : "border-white/10 bg-black/15"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-mono text-[0.7rem] uppercase tracking-[0.28em] text-stone-500">
                                Pick {pick.pick_number} | Slot {pick.slot_number}
                              </p>
                              <p className="mt-2 text-base font-medium text-stone-100">
                                {participant?.display_name ?? "Unknown participant"}
                              </p>
                              <p className="mt-1 text-xs uppercase tracking-[0.24em] text-stone-500">
                                {participant?.participant_type ?? "unknown"}
                              </p>
                            </div>
                            <div className="text-right text-xs uppercase tracking-[0.24em] text-stone-400">
                              {isCurrentPick
                                ? "On the clock"
                                : isMyPick
                                  ? "Your pick"
                                  : pick.status}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-stone-300">
              Draft order has not been published yet. Fill the league and prepare the
              room first.
            </p>
          )}
        </Panel>
      </div>
    </PageShell>
  );
}

function groupPicksByRound(picks: DraftRoomPick[]) {
  const grouped = new Map<number, DraftRoomPick[]>();

  for (const pick of picks) {
    const round = grouped.get(pick.round_number) ?? [];
    round.push(pick);
    grouped.set(pick.round_number, round);
  }

  return Array.from(grouped.entries()).sort((a, b) => a[0] - b[0]);
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-4">
      <p className="font-mono text-[0.7rem] uppercase tracking-[0.28em] text-stone-500">
        {label}
      </p>
      <p className="mt-2 break-words text-base font-medium text-stone-100">
        {value}
      </p>
    </div>
  );
}
