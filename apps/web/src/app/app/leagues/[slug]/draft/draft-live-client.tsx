"use client";

import { useCallback, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";

type DraftLiveClientProps = {
  isLive: boolean;
  leagueId: string;
  className?: string;
};

const LIVE_REFRESH_MS = 4000;

export function DraftLiveClient({
  isLive,
  leagueId,
  className,
}: DraftLiveClientProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const isProcessingRef = useRef(false);

  const processQueue = useCallback(async () => {
    if (!isLive || isProcessingRef.current) {
      return;
    }

    isProcessingRef.current = true;

    try {
      await fetch("/api/draft/auto-resolve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ leagueId }),
      });
    } finally {
      isProcessingRef.current = false;
      startTransition(() => {
        router.refresh();
      });
    }
  }, [isLive, leagueId, router, startTransition]);

  useEffect(() => {
    if (!isLive) {
      return;
    }

    const interval = window.setInterval(() => {
      void processQueue();
    }, LIVE_REFRESH_MS);

    return () => window.clearInterval(interval);
  }, [isLive, processQueue]);

  return (
    <button
      type="button"
      onClick={() => {
        void processQueue();
      }}
      className={className ?? "inline-flex h-14 items-center rounded-[1.25rem] border border-white/10 bg-black/20 px-5 text-xs uppercase tracking-[0.24em] text-stone-200 transition-colors hover:bg-white/10"}
    >
      Refresh Now
    </button>
  );
}
