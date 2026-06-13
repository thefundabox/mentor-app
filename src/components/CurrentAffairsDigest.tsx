/**
 * Daily Current Affairs digest — shown on StudentHome (Adaptive PR 6).
 *
 * Top 3 most recent active CA items, with category, date, and source link
 * if present. The card is collapsible — students who already keep up with
 * news can hide it. Drives the "warm-up" reading per the original spec.
 *
 * Dismissal is *session-local* for PR 6 (hidden until next page load). A
 * follow-up can persist dismissed ids per-student if the card feels nosy.
 */

import { useMemo, useState } from "react";
import { useAppState } from "@/hooks/useAppState";
import { dailyDigest } from "@/lib/currentAffairs";
import { Newspaper, X, ExternalLink, ChevronDown, ChevronRight } from "lucide-react";

const CATEGORY_LABEL: Record<string, string> = {
  rajasthan_scheme: "Rajasthan scheme",
  national_policy:  "National policy",
  science_tech:     "Science & tech",
  awards:           "Awards",
  sports:           "Sports",
  international:    "International",
};
const CATEGORY_TONE: Record<string, string> = {
  rajasthan_scheme: "bg-amber-100 text-amber-800",
  national_policy:  "bg-indigo-100 text-indigo-800",
  science_tech:     "bg-emerald-100 text-emerald-800",
  awards:           "bg-violet-100 text-violet-800",
  sports:           "bg-rose-100 text-rose-800",
  international:    "bg-slate-100 text-slate-800",
};

interface CurrentAffairsDigestProps {
  /** How many CA items to show. Defaults to 3 for the Dashboard glance;
   * the Journey page passes 6 to make it the focal sidebar content. */
  limit?: number;
}

export function CurrentAffairsDigest({ limit = 3 }: CurrentAffairsDigestProps = {}) {
  const { currentAffairs } = useAppState();
  const [collapsed, setCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const items = useMemo(() => dailyDigest(currentAffairs, limit), [currentAffairs, limit]);
  if (dismissed || items.length === 0) return null;

  return (
    <section className="mb-5 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white overflow-hidden">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-indigo-50/50 transition"
      >
        <Newspaper className="w-4 h-4 text-indigo-700 flex-shrink-0" />
        <div className="text-sm font-bold text-indigo-900 flex-1 text-left">
          Today's current affairs
        </div>
        <span className="text-xs text-indigo-700">{items.length} item{items.length === 1 ? "" : "s"}</span>
        {collapsed ? <ChevronRight className="w-4 h-4 text-indigo-700" /> : <ChevronDown className="w-4 h-4 text-indigo-700" />}
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => { e.stopPropagation(); setDismissed(true); }}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); setDismissed(true); } }}
          aria-label="Dismiss for this session"
          className="text-indigo-400 hover:text-indigo-700 ml-1"
        >
          <X className="w-4 h-4" />
        </span>
      </button>

      {!collapsed && (
        <ul className="divide-y divide-indigo-100">
          {items.map((it) => (
            <li key={it.id} className="px-4 py-3">
              <div className="flex items-start gap-2 flex-wrap">
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${CATEGORY_TONE[it.category] ?? "bg-slate-100 text-slate-800"}`}>
                  {CATEGORY_LABEL[it.category] ?? it.category}
                </span>
                <span className="text-[11px] text-slate-500">{new Date(it.dateOfEvent).toLocaleDateString()}</span>
              </div>
              <div className="text-sm font-semibold text-slate-900 mt-1">{it.headline}</div>
              {it.note && <p className="text-xs text-slate-600 mt-1">{it.note}</p>}
              {it.sourceUrl && (
                <a
                  href={it.sourceUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline mt-1"
                >
                  Read source <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
