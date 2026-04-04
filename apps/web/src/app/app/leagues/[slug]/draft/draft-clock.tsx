"use client";

import { useEffect, useMemo, useState } from "react";

type DraftClockProps = {
  isLive: boolean;
  currentPickStartedAt: string | null;
  pickTimeSeconds: number | null;
  isUsersPick: boolean;
};

export function DraftClock({
  isLive,
  currentPickStartedAt,
  pickTimeSeconds,
  isUsersPick,
}: DraftClockProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

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
      remainingSeconds: totalSeconds,
      text: `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`,
    };
  }, [currentPickStartedAt, isLive, now, pickTimeSeconds]);

  const isUrgent = Boolean(countdown && countdown.remainingSeconds <= 10 && isUsersPick);

  return (
    <div className="inline-flex h-14 min-w-[10rem] items-center rounded-[1.25rem] border border-white/12 bg-[#0b1129]/75 px-5 shadow-[inset_0_0_0_1px_rgba(142,171,255,0.06)]">
      <span
        className={`draft-console-title text-2xl font-semibold tracking-[0.16em] ${
          isUrgent ? "text-rose-400" : "text-white"
        }`}
      >
        {countdown?.text ?? "--:--"}
      </span>
    </div>
  );
}
