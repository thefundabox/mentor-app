/**
 * Which homepage to show.
 *
 * Two designs live side by side: `classic` is the white/slate/indigo page,
 * `studio` is the warm-paper treatment taken from the sign-in prototype.
 *
 * Flip DEFAULT_LANDING to change what everyone sees. A visitor can also
 * override it for themselves with ?landing=classic or ?landing=studio, which
 * makes the two comparable side by side on the live site without a deploy --
 * the point of keeping both.
 */
export type LandingVariant = "classic" | "studio";

/** What the public sees. Change this one line to switch back. */
export const DEFAULT_LANDING: LandingVariant = "studio";

export function landingVariant(): LandingVariant {
  if (typeof window === "undefined") return DEFAULT_LANDING;
  const q = new URLSearchParams(window.location.search).get("landing");
  return q === "classic" || q === "studio" ? q : DEFAULT_LANDING;
}
