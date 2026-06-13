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
- [x] Phase 3: GPA What-If Sliders — per-course "hypothetical final grade"
      sliders (accent-styled track + thumb) that live-update each course's
      letter/GPA points plus the projected semester and cumulative GPA, without
      touching real category scores. Reset clears all overrides.
- [~] Phase 4: AI / Auto-fill Enhancements (partial — headline feature shipped)
      - [x] Re-sync / merge from a new upload — "Update from upload" on a
            course opens the auto-fill dialog in merge mode; a fresh screenshot
            is diffed against the existing course (scores updated in place,
            new categories added, weights + untouched categories preserved,
            blank scores never wipe real ones) with a confirm-first preview.
            No more duplicate courses. Verified end-to-end against a real parse.
      - [x] Drop / replacement-rule detection from syllabus text — already
            handled by the existing parser + flags mechanism (route prompt
            Steps 3A-3C); surfaced in the "double-check a few things" screen.
      - [ ] DEFERRED (left for review — ambiguous/risky per autonomous-run
            guardrails): conversational "fix this field" correction (needs a
            new AI endpoint + UX design; manual edit already covers it);
            persisting per-field confidence highlighting into the course view
            (marginal over flags, which already null + explain uncertain
            scores); auto-detecting & storing a custom %→letter→GPA grading
            scale (Phase 2 intentionally ships a fixed scale — integration
            unclear, revisit with the user).
- [~] Phase 5: Personalization / UX (partial — 3 of 4 shipped)
      - [x] Course search/filter — name search on the dashboard once you have
            4+ courses, with clear button + empty state.
      - [x] Custom course colors — per-course accent (6-color curated palette)
            that re-themes that course's accent system via scoped CSS vars
            (letter badge, progress bar, GPA badge, etc.), plus a color dot on
            the dashboard tile. Semantic status colors stay independent.
      - [x] PWA / install — web manifest + maskable icons + iOS meta so
            GradeHQ installs to a home screen and launches standalone.
            (Service-worker offline caching deferred — stale-cache risk.)
      - [ ] DEFERRED (left for review per autonomous-run guardrails):
            light/dark theme toggle. The whole design system (glass, specular,
            ambient glow, accent, grid) is tuned for dark; a light theme is a
            large design decision with high cross-app visual-bug risk — better
            to design it deliberately with the user than guess.
- [x] Final QA pass — full review at 390px (mobile) and 1280px (desktop)
      across all phases; verified no console errors, build + lint clean
      (only the pre-existing localStorage-hook set-state-in-effect lint
      pattern remains). Fixed the course-title overflow: the name is now an
      auto-growing textarea that wraps long titles ("MUS 1 — Intro to Music
      Theory and Composition") instead of clipping on narrow screens.
