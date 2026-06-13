# GradeHQ

A free, private grade calculator for college students. Add your courses and
grades, and find out **the exact score you need on what's left** to land the
grade you want.

- ⚡ **Free & private** — your grades live in your browser (localStorage). No
  account, no database, no tracking.
- 🎯 **"What do I need?"** — pick a target grade (A, B+, custom %) and a
  category, and it solves for the score you need on that category.
- ✨ **AI auto-fill (optional)** — drop in your syllabus PDF and/or a
  screenshot of your grades (Canvas, etc.), and Gemini fills in the
  categories, weights, and scores for you.
- 🧠 **Onboarding tour** — a short first-visit walkthrough explains how
  auto-fill, manual entry, and local persistence work.

## Tech stack

- [Next.js 16](https://nextjs.org/) (App Router, Turbopack) + [React 19](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS v4](https://tailwindcss.com/) (CSS-first config, `@theme inline`)
- [Framer Motion](https://www.framer.com/motion/) for spring-based animation
- [Lucide](https://lucide.dev/) icons
- [Google Gemini](https://ai.google.dev/) (`@google/genai`) for AI auto-fill
- Local-first persistence via `localStorage` — no backend database

## Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

The calculator works fully with **zero setup**.

### AI auto-fill (free)

If you (the deployer) set a `GEMINI_API_KEY`, auto-fill works out of the box
for every visitor — no key required on their end. Google's free tier gives
1,500 requests/day with no credit card, which easily covers a class or campus.

1. Get a free Gemini API key (no credit card) at
   <https://aistudio.google.com/apikey>.
2. Copy the example env file and paste your key:
   ```bash
   cp .env.example .env.local
   ```
   Then set `GEMINI_API_KEY=your_key_here` in `.env.local`.
3. Restart `npm run dev`.

If that shared key ever hits its daily limit (e.g. finals week traffic), the
app degrades gracefully: it tells the user the shared server is busy and lets
them either paste their own free Gemini key (saved only in their browser,
sent once per request, never stored server-side) or enter grades manually.
Auto-fill also works with **no `GEMINI_API_KEY` set at all** — users just add
their own key from the start.

## Deploy free on Vercel

1. Push this repo to GitHub.
2. Import it at <https://vercel.com/new> (the free Hobby plan is plenty).
3. To enable auto-fill in production, add an environment variable in the
   Vercel project settings: `GEMINI_API_KEY` = your key.
4. Deploy. Done.

## How the math works

- **Current grade** = weighted average over the categories you've actually
  been graded in, renormalized by the graded weight.
- **What you need** solves `total × target = lockedPoints + needed × weight`
  for `needed`, treating other ungraded categories as 0% (a worst-case
  answer). If the result is ≤ 0 you've already secured it; if it's > 100 it's
  not reachable.

## Project structure

```
app/
  page.tsx          — main UI: hero, course list, course detail view
  globals.css       — design tokens, theme, glass/specular effects
  api/parse/route.ts — Gemini-backed syllabus/screenshot parser
components/
  CourseDetail.tsx  — categories table, target-grade solver, results
  Autofill.tsx      — AI auto-fill modal (upload + review flow)
  ApiKeyDialog.tsx  — manage your own Gemini API key
  Welcome.tsx       — first-visit onboarding modal
  ui.tsx            — shared primitives (Button, Card, GlassPanel, etc.)
lib/
  grades.ts         — grade math (current grade, needed score)
  types.ts          — shared types
  springs.ts        — shared Framer Motion spring presets
  useCourses.ts / useApiKey.ts / useOnboarding.ts — localStorage-backed hooks
```

## Contributing

PRs and issues are welcome!

1. Fork the repo and clone your fork.
2. `npm install` then `npm run dev` to run it locally.
3. Make your change. Keep it dependency-light and consistent with the
   existing style (Tailwind utility classes, Framer Motion springs from
   `lib/springs.ts`, shared primitives from `components/ui.tsx`).
4. Run `npx tsc --noEmit` and `npm run build` to make sure everything still
   type-checks and builds.
5. Open a pull request describing what changed and why.

Good places to start: UI polish, accessibility fixes, new letter-grade
scales/locales, or improvements to the AI auto-fill prompt/parsing in
`app/api/parse/route.ts`.

## License

[MIT](./LICENSE) — do whatever you want with it, just keep the license
notice.
