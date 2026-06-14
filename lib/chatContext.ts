import type { Course } from "./types";
import type { Profile } from "./useProfile";
import {
  currentGrade,
  letterFor,
  type CourseStatus,
  courseStatus,
} from "./grades";
import {
  DEFAULT_CREDITS,
  cumulativeGPA,
  effectiveGrade,
  gpaPointsFor,
  semesterGPA,
} from "./gpa";
import { courseReality, gpaRange } from "./reality";
import { DEFAULT_SCALE } from "./scale";
import { termNoun, type TermSystem } from "./terms";

const r1 = (n: number | null) =>
  n === null || Number.isNaN(n) ? null : Math.round(n * 10) / 10;
const r2 = (n: number | null) =>
  n === null || Number.isNaN(n) ? null : Math.round(n * 100) / 100;

/**
 * A compact, fully-computed snapshot of the student's grades for the chat
 * assistant. Everything the model might need is precomputed here so it answers
 * from real numbers instead of doing (and fumbling) the math itself.
 */
export function buildGradeContext(
  termCourses: Course[],
  allCourses: Course[],
  system: TermSystem,
  profile: Profile,
): string {
  const noun = termNoun(system);
  const sem = semesterGPA(termCourses);
  const allSem = semesterGPA(allCourses);
  const cum = cumulativeGPA(
    profile.priorGPA ?? 0,
    profile.priorCredits ?? 0,
    allSem,
  );
  const range = gpaRange(termCourses);

  const courses = termCourses.map((course) => {
    const scale = course.gradingScale;
    const tiers = scale ?? DEFAULT_SCALE;
    const cur = currentGrade(course.categories);
    const proj = effectiveGrade(course);
    const reality = courseReality(course);
    const status: CourseStatus = courseStatus(
      course.categories,
      course.targetGrade ?? 90,
    );
    return {
      name: course.name,
      units: course.credits ?? DEFAULT_CREDITS,
      countsTowardGPA: course.includeInGPA ?? true,
      currentGrade: r1(cur),
      projectedGrade: r1(proj),
      projectedLetter: proj !== null ? letterFor(proj, scale) : null,
      projectedGpaPoints: proj !== null ? gpaPointsFor(proj, scale) : null,
      worstCase: r1(reality.floor),
      worstCaseLetter: reality.floorLetter,
      bestCase: r1(reality.ceiling),
      bestCaseLetter: reality.ceilingLetter,
      letterDecided: reality.decided,
      canStillFail: reality.canStillFail,
      status,
      targetGrade: course.targetGrade ?? 90,
      // The exact percent each letter requires in THIS course — use these for
      // any "can I get an X" question, not assumed cutoffs.
      gradeCutoffs: tiers.map((t) => `${t.letter}≥${t.min}%`).join(", "),
      categories: course.categories.map((c) => ({
        name: c.name,
        weightPercent: c.weight,
        score: c.score,
        graded: c.score !== null && c.score !== undefined,
      })),
    };
  });

  const context = {
    termType: noun,
    gpaScale: "4.0",
    semesterGPA: r2(sem.gpa),
    gradedUnitsThisTerm: sem.credits,
    cumulativeGPA: r2(cum.gpa),
    targetCumulativeGPA: profile.targetCumulativeGPA,
    worstCaseTermGPA: r2(range.worst),
    bestCaseTermGPA: r2(range.best),
    coursesLockedIn: range.lockedCount,
    coursesStillInPlay: range.inPlayCount,
    notes:
      "currentGrade = weighted average of graded categories. projectedGrade assumes ungraded work continues at the current average. worstCase assumes 0 on everything ungraded; bestCase assumes 100. There are NO due dates or deadlines in this data.",
    courses,
  };

  return JSON.stringify(context);
}
