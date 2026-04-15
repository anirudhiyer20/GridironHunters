import { PageShell } from "@/components/page-shell";
import { createClient } from "@/lib/supabase/server";

import { MailboxClient, type MailNotification } from "./mailbox-client";

export default function HouseNotificationsPage() {
  return <HouseNotificationsContent />;
}

async function HouseNotificationsContent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let notifications: MailNotification[] = [];

  if (user) {
    let { data } = await supabase
      .from("notifications")
      .select("id, title, category, body, action_href, read_at, created_at")
      .eq("profile_id", user.id)
      .is("archived_at", null)
      .order("created_at", { ascending: false });

    if (!data?.length) {
      await supabase.rpc("seed_my_welcome_notification");

      const seededResult = await supabase
        .from("notifications")
        .select("id, title, category, body, action_href, read_at, created_at")
        .eq("profile_id", user.id)
        .is("archived_at", null)
        .order("created_at", { ascending: false });

      data = seededResult.data;
    }

    notifications =
      data?.map((notification) => ({
        id: notification.id,
        title: notification.title,
        status: notification.read_at ? "opened" : "unopened",
        category: notification.category,
        body: notification.body.split(/\n{2,}|\n/).filter(Boolean),
        actionHref: notification.action_href,
        readAt: notification.read_at,
        createdAt: notification.created_at,
      })) ?? [];
  }

  return (
    <PageShell
      eyebrow="House / Mailbox"
      title="Mailbox"
    >
      <MailboxClient
        notifications={notifications}
        profileId={user?.id ?? null}
      />
    </PageShell>
  );
}
