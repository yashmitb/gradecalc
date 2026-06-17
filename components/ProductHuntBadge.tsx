"use client";

import { useTheme } from "@/lib/useTheme";

const POST_ID = 1170511;
const HREF =
  "https://www.producthunt.com/products/gradehq-what-do-you-need-on-the-final?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-gradehq-what-do-you-need-on-the-final";

/**
 * Product Hunt "featured" badge. The SVG comes in light/dark variants, so we
 * request the one matching the current theme. Before hydration we fall back to
 * dark (the app's default), which avoids a hydration mismatch.
 */
export function ProductHuntBadge() {
  const { resolved, ready } = useTheme();
  const theme = ready && resolved === "light" ? "light" : "dark";
  return (
    <a
      href={HREF}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block"
      aria-label="GradeHQ on Product Hunt"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=${POST_ID}&theme=${theme}`}
        alt="GradeHQ — What do you need on the final? - Drop the syllabus. Know your grades. Keep your privacy. | Product Hunt"
        width={250}
        height={54}
      />
    </a>
  );
}
