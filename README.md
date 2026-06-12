# GradeCalc — Beat the Final Boss 🗡️

A clean, dark-mode grade calculator for college students. Enter your courses and
grades, then find out **the exact score you need on the final** to lock in the
grade you want.

- ⚡ **Free & private** — all your grades live in your browser (localStorage). No
  account, no database, no tracking.
- 🎯 **"What do I need on the final?"** — pick a target (A, B+, custom %) and a
  category, and it solves for the score you need.
- ✨ **AI auto-fill (optional)** — drop in your syllabus PDF and/or a screenshot
  of your Canvas grades, and it fills in the categories, weights, and scores for
  you. Powered by Google Gemini's **free** API tier.

## Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

The calculator works fully with **zero setup**. The AI auto-fill is the only
part that needs a key.

### Enable AI auto-fill (free, optional)

1. Get a free Gemini API key (no credit card) at
   <https://aistudio.google.com/apikey>.
2. Copy the example env file and paste your key:
   ```bash
   cp .env.example .env.local
   ```
   Then set `GEMINI_API_KEY=your_key_here` in `.env.local`.
3. Restart `npm run dev`.

Your key stays on the server (the `/api/parse` route) and is never exposed to
the browser.

## Deploy free on Vercel

1. Push this folder to a GitHub repo.
2. Import it at <https://vercel.com/new> (the free Hobby plan is plenty).
3. To enable auto-fill in production, add an environment variable in the Vercel
   project settings: `GEMINI_API_KEY` = your key.
4. Deploy. Done.

## How the math works

- **Current grade** = weighted average over the categories you've actually been
  graded in, renormalized by the graded weight.
- **What you need** solves `total × target = lockedPoints + needed × weight` for
  `needed`, treating other ungraded categories as 0% (a worst-case answer). If
  the result is ≤ 0 you've already secured it; if it's > 100 it's not reachable.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Google Gemini
(`@google/genai`) · lucide-react. Design system from the UI/UX Pro Max skill
("Operation orange on dark").
