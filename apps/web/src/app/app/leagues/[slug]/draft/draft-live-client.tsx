"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";

type DraftLiveClientProps = {
  isLive: boolean;
};

const LIVE_REFRESH_MS = 4000;

export function DraftLiveClient({ isLive }: DraftLiveClientProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!isLive) {
      return;
    }

    const interval = window.setInterval(() => {
      startTransition(() => {
        router.refresh();
      });
    }, LIVE_REFRESH_MS);

    return () => window.clearInterval(interval);
  }, [isLive, router, startTransition]);

  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-white/10 bg-white/6 px-4 py-4 text-sm text-stone-300">
      <p>
        {isLive
          ? "Live draft refresh is running every few seconds so the pick pool stays current."
          : "Live refresh activates automatically once the draft starts."}
      </p>
      <button
        type="button"
        onClick={() => {
          startTransition(() => {
            router.refresh();
          });
        }}
        className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs uppercase tracking-[0.24em] text-stone-200 transition-colors hover:bg-white/10"
      >
        Refresh now
      </button>
    </div>
  );
}
