export const DAY = 86400000;

export const parseISO = (s: string): Date => new Date(s + "T00:00:00");

export const toISO = (dt: Date): string =>
  `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(
    dt.getDate(),
  ).padStart(2, "0")}`;

export const fmt = (dt: Date): string =>
  dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });

export const addDays = (dt: Date, n: number): Date =>
  new Date(dt.getTime() + n * DAY);

/** Working-day-aware helper: is this a Saturday/Sunday. */
export const isWeekend = (dt: Date): boolean => {
  const wd = dt.getDay();
  return wd === 0 || wd === 6;
};

/** Calendar-day diff (b - a is not it; this is a - b in days, matching prototype's diffDays(a,b)). */
export const diffDays = (a: Date, b: Date): number =>
  Math.round((a.getTime() - b.getTime()) / DAY);

export const clone = <T>(o: T): T => JSON.parse(JSON.stringify(o));
