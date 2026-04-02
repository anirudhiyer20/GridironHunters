import { HeroLink } from "@/components/hero-link";
import { PageShell } from "@/components/page-shell";
import { Panel } from "@/components/panel";

const appCards = [
  {
    title: "League setup",
    description: "Create a league, share invite codes, and manage pre-draft members.",
    href: "/app/leagues",
  },
  {
    title: "Draft room",
    description: "Planned for Sprint 2 after the Sprint 1 league and role foundations are stable.",
    href: "/app/leagues",
  },
  {
    title: "Admin tools",
    description: "Platform admin operations will live under the app namespace too.",
    href: "/app/admin",
  },
];

export default function AppHomePage() {
  return (
    <PageShell
      eyebrow="App"
      title="Product workspace"
      description="This route is the future logged-in home for the product. Right now it acts as the map for the first Sprint 1 implementation slices."
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {appCards.map((card) => (
          <Panel key={card.title} title={card.title} description={card.description}>
            <HeroLink href={card.href} tone="secondary">
              Open
            </HeroLink>
          </Panel>
        ))}
      </div>
    </PageShell>
  );
}
