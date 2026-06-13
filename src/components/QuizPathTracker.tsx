/**
 * QuizPathTracker — 2D path visualisation for the day quiz header.
 *
 * Replaces the legacy `1/N` progress bar with a grid that makes the
 * quiz's two-axis structure visible:
 *
 *   - Horizontal "main" row: one cell per main question. Pending / current
 *     / correct / wrong.
 *   - Vertical "foundation" drill that appears below a wrong main cell
 *     while the student is in remediation. Cells are smaller so the column
 *     reads as a "down-shoot" rather than a sibling main row, connected
 *     by a thin vertical line.
 *   - Once a drill finishes, its column collapses to a tiny pip count
 *     under the originating main cell (so the header height stops growing
 *     as drills accumulate).
 *
 * Pure presentation. Caller (QuizScreen) owns the state.
 */

import { Check, X } from "lucide-react";

export type CellResult = "pending" | "current" | "correct" | "wrong";

export interface MainCellState {
  result: CellResult;
  /** Count of foundation Qs the student already worked through under this cell. Renders as small pips. */
  foundationDots: number;
}

export interface FoundationDrill {
  /** Index (0-based) into the main row this drill hangs from. */
  mainIdx: number;
  /** One state per foundation question in this drill (typically up to 2). */
  results: CellResult[];
}

export interface QuizPathTrackerProps {
  main: MainCellState[];
  activeDrill: FoundationDrill | null;
  /** 1-based; used for the right-side counter only. */
  currentIndex: number;
  total: number;
  onClose: () => void;
}

const MAIN_CELL = "w-[22px] h-[22px]";
const F_CELL = "w-[14px] h-[14px]";

function mainClass(r: CellResult): string {
  switch (r) {
    case "current":
      return "bg-indigo-600 text-white ring-2 ring-indigo-300";
    case "correct":
      return "bg-emerald-500 text-white";
    case "wrong":
      return "bg-rose-500 text-white";
    case "pending":
    default:
      return "bg-slate-100 text-slate-400";
  }
}

function fClass(r: CellResult): string {
  switch (r) {
    case "current":
      return "bg-indigo-600 ring-2 ring-indigo-300";
    case "correct":
      return "bg-emerald-500";
    case "wrong":
      return "bg-rose-500";
    case "pending":
    default:
      return "bg-slate-200";
  }
}

export function QuizPathTracker({
  main, activeDrill, currentIndex, total, onClose,
}: QuizPathTrackerProps) {
  return (
    <div
      data-testid="quiz-path"
      className="max-w-3xl mx-auto px-6 py-3 flex items-start gap-4"
    >
      <button
        onClick={onClose}
        className="text-slate-400 hover:text-slate-700 transition mt-1 flex-shrink-0"
        aria-label="Exit quiz"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Tracker grid — horizontal scroll-x if it overflows on a narrow viewport. */}
      <div className="flex-1 min-w-0 overflow-x-auto">
        <div className="inline-block">
          {/* Main row */}
          <div className="flex items-center gap-[2px]">
            {main.map((cell, idx) => (
              <div
                key={idx}
                title={`Q${idx + 1} · ${cell.result}`}
                className={`${MAIN_CELL} rounded-md flex items-center justify-center text-[10px] font-bold transition ${mainClass(cell.result)}`}
              >
                {cell.result === "correct"
                  ? <Check className="w-3 h-3" />
                  : cell.result === "wrong"
                    ? <X className="w-3 h-3" />
                    : idx + 1}
              </div>
            ))}
          </div>

          {/* Foundation row below main — collapsed pips for past drills, or
            * expanded column for the currently-active drill. Both share the
            * same column rhythm (24px stride: 22px cell + 2px gap) so they
            * line up under their main cells. */}
          {(activeDrill || main.some((m) => m.foundationDots > 0)) && (
            <div className="relative mt-1" style={{ height: activeDrill ? `${activeDrill.results.length * 18 + 4}px` : "10px" }}>
              {/* Past-drill pips */}
              {main.map((cell, idx) => {
                if (cell.foundationDots === 0) return null;
                if (activeDrill && activeDrill.mainIdx === idx) return null; // skip if currently drilling here
                const left = idx * 24 + (22 - 6) / 2; // center 6px pip under 22px cell
                return (
                  <div
                    key={`pip-${idx}`}
                    className="absolute top-0 flex gap-[2px]"
                    style={{ left: `${left}px` }}
                    title={`${cell.foundationDots} foundation Q${cell.foundationDots === 1 ? "" : "s"} done`}
                  >
                    {Array.from({ length: cell.foundationDots }).map((_, k) => (
                      <span key={k} className="w-[6px] h-[6px] rounded-full bg-slate-400" />
                    ))}
                  </div>
                );
              })}

              {/* Active drill column */}
              {activeDrill && (
                <div
                  className="absolute top-0 flex flex-col items-center gap-[2px]"
                  style={{ left: `${activeDrill.mainIdx * 24 + (22 - 14) / 2}px` }}
                  aria-label="Foundation questions"
                >
                  {/* Thin connecting line from the main cell down through the foundation cells */}
                  <span
                    className="absolute top-[-4px] left-1/2 -translate-x-1/2 w-[1px] bg-slate-300"
                    style={{ height: `${activeDrill.results.length * 16 + 4}px` }}
                  />
                  {activeDrill.results.map((r, k) => (
                    <div
                      key={k}
                      title={`Foundation ${k + 1} · ${r}`}
                      className={`relative ${F_CELL} rounded-sm transition ${fClass(r)}`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="text-xs font-medium text-slate-500 w-16 text-right flex-shrink-0">
        {currentIndex} / {total}
      </div>
    </div>
  );
}
