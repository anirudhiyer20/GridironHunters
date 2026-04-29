import { redirect } from "next/navigation";

import { PageShell } from "@/components/page-shell";
import { createClient } from "@/lib/supabase/server";

import { GuildCenterClient } from "./guild-center-client";

export default async function GuildLedgerPage({
  searchParams,
}: {
  searchParams?: Promise<{ message?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const message = resolvedSearchParams?.message;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: memberships } = await supabase
    .from("league_members")
    .select(
      "role, joined_at, leagues!inner(id, name, slug, season, status, draft_starts_at, max_members)",
    )
    .eq("user_id", user?.id ?? "")
    .order("joined_at", { ascending: false });

  const currentGuild = memberships?.[0]
    ? Array.isArray(memberships[0].leagues)
      ? memberships[0].leagues[0]
      : memberships[0].leagues
    : null;

  if (!currentGuild) {
    redirect("/app/guild");
  }

  return (
    <PageShell
      eyebrow="Guild / Center"
      title="Guild Center"
    >
      <GuildCenterClient
        guildId={currentGuild.id}
        guildName={currentGuild.name}
        guildRole={memberships?.[0]?.role === "commissioner" ? "commissioner" : "member"}
        guildSize={currentGuild.max_members}
        draftStartsAt={currentGuild.draft_starts_at}
        message={message}
      />
    </PageShell>
  );
}
