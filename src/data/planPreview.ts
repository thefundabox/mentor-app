/**
 * The first week of the default 80-day plan, for the homepage preview.
 *
 * GENERATED from supabase/migrations/0013_seed_80_day_plan_balanced.sql -- the
 * same plan students actually adopt, not an illustrative sample. Bundled
 * because the homepage renders signed out and plan_templates needs a session.
 */
export const PLAN_START_LABEL = "5 September 2026";
export const PLAN_END_LABEL = "23 November 2026";

export interface PlanPreviewDay {
  day: number;
  dow: string;
  mode: "learn" | "revise" | "simulate";
  subject: string;
  topics: string[];
}

export const PLAN_PREVIEW: PlanPreviewDay[] = [
  { day: 1, dow: "Sat", mode: "learn", subject: "Rajasthan History & Culture", topics: ["Temples of Rajasthan", "Stepwells, Bawdis & Man-made Waterbodies", "Schools of Painting"] },
  { day: 2, dow: "Sun", mode: "learn", subject: "Rajasthan History & Culture", topics: ["Handicrafts of Rajasthan", "Forts of Rajasthan", "Other Dynasties (Hadas, Bhattis, Yadavas, Varik)"] },
  { day: 3, dow: "Mon", mode: "learn", subject: "Rajasthan History & Culture", topics: ["Folk Deities of Rajasthan", "Saints and Sects of Rajasthan", "Folk Dances of Rajasthan", "Drama & Khayal Traditions"] },
  { day: 4, dow: "Tue", mode: "learn", subject: "Rajasthan History & Culture", topics: ["Classical & Folk Music & Instruments", "Rajasthani Dialects", "Rajasthani Literature & Authors"] },
  { day: 5, dow: "Wed", mode: "revise", subject: "Rajasthan History & Culture", topics: ["Temples of Rajasthan", "Schools of Painting", "Forts of Rajasthan"] },
  { day: 6, dow: "Thu", mode: "learn", subject: "Rajasthan History & Culture", topics: ["Guhilas / Sisodias of Mewar", "Rathores of Marwar / Bikaner", "Chauhans of Shakambhari & Ranthambhor", "Gurjara-Pratiharas"] },
  { day: 7, dow: "Fri", mode: "learn", subject: "Rajasthan History & Culture", topics: ["18th–19th Century Political & Social Conditions", "Peasant Movements in Rajasthan", "Tribal Movements in Rajasthan"] },
];
