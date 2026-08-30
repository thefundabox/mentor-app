/**
 * The priority model, and where the marks actually fall.
 *
 * GENERATED from two sources the institute maintains by hand:
 *   - RAS_Prelims_PYQ_Microtheme_Database-v2.xlsx, sheet "Taxonomy & Priority
 *     Matrix" -- 192 microthemes, each scored 1-5 on seven axes which
 *     combine into a Composite and a Priority Tier (P1 >= 3.85, P2 >= 3.35,
 *     P3 >= 2.85, P4 below).
 *   - rpsc_prelims_900_pyq_database.json -- 900 questions, 6 full papers,
 *     each tagged to exactly one microtheme.
 *
 * Baked into the bundle rather than queried: the homepage is shown to
 * signed-out visitors and the questions table needs an authenticated session.
 *
 * NOTE the subject split below is measured from the 900-question corpus, which
 * is the full six papers. It is deliberately NOT the same number as PYQ_TOTAL
 * in pyqStats.ts (806), which counts what is loaded into the practice bank.
 * One is the analysis corpus, the other is what a student can attempt today.
 */

/** One axis of the composite score. Each microtheme is rated 1-5 on all seven. */
export interface PriorityAxis {
  letter: string;
  name: string;
  blurb: string;
  /** Mean rating among P1 microthemes. */
  p1: number;
  /** Mean rating among P3 microthemes -- the bulk of the taxonomy. */
  p3: number;
}

export const PRIORITY_AXES: PriorityAxis[] = [
  { letter: "F", name: "Frequency", blurb: "How often the microtheme has surfaced across the decoded papers.", p1: 4.30, p3: 2.06 },
  { letter: "D", name: "Depth", blurb: "How far past a definition a question tends to go.", p1: 3.76, p3: 2.05 },
  { letter: "L", name: "Lag", blurb: "How long since it was last asked \u2014 the overdue signal.", p1: 4.15, p3: 1.99 },
  { letter: "V", name: "Volatility", blurb: "How fast the correct answer goes stale (lists, ranks, schemes).", p1: 1.76, p3: 1.97 },
  { letter: "T", name: "Traps", blurb: "Density of near-miss options: pairings, match-the-column.", p1: 4.45, p3: 2.06 },
  { letter: "E", name: "Examiner bias", blurb: "The setter’s standing preference for this ground.", p1: 4.91, p3: 2.04 },
  { letter: "C", name: "Complexity", blurb: "Reasoning load once the recall is done.", p1: 3.70, p3: 3.05 },
]

/** Papers decoded for the priority model. */
export const MODEL_PAPERS = 6;
/** Questions in the analysis corpus (6 papers x 150). */
export const MODEL_QUESTIONS = 900;
/** Microthemes carrying a composite score. */
export const MODEL_MICROTHEMES = 192;

/** Where the questions actually fall, measured across all six papers. */
export const SUBJECT_SHARE: { code: string; name: string; questions: number; share: number; perPaper: number }[] = [
  { code: "REASON", name: "Reasoning & Mental Ability", questions: 181, share: 20.1, perPaper: 30.2 },
  { code: "S&T", name: "Science & Technology", questions: 138, share: 15.3, perPaper: 23.0 },
  { code: "RAJ-HIST", name: "Rajasthan History & Culture", questions: 109, share: 12.1, perPaper: 18.2 },
  { code: "GEO-RAJ", name: "Geography of Rajasthan", questions: 90, share: 10.0, perPaper: 15.0 },
  { code: "POL-IND", name: "Indian Polity", questions: 87, share: 9.7, perPaper: 14.5 },
  { code: "IND-HIST", name: "Indian History", questions: 65, share: 7.2, perPaper: 10.8 },
  { code: "GEO-WI", name: "Geography of World & India", questions: 64, share: 7.1, perPaper: 10.7 },
  { code: "CA", name: "Current Affairs", questions: 55, share: 6.1, perPaper: 9.2 },
  { code: "POL-RAJ", name: "Rajasthan Polity & Administration", questions: 44, share: 4.9, perPaper: 7.3 },
  { code: "ECO-IND", name: "Indian Economy", questions: 41, share: 4.6, perPaper: 6.8 },
  { code: "ECO-RAJ", name: "Economy of Rajasthan", questions: 26, share: 2.9, perPaper: 4.3 },
]
