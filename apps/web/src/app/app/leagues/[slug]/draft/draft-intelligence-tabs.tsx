"use client";

import { type ReactNode, useState } from "react";

type DraftToolView = "board" | "players" | "queue";

type DraftIntelligenceTabsProps = {
  board: ReactNode;
  players: ReactNode;
  queue: ReactNode;
};

const DRAFT_TOOL_TABS: Array<{
  id: DraftToolView;
  label: string;
}> = [
  {
    id: "board",
    label: "Draft Board",
  },
  {
    id: "players",
    label: "Available Players",
  },
  {
    id: "queue",
    label: "Queue",
  },
];

export function DraftIntelligenceTabs({
  board,
  players,
  queue,
}: DraftIntelligenceTabsProps) {
  const [activeView, setActiveView] = useState<DraftToolView>("players");

  return (
    <div className="grid gap-5">
      <div className="grid gap-2 md:grid-cols-3">
        {DRAFT_TOOL_TABS.map((tab) => {
          const isActive = activeView === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveView(tab.id)}
              className={`rounded-[1rem] border px-4 py-2.5 text-center transition-colors ${
                isActive
                  ? "border-[#f2bf5e]/45 bg-[#f2bf5e]/12 shadow-[0_0_24px_rgba(242,191,94,0.12)]"
                  : "border-[#6e95ff]/16 bg-[#0b1129]/70 hover:border-[#6e95ff]/32 hover:bg-[#111938]/80"
              }`}
            >
              <p className="draft-console-title text-base text-white">{tab.label}</p>
            </button>
          );
        })}
      </div>

      <div>
        {activeView === "board" ? board : null}
        {activeView === "players" ? players : null}
        {activeView === "queue" ? queue : null}
      </div>
    </div>
  );
}
