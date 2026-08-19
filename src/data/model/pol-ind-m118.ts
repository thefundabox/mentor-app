/**
 * MODEL QUESTIONS — pol-ind-m118 · Fundamental Rights (Part III)
 *
 * PROVENANCE: these are NOT RPSC past questions. They are model questions
 * authored for practice, written in the formats RPSC actually uses and pitched
 * at moderate-to-hard difficulty. `sourceYear` is deliberately absent so they
 * can never be presented as PYQs, and `isModel` marks them in analytics.
 *
 * Format mix mirrors a real RAS paper:
 *   multi-statement + code   ~40%
 *   direct / single-fact     ~25%
 *   assertion-reason         ~15%
 *   match the following      ~12%
 *   chronological / odd-one  ~8%
 */
import type { Question } from "@/types";

const C = "pol-ind-m118";

export const POL_IND_M118_MODEL: Question[] = [
  {
    type: "conceptual", concept: C, questionType: "mcq_applied", difficultyTier: 2,
    q: "Consider the following statements regarding Fundamental Rights:\nA. They are available against the State as well as, in some cases, against private individuals.\nB. All Fundamental Rights are available to citizens and foreigners alike.\nC. They are enforceable through both the Supreme Court and the High Courts.\nWhich of the above are correct?",
    options: ["A and B only", "A and C only", "B and C only", "A, B and C"],
    correct: 1,
    why: "Article 17 (untouchability), 23 (traffic in human beings) and 24 (child labour) operate against private persons too, so A is correct. C is correct — Article 32 (SC) and Article 226 (HC). B is wrong: Articles 15, 16, 19, 29 and 30 are available only to citizens.",
  },
  {
    type: "analytical", concept: C, questionType: "mcq_factual", difficultyTier: 2,
    q: "Which Article of the Constitution was described by Dr. B.R. Ambedkar as 'the very soul of the Constitution and the very heart of it'?",
    options: ["Article 14", "Article 21", "Article 32", "Article 19"],
    correct: 2,
    why: "Ambedkar used this phrase for Article 32 — the right to constitutional remedies — because without it the other rights would be unenforceable.",
  },
  {
    type: "conceptual", concept: C, questionType: "mcq_reasoning", difficultyTier: 3,
    q: "Assertion (A): The right to property is no longer a Fundamental Right.\nReason (R): It was removed from Part III by the 44th Constitutional Amendment Act, 1978 and inserted as Article 300A.",
    options: [
      "Both A and R are true and R is the correct explanation of A",
      "Both A and R are true but R is NOT the correct explanation of A",
      "A is true but R is false",
      "A is false but R is true",
    ],
    correct: 0,
    why: "The 44th Amendment (1978) deleted Article 19(1)(f) and Article 31, making property a constitutional/legal right under Article 300A. R precisely explains A.",
  },
  {
    type: "analytical", concept: C, questionType: "mcq_factual", difficultyTier: 2,
    q: "Under Article 22, a person arrested and detained in custody must be produced before the nearest magistrate within:",
    options: ["12 hours", "24 hours excluding travel time", "48 hours including travel time", "72 hours"],
    correct: 1,
    why: "Article 22(2) requires production within 24 hours of arrest, excluding the time necessary for the journey from the place of arrest to the magistrate's court.",
  },
  {
    type: "conceptual", concept: C, questionType: "mcq_applied", difficultyTier: 3,
    q: "Consider the following statements about Article 21:\nA. It is available to citizens only.\nB. In Maneka Gandhi v. Union of India (1978), the Supreme Court held that the procedure established by law must be fair, just and reasonable.\nC. It cannot be suspended even during a National Emergency.\nWhich of the above are correct?",
    options: ["A and B only", "B and C only", "A and C only", "A, B and C"],
    correct: 1,
    why: "A is wrong — Article 21 protects 'any person', including foreigners. B is the core holding of Maneka Gandhi. C is correct since the 44th Amendment: Articles 20 and 21 cannot be suspended even under Article 359.",
  },
  {
    type: "conceptual", concept: C, questionType: "mcq_applied", difficultyTier: 3,
    q: "Match List-I with List-II and select the correct answer:\nList-I (Writ)\nA. Habeas Corpus\nB. Mandamus\nC. Prohibition\nD. Quo Warranto\nList-II (Purpose)\ni. To command a public authority to perform its duty\nii. To produce a detained person before the court\niii. To question the legality of a person's claim to a public office\niv. To prevent a lower court from exceeding its jurisdiction",
    options: ["A-ii, B-i, C-iv, D-iii", "A-i, B-ii, C-iii, D-iv", "A-ii, B-iv, C-i, D-iii", "A-iii, B-i, C-iv, D-ii"],
    correct: 0,
    why: "Habeas Corpus = 'produce the body'; Mandamus = 'we command' a duty; Prohibition restrains a lower court acting beyond jurisdiction; Quo Warranto = 'by what authority' does one hold public office.",
  },
  {
    type: "analytical", concept: C, questionType: "mcq_factual", difficultyTier: 3,
    q: "The writ of Habeas Corpus can be issued against:",
    options: ["Public authorities only", "Private individuals only", "Both public authorities and private individuals", "Judicial bodies only"],
    correct: 2,
    why: "Habeas Corpus is the one writ that lies against both the State and private persons, since unlawful detention can be effected by either.",
  },
  {
    type: "conceptual", concept: C, questionType: "mcq_applied", difficultyTier: 2,
    q: "Consider the following statements regarding Article 14:\nA. It guarantees equality before law and equal protection of the laws.\nB. 'Equality before law' is of British origin; 'equal protection of the laws' is drawn from the American Constitution.\nC. It permits reasonable classification but forbids class legislation.\nWhich are correct?",
    options: ["A and B only", "A and C only", "B and C only", "A, B and C"],
    correct: 3,
    why: "All three are correct. Article 14 combines the Diceyan rule of law with the American equal-protection clause, and the classification test permits intelligible differentia with a rational nexus.",
  },
  {
    type: "analytical", concept: C, questionType: "mcq_factual", difficultyTier: 2,
    q: "The Right to Education under Article 21A applies to children of which age group?",
    options: ["5 to 14 years", "6 to 14 years", "6 to 16 years", "3 to 14 years"],
    correct: 1,
    why: "Article 21A, inserted by the 86th Amendment (2002), provides free and compulsory education to all children aged 6 to 14 years.",
  },
  {
    type: "conceptual", concept: C, questionType: "mcq_reasoning", difficultyTier: 3,
    q: "Assertion (A): Article 19 rights are suspended automatically the moment a National Emergency is proclaimed.\nReason (R): Article 358 provides for the automatic suspension of Article 19 during a National Emergency.",
    options: [
      "Both A and R are true and R is the correct explanation of A",
      "Both A and R are true but R is NOT the correct explanation of A",
      "A is false but R is broadly true with a qualification",
      "Both A and R are false",
    ],
    correct: 2,
    why: "Since the 44th Amendment, Article 358 suspends Article 19 only when the Emergency is declared on grounds of war or external aggression — not armed rebellion. So the blanket claim in A is false, while R states the general rule without that qualification.",
  },
  {
    type: "analytical", concept: C, questionType: "mcq_factual", difficultyTier: 2,
    q: "Which of the following is NOT one of the six freedoms guaranteed under Article 19(1) as it stands today?",
    options: ["Freedom of speech and expression", "Freedom to acquire, hold and dispose of property", "Freedom to form associations or unions", "Freedom to practise any profession"],
    correct: 1,
    why: "The freedom to acquire, hold and dispose of property — formerly Article 19(1)(f) — was deleted by the 44th Amendment, 1978, leaving six freedoms.",
  },
  {
    type: "conceptual", concept: C, questionType: "mcq_applied", difficultyTier: 3,
    q: "Consider the following statements about Article 20:\nA. It provides protection against ex-post-facto criminal laws.\nB. It bars double jeopardy in both civil and criminal proceedings.\nC. It protects against self-incrimination.\nWhich are correct?",
    options: ["A and C only", "A and B only", "B and C only", "A, B and C"],
    correct: 0,
    why: "A and C are correct. B is wrong — the protection against double jeopardy under Article 20(2) applies only to proceedings before a court or judicial tribunal, i.e. criminal prosecution and punishment, not civil or departmental proceedings.",
  },
  {
    type: "analytical", concept: C, questionType: "mcq_factual", difficultyTier: 3,
    q: "Preventive detention under Article 22 may ordinarily continue beyond three months only on the report of:",
    options: ["The Council of Ministers", "An Advisory Board of persons qualified to be High Court judges", "The Supreme Court", "The Attorney General"],
    correct: 1,
    why: "Article 22(4) requires an Advisory Board — constituted of persons qualified to be appointed as High Court judges — to report sufficient cause before detention exceeds three months.",
  },
  {
    type: "conceptual", concept: C, questionType: "mcq_applied", difficultyTier: 3,
    q: "Consider the following pairs of Article and subject matter:\nA. Article 23 — Prohibition of employment of children in factories\nB. Article 24 — Prohibition of traffic in human beings and forced labour\nC. Article 25 — Freedom of conscience and free profession of religion\nWhich of the pairs is/are correctly matched?",
    options: ["C only", "A and B only", "B and C only", "A, B and C"],
    correct: 0,
    why: "Only C is correct. A and B are interchanged: Article 23 prohibits traffic in human beings and begar; Article 24 bars employment of children below 14 in factories, mines and hazardous work.",
  },
  {
    type: "analytical", concept: C, questionType: "mcq_factual", difficultyTier: 2,
    q: "Cultural and Educational Rights of minorities are guaranteed under which Articles?",
    options: ["Articles 25 and 26", "Articles 29 and 30", "Articles 27 and 28", "Articles 30 and 31"],
    correct: 1,
    why: "Article 29 protects the distinct language, script and culture of any section of citizens; Article 30 gives minorities the right to establish and administer educational institutions.",
  },
  {
    type: "conceptual", concept: C, questionType: "mcq_applied", difficultyTier: 3,
    q: "Consider the following statements on the doctrine of Basic Structure as it affects Fundamental Rights:\nA. It was propounded in Kesavananda Bharati v. State of Kerala (1973).\nB. It holds that Parliament cannot amend Fundamental Rights at all.\nC. Judicial review was later held to be part of the basic structure.\nWhich are correct?",
    options: ["A and B only", "A and C only", "B and C only", "A, B and C"],
    correct: 1,
    why: "A and C are correct. B overstates the doctrine — Parliament may amend Fundamental Rights under Article 368, but not so as to destroy the basic structure.",
  },
  {
    type: "analytical", concept: C, questionType: "mcq_factual", difficultyTier: 3,
    q: "Which case first held that a constitutional amendment abridging Fundamental Rights could itself be struck down, before the Basic Structure doctrine was settled?",
    options: ["Shankari Prasad case (1951)", "Sajjan Singh case (1965)", "Golaknath case (1967)", "Minerva Mills case (1980)"],
    correct: 2,
    why: "In I.C. Golaknath v. State of Punjab (1967) the Supreme Court held Parliament could not abridge Fundamental Rights — a position modified in Kesavananda Bharati (1973).",
  },
  {
    type: "conceptual", concept: C, questionType: "mcq_applied", difficultyTier: 2,
    q: "Consider the following statements about Article 15:\nA. It prohibits discrimination on grounds only of religion, race, caste, sex or place of birth.\nB. It permits special provisions for women and children.\nC. It is available to citizens as well as foreigners.\nWhich are correct?",
    options: ["A and B only", "B and C only", "A and C only", "A, B and C"],
    correct: 0,
    why: "A and B are correct — Article 15(3) expressly saves special provisions for women and children. C is wrong: Article 15 is available to citizens only.",
  },
  {
    type: "analytical", concept: C, questionType: "mcq_factual", difficultyTier: 3,
    q: "The 'Doctrine of Eclipse' applies to:",
    options: [
      "Post-constitutional laws inconsistent with Fundamental Rights",
      "Pre-constitutional laws inconsistent with Fundamental Rights",
      "All laws made by State Legislatures",
      "Constitutional amendments only",
    ],
    correct: 1,
    why: "Under Article 13(1) a pre-constitutional law inconsistent with Part III is not void ab initio but overshadowed — it becomes operative again if the inconsistency is removed.",
  },
  {
    type: "conceptual", concept: C, questionType: "mcq_reasoning", difficultyTier: 3,
    q: "Assertion (A): Article 32 cannot be invoked to enforce a Directive Principle.\nReason (R): Article 32 is a remedy available only for the enforcement of Fundamental Rights conferred by Part III.",
    options: [
      "Both A and R are true and R is the correct explanation of A",
      "Both A and R are true but R is NOT the correct explanation of A",
      "A is true but R is false",
      "A is false but R is true",
    ],
    correct: 0,
    why: "Article 32 is expressly confined to the enforcement of Part III rights; Directive Principles under Part IV are non-justiciable, so R correctly explains A.",
  },
];
