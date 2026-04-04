import { PageShell } from "@/components/page-shell";
import { Panel } from "@/components/panel";

export default function AdminPage() {
  return (
    <PageShell
      eyebrow="Admin / Steward Tools"
      title="Steward Console"
      description="Admin tools remain practical and low-fantasy on purpose, but they now sit inside the same medieval shell as the rest of the world."
    >
      <Panel
        title="Planned Admin Capabilities"
        description="These deepen through later sprints once the Guild, Draft, Hunt, and Arena loops are fully in place."
      >
        <ul className="grid gap-3 text-sm leading-6 text-[#efe2c9]">
          <li>Guild testing across multiple Guilds</li>
          <li>Draft pool and mythic override controls</li>
          <li>Score correction approvals and audit review</li>
          <li>Impersonation support for closed-beta operations</li>
        </ul>
      </Panel>
    </PageShell>
  );
}
