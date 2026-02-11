import type { DateInfo } from "@/types";

export function getJstDateParts(date = new Date()): {
  y: string;
  m: string;
  d: string;
} {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [y, m, d] = fmt.format(date).split("-");
  return { y, m, d };
}

export function resolveDateInfo(inputDate?: string): DateInfo {
  if (inputDate) {
    const [y, m, d] = inputDate.split("-");
    if (!y || !m || !d) {
      throw new Error(`Invalid date format in input.json: ${inputDate}`);
    }
    return {
      y,
      m,
      d,
      iso: `${y}-${m}-${d}`,
      compact: `${y}${m}${d}`,
    };
  }
  const { y, m, d } = getJstDateParts();
  return { y, m, d, iso: `${y}-${m}-${d}`, compact: `${y}${m}${d}` };
}

export function getJstIsoDate(date = new Date()): string {
  const { y, m, d } = getJstDateParts(date);
  return `${y}-${m}-${d}`;
}
