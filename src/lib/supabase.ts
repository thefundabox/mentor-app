import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase client.
 *
 * Reads VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Vite inlines these at build
 * time, so they must be present in the build environment — `.env.local` for dev,
 * and the Railway service variables for production. A build without them
 * produces a bundle where `supabase` is null.
 *
 * The anon key is public by design: it ships in the browser bundle and anyone
 * can read it from the deployed site. Row Level Security on each table is what
 * actually protects the data — see supabase/migrations/.
 */

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** True when both env vars are present and the client is usable. */
export const isSupabaseConfigured = Boolean(url && anonKey);

/**
 * Null when the env vars are missing, so the app can fall back to local-only
 * mode instead of crashing on load. Callers must null-check.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/** Shape of a row in public.profiles. */
export interface ProfileRow {
  id: string;
  email: string;
  name: string;
  role: "student" | "mentor" | "admin";
  mentor_id: string | null;
  created_at: string;
}

if (!isSupabaseConfigured && import.meta.env.DEV) {
  console.warn(
    "[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set — " +
      "running in local-only mode. Sign-in will not work.",
  );
}
