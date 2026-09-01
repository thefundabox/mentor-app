/**
 * The Seekhonomics owl, used wherever the product signs its name.
 *
 * One component rather than four copies: the mark was previously an "R" in a
 * coloured square, hand-rolled separately in the top bar, both landing pages
 * and the sign-in header, each with its own size and background. Swapping the
 * artwork meant editing four files and getting four slightly different results.
 *
 * Only the owl, not the full lockup. The supplied artwork has the SEEKHONOMICS
 * wordmark built in, and every one of these sites already sets the product name
 * in text beside the mark -- using the whole lockup would read "SEEKHONOMICS
 * RAS Mentorship".
 *
 * Served from `public/` rather than imported so the file can be replaced
 * without a rebuild, and so a missing asset degrades to a broken image rather
 * than failing the build.
 */
export function BrandMark({ className = "h-9" }: { className?: string }) {
  return (
    <img
      src="/seekhonomics-owl.png"
      alt="Seekhonomics"
      // Sized by HEIGHT with width auto: the owl is 262x376, noticeably taller
      // than wide, so a square box would letterbox it and leave the mark
      // looking undersized next to the wordmark.
      className={`${className} w-auto shrink-0 select-none`}
      draggable={false}
    />
  );
}
