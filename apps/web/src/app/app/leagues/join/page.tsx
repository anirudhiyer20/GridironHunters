import { joinLeague } from "@/app/app/leagues/actions";
import { PageShell } from "@/components/page-shell";
import { Panel } from "@/components/panel";

export default async function JoinLeaguePage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;

  return (
    <PageShell
      eyebrow="App / Leagues"
      title="Join with invite code"
      description="This flow will enforce capacity, pre-draft join rules, and the one-league-at-a-time restriction for general users."
    >
      <Panel
        title="Enter invite code"
        description="Invite codes are reusable, human-friendly, and expire when the draft starts."
      >
        <form action={joinLeague} className="grid max-w-xl gap-4">
          {message ? (
            <p className="rounded-2xl border border-[#f2bf5e]/30 bg-[#f2bf5e]/10 px-4 py-3 text-sm text-[#f7dca6]">
              {message}
            </p>
          ) : null}
          <label className="grid gap-2 text-sm text-stone-200">
            Invite code
            <input
              type="text"
              name="code"
              placeholder="HUNT2026"
              className="rounded-2xl border border-white/12 bg-white/6 px-4 py-3 uppercase outline-none placeholder:text-stone-500"
            />
          </label>
          <button
            type="submit"
            className="mt-2 rounded-full bg-[#f2bf5e] px-5 py-3 text-sm font-medium text-[#102117]"
          >
            Join league
          </button>
        </form>
      </Panel>
    </PageShell>
  );
}
