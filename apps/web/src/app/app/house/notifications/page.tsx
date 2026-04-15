import Link from "next/link";

import { PageShell } from "@/components/page-shell";
import { Panel } from "@/components/panel";

const NOTIFICATION_SECTIONS = [
  {
    title: "Guild Notices",
    status: "Quiet",
    body: "Guild invites, member changes, and Draft preparation notices will land here.",
  },
  {
    title: "Draft Alerts",
    status: "Ready",
    body: "Upcoming pick reminders, queue warnings, and Draft state changes will use this lane.",
  },
  {
    title: "Arena Results",
    status: "Awaiting Duels",
    body: "Weekly Duel outcomes, standings movement, and score finalization notes will be posted here.",
  },
  {
    title: "Dungeon Reports",
    status: "Scouting",
    body: "Future Hunt results, Wild Player discoveries, and Tribe-specific updates can collect here.",
  },
];

export default function HouseNotificationsPage() {
  return (
    <PageShell
      eyebrow="House / Mailbox"
      title="Mailbox"
      description="A compact House inbox for Guild notices, Draft alerts, Arena results, and Dungeon reports."
    >
      <div className="grid gap-6">
        <Panel title="Notification Inbox" description="This is the visual shell for in-app notifications. The first pass keeps it simple until real notification events are wired in.">
          <div className="grid gap-4 md:grid-cols-2">
            {NOTIFICATION_SECTIONS.map((section) => (
              <article key={section.title} className="rounded-[1.4rem] border border-[#9e8455]/20 bg-black/20 px-5 py-5">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="fantasy-title text-2xl text-[#fff4d8]">{section.title}</h2>
                  <span className="rounded-full border border-[#9e8455]/24 bg-black/20 px-3 py-1 text-[0.68rem] uppercase tracking-[0.2em] text-[#d6bf90]">
                    {section.status}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-7 text-[#e7d7ba]">{section.body}</p>
              </article>
            ))}
          </div>
        </Panel>

        <div>
          <Link href="/app" className="fantasy-button fantasy-button--stone">
            Return To House
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
