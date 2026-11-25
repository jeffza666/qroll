const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export type BangkokParts = {
  year: number;
  month: number;
  day: number;
  dayOfWeek: number;
  hour: number;
  minute: number;
};

const formatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Bangkok",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  weekday: "short",
  hourCycle: "h23",
});

function part(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) {
  return parts.find((item) => item.type === type)?.value ?? "";
}

/** Calendar fields in Asia/Bangkok, independent of the server timezone. */
export function bangkokParts(date: Date): BangkokParts {
  const parts = formatter.formatToParts(date);
  const weekday = part(parts, "weekday");
  const dayOfWeek = WEEKDAY_INDEX[weekday];
  if (dayOfWeek === undefined) {
    throw new Error(`Unexpected weekday from Intl: ${weekday}`);
  }

  return {
    year: Number(part(parts, "year")),
    month: Number(part(parts, "month")),
    day: Number(part(parts, "day")),
    dayOfWeek,
    hour: Number(part(parts, "hour")),
    minute: Number(part(parts, "minute")),
  };
}

export function bangkokDayOfWeek(date: Date) {
  return bangkokParts(date).dayOfWeek;
}

export function formatBangkokTime(date: Date) {
  const { hour, minute } = bangkokParts(date);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function formatBangkokDate(
  date: Date,
  months: readonly string[],
  yearStyle: "buddhist" | "buddhist-short" = "buddhist",
) {
  const { day, month, year } = bangkokParts(date);
  const buddhistYear = year + 543;
  const shownYear =
    yearStyle === "buddhist-short"
      ? String(buddhistYear % 100).padStart(2, "0")
      : String(buddhistYear);
  return `${day} ${months[month - 1]} ${shownYear}`;
}
