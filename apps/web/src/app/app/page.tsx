import { HeroLink } from "@/components/hero-link";
import { LogoutButton } from "@/components/logout-button";
import { PageShell } from "@/components/page-shell";
import { Panel } from "@/components/panel";
import { createClient } from "@/lib/supabase/server";

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

export default async function AppHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <PageShell
      eyebrow="App"
      title="Product workspace"
      description="This route is the future logged-in home for the product. Right now it acts as the map for the first Sprint 1 implementation slices."
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-[1.75rem] border border-white/10 bg-black/20 px-6 py-5">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-stone-500">
            Signed In
          </p>
          <p className="mt-2 text-base text-stone-100">
            {user?.email ?? "Authenticated user"}
          </p>
        </div>
        <LogoutButton />
      </div>

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
