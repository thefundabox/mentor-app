/**
 * What this account is allowed, and how much of it is left.
 *
 * Every number here is read back from the server, never computed in the
 * browser. The caps are enforced in Postgres (0026 for questions, 0027 for
 * mock tests); this module exists only so the UI can *show* what the server
 * will do, and a figure the client worked out for itself would eventually
 * disagree with the thing actually doing the enforcing.
 */
import { supabase } from "./supabase";

export interface QuestionMeter {
  /** New questions unlocked since the last IST midnight. */
  used: number;
  /** Daily allowance, or null when the plan is unmetered. */
  cap: number | null;
  plan: "free" | "paid";
}

export interface TestMeter {
  /** Distinct mock tests opened, ever. */
  used: number;
  /** Allowance, or null when unmetered. */
  cap: number | null;
}

/** Today's question allowance. Null when signed out or offline. */
export async function loadQuestionMeter(): Promise<QuestionMeter | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("questions_used_today");
  if (error || !data) return null;
  // The function returns a single row; PostgREST gives back an array.
  const row = (Array.isArray(data) ? data[0] : data) as
    | { used: number; cap: number | null; plan: string }
    | undefined;
  if (!row) return null;
  return {
    used: row.used ?? 0,
    cap: row.cap ?? null,
    plan: row.plan === "paid" ? "paid" : "free",
  };
}

/** Mock test allowance. Null when signed out or offline. */
export async function loadTestMeter(): Promise<TestMeter | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("tests_used");
  if (error || !data) return null;
  const row = (Array.isArray(data) ? data[0] : data) as
    | { used: number; cap: number | null }
    | undefined;
  if (!row) return null;
  return { used: row.used ?? 0, cap: row.cap ?? null };
}

/**
 * Open a mock test.
 *
 * The allowance is enforced by a trigger, so the failure arrives as a Postgres
 * exception. Its message is written for a student to read ("Your free plan
 * includes 3 mock test(s)...") and is surfaced verbatim rather than replaced
 * with a generic one -- a paywall that will not say why it stopped you is the
 * most annoying kind, and this project has already been bitten once by
 * substituting "You don't have permission" for the database's own words.
 */
export async function startTestAttempt(
  testId: string,
): Promise<{ id: string } | { error: string }> {
  if (!supabase) return { error: "Not connected." };
  const { data, error } = await supabase
    .from("test_attempts")
    // student_id is deliberately not sent: the trigger stamps it from
    // auth.uid(). Sending it would be a claim the server has to ignore anyway.
    .insert({ test_id: testId })
    .select("id")
    .single();
  if (error) return { error: error.message };
  return { id: (data as { id: string }).id };
}
