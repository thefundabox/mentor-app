/**
 * Institute settings, in Postgres.
 *
 * The exam date lived in a constant, the product name was typed into six
 * components, and the landing headline was literal JSX. Changing any of them
 * meant a deploy.
 *
 * Read without a session: the landing page shows the countdown and the product
 * name to people who have not signed in, so 0037 grants anon SELECT here. This
 * is the one table where that is the point rather than a mistake.
 */
import { supabase } from "./supabase";

export interface InstituteSettings {
  productName: string;
  examName: string;
  /** Absolute instant, so the countdown means the same moment everywhere. */
  examAt: number;
  examTimeLabel: string;
  landingHeadlineTop: string;
  landingHeadlineBottom: string;
  landingSubhead: string;
}

/**
 * What ships in the bundle.
 *
 * Not a placeholder: it is what the app shows in local demo mode, on the first
 * paint before the fetch lands, and if the settings row is ever unreadable. The
 * landing page must never render an empty headline while waiting on a network.
 */
export const DEFAULT_SETTINGS: InstituteSettings = {
  productName: "RAS Mentorship",
  examName: "RAS Prelims",
  examAt: Date.UTC(2026, 11, 6, 4, 30, 0),
  examTimeLabel: "10:00 am IST",
  landingHeadlineTop: "80 days.",
  landingHeadlineBottom: "243 microthemes to know.",
  landingSubhead:
    "RPSC publishes 11 headings. We decoded 6 real papers into 243 studiable ideas — then built the plan that walks every one.",
};

interface Row {
  product_name: string;
  exam_name: string;
  exam_at: string;
  exam_time_label: string;
  landing_headline_top: string;
  landing_headline_bottom: string;
  landing_subhead: string;
}

const COLUMNS =
  "product_name,exam_name,exam_at,exam_time_label,landing_headline_top,landing_headline_bottom,landing_subhead";

/** The settings row, or null when it cannot be read (keep the bundled values). */
export async function loadSettings(): Promise<InstituteSettings | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("institute_settings").select(COLUMNS).eq("id", true).maybeSingle();
  if (error || !data) return null;
  const r = data as unknown as Row;
  return {
    productName: r.product_name,
    examName: r.exam_name,
    examAt: new Date(r.exam_at).getTime(),
    examTimeLabel: r.exam_time_label,
    landingHeadlineTop: r.landing_headline_top,
    landingHeadlineBottom: r.landing_headline_bottom,
    landingSubhead: r.landing_subhead,
  };
}

/** Admin-only, enforced by RLS in 0037. */
export async function saveSettings(s: InstituteSettings): Promise<{ error?: string }> {
  if (!supabase) return { error: "Not connected." };
  const { error } = await supabase.from("institute_settings").update({
    product_name: s.productName,
    exam_name: s.examName,
    exam_at: new Date(s.examAt).toISOString(),
    exam_time_label: s.examTimeLabel,
    landing_headline_top: s.landingHeadlineTop,
    landing_headline_bottom: s.landingHeadlineBottom,
    landing_subhead: s.landingSubhead,
    updated_at: new Date().toISOString(),
  }).eq("id", true);
  return error ? { error: error.message } : {};
}
