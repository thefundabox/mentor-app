import type { ReactNode } from "react";

/**
 * Babo Sa, the guide, saying one thing about the screen you are on.
 *
 * The point is orientation, not decoration. A student opening a screen for the
 * first time should be told what it is for and what to do next, in one
 * sentence, in a voice -- which is easier to take than another block of grey
 * help text.
 *
 * Rules that keep him from becoming wallpaper:
 *
 *   - One per screen. He is a guide, not a mascot sprinkled about.
 *   - The line says something the screen does not already say. If the heading
 *     covers it, he stays quiet: callers pass null and nothing renders.
 *   - Where the app knows the student's situation, the line reflects it. A
 *     sentence that changes when your pacing changes is worth reading twice;
 *     the same greeting every morning is not.
 *
 * Deliberately not dismissible. He is one compact row, and a per-screen
 * dismissed flag is state to store, sync and eventually explain. If he starts
 * feeling like noise the fix is fewer, better lines -- not a close button.
 */
export function GuideNote({ children, className = "" }: {
  /** The line. Pass null/false to render nothing at all. */
  children: ReactNode;
  className?: string;
}) {
  if (!children) return null;
  return (
    <aside className={`flex items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-3.5 ${className}`}>
      {/* Decorative: he is named in the text beside him, so announcing the
          image too would just repeat it to a screen reader. object-top frames
          the turban and face rather than cropping to the waistcoat. */}
      <img
        src="/babosa-guide.png"
        alt=""
        aria-hidden="true"
        className="h-12 w-12 shrink-0 rounded-xl bg-white object-cover object-top"
      />
      <p className="text-sm leading-relaxed text-slate-700">
        <strong className="mr-1.5 font-bold text-slate-900">Babo Sa!</strong>
        {children}
      </p>
    </aside>
  );
}
