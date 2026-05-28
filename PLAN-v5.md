# Plan v5 — Onboarding polish, scalable Subject library, Subject master, Admin role

## Context (why this change set)

- The Subject library currently shows every topic flat. Won't scale past ~30 topics, let alone the 300–400 you expect.
- Day timeline shows a fixed 15 slots no matter what scope the student picks. If they commit a week, they should only see 7 days to plan.
- The Commitment Scope panel is at the bottom of the page, which is backwards — that choice should drive the rest of the screen.
- Subjects/topics are hardcoded in `src/data/index.ts`. To grow the catalog at scale we need a Subject master, owned by a new Admin role.
- The Admin role also needs to assign mentors to students and see mentor-level progress. Mentor-specific tasks (more actions on the mentor view) will come in a later iteration.

---

## Part 1 — Onboarding restructure

### New screen order (top to bottom)

```
┌─ Onboarding ─────────────────────────────────────────┐
│  Header: "Build your prep chart"                     │
│                                                       │
│  ┌─ 1. Commitment scope ─────────────────────────┐   │
│  │  ( • Week 7d )  ( ○ Month 30d )  ( ○ Overall ) │   │
│  │  When scope = Overall: [ − ] [ 15 ] [ + ]      │   │
│  └────────────────────────────────────────────────┘   │
│                                                       │
│  ┌─ 2. Subject library ───┐  ┌─ 3. Your N-day plan ─┐│
│  │ 🔍 search topics       │  │ Day 1 [ topic chip ] ││
│  │ ▸ 🏰 Rajasthan History │  │ Day 2 [ empty ]      ││
│  │ ▸ ⚖️ Indian Polity     │  │ ...                  ││
│  │ ▸ 🏜️ Geography of Raj  │  │ Day 7 [ empty ]      ││
│  │ ▸ ➕ more (15 subjects) │  └──────────────────────┘│
│  └────────────────────────┘                          │
│                                                       │
│  [ Submit week plan → ]                              │
└──────────────────────────────────────────────────────┘
```

### Day count rules

| Scope chosen | Days shown in timeline | Stepper visible? |
|---|---|---|
| Week    | 7  | no |
| Month   | 30 | no |
| Overall | user-chosen (default 30, range 15–120) | yes |

- Changing scope **resizes** the timeline. Any topics already in slots beyond the new size go into an "overflow" tray with a one-click "fit into plan" action (so we don't silently throw away work).
- For repeat commitments (student already approved through Day 7, committing the next week): timeline shows **Days 8–14** with the previous 7 collapsed into a read-only "previously approved" header.

---

## Part 2 — Scalable Subject library

Two changes that compound:

1. **Collapsible by default**: subject headers only. A `▸ / ▾` chevron toggles. Drag the header to fill a day with the subject's topics in order; expand to drag individual topics.
2. **Search bar at top**: type "Hald" → matches "Haldighati" inside Mewar — Sisodias; the parent subject auto-expands and the matching topic is highlighted. Search works across all subject and topic names.

### Wireframe

```
┌─ Subject library ─────────────────────  4/7 days filled ─┐
│  🔍 search subjects & topics                              │
├───────────────────────────────────────────────────────────┤
│  ⠿  🏰  Rajasthan History       (5 topics)    [▸] auto-fill│
│  ⠿  ⚖️  Indian Polity            (5 topics)    [▾] auto-fill│
│        ⠿  • Preamble & Basic Structure                    │
│        ⠿  • Fundamental Rights                            │
│        ⠿  • DPSP & Fundamental Duties                     │
│        ⠿  • President & Prime Minister                    │
│        ⠿  • Parliament                                    │
│  ⠿  🏜️  Geography of Rajasthan   (5 topics)    [▸] auto-fill│
│  ⠿  📜  Modern Indian History    (12 topics)   [▸] auto-fill│
│  …                                                        │
└───────────────────────────────────────────────────────────┘
```

- All subjects collapsed on initial load (less scroll noise).
- Search auto-expands matching subjects.
- Drag-and-drop continues to work on both headers (whole-subject) and individual topics.

---

## Part 3 — Subject master (admin-owned)

Currently `SUBJECTS` is a hardcoded const in `src/data/index.ts`. Promote it to runtime data the Admin can edit.

### Storage

- New localStorage key: `v5_subjects`
- Default seed = today's 3 subjects + their 15 topics, so existing demo continues to work on first load with an empty catalog.
- All consumers (`Onboarding`, `findTopic`, `topicQuestions`, `topicNotes`) switch from importing `SUBJECTS` directly to a `useSubjects()` hook backed by context.

### Admin operations

- Add / rename / delete a subject (with icon picker, color picker)
- Add / rename / delete a topic within a subject
- Drag-reorder topics within a subject; drag-reorder subjects
- (Future, not in this iteration) attach notes / PYQs / Mains rubric to a topic

### Safeguards

- Deleting a subject/topic that's referenced in any student's chart should warn: "Used in 3 students' charts. Delete anyway, replace with a tombstone, or keep?" For v5 simplest path: confirm + soft-delete (topic stays in old charts, won't appear in new searches).

---

## Part 4 — Admin role

### Hierarchy

```
                     ┌─────────┐
                     │  ADMIN  │  (manages catalog + people)
                     └────┬────┘
                          │ assigns
              ┌───────────┴───────────┐
              ▼                       ▼
         ┌────────┐              ┌────────┐
         │ Mentor │              │ Mentor │
         └────┬───┘              └────┬───┘
              │                       │
        ┌─────┴─────┐           ┌─────┴─────┐
        ▼     ▼     ▼           ▼     ▼     ▼
     Student Student Student Student Student Student
```

### Landing page — three roles

```
┌──────────────────────────────────────────────────────┐
│  RAS Mentorship                                       │
│                                                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │ 🎯       │  │ 🧭       │  │ ⚙️        │            │
│  │ Student  │  │ Mentor   │  │ Admin    │            │
│  └──────────┘  └──────────┘  └──────────┘            │
└──────────────────────────────────────────────────────┘
```

### Admin dashboard — three tabs

**Tab 1 — People**
- List of mentors with: avatar, name, # students, avg student level, last active
- Click a mentor → see their student list with reassign / unassign actions
- Add a new mentor by email
- Reassign a student: dropdown on each row to swap mentor

**Tab 2 — Subject master**
- Tree view of subjects → topics
- Inline edit, drag-reorder
- "Add subject" / "Add topic" buttons
- Tombstone indicator on topics referenced by existing charts

**Tab 3 — Platform stats**
- Total students, total mentors, total subjects/topics
- Mentor leaderboard (students cleared, avg score, response time on overrides)
- Topics most/least studied across the platform (signals what's missing in the catalog)

### Seeded admin account

- `admin@example.com` — "Admin Singh"
- Visible on the Admin login as a demo account (same pattern as the seeded mentor)

---

## Part 5 — Mentor task center (placeholder, NOT in this iteration)

You said mentor-specific tasks come next. To leave room:

- Add a `tasks` array to the mentor view (empty for now) so we can later drop in: "Review 2 plans", "Approve 1 override", "Send weekly nudge to Aamir".
- No code in v5 — just keep the mentor dashboard layout flexible.

---

## Data model changes

```ts
// types/index.ts

// Role gets a third value.
export type Role = "student" | "mentor" | "admin";

// User: admins exist; no mentorId needed for them.
export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  mentorId?: string;          // students only
  managedMentorIds?: string[]; // admins only (optional — could derive)
  createdAt: number;
}

// New: subject catalog as data (was hardcoded).
export interface SubjectCatalogEntry extends Subject {
  archived?: boolean;          // soft-delete
}

// AppState gains:
//   subjects: SubjectCatalogEntry[]
//   route adds: "admin", "admin_people", "admin_catalog", "admin_stats"
```

Storage bump: **v4 → v5**. Old v4 data ignored, fresh seed loads with the same demo accounts plus a new Admin Singh.

---

## Files touched

| Area | New | Modified |
|---|---|---|
| Onboarding restructure | — | `src/pages/Onboarding.tsx` |
| Subject library scaling | — | `src/pages/Onboarding.tsx`, `src/data/index.ts` |
| Subject master + runtime catalog | `src/hooks/useSubjects.ts` | `src/data/index.ts` (export DEFAULT_SUBJECTS), all importers of `SUBJECTS` |
| Admin role | `src/pages/AdminDashboard.tsx`, `src/pages/admin/People.tsx`, `src/pages/admin/Catalog.tsx`, `src/pages/admin/Stats.tsx` | `src/pages/Landing.tsx`, `src/pages/Login.tsx`, `src/hooks/useAppState.tsx`, `src/types/index.ts`, `src/App.tsx`, `src/components/TopBar.tsx` |

---

## Phasing (build order)

I'd ship in this order so each step is independently visible:

1. **Onboarding restructure** (scope at top, day count tied to scope). Smallest unit, immediate win.
2. **Collapsible + searchable subject library**. Doesn't depend on admin, helps every flow.
3. **Subject master moved to runtime** (subjects come from context, no UI yet to edit). Lays groundwork.
4. **Admin role + Admin dashboard** (People + Subject master CRUD + Stats). Bigger chunk.
5. **(Future iteration)** Mentor task center.

---

## Open questions before I build

1. **Overall scope day count**: should the student pick the total length (slider 15–120 default 30), or should "Overall" mean "however long the current chart already is"? I lean toward the slider — clearer commitment.
2. **Search scope**: only topic/subject names, or also note bodies (when AI notes exist)? Names-only is much cheaper and covers 95% of need.
3. **Admin → Mentor visibility**: can an admin *act as* a mentor (open a mentor's dashboard read-only or with edit?), or just see aggregate metrics? I'd start with read-only drill-in.
4. **Multiple admins**: support multiple admin accounts, or single seeded admin only? I'd allow multiple via the same email-based login.
5. **Subject deletion**: tombstone (soft-delete; old charts keep working) or hard block when referenced? I lean tombstone — won't break student progress mid-prep.

If you don't push back on any of these, I'll go with the recommendations above.

---

## Verification plan

After building each phase, manually walk:

- **Onboarding**: change scope → confirm day count changes; overflow topics handled when shrinking.
- **Subject library**: type "Bhama" → confirms Mewar expands and the matching topic highlights; collapse all → only headers visible.
- **Admin**: sign in as Admin Singh → People tab shows Priya with Aamir+Neha → add a new topic in Subject master → switch to Student → confirm the new topic appears in the library.
- **Re-assign**: Admin re-assigns Aamir from Priya to a newly created mentor; Aamir's MentorStudentDetail history is preserved.
- **Migration**: clear localStorage, hard reload — seeded data appears with Admin Singh, Priya, Aamir, Neha all present and intact.
