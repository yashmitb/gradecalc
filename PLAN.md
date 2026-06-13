# GradeHQ Roadmap

This is the working plan for the next set of features. Phases 1-5 are the
active/priority work; "Later / Deferred" is everything else from the feature
brainstorm, parked for future phases.

Guiding constraints from this planning round:
- **No manual tedium.** Skip anything that requires the user to repeatedly
  hand-enter things like "how many days late was this" — unless it can be
  derived automatically.
- **No reminders / deadline tracking yet** — explicitly out of scope for this
  round.

### Canvas direct sync — parked (not in this round)
We researched a "Connect Canvas" sync (Personal Access Token → server proxy →
auto-populated courses/categories/scores, including automatic drop-lowest and
extra-credit handling via the Canvas REST API). **Tested against a real UCSD
account and hit a hard blocker**: UCSD has disabled self-service Canvas access
token generation for students ("Your Canvas administrators have chosen to
limit your ability to generate your own access token..."), so the PAT-based
approach doesn't work for UCSD users, likely many other schools too.

Decision: drop direct Canvas sync for this round and focus on the phases below,
all of which work today via the existing syllabus/screenshot auto-fill. See
"Later / Deferred" for possible future approaches (browser extension reading
the authenticated Canvas session, PAT sync as an opt-in for schools that allow
it, etc.) if we revisit this later.

---

## Phase 1: Visualization

- **Category weight breakdown** — donut/bar chart per course showing how much
  each category contributes to the grade.
- **Progress bar toward target grade** — visual fill showing current vs.
  target.
- **Status badges** — "on track" / "at risk" / "secured" per course, shown on
  the dashboard course tiles.
- **Dashboard summary** — at-a-glance grid of all courses with current grade,
  status, and weight.

---

## Phase 2: Cross-Course GPA Calculator

- **Credit hours per course** — one-time field per course (not repetitive
  tedium — set once, like the course name).
- **Custom/school grading scales** — define %→letter→GPA-point mappings (e.g.
  UCSD's scale), selectable or editable per course.
- **Semester GPA rollup** — computed live from each course's current/projected
  grade × credit hours.
- **Cumulative GPA blending** — enter current cumulative GPA + credits
  completed, blend with this semester's projected GPA.
- **"What GPA do I need this semester"** — back-solve required semester GPA
  to hit a target cumulative GPA.

---

## Phase 3: Cross-Course GPA "What-If" Sliders

- Builds directly on Phase 1-2.
- Per-course sliders for "projected final grade" that update:
  - That course's letter grade / GPA points
  - The **overall semester GPA** and **cumulative GPA** live
- Lets students answer "if I get a B+ here and an A- there, what's my GPA?" —
  the scenario-testing capability that static chat answers can't replicate.

---

## Phase 4: AI / Auto-fill Enhancements

- **Re-sync / merge from a new upload** — uploading a new screenshot/PDF for
  an existing course updates scores in place (diff against existing
  categories) instead of creating a duplicate course.
- **Confidence highlighting** — inline visual flag on extracted fields the
  model wasn't fully sure about (complements the existing `flags` mechanism).
- **Conversational correction** — quick inline "fix this field" interaction
  ("midterm is 25%, not 30%") instead of editing raw fields.
- **Auto-detect grading scale & drop/replacement rules from syllabus text** —
  for non-Canvas schools/users, extend the existing parser to also pull the
  school's grading scale and any "drop lowest" language, so manual setup
  shrinks even for syllabus-only users.
- *(Lower priority)* multi-LMS screenshot support (Blackboard, Brightspace,
  Moodle) — useful for the subset of users without Canvas.

---

## Phase 5: Personalization / UX

- **Light/dark theme toggle.**
- **Custom course colors/icons** — helps distinguish courses at a glance,
  especially once the dashboard has more cards (GPA rollup encourages adding
  every course).
- **Course search/filter** — useful once most users have a full course list.
- **PWA / "install as app"** support for quick mobile access.

---

## Later / Deferred (not in this round)

Parked features from the original brainstorm, roughly grouped:

- **Reminders & at-risk alerts** — explicitly excluded for now.
- **Deadline tracking** — explicitly excluded for now.
- **Late penalty calculator** — requires manual "days late" entry; revisit
  only if Canvas's `submission.late` / `seconds_late` fields can drive it
  automatically post-sync.
- **Sharing/export** — PDF report, read-only share link, CSV export,
  print-friendly view.
- **Multi-semester / degree-level view** — GPA trend across years, major GPA
  vs. overall GPA (tag courses as in-major).
- **Cross-group score replacement rules** (e.g. "final replaces lowest
  midterm if higher") — Canvas doesn't model this directly; would need manual
  config, so lower priority.
- **Custom rounding rules.**
- **Calendar sync** for deadlines (depends on deadline tracking being in
  scope).
- **Browser extension** that reads Canvas pages directly (alternative/backup
  to API sync).
- **Cross-device sync without accounts** (export/import JSON, QR transfer).
- **Motivation/encouragement messages** — small polish, bundle into a future
  personalization pass.

---

## Suggested order of work

1. Phase 1 (visualization) — quick wins, makes the dashboard feel alive.
2. Phase 2 + 3 (GPA rollup + sliders) — the headline differentiator, builds on
   1.
3. Phase 4 (AI/auto-fill enhancements) — polishes the existing flow.
4. Phase 5 (personalization) — polish pass once core features are in.

## Working notes (live)

This section is updated as work progresses through each phase — what's done,
what's in flight, and any decisions made along the way.

- [x] Phase 1: Visualization — category breakdown bar, grade progress bar
      with target marker, secured/on-track/at-risk status badges (course
      tiles + detail), dashboard summary stats row. Shipped in 48a3d9d.
- [x] Phase 2: Cross-Course GPA Calculator — per-course units + "count toward
      GPA" toggle, GPA points badge, semester GPA rollup, optional prior-GPA
      blending into a cumulative GPA, and a "what GPA do I need this
      semester" solver (locked-in / impossible / target value).
- [ ] Phase 3: GPA What-If Sliders
- [ ] Phase 4: AI / Auto-fill Enhancements
- [ ] Phase 5: Personalization / UX
