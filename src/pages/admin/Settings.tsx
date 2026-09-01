/**
 * Admin → Institute settings.
 *
 * The exam date used to be a constant in src/data/exam.ts, the product name was
 * typed into six components, and the landing headline was literal JSX. Moving
 * the paper by a week meant a code change and a deploy. This is the screen that
 * makes those a form.
 */
import { useEffect, useState } from "react";
import { useAppState } from "@/hooks/useAppState";
import { Button } from "@/components/ui/button";
import { Save, Check } from "lucide-react";
import type { InstituteSettings } from "@/lib/settingsStore";

/**
 * A timestamp as the value a `datetime-local` input wants.
 *
 * Rendered in IST regardless of where the admin is sitting, because the field
 * is labelled IST and the exam is at a fixed Indian local time. Formatting in
 * the browser's own zone would show an admin abroad a different clock time for
 * the same paper and invite them to "correct" it.
 */
function toISTInput(ms: number): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date(ms));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/** The inverse: read the field back as an absolute instant, fixing IST (+05:30). */
function fromISTInput(v: string): number | null {
  const t = Date.parse(`${v}:00+05:30`);
  return Number.isNaN(t) ? null : t;
}

export function SettingsTab() {
  const { settings, updateSettings } = useAppState();
  const [draft, setDraft] = useState<InstituteSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Settings arrive from Postgres after the first paint, so adopt them when
  // they land -- but only while the form is untouched, or a slow fetch would
  // wipe what the admin had already started typing.
  const [touched, setTouched] = useState(false);
  useEffect(() => { if (!touched) setDraft(settings); }, [settings, touched]);

  const set = <K extends keyof InstituteSettings>(k: K, v: InstituteSettings[K]) => {
    setTouched(true); setSaved(false); setError(null);
    setDraft((d) => ({ ...d, [k]: v }));
  };

  const save = async () => {
    setSaving(true); setError(null);
    const res = await updateSettings(draft);
    setSaving(false);
    if (res.error) { setError(res.error); return; }
    setTouched(false); setSaved(true);
  };

  const examInput = toISTInput(draft.examAt);

  return (
    <div className="space-y-6 max-w-2xl">
      <p className="text-sm text-slate-500">
        What the app calls itself, which paper it counts down to, and the words on
        the front page. Changes are live for everyone as soon as they are saved —
        no deploy.
      </p>

      <Section title="Identity">
        <Field label="Product name" hint="Shown in the header, on the sign-in screen and in the footer.">
          <input className={INPUT} value={draft.productName}
            onChange={(e) => set("productName", e.target.value)} />
        </Field>
        <Field label="Exam name" hint='Used in the countdown, as "<name> countdown".'>
          <input className={INPUT} value={draft.examName}
            onChange={(e) => set("examName", e.target.value)} />
        </Field>
      </Section>

      <Section title="The paper">
        <Field label="Date and time (IST)" hint="Stored as an absolute instant, so the countdown is right from any timezone.">
          <input type="datetime-local" className={INPUT} value={examInput}
            onChange={(e) => {
              const ms = fromISTInput(e.target.value);
              if (ms !== null) set("examAt", ms);
            }} />
        </Field>
        <Field label="Time label" hint="How the time is written under the countdown.">
          <input className={INPUT} value={draft.examTimeLabel}
            onChange={(e) => set("examTimeLabel", e.target.value)} />
        </Field>
      </Section>

      <Section title="Landing page">
        <Field label="Headline, first line">
          <input className={INPUT} value={draft.landingHeadlineTop}
            onChange={(e) => set("landingHeadlineTop", e.target.value)} />
        </Field>
        <Field label="Headline, second line"
               hint="A number at the start is coloured in the brand orange.">
          <input className={INPUT} value={draft.landingHeadlineBottom}
            onChange={(e) => set("landingHeadlineBottom", e.target.value)} />
        </Field>
        <Field label="Sub-headline">
          <textarea rows={3} className={INPUT} value={draft.landingSubhead}
            onChange={(e) => set("landingSubhead", e.target.value)} />
        </Field>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Preview</div>
          <div className="text-2xl font-extrabold leading-[1.05] tracking-[-.03em] text-slate-900">
            <span className="block">{draft.landingHeadlineTop}</span>
            <span className="block">{previewAccent(draft.landingHeadlineBottom)}</span>
          </div>
          <p className="mt-2 text-sm text-slate-500">{draft.landingSubhead}</p>
        </div>
      </Section>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving || !touched}>
          {saving ? "Saving…" : <>Save <Save className="w-4 h-4" /></>}
        </Button>
        {saved && (
          <span className="text-sm font-medium text-emerald-700 flex items-center gap-1.5">
            <Check className="w-4 h-4" /> Saved — live for everyone
          </span>
        )}
      </div>
    </div>
  );
}

const INPUT =
  "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 " +
  "focus:outline-none focus:ring-2 focus:ring-slate-300";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
      <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, hint, children }: {
  label: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      {children}
      {hint && <span className="block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

/** Mirrors the landing page's rule so the preview does not lie. */
function previewAccent(text: string) {
  const m = /^(\d[\d,]*)(\s*)([\s\S]*)$/.exec(text);
  if (!m) return text;
  return (<><span className="text-[#CA7022]">{m[1]}</span>{m[2]}{m[3]}</>);
}
