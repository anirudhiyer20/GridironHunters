"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { confirmExitWorld, resignFromGuild } from "./actions";
import { GuildCenterPixiScene } from "./guild-center-pixi-scene";

type GuildCenterClientProps = {
  guildId: string;
  guildName: string;
  guildRole: "commissioner" | "member";
  guildSize: number;
  draftStartsAt: string | null;
  message?: string;
};

type GuildPanel = "landing" | "guild-rules" | "game-rules" | "resign" | "exit";

const guildRulesPages = [
  {
    title: "General",
    rows: [
      ["Guild Size", "10"],
      ["Player Scoring", "PPR"],
      ["Base Effectiveness", "+10%"],
      ["Draft Date & Time", "Guild Schedule"],
    ],
  },
  {
    title: "Membership",
    rows: [
      ["Invite Codes", "Reusable Until Draft Start"],
      ["Member Cap", "10 Houses"],
      ["Resignation", "Member Self-Serve"],
      ["Removal", "Guild Master Pre-Draft"],
    ],
  },
] as const;

const gameRulesPages = [
  {
    title: "General",
    lines: [
      "Draft builds the House Party.",
      "Arena and Dungeon assignments are separate.",
      "Battle Keys power Hunts each week.",
      "Captured wild players become owned by the House.",
    ],
  },
  {
    title: "Dungeon Hunts",
    lines: [
      "Queue wild targets by Tribe chamber.",
      "Assign 1-2 battlers per hunt row.",
      "Best battler score vs wild score resolves outcome.",
      "Submitted hunts lock in keys until resolved.",
    ],
  },
] as const;

export function GuildCenterClient({
  guildId,
  guildName,
  guildRole,
  guildSize,
  draftStartsAt,
  message,
}: GuildCenterClientProps) {
  const [panel, setPanel] = useState<GuildPanel>("landing");
  const [guildPageIndex, setGuildPageIndex] = useState(0);
  const [gamePageIndex, setGamePageIndex] = useState(0);
  const [showFarewell, setShowFarewell] = useState(false);

  const activeGuildPage = guildRulesPages[guildPageIndex];
  const activeGamePage = gameRulesPages[gamePageIndex];

  const guildRuleRows = useMemo(
    () => [
      ["Guild Name", guildName],
      ["Guild Size", String(guildSize)],
      ["Player Scoring", "PPR"],
      ["Base Effectiveness", "+10%"],
      [
        "Draft Date & Time",
        draftStartsAt ? new Date(draftStartsAt).toLocaleString() : "Not Set",
      ],
      ...activeGuildPage.rows.filter((row) => row[0] !== "Guild Size" && row[0] !== "Draft Date & Time"),
    ],
    [activeGuildPage.rows, draftStartsAt, guildName, guildSize],
  );

  return (
    <section className="guild-center-shell">
      {message ? <div className="guild-center-message">{message}</div> : null}

      {panel === "landing" ? (
        <div className="guild-center-landing guild-center-landing--pixi">
          <GuildCenterPixiScene />

          <Link href="/app/guild" className="guild-center-close" aria-label="Close Guild Center">
            X
          </Link>

          <div className="guild-center-buttons guild-center-buttons--pixi">
            <button type="button" className="nes-btn guild-center-menu-btn" onClick={() => setPanel("guild-rules")}>
              Guild Rules
            </button>
            <button type="button" className="nes-btn guild-center-menu-btn" onClick={() => setPanel("game-rules")}>
              Game Rules
            </button>
            <button type="button" className="nes-btn guild-center-menu-btn" onClick={() => setPanel("resign")}>
              Guild Resignations
            </button>
            <button type="button" className="nes-btn guild-center-menu-btn" onClick={() => setPanel("exit")}>
              Exit World
            </button>
          </div>

          <div className="guild-center-role-note guild-center-role-note--pixi">
            {guildRole === "commissioner" ? "Guild Master" : "Guild Member"}
          </div>
        </div>
      ) : null}

      {panel === "guild-rules" ? (
        <div className="guild-book-shell">
          <button
            type="button"
            className="guild-book-arrow"
            onClick={() => setGuildPageIndex((index) => Math.max(index - 1, 0))}
            disabled={guildPageIndex === 0}
          >
            {"<"}
          </button>
          <button
            type="button"
            className="guild-book-arrow guild-book-arrow--right"
            onClick={() => setGuildPageIndex((index) => Math.min(index + 1, guildRulesPages.length - 1))}
            disabled={guildPageIndex === guildRulesPages.length - 1}
          >
            {">"}
          </button>
          <button type="button" className="guild-center-close" onClick={() => setPanel("landing")}>
            X
          </button>
          <article className="guild-book">
            <div className="guild-book-left">
              <h2>{guildName.toUpperCase()}</h2>
              <h3>Rulebook</h3>
            </div>
            <div className="guild-book-right">
              <h4>{activeGuildPage.title}</h4>
              <div className="guild-book-grid">
                {guildRuleRows.map(([label, value]) => (
                  <div key={label} className="guild-book-row">
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </article>
        </div>
      ) : null}

      {panel === "game-rules" ? (
        <div className="guild-book-shell">
          <button
            type="button"
            className="guild-book-arrow"
            onClick={() => setGamePageIndex((index) => Math.max(index - 1, 0))}
            disabled={gamePageIndex === 0}
          >
            {"<"}
          </button>
          <button
            type="button"
            className="guild-book-arrow guild-book-arrow--right"
            onClick={() => setGamePageIndex((index) => Math.min(index + 1, gameRulesPages.length - 1))}
            disabled={gamePageIndex === gameRulesPages.length - 1}
          >
            {">"}
          </button>
          <button type="button" className="guild-center-close" onClick={() => setPanel("landing")}>
            X
          </button>
          <article className="guild-book">
            <div className="guild-book-left">
              <h2>GRIDIRON HUNTERS</h2>
              <h3>Rulebook</h3>
            </div>
            <div className="guild-book-right">
              <h4>{activeGamePage.title}</h4>
              <ul className="guild-book-lines">
                {activeGamePage.lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          </article>
        </div>
      ) : null}

      {panel === "exit" ? (
        <div className="guild-exit-shell">
          <button type="button" className="guild-center-close" onClick={() => setPanel("landing")}>
            X
          </button>
          <WizardSprite className="guild-center-wizard guild-center-wizard--left" />
          <div className="guild-exit-bubble">
            {showFarewell ? (
              <>
                <p>Thank You For Playing! See You Next Time!</p>
                <form action={confirmExitWorld}>
                  <button type="submit" className="guild-exit-yes">Leave Now</button>
                </form>
              </>
            ) : (
              <>
                <p>Are You Sure You Want To Exit This World?</p>
                <div className="guild-exit-actions">
                  <button type="button" className="guild-exit-yes" onClick={() => setShowFarewell(true)}>Yes</button>
                  <button type="button" className="guild-exit-no" onClick={() => setPanel("landing")}>No</button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      {panel === "resign" ? (
        <div className="guild-resign-shell">
          <button type="button" className="guild-center-close" onClick={() => setPanel("landing")}>
            X
          </button>
          <WizardSprite className="guild-center-wizard guild-center-wizard--left" />
          <div className="guild-resign-card">
            <h3>{guildName}</h3>
            <div className="guild-resign-lock">Remove Member (Locked)</div>
            <div className="guild-resign-lock">Change Member Status (Locked)</div>
            <div className="guild-resign-section">
              <strong>League Resignation</strong>
              {guildRole === "commissioner" ? (
                <p className="guild-resign-warning">
                  Guild Masters cannot resign yet. Transfer leadership first.
                </p>
              ) : (
                <>
                  <p>Do You Want To Resign From This Guild?</p>
                  <form action={resignFromGuild} className="guild-resign-actions">
                    <input type="hidden" name="league_id" value={guildId} />
                    <button type="submit" className="guild-exit-yes">Yes</button>
                    <button type="button" className="guild-exit-no" onClick={() => setPanel("landing")}>No</button>
                  </form>
                  <p className="guild-resign-warning">
                    Warning: This action cannot be undone. To rejoin, use a valid Guild code before the Guild fills.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function WizardSprite({ className }: { className: string }) {
  return (
    <div className={className} aria-hidden="true">
      <div className="guild-wizard">
        <span className="guild-wizard__hat" />
        <span className="guild-wizard__head" />
        <span className="guild-wizard__robe" />
        <span className="guild-wizard__beard" />
        <span className="guild-wizard__arm" />
        <span className="guild-wizard__staff" />
        <span className="guild-wizard__orb" />
        <span className="guild-wizard__shadow" />
      </div>
    </div>
  );
}
