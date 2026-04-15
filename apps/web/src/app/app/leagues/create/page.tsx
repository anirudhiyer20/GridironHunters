import { createLeague } from "@/app/app/leagues/actions";
import { PageShell } from "@/components/page-shell";
import { Panel } from "@/components/panel";

export default async function CreateLeaguePage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;

  return (
    <PageShell
      eyebrow="App / Leagues"
      title="Create a league"
    >
      <Panel
        title="League details"
        description="MVP leagues are fixed at 10 teams, commissioner-created, and pre-draft editable."
      >
        <form action={createLeague} className="grid gap-4 md:grid-cols-2">
          {message ? (
            <p className="md:col-span-2 rounded-2xl border border-[#f2bf5e]/30 bg-[#f2bf5e]/10 px-4 py-3 text-sm text-[#f7dca6]">
              {message}
            </p>
          ) : null}
          <label className="grid gap-2 text-sm text-stone-200">
            League name
            <input
              type="text"
              name="name"
              placeholder="Sunday Mythics"
              className="rounded-2xl border border-white/12 bg-white/6 px-4 py-3 outline-none placeholder:text-stone-500"
            />
          </label>
          <label className="grid gap-2 text-sm text-stone-200">
            Slug
            <input
              type="text"
              name="slug"
              placeholder="sunday-mythics"
              className="rounded-2xl border border-white/12 bg-white/6 px-4 py-3 outline-none placeholder:text-stone-500"
            />
          </label>
          <label className="grid gap-2 text-sm text-stone-200">
            Season
            <input
              type="number"
              name="season"
              placeholder="2026"
              className="rounded-2xl border border-white/12 bg-white/6 px-4 py-3 outline-none placeholder:text-stone-500"
            />
          </label>
          <label className="grid gap-2 text-sm text-stone-200 md:col-span-2">
            Draft datetime
            <input
              type="datetime-local"
              name="draft_starts_at"
              className="rounded-2xl border border-white/12 bg-white/6 px-4 py-3 outline-none"
            />
          </label>
          <button
            type="submit"
            className="md:col-span-2 mt-2 rounded-full bg-[#f2bf5e] px-5 py-3 text-sm font-medium text-[#102117]"
          >
            Create league
          </button>
        </form>
      </Panel>
    </PageShell>
  );
}
