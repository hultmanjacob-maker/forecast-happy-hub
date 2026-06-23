import { addDays, format, getISOWeek, getISOWeekYear, setISOWeek, setISOWeekYear, startOfISOWeek } from "date-fns";

export const SKIP_WEEKS = [29, 30, 31];

export type WeekId = { year: number; week: number };

export function currentWeekId(date = new Date()): WeekId {
  let id: WeekId = { year: getISOWeekYear(date), week: getISOWeek(date) };
  if (SKIP_WEEKS.includes(id.week)) id = nextWeek(id);
  return id;
}

export function weekStart(id: WeekId): Date {
  const d = setISOWeek(setISOWeekYear(new Date(), id.year), id.week);
  return startOfISOWeek(d);
}

export function weekRangeLabel(id: WeekId): string {
  const start = weekStart(id);
  const end = addDays(start, 6);
  const sameMonth = start.getMonth() === end.getMonth();
  if (sameMonth) {
    return `${format(start, "MMM d")}–${format(end, "d, yyyy")}`;
  }
  return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
}

function weeksInISOYear(year: number): number {
  // Use Dec 28: always in the last ISO week of its ISO year
  return getISOWeek(new Date(year, 11, 28));
}

export function nextWeek({ year, week }: WeekId): WeekId {
  let y = year;
  let w = week + 1;
  if (w > weeksInISOYear(y)) {
    y += 1;
    w = 1;
  }
  if (SKIP_WEEKS.includes(w)) return nextWeek({ year: y, week: w });
  return { year: y, week: w };
}

export function prevWeek({ year, week }: WeekId): WeekId {
  let y = year;
  let w = week - 1;
  if (w < 1) {
    y -= 1;
    w = weeksInISOYear(y);
  }
  if (SKIP_WEEKS.includes(w)) return prevWeek({ year: y, week: w });
  return { year: y, week: w };
}

export function weekKey(id: WeekId): string {
  return `${id.year}-W${String(id.week).padStart(2, "0")}`;
}

export function formatDKK(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "";
  return new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency: "DKK",
    maximumFractionDigits: 0,
  }).format(value);
}
