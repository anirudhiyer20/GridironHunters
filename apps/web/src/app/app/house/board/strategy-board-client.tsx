"use client";

import Link from "next/link";
import { useState } from "react";

type StrategyBoardRow = {
  label: string;
  value: string;
  warning?: boolean;
};

type StrategyBoardLink = {
  href: string;
  label: string;
};

export type StrategyBoardPaper = {
  id: string;
  title: string;
  summary: string;
  tone?: "base" | "warning" | "green" | "blue";
  rows?: StrategyBoardRow[];
  body?: string;
  links?: StrategyBoardLink[];
};

type StrategyBoardClientProps = {
  papers: StrategyBoardPaper[];
};

const PAPER_POSITIONS = [
  { left: "8%", top: "12%", rotate: "-3deg" },
  { left: "39%", top: "8%", rotate: "2deg" },
  { right: "9%", top: "15%", rotate: "4deg" },
  { left: "18%", bottom: "17%", rotate: "3deg" },
  { right: "24%", bottom: "15%", rotate: "-4deg" },
] as const;

export function StrategyBoardClient({ papers }: StrategyBoardClientProps) {
  const [selectedPaperId, setSelectedPaperId] = useState<string | null>(null);
  const selectedPaper = papers.find((paper) => paper.id === selectedPaperId) ?? null;

  return (
    <section className="strategy-board-shell">
      <Link href="/app" className="strategy-board-return">
        Return To House
      </Link>
      <div className="strategy-board-surface">
        {papers.map((paper, index) => {
          const position = PAPER_POSITIONS[index] ?? PAPER_POSITIONS[0];

          return (
            <button
              key={paper.id}
              type="button"
              onClick={() => setSelectedPaperId(paper.id)}
              className={`strategy-paper strategy-paper--${paper.tone ?? "base"} absolute grid min-h-28 w-44 justify-items-center gap-1 border-2 border-[#5d4125]/25 bg-[#f3ead7] px-3 py-4 text-center text-[#3f2512] shadow-[0_10px_16px_rgba(48,25,9,0.26),inset_0_0_0_1px_rgba(255,255,255,0.28)] transition-transform hover:-translate-y-1`}
              style={{
                ...position,
                transform: `rotate(${position.rotate})`,
              }}
            >
              <span className="strategy-paper__pin" />
              <strong className="font-mono text-[0.95rem] leading-none">{paper.title}</strong>
              <small className="text-[0.72rem] leading-tight text-[#734c25]">{paper.summary}</small>
            </button>
          );
        })}
      </div>

      {selectedPaper ? (
        <div className="strategy-paper-modal" onClick={() => setSelectedPaperId(null)}>
          <div className="strategy-paper-modal__backdrop" />
          <article className="strategy-paper-modal__panel" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="fantasy-kicker text-[0.68rem] text-[#8a6132]">Board Note</p>
                <h2 className="fantasy-title mt-2 text-3xl text-[#3f2512]">{selectedPaper.title}</h2>
              </div>
              <button type="button" className="strategy-paper-modal__close" onClick={() => setSelectedPaperId(null)}>
                Close
              </button>
            </div>

            <p className="mt-4 text-sm leading-7 text-[#4e331a]">{selectedPaper.body ?? selectedPaper.summary}</p>

            {selectedPaper.rows?.length ? (
              <div className="mt-5 grid gap-3">
                {selectedPaper.rows.map((row) => (
                  <div key={row.label} className="strategy-paper-row">
                    <span>{row.label}</span>
                    <strong className={row.warning ? "text-[#9c3f2c]" : "text-[#3b2413]"}>{row.value}</strong>
                  </div>
                ))}
              </div>
            ) : null}

            {selectedPaper.links?.length ? (
              <div className="mt-6 flex flex-wrap gap-3">
                {selectedPaper.links.map((link) => (
                  <Link key={link.href} href={link.href} className="fantasy-button fantasy-button--gold">
                    {link.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </article>
        </div>
      ) : null}
    </section>
  );
}
