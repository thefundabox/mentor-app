/**
 * Admin → People.
 *
 * Split out of AdminDashboard, which had grown to 2,772 lines holding every
 * section at once. Each section is now its own module and its own lazy chunk,
 * so opening People no longer downloads the PYQ importer.
 */
import { useMemo, useState } from "react";
import { useAppState } from "@/hooks/useAppState";
import { Button } from "@/components/ui/button";
import { BulkImportPanel } from "@/components/BulkImportPanel";
import { AccountsPanel } from "@/components/AccountsPanel";
import { Plus } from "lucide-react";

function SendResetLink({ email }: { email: string }) {
  const { sendPasswordReset, authEnabled } = useAppState();
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  if (!authEnabled) return null;

  const send = async () => {
    setState("busy");
    const result = await sendPasswordReset(email);
    if (result.error) { setState("error"); setMessage(result.error); return; }
    setState("sent");
  };

  if (state === "sent") {
    return <span className="text-[11px] font-medium text-emerald-700 whitespace-nowrap">reset link sent</span>;
  }

  return (
    <span className="inline-flex items-center gap-2 min-w-0">
      {/* The reason used to live only in the title attribute, so a failure read
          as "failed — retry" with no way to tell a rate limit from a bad
          address without hovering. */}
      {state === "error" && message && (
        <span className="text-[11px] text-rose-700 truncate max-w-[18rem]" title={message}>
          {message}
        </span>
      )}
      <button
        onClick={send}
        disabled={state === "busy"}
        title={message || `Email a password-reset link to ${email}`}
        className={`text-[11px] font-medium px-2 py-1 rounded-lg whitespace-nowrap disabled:opacity-50 ${
          state === "error"
            ? "text-rose-700 bg-rose-50 hover:bg-rose-100"
            : "text-slate-600 bg-slate-100 hover:bg-slate-200"
        }`}
      >
        {state === "busy" ? "sending…" : state === "error" ? "retry" : "reset password"}
      </button>
    </span>
  );
}

export function PeopleTab() {
  const { mentors, students, addUser, levelInfo, getStudent, completedDays, batchForStudent, authEnabled } = useAppState();
  const [newMentorEmail, setNewMentorEmail] = useState("");
  const [newMentorName, setNewMentorName] = useState("");

  // Real accounts carry a Supabase uuid; the bundled demo people carry ids like
  // u_student_aamir. Mixing them in a live admin view put invented students in
  // real mentors' cohorts, so once auth is on, only real accounts are listed.
  const isReal = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(id);
  const realMentors = useMemo(
    () => (authEnabled ? mentors.filter((m) => isReal(m.id)) : mentors),
    [mentors, authEnabled],
  );
  const realStudents = useMemo(
    () => (authEnabled ? students.filter((s) => isReal(s.id)) : students),
    [students, authEnabled],
  );

  // Assignment lives in Accounts above, which writes to Postgres. This is a
  // read-only cohort view.
  const studentsByMentor = useMemo(() => {
    const out: Record<string, typeof students> = {};
    for (const m of realMentors) out[m.id] = [];
    for (const s of realStudents) {
      if (s.mentorId && out[s.mentorId]) out[s.mentorId].push(s);
    }
    return out;
  }, [realMentors, realStudents]);

  const [addNote, setAddNote] = useState<string | null>(null);

  const addMentor = () => {
    if (!newMentorEmail.includes("@")) return;
    const email = newMentorEmail.trim().toLowerCase();
    const before = mentors.length + students.length;
    addUser({ role: "mentor", email, name: newMentorName.trim() || newMentorEmail.split("@")[0] });
    // addUser returns the existing row instead of appending a duplicate. Say so,
    // rather than appearing to do nothing.
    setAddNote(
      before === mentors.length + students.length
        ? `${email} already has an entry — nothing added. Change their role in Accounts above.`
        : null,
    );
    setNewMentorEmail(""); setNewMentorName("");
  };

  return (
    <div className="space-y-6">
      <AccountsPanel />

      <BulkImportPanel />

      {/* Local-only mode alone. With a Supabase project the cohort view lists real
          accounts, so a browser-only row would be invisible as well as unusable. */}
      {!authEnabled && (
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-900">Add a local demo mentor</h2>
        </div>
        <div className="mb-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
          This does <strong>not</strong> create a real account — it only adds a row to this browser, for demo
          and layout purposes. Someone added here cannot sign in. To grant real mentor access, have them sign
          up first, then change their role in <strong>Accounts</strong> above.
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
          <input type="email" placeholder="email@example.com" value={newMentorEmail} onChange={(e) => setNewMentorEmail(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 outline-none text-sm" />
          <input type="text" placeholder="Display name" value={newMentorName} onChange={(e) => setNewMentorName(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 outline-none text-sm" />
          <Button onClick={addMentor} disabled={!newMentorEmail.includes("@")}><Plus className="w-4 h-4" /> Add mentor</Button>
        </div>
        {addNote && <div className="mt-2 text-xs text-amber-800">{addNote}</div>}
      </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {realMentors.map((m) => {
          const list = studentsByMentor[m.id] || [];
          const totalDays = list.reduce((acc, s) => acc + getStudent(s.id).chart.days.length, 0);
          const totalCleared = list.reduce((acc, s) => acc + completedDays(s.id).length, 0);
          return (
            <div key={m.id} className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  {m.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-slate-900">{m.name}</div>
                  <div className="text-xs text-slate-500">{m.email}</div>
                </div>
                <SendResetLink email={m.email} />
                <div className="text-right">
                  <div className="text-xs uppercase font-bold text-slate-500">Students</div>
                  <div className="text-lg font-bold text-slate-900">{list.length}</div>
                </div>
              </div>
              {list.length === 0 ? (
                <div className="text-sm text-slate-500 py-3 text-center bg-slate-50 rounded-lg">No students assigned.</div>
              ) : (
                <div className="space-y-1.5">
                  {list.map((s) => {
                    const info = levelInfo(s.id);
                    const batch = batchForStudent(s.id);
                    return (
                      <div key={s.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs flex items-center justify-center font-bold flex-shrink-0">
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <div className="text-sm font-semibold text-slate-900 truncate">{s.name}</div>
                            {batch && (
                              <span className="text-[10px] uppercase font-bold text-indigo-700 px-1.5 py-0.5 rounded bg-indigo-50">{batch.name}</span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500">Lv {info.level} · ⭐ {info.total.toLocaleString()}</div>
                        </div>
                        <SendResetLink email={s.email} />
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="mt-3 text-xs text-slate-500 flex items-center gap-3">
                <span>{totalCleared} / {totalDays} days cleared overall</span>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}


/* ==================== Catalog tab ==================== */
