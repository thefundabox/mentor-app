import type { Subject, Question, PYQ, MainsPrompt, User, StudentData, DaySlot } from "@/types";

export const SUBJECTS: Subject[] = [
  {
    id: "raj-history",
    name: "Rajasthan History",
    icon: "🏰",
    color: "amber",
    topics: [
      { id: "mauryan-raj", name: "Mauryan Rajasthan" },
      { id: "pratiharas", name: "Gurjara-Pratiharas" },
      { id: "chauhans", name: "Chauhans of Ajmer" },
      { id: "mewar", name: "Mewar — Sisodias" },
      { id: "1857-raj", name: "1857 Revolt in Rajasthan" },
    ],
  },
  {
    id: "polity",
    name: "Indian Polity",
    icon: "⚖️",
    color: "indigo",
    topics: [
      { id: "preamble", name: "Preamble & Basic Structure" },
      { id: "fund-rights", name: "Fundamental Rights" },
      { id: "dpsp", name: "DPSP & Fundamental Duties" },
      { id: "exec", name: "President & Prime Minister" },
      { id: "parliament", name: "Parliament" },
    ],
  },
  {
    id: "raj-geo",
    name: "Geography of Rajasthan",
    icon: "🏜️",
    color: "emerald",
    topics: [
      { id: "phys-div", name: "Physical Divisions" },
      { id: "rivers", name: "Rivers & Drainage" },
      { id: "climate", name: "Climate" },
      { id: "soils", name: "Soils" },
      { id: "minerals", name: "Minerals" },
    ],
  },
];

export const MEWAR_NOTES = `
# Mewar — The Sisodia Dynasty

## Origins
The Sisodias trace their lineage to the Guhilot clan of Rajputs, who ruled Mewar from Nagda and later Chittor. **Bappa Rawal** (c. 8th century) is the traditional founder; the dynasty crystallised after Rana Hammir restored Mewar in the 14th century following Alauddin Khalji's sack of Chittor in 1303.

## Rana Kumbha (r. 1433–1468)
A polymath ruler — soldier, builder, scholar of music (author of *Sangeetraj*) and architecture. Built or fortified **32 of the 84 forts** ascribed to Mewar, including:
- **Kumbhalgarh** — the second-longest continuous wall in the world, designed by Mandan
- **Vijay Stambh** at Chittor (1448) to commemorate victory over Mahmud Khalji of Malwa

Kumbha defeated the combined forces of Malwa and Gujarat and extended Mewar's writ across much of present-day Rajasthan.

## Rana Sanga (r. 1508–1528)
Unified the Rajput confederacy against the Lodi sultans and later against Babur. Defeated at the **Battle of Khanwa (1527)** by Babur's superior artillery — a turning point that opened northern India to the Mughals. Reputed to have lost an eye, an arm, and the use of a leg in 80+ battles.

## Akbar's Sieges of Chittor (1567–68)
Akbar besieged Chittor under **Maharana Udai Singh II**. Defenders **Jaimal of Bednore** and **Patta of Kelwa** fell heroically; the fort was sacked and ~30,000 inhabitants killed. Udai Singh withdrew into the Aravallis and founded **Udaipur** as the new capital.

## Maharana Pratap (r. 1572–1597)
The dynasty's iconic figure. Refused Akbar's overtures of vassalage. Fought the **Battle of Haldighati (18 June 1576)** against Mughal forces led by Raja Man Singh of Amber. Tactically inconclusive but strategically a Mughal advance — Pratap retreated into the Aravallis on his horse **Chetak**, supported by Bhil tribals under **Rana Punja**, and waged a sustained guerrilla campaign.

The **Battle of Dewair (1582)** marked Mewar's resurgence — Pratap recovered most of his lost territory (Chittor itself remained Mughal until 1615). His financier was the Jain merchant **Bhama Shah**, who funded the resistance from personal wealth.

## Treaty of 1818
Mewar accepted British paramountcy under **Maharana Bhim Singh** via a subsidiary alliance with the East India Company, ending centuries of independence. The treaty stabilised the state but locked it into the colonial order.

## Cultural Legacy
- **Pichwai** painting at Nathdwara
- **Mewar school of miniature painting** (17th–18th c.)
- The cult of *Eklingji* as state deity — the Maharana ruled in the name of Eklingji as *Diwan*

## Why Mewar matters in RAS
Mewar's resistance is a recurring micro-theme in Rajasthan history because it ties together: (a) Mughal expansion and Rajput response, (b) the role of tribal alliances (Bhils), (c) Rajput political economy (Bhama Shah's financing), and (d) the symbolic construction of Rajput honour that shaped later regional identity.
`.trim();

export const QPOOL_MEWAR: Question[] = [
  {
    type: "conceptual",
    concept: "guerrilla-strategy",
    q: "Maharana Pratap's decision to retreat into the Aravallis after Haldighati is best understood as:",
    options: [
      "A flight from battle",
      "A guerrilla strategy exploiting terrain",
      "Surrender to Mughal supremacy",
      "A purely defensive posture",
    ],
    correct: 1,
    why: "Retreat into the Aravallis was an active strategy — denying the Mughals a decisive battle, using terrain advantage, and waging sustained attrition with Bhil support.",
  },
  {
    type: "conceptual",
    concept: "tribal-alliance",
    q: "Bhil participation in Mewar's resistance most directly demonstrates:",
    options: [
      "Caste rigidity in Rajput polity",
      "The role of tribal alliances in Rajput statecraft",
      "Mughal weakness",
      "Religious conversion",
    ],
    correct: 1,
    why: "Pratap's reliance on the Bhils (under Rana Punja) shows Rajput rulers actively integrating tribal communities into military and political resistance.",
  },
  {
    type: "conceptual",
    concept: "rajput-economy",
    q: "Bhama Shah's financing of Pratap's campaigns is significant because it:",
    options: [
      "Proves Mewar was wealthy",
      "Illustrates merchant-Rajput political economy",
      "Shows tax revenue collapse",
      "Was a personal loan, not state finance",
    ],
    correct: 1,
    why: "It reveals how Jain mercantile capital underwrote Rajput political resistance — an interlocking elite system, not just a one-off donation.",
  },
  {
    type: "conceptual",
    concept: "symbolic-resistance",
    q: "The cult of Eklingji functioned in Mewar primarily as:",
    options: [
      "Folk religion of peasants",
      "A legitimating ideology — ruler as deity's diwan",
      "Anti-Mughal propaganda",
      "An import from Gujarat",
    ],
    correct: 1,
    why: "The Maharana ruling 'in the name of Eklingji' positioned the throne as subordinate to a divine sovereign — a powerful legitimating fiction.",
  },
  {
    type: "conceptual",
    concept: "mughal-expansion",
    q: "Khanwa (1527) is a turning point because it:",
    options: [
      "Ended Rajput power forever",
      "Established Mughal artillery dominance in north India",
      "Was the first Mughal-Rajput contact",
      "United all Rajputs",
    ],
    correct: 1,
    why: "Babur's gunpowder + tulughma tactics decisively beat the Rajput confederacy — opening the plains to Mughal consolidation.",
  },
  {
    type: "conceptual",
    concept: "guerrilla-strategy",
    q: "Dewair (1582) matters because it shows that:",
    options: [
      "Pratap surrendered",
      "Guerrilla attrition can reverse a conventional defeat",
      "Mughals withdrew permanently",
      "Chittor was recovered",
    ],
    correct: 1,
    why: "Dewair was the payoff of years of guerrilla warfare — Mewar recovered most of its territory, though Chittor stayed Mughal till 1615.",
  },
  {
    type: "conceptual",
    concept: "subsidiary-alliance",
    q: "The 1818 treaty's deepest consequence for Mewar was:",
    options: [
      "Loss of cultural identity",
      "Integration into the colonial order, ending strategic autonomy",
      "Immediate impoverishment",
      "Religious change",
    ],
    correct: 1,
    why: "Subsidiary alliances traded protection for sovereignty — Mewar's external policy and military independence ended in 1818.",
  },
  {
    type: "conceptual",
    concept: "fortification",
    q: "Kumbhalgarh's design under Rana Kumbha reflects:",
    options: [
      "Mughal influence",
      "An indigenous tradition of hill-fort engineering",
      "Portuguese assistance",
      "Defensive obsolescence",
    ],
    correct: 1,
    why: "Kumbhalgarh (architect: Mandan) is a high point of indigenous Rajput hill-fort tradition — pre-dating and independent of Mughal styles.",
  },
  {
    type: "analytical",
    concept: "haldighati-facts",
    q: "The Battle of Haldighati was fought in:",
    options: ["1556", "1576", "1582", "1615"],
    correct: 1,
    why: "Haldighati was fought on 18 June 1576 between Pratap and the Mughal force under Raja Man Singh.",
  },
  {
    type: "analytical",
    concept: "haldighati-facts",
    q: "Mughal forces at Haldighati were commanded by:",
    options: [
      "Akbar himself",
      "Man Singh of Amber",
      "Asaf Khan only",
      "Bairam Khan",
    ],
    correct: 1,
    why: "Raja Man Singh led the Mughal contingent; Asaf Khan was a subordinate commander.",
  },
  {
    type: "analytical",
    concept: "chittor-sieges",
    q: "Akbar sacked Chittor in:",
    options: ["1303", "1535", "1568", "1576"],
    correct: 2,
    why: "Akbar's siege ended in February 1568 with the fall of the fort — the third great sack of Chittor.",
  },
  {
    type: "analytical",
    concept: "chittor-sieges",
    q: "The 1303 sack of Chittor was carried out by:",
    options: [
      "Mahmud of Ghazni",
      "Alauddin Khalji",
      "Muhammad bin Tughlaq",
      "Babur",
    ],
    correct: 1,
    why: "Alauddin Khalji's 1303 siege is the first great sack of Chittor and the source of the Padmini legend.",
  },
  {
    type: "analytical",
    concept: "kumbha-works",
    q: "Vijay Stambh at Chittor was built by:",
    options: ["Rana Sanga", "Rana Kumbha", "Maharana Pratap", "Bappa Rawal"],
    correct: 1,
    why: "Rana Kumbha built the Vijay Stambh in 1448 to commemorate his victory over Mahmud Khalji of Malwa.",
  },
  {
    type: "analytical",
    concept: "kumbha-works",
    q: "Kumbhalgarh was designed by the architect:",
    options: ["Mandan", "Vidyadhar", "Raja Man", "Dhanna"],
    correct: 0,
    why: "Mandan is the architect credited in Kumbha's court — also author of architectural treatises like Vastumandan.",
  },
  {
    type: "analytical",
    concept: "pratap-allies",
    q: "Pratap's principal financier was:",
    options: ["Todar Mal", "Bhama Shah", "Birbal", "Tansen"],
    correct: 1,
    why: "The Jain merchant Bhama Shah financed Pratap's resistance from his personal wealth.",
  },
  {
    type: "analytical",
    concept: "pratap-allies",
    q: "The Bhil leader who supported Pratap was:",
    options: ["Rana Punja", "Hammir", "Jaimal", "Patta"],
    correct: 0,
    why: "Rana Punja of the Bhils provided the tribal alliance that sustained guerrilla operations.",
  },
  {
    type: "analytical",
    concept: "khanwa",
    q: "Khanwa (1527) was fought between Babur and:",
    options: ["Ibrahim Lodi", "Rana Sanga", "Hemu", "Maldeo"],
    correct: 1,
    why: "Khanwa pitted Babur's Mughals against the Rajput confederacy led by Rana Sanga of Mewar.",
  },
  {
    type: "analytical",
    concept: "subsidiary-alliance",
    q: "Mewar entered subsidiary alliance with the British in:",
    options: ["1803", "1818", "1857", "1947"],
    correct: 1,
    why: "Maharana Bhim Singh signed the treaty in 1818 under the Pindari/Maratha settlement era.",
  },
  {
    type: "analytical",
    concept: "udaipur-founding",
    q: "Udaipur was founded as the new Mewar capital by:",
    options: ["Rana Kumbha", "Udai Singh II", "Maharana Pratap", "Jagat Singh"],
    correct: 1,
    why: "After the fall of Chittor in 1568, Udai Singh II shifted the capital to Udaipur.",
  },
  {
    type: "analytical",
    concept: "dewair",
    q: "The Battle of Dewair (1582) is significant because it marked:",
    options: [
      "Pratap's death",
      "Mewar's territorial resurgence",
      "Akbar's final victory",
      "Founding of Udaipur",
    ],
    correct: 1,
    why: "Dewair was the symbolic and military payoff of Pratap's guerrilla campaign — Mewar recovered most of its lost territory.",
  },
];

export const FOUNDATION_QS: Record<string, Question[]> = {
  "guerrilla-strategy": [
    {
      q: "Guerrilla warfare typically relies on:",
      options: [
        "Mass pitched battles",
        "Terrain, mobility, and attrition",
        "Naval blockade",
        "Siege engines",
      ],
      correct: 1,
      why: "Guerrilla forces avoid decisive battle and bleed the enemy through mobility and terrain.",
      type: "conceptual",
      concept: "guerrilla-strategy",
    },
    {
      q: "Pratap's base after Haldighati was in the:",
      options: ["Thar desert", "Aravalli hills", "Gangetic plain", "Vindhyas"],
      correct: 1,
      why: "The Aravallis gave cover, supply lines through Bhil country, and defensible terrain.",
      type: "conceptual",
      concept: "guerrilla-strategy",
    },
  ],
  "tribal-alliance": [
    {
      q: "The Bhils are predominantly an Adivasi community of:",
      options: [
        "Bengal",
        "Western & central India including southern Rajasthan",
        "Kashmir",
        "Tamil Nadu",
      ],
      correct: 1,
      why: "Bhils are concentrated in the Aravalli-Vindhya belt — Mewar's natural recruiting ground.",
      type: "conceptual",
      concept: "tribal-alliance",
    },
    {
      q: "Rana Punja led which community in support of Pratap?",
      options: ["Jats", "Bhils", "Meenas", "Gujjars"],
      correct: 1,
      why: "Rana Punja is the Bhil chieftain remembered for the alliance with Mewar.",
      type: "conceptual",
      concept: "tribal-alliance",
    },
  ],
  "rajput-economy": [
    {
      q: "Pre-modern Rajput states drew significant fiscal support from:",
      options: [
        "European banks",
        "Jain and Marwari merchant networks",
        "Spanish silver",
        "Mughal subsidies",
      ],
      correct: 1,
      why: "Indigenous mercantile capital — especially Jain — financed Rajput state-making.",
      type: "conceptual",
      concept: "rajput-economy",
    },
    {
      q: "Bhama Shah is associated with which dynasty?",
      options: [
        "Rathores of Marwar",
        "Sisodias of Mewar",
        "Kachwahas of Amber",
        "Chauhans of Ajmer",
      ],
      correct: 1,
      why: "He is the iconic financier of Mewar under Maharana Pratap.",
      type: "conceptual",
      concept: "rajput-economy",
    },
  ],
  "symbolic-resistance": [
    {
      q: "The tutelary deity of Mewar's rulers is:",
      options: ["Shrinathji", "Eklingji", "Jagannath", "Khatu Shyam"],
      correct: 1,
      why: "The Maharana ruled 'as diwan of Eklingji' — a legitimating sovereign-deity formula.",
      type: "conceptual",
      concept: "symbolic-resistance",
    },
    {
      q: "A 'legitimating ideology' in political terms is:",
      options: [
        "A budget plan",
        "A belief system that justifies authority",
        "A military doctrine",
        "A trade agreement",
      ],
      correct: 1,
      why: "Legitimating ideologies — divine right, ancestry myths — convert raw power into accepted authority.",
      type: "conceptual",
      concept: "symbolic-resistance",
    },
  ],
  "mughal-expansion": [
    {
      q: "Babur's decisive military advantage at Panipat and Khanwa was:",
      options: [
        "War elephants",
        "Field artillery + tulughma tactics",
        "Naval ships",
        "Larger numbers",
      ],
      correct: 1,
      why: "Gunpowder artillery and the tulughma flanking manoeuvre overcame larger Indian armies.",
      type: "conceptual",
      concept: "mughal-expansion",
    },
    {
      q: "The Mughal empire was founded by:",
      options: ["Akbar", "Babur", "Humayun", "Shah Jahan"],
      correct: 1,
      why: "Babur founded the empire after Panipat (1526).",
      type: "conceptual",
      concept: "mughal-expansion",
    },
  ],
  "subsidiary-alliance": [
    {
      q: "The subsidiary alliance system was devised by:",
      options: [
        "Lord Cornwallis",
        "Lord Wellesley",
        "Lord Dalhousie",
        "Warren Hastings",
      ],
      correct: 1,
      why: "Wellesley systematised the subsidiary alliance from 1798 onwards.",
      type: "conceptual",
      concept: "subsidiary-alliance",
    },
    {
      q: "A state under subsidiary alliance loses control of its:",
      options: [
        "Religion",
        "External relations and standing army",
        "Caste system",
        "Language",
      ],
      correct: 1,
      why: "The British took over defence and foreign policy — internal sovereignty remained nominal.",
      type: "conceptual",
      concept: "subsidiary-alliance",
    },
  ],
  fortification: [
    {
      q: "Kumbhalgarh is famous for having:",
      options: [
        "The longest temple corridor",
        "The second-longest continuous wall in the world",
        "An underwater fort",
        "A Mughal mosque",
      ],
      correct: 1,
      why: "Its perimeter wall is ~36 km, second only to the Great Wall of China.",
      type: "conceptual",
      concept: "fortification",
    },
    {
      q: "Hill forts of Rajasthan inscribed by UNESCO include:",
      options: [
        "Only Chittor",
        "Six forts including Chittor, Kumbhalgarh, Ranthambore, Amber, Jaisalmer, Gagron",
        "Only Amber and Jaisalmer",
        "None",
      ],
      correct: 1,
      why: "UNESCO inscribed the six in 2013 as a serial property.",
      type: "conceptual",
      concept: "fortification",
    },
  ],
  "haldighati-facts": [
    {
      q: "Haldighati pass lies in which mountain range?",
      options: ["Vindhyas", "Aravallis", "Satpuras", "Himalayas"],
      correct: 1,
      why: "It is a pass through the Aravallis near Gogunda.",
      type: "analytical",
      concept: "haldighati-facts",
    },
    {
      q: "Pratap's horse at Haldighati was:",
      options: ["Badal", "Chetak", "Hayagriva", "Sarangi"],
      correct: 1,
      why: "Chetak is the named warhorse memorialised in Mewar tradition.",
      type: "analytical",
      concept: "haldighati-facts",
    },
  ],
  "chittor-sieges": [
    {
      q: "Chittor has been sacked how many times in major recorded sieges?",
      options: ["Once", "Twice", "Three times", "Five times"],
      correct: 2,
      why: "1303 (Alauddin), 1535 (Bahadur Shah of Gujarat), 1568 (Akbar).",
      type: "analytical",
      concept: "chittor-sieges",
    },
    {
      q: "Jauhar at Chittor refers to:",
      options: [
        "A coronation rite",
        "Mass self-immolation by Rajput women to avoid capture",
        "A trade fair",
        "A poetic form",
      ],
      correct: 1,
      why: "Jauhar is the Rajput practice of mass self-immolation when defeat became certain.",
      type: "analytical",
      concept: "chittor-sieges",
    },
  ],
  "kumbha-works": [
    {
      q: "Sangeetraj was authored by:",
      options: ["Tansen", "Rana Kumbha", "Amir Khusrau", "Mirabai"],
      correct: 1,
      why: "Kumbha was a scholar-king; Sangeetraj is his treatise on music.",
      type: "analytical",
      concept: "kumbha-works",
    },
    {
      q: "Vijay Stambh commemorates a victory over:",
      options: ["Babur", "Mahmud Khalji of Malwa", "Akbar", "Alauddin Khalji"],
      correct: 1,
      why: "Kumbha defeated Mahmud Khalji of Malwa in 1440 — the column was raised in 1448.",
      type: "analytical",
      concept: "kumbha-works",
    },
  ],
  "pratap-allies": [
    {
      q: "Mirabai, the bhakti poet, was associated with the court of:",
      options: ["Marwar", "Mewar", "Amber", "Bikaner"],
      correct: 1,
      why: "Mira was a Mewar princess (married into Sisodia line).",
      type: "analytical",
      concept: "pratap-allies",
    },
    {
      q: "Bhama Shah's gift to Pratap is traditionally said to have funded:",
      options: [
        "A pilgrimage",
        "An army for 12 years",
        "A temple",
        "A palace",
      ],
      correct: 1,
      why: "Tradition holds it sustained Pratap's army for ~12 years of campaigning.",
      type: "analytical",
      concept: "pratap-allies",
    },
  ],
  khanwa: [
    {
      q: "Khanwa is located in present-day:",
      options: [
        "Madhya Pradesh",
        "Rajasthan (Bharatpur district)",
        "Uttar Pradesh",
        "Gujarat",
      ],
      correct: 1,
      why: "Khanwa village is in Bharatpur district of Rajasthan.",
      type: "analytical",
      concept: "khanwa",
    },
    {
      q: "After Khanwa, Babur adopted the title:",
      options: ["Padshah", "Ghazi", "Sultan-ul-Hind", "Zillullah"],
      correct: 1,
      why: "He took the title Ghazi after the victory over the 'infidel' confederacy.",
      type: "analytical",
      concept: "khanwa",
    },
  ],
  "udaipur-founding": [
    {
      q: "Udaipur was founded around:",
      options: ["1459", "1568–69", "1615", "1727"],
      correct: 1,
      why: "Udai Singh shifted the capital ~1568 after Chittor fell.",
      type: "analytical",
      concept: "udaipur-founding",
    },
    {
      q: "Lake Pichola was originally commissioned by:",
      options: [
        "A Sisodia ruler",
        "A Banjara merchant",
        "Akbar",
        "British engineers",
      ],
      correct: 1,
      why: "Tradition credits a Banjara grain merchant; Sisodias later expanded it.",
      type: "analytical",
      concept: "udaipur-founding",
    },
  ],
  dewair: [
    {
      q: "After Dewair, Mewar recovered all major forts EXCEPT:",
      options: ["Kumbhalgarh", "Gogunda", "Chittor", "Udaipur"],
      correct: 2,
      why: "Chittor remained under Mughal control until 1615 (treaty under Jahangir).",
      type: "analytical",
      concept: "dewair",
    },
    {
      q: "Pratap's son and successor was:",
      options: ["Amar Singh I", "Karan Singh", "Jagat Singh", "Raj Singh"],
      correct: 0,
      why: "Amar Singh I succeeded Pratap and signed the 1615 treaty with Jahangir.",
      type: "analytical",
      concept: "dewair",
    },
  ],
};

export const PYQS_MEWAR: PYQ[] = [
  {
    q: "With reference to the medieval history of Rajasthan, consider the following statements about Maharana Pratap: 1) He was crowned at Gogunda. 2) Bhama Shah's financial support enabled his army for several years. 3) The Battle of Dewair was fought in 1572. Which are correct?",
    a: "1 and 2 only",
    year: "RAS 2018",
    explain:
      "Pratap was crowned at Gogunda (1572); Bhama Shah financed the army; Dewair was in 1582, not 1572.",
  },
  {
    q: "Vijay Stambh at Chittorgarh was built to commemorate the victory of Rana Kumbha over:",
    a: "Mahmud Khalji of Malwa",
    year: "RAS 2016",
    explain: "Built 1448 to mark the 1440 victory.",
  },
  {
    q: "Which Bhil chieftain assisted Maharana Pratap in his struggle against Akbar?",
    a: "Rana Punja",
    year: "RAS 2013",
    explain: "Rana Punja of the Bhils was central to the guerrilla phase.",
  },
  {
    q: "The treaty between Mewar and the British East India Company was signed in the year:",
    a: "1818",
    year: "RAS 2021",
    explain: "Subsidiary alliance under Maharana Bhim Singh.",
  },
  {
    q: "Architect of Kumbhalgarh fort was:",
    a: "Mandan",
    year: "RAS 2019",
    explain: "Court architect of Rana Kumbha and author of Vastumandan.",
  },
];

export const MAINS_PROMPT: MainsPrompt = {
  prompt:
    "Examine the strategic, economic and cultural foundations of Mewar's resistance to Mughal expansion under Maharana Pratap. (250 words)",
  rubric: [
    "Haldighati",
    "1576",
    "guerrilla",
    "Aravalli",
    "Bhil",
    "Punja",
    "Chetak",
    "Bhama Shah",
    "Dewair",
    "Kumbhalgarh",
    "Chittor",
    "Akbar",
    "Man Singh",
    "Eklingji",
  ],
};

// Utility functions
export function findTopic(topicId: string) {
  for (const s of SUBJECTS) {
    const t = s.topics.find((t) => t.id === topicId);
    if (t) return { subject: s, topic: t };
  }
  return null;
}

export function topicQuestions(topicId: string): Question[] {
  return topicId === "mewar" ? QPOOL_MEWAR : QPOOL_MEWAR;
}

export function topicNotes(topicId: string): string | null {
  return topicId === "mewar" ? MEWAR_NOTES : null;
}

export function shuffle<T>(arr: T[], seed?: number): T[] {
  const a = [...arr];
  let s = seed || Math.floor(Math.random() * 1e9);
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ==================== CONCEPT LABELS (for analytics) ==================== */
// Human-readable labels for the concept tags used in the question pool.
// Used by the mentor dashboard to surface strong/weak areas.
export const CONCEPT_LABELS: Record<string, string> = {
  "guerrilla-strategy": "Guerrilla strategy",
  "tribal-alliance": "Tribal alliances",
  "rajput-economy": "Rajput political economy",
  "symbolic-resistance": "Symbolic legitimacy",
  "mughal-expansion": "Mughal expansion",
  "subsidiary-alliance": "Subsidiary alliance",
  "fortification": "Fortifications",
  "haldighati-facts": "Haldighati (1576)",
  "chittor-sieges": "Sieges of Chittor",
  "kumbha-works": "Rana Kumbha's works",
  "pratap-allies": "Pratap's allies",
  "khanwa": "Battle of Khanwa",
  "udaipur-founding": "Founding of Udaipur",
  "dewair": "Battle of Dewair",
};

export const conceptLabel = (id: string) => CONCEPT_LABELS[id] || id;

/* ==================== POINTS CONSTANTS ==================== */

export const POINTS = {
  QUIZ_PASS: 100,        // ≥80% on a day's quiz
  FIRST_TRY_BONUS: 50,   // cleared on first attempt
  MAINS_SUBMIT: 25,      // submitted a mains answer
  PYQ_REVIEW: 10,        // revealed a PYQ explanation
  CHART_APPROVED: 20,    // mentor approved the prep chart
  STREAK_3: 30,          // 3-day streak
  STREAK_7: 100,         // 7-day streak
};

export const POINTS_PER_LEVEL = 500;
export const levelFromPoints = (total: number) => Math.floor(total / POINTS_PER_LEVEL) + 1;
export const xpInLevel = (total: number) => total % POINTS_PER_LEVEL;
export const xpToNextLevel = (total: number) => POINTS_PER_LEVEL - xpInLevel(total);

/* ==================== SEED USERS & STUDENT DATA ==================== */

export function emptyStudentData(): StudentData {
  return {
    chart: { days: [], status: "draft" },
    progress: { currentDay: 1 },
    overrides: [],
    attempts: [],
    mainsScores: [],
    points: { total: 0, history: [] },
    pyqsReviewed: [],
  };
}

const ms = (daysAgo: number) => Date.now() - daysAgo * 86400000;

// One mentor + two demo students with realistic-looking progress so the
// mentor dashboard is meaningful on first load.
const MENTOR_ID = "u_mentor_priya";
const STUDENT_AAMIR = "u_student_aamir";
const STUDENT_NEHA  = "u_student_neha";

export const SEED_USERS: User[] = [
  {
    id: MENTOR_ID,
    email: "priya.mentor@example.com",
    name: "Priya Sharma",
    role: "mentor",
    createdAt: ms(60),
  },
  {
    id: STUDENT_AAMIR,
    email: "aamir.parwez@gmail.com",
    name: "Aamir Parwez",
    role: "student",
    mentorId: MENTOR_ID,
    createdAt: ms(20),
  },
  {
    id: STUDENT_NEHA,
    email: "neha.j@example.com",
    name: "Neha Joshi",
    role: "student",
    mentorId: MENTOR_ID,
    createdAt: ms(15),
  },
];

/** Build a chart where a given day index has multiple topics. */
const multiChart = (rows: string[][]): DaySlot[][] => rows.map((ids) =>
  ids.map((id) => {
    const t = findTopic(id);
    return { subjectId: t!.subject.id, topicId: id };
  })
);

export function seedStudentData(): Record<string, StudentData> {
  // Aamir: chart approved, day 4 in progress, mixed accuracy across concepts.
  // Day 2 is a multi-topic day to demo the new feature.
  const aamirChart = multiChart([
    ["mauryan-raj"],
    ["pratiharas", "chauhans"], // multi-topic day
    ["mewar"],
    ["1857-raj"],
    ["preamble"],
    ["fund-rights"],
    ["dpsp"],
    ["phys-div"],
  ]);
  const aamir: StudentData = {
    chart: { days: aamirChart, status: "approved", submittedAt: ms(12), decidedAt: ms(11) },
    progress: { currentDay: 4 },
    overrides: [],
    attempts: [
      { day: 1, topicId: "mauryan-raj", score: 87, when: ms(10), byConcept: { "guerrilla-strategy": { right: 2, wrong: 0 }, "tribal-alliance": { right: 1, wrong: 1 }, "haldighati-facts": { right: 2, wrong: 0 } } },
      { day: 2, topicId: "pratiharas",  score: 73, when: ms(7),  byConcept: { "mughal-expansion": { right: 1, wrong: 2 }, "kumbha-works": { right: 2, wrong: 0 }, "khanwa": { right: 0, wrong: 2 } } },
      { day: 2, topicId: "pratiharas",  score: 91, when: ms(7),  byConcept: { "mughal-expansion": { right: 2, wrong: 1 }, "kumbha-works": { right: 2, wrong: 0 }, "khanwa": { right: 2, wrong: 0 } } },
      { day: 2, topicId: "chauhans",    score: 84, when: ms(6),  byConcept: { "chittor-sieges": { right: 2, wrong: 0 }, "fortification": { right: 1, wrong: 1 }, "pratap-allies": { right: 2, wrong: 0 } } },
      { day: 3, topicId: "mewar",       score: 84, when: ms(4),  byConcept: { "chittor-sieges": { right: 2, wrong: 0 }, "fortification": { right: 1, wrong: 1 }, "pratap-allies": { right: 2, wrong: 0 } } },
      { day: 4, topicId: "1857-raj",    score: 68, when: ms(1),  byConcept: { "subsidiary-alliance": { right: 1, wrong: 2 }, "symbolic-resistance": { right: 0, wrong: 2 }, "dewair": { right: 2, wrong: 0 } } },
    ],
    mainsScores: [{ day: 3, topicId: "mewar", score: 71, when: ms(4) }],
    points: {
      total: 380,
      history: [
        { id: 1, when: ms(11), kind: "chart_approved", amount: 20 },
        { id: 2, when: ms(10), kind: "quiz_pass", amount: 100, meta: { day: 1 } },
        { id: 3, when: ms(10), kind: "first_try_bonus", amount: 50, meta: { day: 1 } },
        { id: 4, when: ms(7),  kind: "quiz_pass", amount: 100, meta: { day: 2 } },
        { id: 5, when: ms(4),  kind: "quiz_pass", amount: 100, meta: { day: 3 } },
        { id: 6, when: ms(4),  kind: "mains_submit", amount: 25, meta: { day: 3 } },
        { id: 7, when: ms(4),  kind: "first_try_bonus", amount: 50, meta: { day: 3 } },
        { id: 8, when: ms(4),  kind: "pyq_review", amount: 10, meta: { label: "RAS 2018" } },
        { id: 9, when: ms(4),  kind: "pyq_review", amount: 10, meta: { label: "RAS 2016" } },
        { id: 10, when: ms(4), kind: "pyq_review", amount: 10, meta: { label: "RAS 2013" } },
      ],
    },
    pyqsReviewed: ["RAS 2018", "RAS 2016", "RAS 2013"],
    lastActivityAt: ms(1),
  };

  // Neha: just submitted chart, waiting for mentor approval. Day 1 doubles up.
  const nehaChart = multiChart([
    ["phys-div", "rivers"],
    ["climate"],
    ["soils"],
    ["minerals"],
    ["preamble"],
    ["fund-rights"],
  ]);
  const neha: StudentData = {
    chart: { days: nehaChart, status: "pending_approval", submittedAt: ms(0) },
    progress: { currentDay: 1 },
    overrides: [],
    attempts: [],
    mainsScores: [],
    points: { total: 0, history: [] },
    pyqsReviewed: [],
    lastActivityAt: ms(0),
  };

  return {
    [STUDENT_AAMIR]: aamir,
    [STUDENT_NEHA]: neha,
  };
}

export const DEFAULT_MENTOR_ID = MENTOR_ID;

