/**
 * RPSC RAS Prelims subject catalog.
 *
 * GENERATED from RAS_Prelims_Master_Taxonomy_v1.1.docx — 11 subjects,
 * 77 themes, 243 microthemes — which is itself anchored on the official RPSC
 * syllabus (PRE.pdf, dated 09-01-2026) and the RAS Prelims papers for
 * 2015, 2016, 2018, 2021, 2023 and 2024.
 *
 * Mapping onto the app's two-level Subject -> Topic shape:
 *   taxonomy Subject    -> Subject
 *   taxonomy Microtheme -> Topic   (the atomic unit questions attach to)
 *   taxonomy Theme      -> Topic.theme, for grouping in the library UI
 *
 * Topic ids are `<subject>-m<n>` where m<n> is the microtheme code, so every
 * topic traces back to a row in the taxonomy document.
 *
 * `difficultyTier` is seeded from the provenance tag: microthemes RPSC has
 * actually asked but which are not literal in the syllabus (P) are treated as
 * harder. `weightagePercent` is deliberately absent — taxonomy v1.1 is the
 * pre-PYQ-tagging phase and carries no frequency data yet. It should be filled
 * in once the PYQ corpus is tagged, not guessed at here.
 */
import type { SubjectCatalogEntry } from "@/types";

/**
 * Static Tailwind classes per subject colour.
 *
 * Do NOT rebuild these as `bg-${color}-50` template strings: Tailwind scans
 * source text, so dynamically assembled class names are purged from the
 * production CSS. That bug was live before this file existed — six of the ten
 * previous subjects rendered with no background at all.
 */
export const SUBJECT_THEME: Record<string, { bg: string; text: string; ring: string }> = {
  amber:   { bg: "bg-amber-50",   text: "text-amber-900",   ring: "ring-amber-200" },
  rose:    { bg: "bg-rose-50",    text: "text-rose-900",    ring: "ring-rose-200" },
  sky:     { bg: "bg-sky-50",     text: "text-sky-900",     ring: "ring-sky-200" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-900", ring: "ring-emerald-200" },
  indigo:  { bg: "bg-indigo-50",  text: "text-indigo-900",  ring: "ring-indigo-200" },
  violet:  { bg: "bg-violet-50",  text: "text-violet-900",  ring: "ring-violet-200" },
  teal:    { bg: "bg-teal-50",    text: "text-teal-900",    ring: "ring-teal-200" },
  lime:    { bg: "bg-lime-50",    text: "text-lime-900",    ring: "ring-lime-200" },
  fuchsia: { bg: "bg-fuchsia-50", text: "text-fuchsia-900", ring: "ring-fuchsia-200" },
  slate:   { bg: "bg-slate-100",  text: "text-slate-900",   ring: "ring-slate-200" },
  orange:  { bg: "bg-orange-50",  text: "text-orange-900",  ring: "ring-orange-200" },
};

export const subjectTheme = (color: string) => SUBJECT_THEME[color] ?? SUBJECT_THEME.slate;

export const RPSC_SUBJECTS: SubjectCatalogEntry[] = [
  {
    id: "raj-hist", name: "Rajasthan History, Art, Culture, Literature, Tradition & Heritage", icon: "🏰", color: "amber",
    rajasthanSpecific: true,
    stage: "prelims",
    topics: [
      // T1 — Pre-history and Sources
      { id: "raj-hist-m1", name: "Pre-historical sites of Rajasthan", theme: "Pre-history and Sources", rajasthanSpecific: true },
      { id: "raj-hist-m2", name: "Society and Culture of Ancient Rajasthan", theme: "Pre-history and Sources", rajasthanSpecific: true },
      { id: "raj-hist-m3", name: "Sources of Rajasthan History", theme: "Pre-history and Sources", rajasthanSpecific: true },
      // T2 — Medieval Dynasties of Rajasthan
      { id: "raj-hist-m4", name: "Gurjara-Pratiharas", theme: "Medieval Dynasties of Rajasthan", rajasthanSpecific: true },
      { id: "raj-hist-m5", name: "Chauhans of Shakambhari & Ranthambhor", theme: "Medieval Dynasties of Rajasthan", rajasthanSpecific: true },
      { id: "raj-hist-m6", name: "Guhilas / Sisodias of Mewar", theme: "Medieval Dynasties of Rajasthan", rajasthanSpecific: true },
      { id: "raj-hist-m7", name: "Rathores of Marwar / Bikaner", theme: "Medieval Dynasties of Rajasthan", rajasthanSpecific: true },
      { id: "raj-hist-m8", name: "Kachhwaha of Amber/Jaipur", theme: "Medieval Dynasties of Rajasthan", rajasthanSpecific: true },
      { id: "raj-hist-m9", name: "Other Dynasties (Hadas, Bhattis, Yadavas, Varik)", theme: "Medieval Dynasties of Rajasthan", rajasthanSpecific: true },
      { id: "raj-hist-m10", name: "Administrative & Revenue System in Medieval Rajasthan", theme: "Medieval Dynasties of Rajasthan", rajasthanSpecific: true },
      // T3 — Modern Rajasthan (18th–20th Century)
      { id: "raj-hist-m11", name: "18th–19th Century Political & Social Conditions", theme: "Modern Rajasthan (18th–20th Century)", rajasthanSpecific: true },
      { id: "raj-hist-m12", name: "Peasant Movements in Rajasthan", theme: "Modern Rajasthan (18th–20th Century)", rajasthanSpecific: true },
      { id: "raj-hist-m13", name: "Tribal Movements in Rajasthan", theme: "Modern Rajasthan (18th–20th Century)", rajasthanSpecific: true },
      { id: "raj-hist-m14", name: "Praja Mandal Movements", theme: "Modern Rajasthan (18th–20th Century)", rajasthanSpecific: true },
      { id: "raj-hist-m15", name: "Revolutionary Activities & Conspiracy Cases", theme: "Modern Rajasthan (18th–20th Century)", rajasthanSpecific: true, difficultyTier: 3 },
      { id: "raj-hist-m16", name: "Pre-Independence Press of Rajasthan", theme: "Modern Rajasthan (18th–20th Century)", rajasthanSpecific: true },
      { id: "raj-hist-m17", name: "Integration of Rajasthan", theme: "Modern Rajasthan (18th–20th Century)", rajasthanSpecific: true },
      // T4 — Architectural Tradition
      { id: "raj-hist-m18", name: "Forts of Rajasthan", theme: "Architectural Tradition", rajasthanSpecific: true },
      { id: "raj-hist-m19", name: "Palaces and Monuments", theme: "Architectural Tradition", rajasthanSpecific: true },
      { id: "raj-hist-m20", name: "Temples of Rajasthan", theme: "Architectural Tradition", rajasthanSpecific: true },
      { id: "raj-hist-m21", name: "Stepwells, Bawdis & Man-made Waterbodies", theme: "Architectural Tradition", rajasthanSpecific: true },
      { id: "raj-hist-m22", name: "Schools of Painting", theme: "Architectural Tradition", rajasthanSpecific: true },
      { id: "raj-hist-m23", name: "Handicrafts of Rajasthan", theme: "Architectural Tradition", rajasthanSpecific: true },
      // T5 — Performing Arts
      { id: "raj-hist-m24", name: "Folk Dances of Rajasthan", theme: "Performing Arts", rajasthanSpecific: true },
      { id: "raj-hist-m25", name: "Drama & Khayal Traditions", theme: "Performing Arts", rajasthanSpecific: true },
      { id: "raj-hist-m26", name: "Classical & Folk Music & Instruments", theme: "Performing Arts", rajasthanSpecific: true },
      // T6 — Language & Literature
      { id: "raj-hist-m27", name: "Rajasthani Dialects", theme: "Language & Literature", rajasthanSpecific: true },
      { id: "raj-hist-m28", name: "Rajasthani Literature & Authors", theme: "Language & Literature", rajasthanSpecific: true },
      { id: "raj-hist-m29", name: "Folk Literature", theme: "Language & Literature", rajasthanSpecific: true },
      // T7 — Religious Life
      { id: "raj-hist-m30", name: "Saints and Sects of Rajasthan", theme: "Religious Life", rajasthanSpecific: true },
      { id: "raj-hist-m31", name: "Folk Deities of Rajasthan", theme: "Religious Life", rajasthanSpecific: true },
      { id: "raj-hist-m32", name: "Religious Communities & Practices", theme: "Religious Life", rajasthanSpecific: true },
      // T8 — Social Life
      { id: "raj-hist-m33", name: "Fairs & Festivals", theme: "Social Life", rajasthanSpecific: true },
      { id: "raj-hist-m34", name: "Social Customs and Traditions", theme: "Social Life", rajasthanSpecific: true },
      { id: "raj-hist-m35", name: "Attires & Ornaments", theme: "Social Life", rajasthanSpecific: true },
      // T9 — Leading Personalities of Rajasthan
      { id: "raj-hist-m36", name: "Pre-Independence Personalities", theme: "Leading Personalities of Rajasthan", rajasthanSpecific: true },
      { id: "raj-hist-m37", name: "Post-Independence Personalities", theme: "Leading Personalities of Rajasthan", rajasthanSpecific: true },
    ],
  },
  {
    id: "ind-hist", name: "Indian History (Ancient, Medieval, Modern)", icon: "📜", color: "rose",
    stage: "prelims",
    topics: [
      // T1 — Ancient — Cultural Foundations & Religion
      { id: "ind-hist-m38", name: "Indus Valley & Vedic Age", theme: "Ancient — Cultural Foundations & Religion" },
      { id: "ind-hist-m39", name: "Heterodox Religions of 6th Century BC", theme: "Ancient — Cultural Foundations & Religion" },
      { id: "ind-hist-m40", name: "Mahajanapadas & Janapadas", theme: "Ancient — Cultural Foundations & Religion" },
      // T2 — Ancient — Major Dynasties
      { id: "ind-hist-m41", name: "Mauryan Empire", theme: "Ancient — Major Dynasties" },
      { id: "ind-hist-m42", name: "Kushan & Satavahana", theme: "Ancient — Major Dynasties" },
      { id: "ind-hist-m43", name: "Gupta Period", theme: "Ancient — Major Dynasties" },
      { id: "ind-hist-m44", name: "Chalukya, Pallava, Chola", theme: "Ancient — Major Dynasties" },
      // T3 — Ancient — Art, Architecture & Knowledge System
      { id: "ind-hist-m45", name: "Ancient Art & Architecture", theme: "Ancient — Art, Architecture & Knowledge System" },
      { id: "ind-hist-m46", name: "Scientific Development in Ancient India", theme: "Ancient — Art, Architecture & Knowledge System" },
      { id: "ind-hist-m47", name: "Indian Knowledge & Value System", theme: "Ancient — Art, Architecture & Knowledge System" },
      // T4 — Medieval — Sultanate & Vijayanagar
      { id: "ind-hist-m48", name: "Delhi Sultanate Dynasties", theme: "Medieval — Sultanate & Vijayanagar" },
      { id: "ind-hist-m49", name: "Vijayanagar Empire", theme: "Medieval — Sultanate & Vijayanagar" },
      // T5 — Medieval — Mughals and Marathas
      { id: "ind-hist-m50", name: "Mughal Administration & Policies", theme: "Medieval — Mughals and Marathas" },
      { id: "ind-hist-m51", name: "Marathas", theme: "Medieval — Mughals and Marathas" },
      // T6 — Medieval — Cultural Developments
      { id: "ind-hist-m52", name: "Medieval Art, Architecture, Painting, Music, Literature", theme: "Medieval — Cultural Developments" },
      { id: "ind-hist-m53", name: "Bhakti Movement", theme: "Medieval — Cultural Developments" },
      { id: "ind-hist-m54", name: "Sufi Movement", theme: "Medieval — Cultural Developments" },
      // T7 — Modern — British Conquest & Resistance
      { id: "ind-hist-m55", name: "Anglo-Maratha, Anglo-Mysore, Anglo-Sikh Wars", theme: "Modern — British Conquest & Resistance" },
      { id: "ind-hist-m56", name: "Revolt of 1857", theme: "Modern — British Conquest & Resistance" },
      { id: "ind-hist-m57", name: "British Policies — Political, Economic, Administrative", theme: "Modern — British Conquest & Resistance" },
      // T8 — Modern — Nationalism & Socio-Religious Reform
      { id: "ind-hist-m58", name: "Emergence of Nationalism", theme: "Modern — Nationalism & Socio-Religious Reform" },
      { id: "ind-hist-m59", name: "Socio-Religious Reform Movements", theme: "Modern — Nationalism & Socio-Religious Reform" },
      // T9 — Modern — Indian National Movement
      { id: "ind-hist-m60", name: "Moderates, Extremists, Surat Split (1907)", theme: "Modern — Indian National Movement" },
      { id: "ind-hist-m61", name: "Swadeshi & Bengal Partition (1905)", theme: "Modern — Indian National Movement" },
      { id: "ind-hist-m62", name: "Home Rule Movement", theme: "Modern — Indian National Movement" },
      { id: "ind-hist-m63", name: "Gandhian Phase: Non-Cooperation, Civil Disobedience, Quit India", theme: "Modern — Indian National Movement" },
      { id: "ind-hist-m64", name: "Revolutionary Movements", theme: "Modern — Indian National Movement" },
      { id: "ind-hist-m65", name: "Constitutional Developments under British Rule", theme: "Modern — Indian National Movement" },
      { id: "ind-hist-m66", name: "Subhas Chandra Bose & INA", theme: "Modern — Indian National Movement" },
      { id: "ind-hist-m67", name: "Towards Partition & Independence", theme: "Modern — Indian National Movement" },
      // T10 — Post-Independence Nation Building (1947–2000)
      { id: "ind-hist-m68", name: "Integration of Princely States", theme: "Post-Independence Nation Building (1947–2000)" },
      { id: "ind-hist-m69", name: "Reorganization of States", theme: "Post-Independence Nation Building (1947–2000)" },
      { id: "ind-hist-m70", name: "Nehruvian Institutional Building", theme: "Post-Independence Nation Building (1947–2000)" },
      { id: "ind-hist-m71", name: "Planning & Economic Reforms (post-1991)", theme: "Post-Independence Nation Building (1947–2000)" },
      { id: "ind-hist-m72", name: "Development of Science & Technology (post-1947)", theme: "Post-Independence Nation Building (1947–2000)" },
    ],
  },
  {
    id: "geo-wi", name: "Geography of World and India", icon: "🌏", color: "sky",
    stage: "prelims",
    topics: [
      // T1 — World — Physical Geography
      { id: "geo-wi-m73", name: "World Mountains, Plateaus, Plains, Deserts", theme: "World — Physical Geography" },
      { id: "geo-wi-m74", name: "World Rivers & Lakes", theme: "World — Physical Geography" },
      { id: "geo-wi-m75", name: "Natural Vegetation Belts", theme: "World — Physical Geography" },
      // T2 — World — Economic Geography
      { id: "geo-wi-m76", name: "World Agriculture", theme: "World — Economic Geography" },
      { id: "geo-wi-m77", name: "Major Industrial Regions of the World", theme: "World — Economic Geography" },
      { id: "geo-wi-m78", name: "World Transport Networks", theme: "World — Economic Geography" },
      // T3 — World — Environmental Issues
      { id: "geo-wi-m79", name: "Desertification & Land Degradation", theme: "World — Environmental Issues" },
      { id: "geo-wi-m80", name: "Deforestation & Forest Loss", theme: "World — Environmental Issues" },
      { id: "geo-wi-m81", name: "Climate Change & Global Warming", theme: "World — Environmental Issues" },
      { id: "geo-wi-m82", name: "Ozone Layer Depletion", theme: "World — Environmental Issues" },
      // T4 — India — Physiography
      { id: "geo-wi-m83", name: "Physiographic Divisions of India", theme: "India — Physiography" },
      { id: "geo-wi-m84", name: "Indian Drainage System", theme: "India — Physiography" },
      { id: "geo-wi-m85", name: "Indian Lakes", theme: "India — Physiography" },
      // T5 — India — Climate
      { id: "geo-wi-m86", name: "Indian Monsoon System", theme: "India — Climate" },
      { id: "geo-wi-m87", name: "Climate Regions of India", theme: "India — Climate" },
      // T6 — India — Agriculture & Irrigation
      { id: "geo-wi-m88", name: "Irrigation in India", theme: "India — Agriculture & Irrigation" },
      { id: "geo-wi-m89", name: "Indian Crops & Cropping Patterns", theme: "India — Agriculture & Irrigation" },
      // T7 — India — Minerals, Industry, Infrastructure
      { id: "geo-wi-m90", name: "Indian Metallic Minerals", theme: "India — Minerals, Industry, Infrastructure" },
      { id: "geo-wi-m91", name: "Indian Non-Metallic Minerals", theme: "India — Minerals, Industry, Infrastructure" },
      { id: "geo-wi-m92", name: "Indian Industrial Regions", theme: "India — Minerals, Industry, Infrastructure" },
      { id: "geo-wi-m93", name: "Indian Transport Networks (Highway/Rail)", theme: "India — Minerals, Industry, Infrastructure" },
      { id: "geo-wi-m94", name: "Nuclear Power Plants", theme: "India — Minerals, Industry, Infrastructure", difficultyTier: 3 },
    ],
  },
  {
    id: "geo-raj", name: "Geography of Rajasthan", icon: "🏜️", color: "emerald",
    rajasthanSpecific: true,
    stage: "prelims",
    topics: [
      // T1 — Location, Extent & Physiography
      { id: "geo-raj-m95", name: "Location & Extent of Rajasthan", theme: "Location, Extent & Physiography", rajasthanSpecific: true },
      { id: "geo-raj-m96", name: "Physiographic Divisions of Rajasthan", theme: "Location, Extent & Physiography", rajasthanSpecific: true },
      // T2 — Rivers and Lakes
      { id: "geo-raj-m97", name: "Rivers of Rajasthan", theme: "Rivers and Lakes", rajasthanSpecific: true },
      { id: "geo-raj-m98", name: "Lakes of Rajasthan", theme: "Rivers and Lakes", rajasthanSpecific: true },
      { id: "geo-raj-m99", name: "Multipurpose River Projects", theme: "Rivers and Lakes", rajasthanSpecific: true },
      // T3 — Climate
      { id: "geo-raj-m100", name: "Climatic Characteristics of Rajasthan", theme: "Climate", rajasthanSpecific: true },
      // T4 — Vegetation, Biodiversity & Conservation
      { id: "geo-raj-m101", name: "Forest Cover & Vegetation", theme: "Vegetation, Biodiversity & Conservation", rajasthanSpecific: true },
      { id: "geo-raj-m102", name: "National Parks, Wildlife Sanctuaries & Conservation Reserves", theme: "Vegetation, Biodiversity & Conservation", rajasthanSpecific: true },
      { id: "geo-raj-m103", name: "Tiger Reserves of Rajasthan", theme: "Vegetation, Biodiversity & Conservation", rajasthanSpecific: true },
      // T5 — Soils & Agriculture
      { id: "geo-raj-m104", name: "Soils of Rajasthan", theme: "Soils & Agriculture", rajasthanSpecific: true },
      { id: "geo-raj-m105", name: "Agriculture of Rajasthan", theme: "Soils & Agriculture", rajasthanSpecific: true },
      { id: "geo-raj-m106", name: "Livestock of Rajasthan", theme: "Soils & Agriculture", rajasthanSpecific: true },
      // T6 — Irrigation & Water Resources
      { id: "geo-raj-m107", name: "Irrigation Systems of Rajasthan", theme: "Irrigation & Water Resources", rajasthanSpecific: true },
      // T7 — Demography & Society
      { id: "geo-raj-m108", name: "Population — Growth, Density, Literacy, Sex-Ratio", theme: "Demography & Society", rajasthanSpecific: true },
      { id: "geo-raj-m109", name: "Urbanization in Rajasthan", theme: "Demography & Society", rajasthanSpecific: true },
      { id: "geo-raj-m110", name: "Tribes of Rajasthan", theme: "Demography & Society", rajasthanSpecific: true },
      // T8 — Minerals & Industry
      { id: "geo-raj-m111", name: "Metallic Minerals of Rajasthan", theme: "Minerals & Industry", rajasthanSpecific: true },
      { id: "geo-raj-m112", name: "Non-Metallic Minerals of Rajasthan", theme: "Minerals & Industry", rajasthanSpecific: true },
      { id: "geo-raj-m113", name: "Industries & Industrial Parks of Rajasthan", theme: "Minerals & Industry", rajasthanSpecific: true },
      // T9 — Tourism
      { id: "geo-raj-m114", name: "Tourism Circuits of Rajasthan", theme: "Tourism", rajasthanSpecific: true },
    ],
  },
  {
    id: "pol-ind", name: "Indian Constitution, Political System & Governance", icon: "⚖️", color: "indigo",
    stage: "prelims",
    topics: [
      // T1 — Constitutional Framework
      { id: "pol-ind-m115", name: "Framing of the Constitution & Constituent Assembly", theme: "Constitutional Framework" },
      { id: "pol-ind-m116", name: "Preamble", theme: "Constitutional Framework" },
      { id: "pol-ind-m117", name: "Citizenship", theme: "Constitutional Framework" },
      // T2 — Rights, Duties & Directive Principles
      { id: "pol-ind-m118", name: "Fundamental Rights (Part III)", theme: "Rights, Duties & Directive Principles" },
      { id: "pol-ind-m119", name: "Directive Principles of State Policy", theme: "Rights, Duties & Directive Principles" },
      { id: "pol-ind-m120", name: "Fundamental Duties", theme: "Rights, Duties & Directive Principles" },
      // T3 — Union Executive
      { id: "pol-ind-m121", name: "President of India", theme: "Union Executive" },
      { id: "pol-ind-m122", name: "Vice President", theme: "Union Executive" },
      { id: "pol-ind-m123", name: "Prime Minister & Council of Ministers", theme: "Union Executive" },
      { id: "pol-ind-m124", name: "Attorney General of India", theme: "Union Executive" },
      // T4 — Union Legislature
      { id: "pol-ind-m125", name: "Parliament — Houses, Composition, Sessions", theme: "Union Legislature" },
      { id: "pol-ind-m126", name: "Parliamentary Procedures & Bills", theme: "Union Legislature" },
      { id: "pol-ind-m127", name: "Parliamentary Committees", theme: "Union Legislature" },
      { id: "pol-ind-m128", name: "Budget & Financial Procedures", theme: "Union Legislature" },
      // T5 — Judiciary
      { id: "pol-ind-m129", name: "Supreme Court of India", theme: "Judiciary" },
      { id: "pol-ind-m130", name: "High Courts & Subordinate Judiciary", theme: "Judiciary" },
      { id: "pol-ind-m131", name: "Tribunals & ADR", theme: "Judiciary" },
      // T6 — Federalism
      { id: "pol-ind-m132", name: "Union–State Legislative Relations", theme: "Federalism" },
      { id: "pol-ind-m133", name: "Union–State Administrative & Financial Relations", theme: "Federalism" },
      { id: "pol-ind-m134", name: "Emergency Provisions", theme: "Federalism" },
      // T7 — Local Government
      { id: "pol-ind-m135", name: "Panchayati Raj Institutions (73rd Amendment)", theme: "Local Government" },
      { id: "pol-ind-m136", name: "Urban Local Bodies (74th Amendment)", theme: "Local Government" },
      // T8 — Constitutional & Statutory Bodies (Centre)
      { id: "pol-ind-m137", name: "Election Commission of India", theme: "Constitutional & Statutory Bodies (Centre)" },
      { id: "pol-ind-m138", name: "Union Public Service Commission", theme: "Constitutional & Statutory Bodies (Centre)" },
      { id: "pol-ind-m139", name: "Human Rights Bodies — NHRC, NCW, NCPCR", theme: "Constitutional & Statutory Bodies (Centre)" },
      { id: "pol-ind-m140", name: "NITI Aayog", theme: "Constitutional & Statutory Bodies (Centre)" },
      // T9 — Public Policy & Governance Mechanisms
      { id: "pol-ind-m141", name: "Public Policy & Citizen Charter", theme: "Public Policy & Governance Mechanisms" },
      { id: "pol-ind-m142", name: "Social Audit & Grievance Redressal", theme: "Public Policy & Governance Mechanisms" },
      // T10 — Anti-Corruption & Transparency Bodies
      { id: "pol-ind-m143", name: "Lokpal & Lokayukta", theme: "Anti-Corruption & Transparency Bodies" },
      { id: "pol-ind-m144", name: "Central Vigilance Commission", theme: "Anti-Corruption & Transparency Bodies" },
      { id: "pol-ind-m145", name: "Central Information Commission", theme: "Anti-Corruption & Transparency Bodies" },
    ],
  },
  {
    id: "pol-raj", name: "Political and Administrative System of Rajasthan", icon: "🏛️", color: "violet",
    rajasthanSpecific: true,
    stage: "prelims",
    topics: [
      // T1 — Rajasthan State Executive & Legislature
      { id: "pol-raj-m146", name: "Governor of Rajasthan", theme: "Rajasthan State Executive & Legislature", rajasthanSpecific: true },
      { id: "pol-raj-m147", name: "CM & Council of Ministers", theme: "Rajasthan State Executive & Legislature", rajasthanSpecific: true },
      { id: "pol-raj-m148", name: "Rajasthan Legislative Assembly (Vidhan Sabha)", theme: "Rajasthan State Executive & Legislature", rajasthanSpecific: true },
      { id: "pol-raj-m149", name: "Advocate General of Rajasthan", theme: "Rajasthan State Executive & Legislature", rajasthanSpecific: true },
      // T2 — Rajasthan Judiciary
      { id: "pol-raj-m150", name: "Rajasthan High Court", theme: "Rajasthan Judiciary", rajasthanSpecific: true },
      { id: "pol-raj-m151", name: "Subordinate Courts & Other Judicial Bodies", theme: "Rajasthan Judiciary", rajasthanSpecific: true },
      // T3 — Secretariat & District Administration
      { id: "pol-raj-m152", name: "Chief Secretary & State Secretariat", theme: "Secretariat & District Administration", rajasthanSpecific: true },
      { id: "pol-raj-m153", name: "Directorates & Departmental Hierarchy", theme: "Secretariat & District Administration", rajasthanSpecific: true },
      { id: "pol-raj-m154", name: "Divisional Commissioner", theme: "Secretariat & District Administration", rajasthanSpecific: true },
      { id: "pol-raj-m155", name: "District Collector / District Magistrate", theme: "Secretariat & District Administration", rajasthanSpecific: true },
      { id: "pol-raj-m156", name: "Superintendent of Police", theme: "Secretariat & District Administration", rajasthanSpecific: true },
      { id: "pol-raj-m157", name: "Sub-Divisional Officer & Tehsildar", theme: "Secretariat & District Administration", rajasthanSpecific: true },
      // T4 — Rajasthan Constitutional / Statutory Bodies
      { id: "pol-raj-m158", name: "Rajasthan Public Service Commission", theme: "Rajasthan Constitutional / Statutory Bodies", rajasthanSpecific: true },
      { id: "pol-raj-m159", name: "Rajasthan State Election Commission", theme: "Rajasthan Constitutional / Statutory Bodies", rajasthanSpecific: true },
      { id: "pol-raj-m160", name: "Rajasthan Information Commission", theme: "Rajasthan Constitutional / Statutory Bodies", rajasthanSpecific: true },
      { id: "pol-raj-m161", name: "Rajasthan State Women Commission", theme: "Rajasthan Constitutional / Statutory Bodies", rajasthanSpecific: true },
      { id: "pol-raj-m162", name: "Board of Revenue, Rajasthan", theme: "Rajasthan Constitutional / Statutory Bodies", rajasthanSpecific: true },
      { id: "pol-raj-m163", name: "Lokayukta of Rajasthan", theme: "Rajasthan Constitutional / Statutory Bodies", rajasthanSpecific: true },
      // T5 — Local Government in Rajasthan
      { id: "pol-raj-m164", name: "Panchayati Raj in Rajasthan", theme: "Local Government in Rajasthan", rajasthanSpecific: true },
      { id: "pol-raj-m165", name: "Municipalities of Rajasthan", theme: "Local Government in Rajasthan", rajasthanSpecific: true },
    ],
  },
  {
    id: "eco-ind", name: "Economic Concepts and Indian Economy", icon: "💹", color: "teal",
    stage: "prelims",
    topics: [
      // T1 — Economic Concepts & Measurement
      { id: "eco-ind-m166", name: "Economic Growth vs Development", theme: "Economic Concepts & Measurement" },
      { id: "eco-ind-m167", name: "Sustainable Development", theme: "Economic Concepts & Measurement" },
      { id: "eco-ind-m168", name: "Measurement of Development & Indices", theme: "Economic Concepts & Measurement" },
      // T2 — Monetary & Fiscal Policy
      { id: "eco-ind-m169", name: "Monetary Policy & RBI Functions", theme: "Monetary & Fiscal Policy" },
      { id: "eco-ind-m170", name: "Fiscal Policy & Budget", theme: "Monetary & Fiscal Policy" },
      { id: "eco-ind-m171", name: "Resource Mobilization & Taxation", theme: "Monetary & Fiscal Policy" },
      // T3 — Fiscal Federalism
      { id: "eco-ind-m172", name: "Centre–State Financial Relations", theme: "Fiscal Federalism" },
      { id: "eco-ind-m173", name: "Finance Commission", theme: "Fiscal Federalism" },
      // T4 — Agriculture & Rural Economy
      { id: "eco-ind-m174", name: "Agricultural Development — Institutional & Technological", theme: "Agriculture & Rural Economy" },
      { id: "eco-ind-m175", name: "Reforms in Indian Agriculture", theme: "Agriculture & Rural Economy" },
      { id: "eco-ind-m176", name: "Agricultural Schemes & Initiatives", theme: "Agriculture & Rural Economy" },
      // T5 — Industry & Reforms
      { id: "eco-ind-m177", name: "Industrial Growth, Pattern & Policy", theme: "Industry & Reforms" },
      { id: "eco-ind-m178", name: "LPG Reforms (1991)", theme: "Industry & Reforms" },
      // T6 — Services, Infrastructure, Skill
      { id: "eco-ind-m179", name: "Services Sector", theme: "Services, Infrastructure, Skill" },
      { id: "eco-ind-m180", name: "Energy", theme: "Services, Infrastructure, Skill" },
      { id: "eco-ind-m181", name: "Transportation & Communication", theme: "Services, Infrastructure, Skill" },
      { id: "eco-ind-m182", name: "Skill Development & Employment", theme: "Services, Infrastructure, Skill" },
      { id: "eco-ind-m183", name: "Social Justice & Empowerment", theme: "Services, Infrastructure, Skill" },
    ],
  },
  {
    id: "eco-raj", name: "Economy of Rajasthan", icon: "🪙", color: "lime",
    rajasthanSpecific: true,
    stage: "prelims",
    topics: [
      // T1 — Macro & Fiscal Position
      { id: "eco-raj-m184", name: "Rajasthan Macroeconomy & State Budget", theme: "Macro & Fiscal Position", rajasthanSpecific: true },
      // T2 — Sectoral Position
      { id: "eco-raj-m185", name: "Agriculture Sector — Rajasthan", theme: "Sectoral Position", rajasthanSpecific: true },
      { id: "eco-raj-m186", name: "Industry Sector — Rajasthan", theme: "Sectoral Position", rajasthanSpecific: true },
      { id: "eco-raj-m187", name: "Services Sector — Rajasthan", theme: "Sectoral Position", rajasthanSpecific: true },
      // T3 — Infrastructure Development
      { id: "eco-raj-m188", name: "Energy Infrastructure", theme: "Infrastructure Development", rajasthanSpecific: true },
      { id: "eco-raj-m189", name: "Transportation Infrastructure (Rajasthan)", theme: "Infrastructure Development", rajasthanSpecific: true },
      { id: "eco-raj-m190", name: "Communication Infrastructure (Rajasthan)", theme: "Infrastructure Development", rajasthanSpecific: true },
      // T4 — Rural Development & Local Finance
      { id: "eco-raj-m191", name: "Rural Development & Panchayati Raj (Economy)", theme: "Rural Development & Local Finance", rajasthanSpecific: true },
      { id: "eco-raj-m192", name: "Rajasthan State Finance Commission", theme: "Rural Development & Local Finance", rajasthanSpecific: true },
      // T5 — Social Services & Welfare
      { id: "eco-raj-m193", name: "Education & Health Services (Rajasthan)", theme: "Social Services & Welfare", rajasthanSpecific: true },
      { id: "eco-raj-m194", name: "Major Welfare Schemes of Rajasthan", theme: "Social Services & Welfare", rajasthanSpecific: true },
    ],
  },
  {
    id: "sci-tech", name: "Science & Technology", icon: "🧪", color: "fuchsia",
    stage: "prelims",
    topics: [
      // T1 — Foundational Science
      { id: "sci-tech-m195", name: "Basics of Everyday Science (Physics)", theme: "Foundational Science" },
      { id: "sci-tech-m196", name: "Basics of Everyday Science (Chemistry)", theme: "Foundational Science" },
      { id: "sci-tech-m197", name: "Basics of Everyday Science (Biology)", theme: "Foundational Science" },
      // T2 — ICT & Emerging Tech
      { id: "sci-tech-m198", name: "Computers & Hardware/Software Basics", theme: "ICT & Emerging Tech" },
      { id: "sci-tech-m199", name: "Internet, Cybersecurity & Emerging ICT", theme: "ICT & Emerging Tech" },
      // T3 — Defence & Space
      { id: "sci-tech-m200", name: "Indian Defence Technology", theme: "Defence & Space" },
      { id: "sci-tech-m201", name: "Indian Space Technology", theme: "Defence & Space" },
      // T4 — Bio-Sciences & Health
      { id: "sci-tech-m202", name: "Genetics, Inheritance & Variation", theme: "Bio-Sciences & Health" },
      { id: "sci-tech-m203", name: "Genetic Engineering & Biotechnology", theme: "Bio-Sciences & Health" },
      { id: "sci-tech-m204", name: "Nanotechnology", theme: "Bio-Sciences & Health" },
      { id: "sci-tech-m205", name: "Human Health Care, Food & Nutrition", theme: "Bio-Sciences & Health" },
      { id: "sci-tech-m206", name: "Diseases & Public Health Programmes", theme: "Bio-Sciences & Health" },
      // T5 — Environment, Ecology & Biodiversity (S&T overlap)
      { id: "sci-tech-m207", name: "Environmental & Ecological Changes & Impact Assessment", theme: "Environment, Ecology & Biodiversity (S&T overlap)" },
      { id: "sci-tech-m208", name: "Biodiversity & Conservation", theme: "Environment, Ecology & Biodiversity (S&T overlap)" },
      { id: "sci-tech-m209", name: "Sustainable Development (Resource lens)", theme: "Environment, Ecology & Biodiversity (S&T overlap)" },
      // T6 — Agri-Tech with Rajasthan focus
      { id: "sci-tech-m210", name: "Agriculture, Horticulture, Forestry, Animal Husbandry — Rajasthan", theme: "Agri-Tech with Rajasthan focus" },
      // T7 — Government S&T Policy
      { id: "sci-tech-m211", name: "Key Govt S&T Programs & Policies (India + Rajasthan)", theme: "Government S&T Policy" },
      // T8 — Recent Advancements & Indian Contribution
      { id: "sci-tech-m212", name: "Recent Scientific & Technological Advancements", theme: "Recent Advancements & Indian Contribution" },
      { id: "sci-tech-m213", name: "Contribution of Indians in S&T", theme: "Recent Advancements & Indian Contribution" },
      { id: "sci-tech-m214", name: "Indigenization of S&T", theme: "Recent Advancements & Indian Contribution" },
    ],
  },
  {
    id: "reason", name: "Reasoning & Mental Ability", icon: "🧠", color: "slate",
    stage: "prelims",
    topics: [
      // T1 — Logical Reasoning
      { id: "reason-m215", name: "Statement & Assumptions", theme: "Logical Reasoning" },
      { id: "reason-m216", name: "Statement & Argument", theme: "Logical Reasoning" },
      { id: "reason-m217", name: "Statements & Conclusion", theme: "Logical Reasoning" },
      { id: "reason-m218", name: "Statement & Courses of Action", theme: "Logical Reasoning" },
      { id: "reason-m219", name: "Analytical / Critical Reasoning", theme: "Logical Reasoning" },
      // T2 — Mental Ability
      { id: "reason-m220", name: "Number/Letter Sequences", theme: "Mental Ability" },
      { id: "reason-m221", name: "Coding/Decoding", theme: "Mental Ability" },
      { id: "reason-m222", name: "Blood Relations", theme: "Mental Ability" },
      { id: "reason-m223", name: "Direction Sense", theme: "Mental Ability" },
      { id: "reason-m224", name: "Logical Venn Diagrams", theme: "Mental Ability" },
      { id: "reason-m225", name: "Ranking & Sitting Arrangement", theme: "Mental Ability" },
      { id: "reason-m226", name: "Shapes & Sub-sections", theme: "Mental Ability" },
      // T3 — Basic Numeracy
      { id: "reason-m227", name: "Ratio, Proportion, Partnership, Profit-Loss", theme: "Basic Numeracy" },
      { id: "reason-m228", name: "Percentage", theme: "Basic Numeracy" },
      { id: "reason-m229", name: "Simple & Compound Interest", theme: "Basic Numeracy" },
      { id: "reason-m230", name: "Mensuration — Perimeter & Area of Plane Figures", theme: "Basic Numeracy" },
      { id: "reason-m231", name: "Data Interpretation (Tables, Bar/Line/Pie)", theme: "Basic Numeracy" },
      { id: "reason-m232", name: "Measures of Central Tendency", theme: "Basic Numeracy" },
      { id: "reason-m233", name: "Permutation & Combination", theme: "Basic Numeracy" },
      { id: "reason-m234", name: "Probability (Simple)", theme: "Basic Numeracy" },
    ],
  },
  {
    id: "current-affairs", name: "Current Affairs & Issues (with special reference to Rajasthan)", icon: "🗞️", color: "orange",
    stage: "prelims",
    topics: [
      // T1 — Personalities, Places, Issues
      { id: "current-affairs-m235", name: "Important Personalities (India + Rajasthan)", theme: "Personalities, Places, Issues" },
      { id: "current-affairs-m236", name: "Places in News", theme: "Personalities, Places, Issues" },
      { id: "current-affairs-m237", name: "Contemporary Issues", theme: "Personalities, Places, Issues" },
      // T2 — Schemes & Programs
      { id: "current-affairs-m238", name: "Newly Launched Schemes (Centre + Rajasthan)", theme: "Schemes & Programs" },
      // T3 — Economy / Polity Developments
      { id: "current-affairs-m239", name: "Major Economic Developments", theme: "Economy / Polity Developments" },
      { id: "current-affairs-m240", name: "Major Political Developments", theme: "Economy / Polity Developments" },
      // T4 — Sports, Awards, Publications
      { id: "current-affairs-m241", name: "Sports & Games", theme: "Sports, Awards, Publications" },
      { id: "current-affairs-m242", name: "Awards, Publications, Authors", theme: "Sports, Awards, Publications" },
      // T5 — Statutory Current-Affairs Items
      { id: "current-affairs-m243", name: "Rajasthan Public Examination (Measures for Prevention of Unfair Means in Recruitment) Act, 2022", theme: "Statutory Current-Affairs Items" },
    ],
  },
];

/** 243 microthemes across 11 subjects. */
export const TOPIC_COUNT = 243;


/**
 * Old topic id -> new microtheme id.
 *
 * The previous catalog (10 invented subjects, 63 topics) is referenced by
 * seeded charts, plan templates, the PYQ bank — and, more importantly, by any
 * chart a real user has already saved to localStorage. Resolving through this
 * map in findTopic() keeps those working instead of rendering "unscheduled".
 *
 * Where the old topic was broader than any single microtheme, it maps to the
 * closest one rather than being dropped.
 */
export const LEGACY_TOPIC_ALIASES: Record<string, string> = {
  // Rajasthan history / art & culture
  "mauryan-raj": "raj-hist-m2",
  "pratiharas": "raj-hist-m4",
  "chauhans": "raj-hist-m5",
  "mewar": "raj-hist-m6",
  "marwar": "raj-hist-m7",
  "amber-jaipur": "raj-hist-m8",
  "1857-raj": "raj-hist-m11",
  "integration-raj": "raj-hist-m17",
  "architecture": "raj-hist-m18",
  "miniature-paintings": "raj-hist-m22",
  "handicrafts": "raj-hist-m23",
  "folk-dances": "raj-hist-m24",
  "folk-music": "raj-hist-m26",
  "festivals-fairs": "raj-hist-m33",

  // Indian history
  "british-rise": "ind-hist-m55",
  "revolt-1857": "ind-hist-m56",
  "moderates": "ind-hist-m60",
  "gandhi-era": "ind-hist-m63",
  "partition": "ind-hist-m67",

  // Geography — world & India
  "physiography": "geo-wi-m83",
  "river-systems": "geo-wi-m84",
  "monsoon": "geo-wi-m86",
  "climate-india": "geo-wi-m87",
  "minerals-india": "geo-wi-m90",
  "climate-change": "geo-wi-m81",

  // Geography — Rajasthan
  "phys-div": "geo-raj-m96",
  "rivers": "geo-raj-m97",
  "climate": "geo-raj-m100",
  "wildlife": "geo-raj-m102",
  "soils": "geo-raj-m104",
  "agriculture-raj": "geo-raj-m105",
  "minerals": "geo-raj-m111",

  // Polity
  "constituent": "pol-ind-m115",
  "preamble": "pol-ind-m116",
  "fund-rights": "pol-ind-m118",
  "dpsp": "pol-ind-m119",
  "exec": "pol-ind-m121",
  "parliament": "pol-ind-m125",
  "budget": "pol-ind-m128",
  "judiciary": "pol-ind-m129",
  "federalism": "pol-ind-m132",
  "panchayati-raj": "pol-ind-m135",
  "planning": "pol-ind-m140",

  // Economy
  "national-income": "eco-ind-m168",
  "banking": "eco-ind-m169",
  "fiscal-policy": "eco-ind-m170",
  "external-sector": "eco-ind-m178",
  "energy": "eco-ind-m180",
  "poverty-employment": "eco-ind-m182",

  // Science & tech / environment
  "it-cyber": "sci-tech-m199",
  "defense-tech": "sci-tech-m200",
  "space": "sci-tech-m201",
  "biotech": "sci-tech-m203",
  "pollution": "sci-tech-m207",
  "ecosystems": "sci-tech-m207",
  "environmental-laws": "sci-tech-m207",
  "biodiversity": "sci-tech-m208",

  // Current affairs
  "ca-international": "current-affairs-m237",
  "ca-summits": "current-affairs-m237",
  "ca-national": "current-affairs-m240",
  "ca-economy": "current-affairs-m239",
  "ca-sports": "current-affairs-m241",
  "ca-reports": "current-affairs-m242",
};

/** Resolve a possibly-legacy topic id to its current id. */
export const resolveTopicId = (id: string) => LEGACY_TOPIC_ALIASES[id] ?? id;
