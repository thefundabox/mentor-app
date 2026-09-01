/**
 * What is switched on.
 *
 * Lets a part of the product come down without a deploy -- the Mains tab while
 * its content is not ready, and whatever needs it next. See 0038.
 */
import { supabase } from "./supabase";

export type FeatureState = "visible" | "hidden" | "removed";

export interface FeatureFlag {
  key: string;
  state: FeatureState;
  /** Human name for the admin screen, so the UI needs no key-to-label table. */
  label: string;
}

/**
 * The flags that ship in the bundle.
 *
 * Everything visible. This is what demo mode uses, what the first paint uses
 * before the fetch lands, and what applies if the table cannot be read -- so a
 * failure to reach the database shows the product, never a blank screen with
 * features silently missing.
 */
export const DEFAULT_FLAGS: FeatureFlag[] = [
  { key: "topic_mains", state: "visible", label: "Mains tab on the topic screen" },
];

export async function loadFeatureFlags(): Promise<FeatureFlag[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("feature_flags").select("key,state,label").order("key");
  if (error || !data) return null;
  return data as FeatureFlag[];
}

/**
 * Admin-only. Goes through the RPC rather than a table write, so a refusal
 * raises instead of quietly matching no rows and reporting success.
 */
export async function setFeatureState(
  key: string, state: FeatureState,
): Promise<{ error?: string }> {
  if (!supabase) return { error: "Not connected." };
  const { error } = await supabase.rpc("set_feature_state", {
    target_key: key, new_state: state,
  });
  return error ? { error: error.message } : {};
}

/**
 * Should this viewer see the feature?
 *
 * `hidden` is the interesting case: staff still see it, which is what makes it
 * possible to check something before putting it back in front of students.
 */
export function featureVisibleTo(
  state: FeatureState, role: "student" | "mentor" | "admin" | undefined,
): boolean {
  if (state === "removed") return false;
  if (state === "visible") return true;
  return role === "mentor" || role === "admin";
}
