import { LandingClassic } from "@/pages/LandingClassic";
import { LandingStudio } from "@/pages/LandingStudio";
import { landingVariant } from "@/lib/landingVariant";

/**
 * Homepage switch.
 *
 * Two complete designs, same content: `classic` is white/slate/indigo,
 * `studio` is the warm-paper treatment taken from the sign-in prototype.
 *
 * Kept as a switch rather than a rewrite so reverting costs one line in
 * src/lib/landingVariant.ts, and so the two can be compared on the live site
 * with ?landing=classic and ?landing=studio before anything is decided.
 */
export function Landing() {
  return landingVariant() === "studio" ? <LandingStudio /> : <LandingClassic />;
}
