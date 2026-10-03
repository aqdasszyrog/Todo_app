// Helpers for due dates, which are plain calendar days ("YYYY-MM-DD").
// "Today" must come from the user's own clock (see hooks/use-today.ts), not
// the server's, or a task could show as overdue hours early or late.

export type DueStatus = "overdue" | "today" | "upcoming";

const DAY_MS = 24 * 60 * 60 * 1000;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** The device's current local date as "YYYY-MM-DD". */
export function localDateString(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Whole days from `today` to `date` (negative when `date` is in the past). */
function daysBetween(today: string, date: string) {
  return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY_MS);
}

export function dueStatus(dueDate: string, today: string): DueStatus {
  const days = daysBetween(today, dueDate);
  return days < 0 ? "overdue" : days === 0 ? "today" : "upcoming";
}

/** "Today", "Tomorrow", "Yesterday", "5 Oct", or "5 Oct 2027" for other years. */
export function formatDueDate(dueDate: string, today: string | null) {
  if (today) {
    const days = daysBetween(today, dueDate);
    if (days === 0) return "Today";
    if (days === 1) return "Tomorrow";
    if (days === -1) return "Yesterday";
  }
  const date = new Date(`${dueDate}T00:00:00Z`);
  const sameYear = today ? today.slice(0, 4) === dueDate.slice(0, 4) : true;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: sameYear ? undefined : "numeric",
    timeZone: "UTC",
  });
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * DAY_MS],
  ["month", 30 * DAY_MS],
  ["week", 7 * DAY_MS],
  ["day", DAY_MS],
  ["hour", 60 * 60 * 1000],
  ["minute", 60 * 1000],
];

/** "just now", "5 minutes ago", "yesterday"… Call it on the client only. */
export function timeAgo(iso: string, now = Date.now()) {
  const elapsed = Date.parse(iso) - now;
  const format = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, ms] of RELATIVE_UNITS) {
    if (Math.abs(elapsed) >= ms) return format.format(Math.round(elapsed / ms), unit);
  }
  return "just now";
}
