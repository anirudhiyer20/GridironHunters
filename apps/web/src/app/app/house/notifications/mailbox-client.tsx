"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

export type MailNotification = {
  id: string;
  title: string;
  status: "opened" | "unopened";
  category: string;
  body: string[];
  actionHref: string | null;
  readAt: string | null;
  createdAt: string;
};

type MailFilter = "all" | "unopened" | "opened";

export function MailboxClient({
  notifications,
  profileId,
}: {
  notifications: MailNotification[];
  profileId: string | null;
}) {
  const [mailItems, setMailItems] = useState(notifications);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<MailFilter>("all");
  const selectedNotification = mailItems.find((notification) => notification.id === selectedId) ?? null;
  const filteredNotifications = mailItems.filter((notification) => {
    if (filter === "all") {
      return true;
    }

    return notification.status === filter;
  });
  const unreadCount = mailItems.filter((notification) => notification.status === "unopened").length;

  useEffect(() => {
    if (!profileId) {
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      return;
    }

    const channel = supabase
      .channel(`mailbox:${profileId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `profile_id=eq.${profileId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            setMailItems((currentItems) => currentItems.filter((item) => item.id !== payload.old.id));
            return;
          }

          const row = payload.new as {
            id: string;
            title: string;
            category: string;
            body: string;
            action_href: string | null;
            read_at: string | null;
            created_at: string;
            archived_at?: string | null;
          };

          if (row.archived_at) {
            setMailItems((currentItems) => currentItems.filter((item) => item.id !== row.id));
            return;
          }

          const nextItem = toMailNotification(row);
          setMailItems((currentItems) => {
            const existingIndex = currentItems.findIndex((item) => item.id === nextItem.id);

            if (existingIndex >= 0) {
              return currentItems.map((item) => (item.id === nextItem.id ? nextItem : item));
            }

            return [nextItem, ...currentItems].sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
            );
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [profileId]);

  async function openNotification(notificationId: string) {
    setSelectedId(notificationId);

    const notification = mailItems.find((item) => item.id === notificationId);
    if (!notification || notification.readAt) {
      return;
    }

    const readAt = new Date().toISOString();
    setMailItems((currentItems) =>
      currentItems.map((item) =>
        item.id === notificationId
          ? {
              ...item,
              status: "opened",
              readAt,
            }
          : item,
      ),
    );

    const supabase = createClient();
    if (!supabase) {
      return;
    }

    const { error } = await supabase.rpc("mark_notification_read", {
      p_notification_id: notificationId,
    });

    if (error) {
      setMailItems((currentItems) =>
        currentItems.map((item) =>
          item.id === notificationId
            ? {
                ...item,
                status: "unopened",
                readAt: null,
              }
            : item,
        ),
      );
    }
  }

  async function markAllRead() {
    const readAt = new Date().toISOString();
    setMailItems((currentItems) =>
      currentItems.map((item) => ({
        ...item,
        status: "opened",
        readAt: item.readAt ?? readAt,
      })),
    );

    const supabase = createClient();
    if (!supabase) {
      return;
    }

    await supabase.rpc("mark_all_notifications_read");
  }

  return (
    <section className="mailbox-stage" aria-label="House mailbox">
      <Link href="/app" className="mailbox-stage__home" aria-label="Return to House">
        <span aria-hidden="true" />
      </Link>

      <div className="mailbox-stage__filters" aria-label="Mailbox filters">
        <button
          type="button"
          className={filter === "all" ? "mailbox-filter mailbox-filter--active" : "mailbox-filter"}
          onClick={() => setFilter("all")}
        >
          All
        </button>
        <button
          type="button"
          className={filter === "unopened" ? "mailbox-filter mailbox-filter--active" : "mailbox-filter"}
          onClick={() => setFilter("unopened")}
        >
          Unread {unreadCount ? `(${unreadCount})` : ""}
        </button>
        <button
          type="button"
          className={filter === "opened" ? "mailbox-filter mailbox-filter--active" : "mailbox-filter"}
          onClick={() => setFilter("opened")}
        >
          Read
        </button>
        <button type="button" className="mailbox-filter" onClick={markAllRead}>
          Mark All Read
        </button>
      </div>

      <div className="mailbox-stage__reader">
        {selectedNotification ? (
          <OpenScroll notification={selectedNotification} />
        ) : (
          <div className="mailbox-stage__empty">
            <p>Click Each</p>
            <p>Scroll To View</p>
          </div>
        )}
      </div>

      <div className="mailbox-stage__rail" aria-label="Notification scroll list">
        {filteredNotifications.length ? filteredNotifications.map((notification) => (
          <button
            key={notification.id}
            type="button"
            className={
              selectedNotification?.id === notification.id
                ? "mailbox-stage__scroll mailbox-stage__scroll--active"
                : "mailbox-stage__scroll"
            }
            onClick={() => {
              void openNotification(notification.id);
            }}
            aria-label={`${notification.title}, ${notification.status}`}
          >
            <span className="mailbox-stage__scroll-title">{notification.title}</span>
            <span className="mailbox-stage__scroll-art" aria-hidden="true">
              <span />
            </span>
            <span className="sr-only">{notification.status}</span>
          </button>
        )) : (
          <div className="mailbox-stage__no-mail">
            No scrolls found.
          </div>
        )}
      </div>
    </section>
  );
}

function OpenScroll({ notification }: { notification: MailNotification }) {
  return (
    <article className="mailbox-parchment">
      <div className="mailbox-parchment__roll mailbox-parchment__roll--top" aria-hidden="true" />
      <div className="mailbox-parchment__paper">
        <div className="mailbox-parchment__seal" aria-hidden="true" />
        <p className="mailbox-parchment__category">{notification.category}</p>
        <h2 className="mailbox-parchment__title">{notification.title}</h2>
        <div className="mailbox-parchment__body">
          {notification.body.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        {notification.actionHref ? (
          <Link href={notification.actionHref} className="mailbox-parchment__action">
            Follow This Scroll
          </Link>
        ) : null}
        <div className="mailbox-parchment__key" aria-hidden="true" />
      </div>
      <div className="mailbox-parchment__roll mailbox-parchment__roll--bottom" aria-hidden="true" />
    </article>
  );
}

function toMailNotification(row: {
  id: string;
  title: string;
  category: string;
  body: string;
  action_href: string | null;
  read_at: string | null;
  created_at: string;
}): MailNotification {
  return {
    id: row.id,
    title: row.title,
    status: row.read_at ? "opened" : "unopened",
    category: row.category,
    body: row.body.split(/\n{2,}|\n/).filter(Boolean),
    actionHref: row.action_href,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}
