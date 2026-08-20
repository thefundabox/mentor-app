import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppState } from "@/hooks/useAppState";
import { RotateCw, ShieldCheck, Loader2 } from "lucide-react";
import type { Role } from "@/types";
import type { ProfileRow } from "@/lib/supabase";

/**
 * Real accounts, straight from public.profiles.
 *
 * The rest of the People tab lists `users`, which is localStorage — anyone
 * "added" there is a ghost that cannot log in. This panel only shows people who
 * actually completed signup, and is the supported way to promote a mentor or an
 * admin without opening the SQL editor.
 */
export function AccountsPanel() {
  const { listProfiles, setUserRole, setUserMentor, currentUser, authEnabled } = useAppState();

  const [rows, setRows] = useState<ProfileRow[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  // Await first, so nothing sets state synchronously when this runs from an
  // effect — that triggers a cascading render.
  const load = useCallback(async () => {
    const next = await listProfiles();
    setError(null);
    setRows(next);
  }, [listProfiles]);

  // Fetch inline rather than calling `load`, with a cancel flag so a result
  // arriving after unmount does not set state on a dead component.
  useEffect(() => {
    if (!authEnabled) return;
    let cancelled = false;
    void (async () => {
      const next = await listProfiles();
      if (cancelled) return;
      setError(null);
      setRows(next);
    })();
    return () => { cancelled = true; };
  }, [authEnabled, listProfiles]);

  const mentors = useMemo(() => (rows ?? []).filter((r) => r.role === "mentor"), [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows ?? [];
    return (rows ?? []).filter((r) =>
      r.email.toLowerCase().includes(q) || r.name.toLowerCase().includes(q));
  }, [rows, query]);

  if (!authEnabled) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <h2 className="font-semibold text-slate-900 mb-1">Accounts</h2>
        <p className="text-sm text-slate-500">
          Running in local-only mode — no Supabase project is configured, so there are no real accounts to manage.
        </p>
      </div>
    );
  }

  const changeRole = async (row: ProfileRow, role: Role) => {
    if (role === row.role) return;
    setBusyId(row.id); setError(null);
    const result = await setUserRole(row.id, role);
    setBusyId(null);
    if (result.error) { setError(result.error); return; }
    setRows((prev) => (prev ?? []).map((r) => (r.id === row.id ? { ...r, role } : r)));
  };

  const changeMentor = async (row: ProfileRow, mentorId: string) => {
    const next = mentorId || null;
    setBusyId(row.id); setError(null);
    const result = await setUserMentor(row.id, next);
    setBusyId(null);
    if (result.error) { setError(result.error); return; }
    setRows((prev) => (prev ?? []).map((r) => (r.id === row.id ? { ...r, mentor_id: next } : r)));
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
        <h2 className="font-semibold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          Accounts {rows && <span className="text-slate-400 font-normal">({rows.length})</span>}
        </h2>
        <button onClick={load} className="text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1">
          <RotateCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Everyone who has actually signed up. Changing a role here takes effect the next time that person loads the app.
      </p>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search name or email"
        className="w-full mb-3 px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 text-sm"
      />

      {error && (
        <div className="mb-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-800">{error}</div>
      )}

      {rows === null ? (
        <div className="py-8 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading accounts…
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-8 text-center text-sm text-slate-500">
          {rows.length === 0 ? "No accounts yet — nobody has signed up." : "No account matches that search."}
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {filtered.map((row) => {
            const isSelf = row.id === currentUser?.id;
            const busy = busyId === row.id;
            return (
              <div key={row.id} className="py-2.5 flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-[12rem]">
                  <div className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                    {row.name || row.email.split("@")[0]}
                    {isSelf && <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">you</span>}
                  </div>
                  <div className="text-[11px] text-slate-500">{row.email}</div>
                </div>

                <select
                  value={row.role}
                  disabled={isSelf || busy}
                  onChange={(e) => changeRole(row, e.target.value as Role)}
                  title={isSelf ? "You cannot change your own role — use the SQL editor if you really mean to" : "Change role"}
                  className="text-xs px-2 py-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="student">student</option>
                  <option value="mentor">mentor</option>
                  <option value="admin">admin</option>
                </select>

                {row.role === "student" && (
                  <select
                    value={row.mentor_id ?? ""}
                    disabled={busy}
                    onChange={(e) => changeMentor(row, e.target.value)}
                    title="Assign a mentor"
                    className="text-xs px-2 py-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-50"
                  >
                    <option value="">no mentor</option>
                    {mentors.map((m) => (
                      <option key={m.id} value={m.id}>{m.name || m.email}</option>
                    ))}
                  </select>
                )}

                {busy && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
