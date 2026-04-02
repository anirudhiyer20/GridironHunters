import { PageShell } from "@/components/page-shell";
import { Panel } from "@/components/panel";

export default function AdminPage() {
  return (
    <PageShell
      eyebrow="App / Admin"
      title="Admin workspace"
      description="Platform admin tooling is part of the MVP, but most capabilities land later. This route reserves the namespace now so it doesn’t become an afterthought."
    >
      <Panel
        title="Planned admin capabilities"
        description="These will expand through later sprints once Sprint 1 access and league flows are solid."
      >
        <ul className="grid gap-3 text-sm leading-6 text-stone-300">
          <li>League testing across multiple leagues</li>
          <li>Draft pool and mythic override controls</li>
          <li>Score correction approvals and audit review</li>
          <li>Impersonation support for closed beta operations</li>
        </ul>
      </Panel>
    </PageShell>
  );
}
