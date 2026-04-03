"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type DraftLiveClientProps = {
  isLive: boolean;
  leagueId: string;
  currentPickStartedAt: string | null;
  pickTimeSeconds: number | null;
  onTheClockName: string | null;
};

const LIVE_REFRESH_MS = 4000;

export function DraftLiveClient({
  isLive,
  leagueId,
  currentPickStartedAt,
  pickTimeSeconds,
  onTheClockName,
}: DraftLiveClientProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [now, setNow] = useState(() => Date.now());
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
      setNow(Date.now());
      void processQueue();
    }, LIVE_REFRESH_MS);

    return () => window.clearInterval(interval);
  }, [isLive, processQueue]);

  useEffect(() => {
    if (!isLive || !currentPickStartedAt || !pickTimeSeconds) {
      return;
    }

    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, [currentPickStartedAt, isLive, pickTimeSeconds]);

  const countdown = useMemo(() => {
    if (!isLive || !currentPickStartedAt || !pickTimeSeconds) {
      return null;
    }

    const startedAtMs = new Date(currentPickStartedAt).getTime();
    const deadlineMs = startedAtMs + pickTimeSeconds * 1000;
    const remainingMs = Math.max(0, deadlineMs - now);
    const totalSeconds = Math.ceil(remainingMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return {
      isExpired: totalSeconds <= 0,
      remainingSeconds: totalSeconds,
      text: `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`,
    };
  }, [currentPickStartedAt, isLive, now, pickTimeSeconds]);

  useEffect(() => {
    if (!countdown?.isExpired) {
      return;
    }

    void processQueue();
  }, [countdown?.isExpired, processQueue]);

  const countdownTone = countdown?.isExpired
    ? "border-rose-300/30 bg-rose-400/10 text-rose-100"
    : countdown && countdown.remainingSeconds <= 10
      ? "border-amber-300/30 bg-amber-400/10 text-amber-100"
      : "border-emerald-300/25 bg-emerald-400/10 text-emerald-100";

  return (
    <div className="mb-5 rounded-[1.5rem] border border-white/10 bg-white/6 px-4 py-4 text-sm text-stone-300">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-3">
          <p>
            {isLive
              ? "Live draft refresh is running every few seconds so the pick pool stays current and timed-out turns can auto-advance."
              : "Live refresh activates automatically once the draft starts."}
          </p>
          {countdown ? (
            <div className={`inline-flex w-fit items-center gap-3 rounded-full border px-4 py-2 ${countdownTone}`}>
              <span className="font-mono text-xs uppercase tracking-[0.24em]">
                Pick clock
              </span>
              <span className="font-mono text-lg font-semibold tracking-[0.16em]">
                {countdown.text}
              </span>
              <span className="text-xs uppercase tracking-[0.24em] text-current/80">
                {countdown.isExpired
                  ? "Processing timeout"
                  : onTheClockName
                    ? `${onTheClockName} on the clock`
                    : "Clock running"}
              </span>
            </div>
          ) : (
            <p className="text-sm text-stone-400">
              No active pick clock is running yet.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            void processQueue();
          }}
          className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs uppercase tracking-[0.24em] text-stone-200 transition-colors hover:bg-white/10"
        >
          Refresh now
        </button>
      </div>
    </div>
  );
}
