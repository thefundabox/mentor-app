/**
 * Small gradient stat tile used in the Dashboard Today strip and (formerly)
 * StudentHome. Extracted so both consumers stay in sync.
 *
 * `progress` (0..1) optionally renders a slim progress bar at the bottom —
 * used for the Level/XP tile, omitted for Points/Streak.
 */

export function StatTile({ label, value, accent, icon, sub, progress }: {
  label: string;
  value: string | number;
  accent: "indigo" | "amber" | "rose";
  icon: React.ReactNode;
  sub: string;
  progress?: number;
}) {
  const map = {
    indigo: { bg: "from-indigo-50 to-indigo-100/40", text: "text-indigo-700", bar: "bg-indigo-500" },
    amber:  { bg: "from-amber-50 to-amber-100/40",   text: "text-amber-700",  bar: "bg-amber-500"  },
    rose:   { bg: "from-rose-50 to-rose-100/40",     text: "text-rose-700",   bar: "bg-rose-500"   },
  }[accent];
  return (
    <div className={`rounded-2xl border border-slate-200 bg-gradient-to-br ${map.bg} p-4`}>
      <div className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide ${map.text}`}>
        {icon}{label}
      </div>
      <div className="text-2xl font-bold text-slate-900 mt-1">{value}</div>
      <div className="text-xs text-slate-500 mt-1">{sub}</div>
      {progress !== undefined && (
        <div className="mt-2 h-1.5 bg-white/60 rounded-full overflow-hidden">
          <div className={`h-full ${map.bar}`} style={{ width: `${Math.max(2, progress * 100)}%` }} />
        </div>
      )}
    </div>
  );
}
