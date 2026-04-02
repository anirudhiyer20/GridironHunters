import { PageShell } from "@/components/page-shell";
import { Panel } from "@/components/panel";

export default function CreateLeaguePage() {
  return (
    <PageShell
      eyebrow="App / Leagues"
      title="Create a league"
      description="This flow will become the commissioner entry point. For now it establishes the route, fields, and product shape before we wire the database-backed action."
    >
      <Panel
        title="League details"
        description="MVP leagues are fixed at 10 teams, commissioner-created, and pre-draft editable."
      >
        <form className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm text-stone-200">
            League name
            <input
              type="text"
              placeholder="Sunday Mythics"
              className="rounded-2xl border border-white/12 bg-white/6 px-4 py-3 outline-none placeholder:text-stone-500"
            />
          </label>
          <label className="grid gap-2 text-sm text-stone-200">
            Season
            <input
              type="number"
              placeholder="2026"
              className="rounded-2xl border border-white/12 bg-white/6 px-4 py-3 outline-none placeholder:text-stone-500"
            />
          </label>
          <label className="grid gap-2 text-sm text-stone-200 md:col-span-2">
            Draft datetime
            <input
              type="datetime-local"
              className="rounded-2xl border border-white/12 bg-white/6 px-4 py-3 outline-none"
            />
          </label>
          <button
            type="button"
            className="md:col-span-2 mt-2 rounded-full bg-[#f2bf5e] px-5 py-3 text-sm font-medium text-[#102117]"
          >
            Create league flow next
          </button>
        </form>
      </Panel>
    </PageShell>
  );
}
