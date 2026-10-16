// Períodos são dias civis em Paragominas (America/Belem), não janelas móveis de 24h.
export type ResultsRange = { startDate: string; endDate: string };
export type ResultsPreset = "today" | "yesterday" | "last7" | "last30" | "last90" | "custom";
const BELEM_ZONE = "America/Belem";
const DAY_MS = 24 * 60 * 60 * 1000;

export function belemToday(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BELEM_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const value = (type: string) => parts.find(item => item.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function validCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function shiftCalendarDay(value: string, amount: number): string {
  if (!validCalendarDate(value) || !Number.isInteger(amount)) {
    throw new Error("Data de calendário inválida.");
  }
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function resultsPresetRange(
  preset: Exclude<ResultsPreset, "custom">, today = belemToday(),
): ResultsRange {
  const offset = preset === "today" ? 0
    : preset === "yesterday" ? -1
    : preset === "last7" ? -6
    : preset === "last30" ? -29 : -89;
  if (preset === "yesterday") {
    const day = shiftCalendarDay(today, -1);
    return { startDate: day, endDate: day };
  }
  return { startDate: shiftCalendarDay(today, offset), endDate: today };
}

export function resultsRangeError(
  range: ResultsRange, today = belemToday(),
): string | null {
  if (!validCalendarDate(range.startDate) || !validCalendarDate(range.endDate)) {
    return "Informe uma data inicial e uma data final válidas.";
  }
  if (range.startDate > range.endDate) return "A data inicial não pode ser posterior à final.";
  if (range.endDate > today) return "A data final não pode ser futura.";
  const span = (Date.parse(`${range.endDate}T12:00:00Z`) -
    Date.parse(`${range.startDate}T12:00:00Z`)) / DAY_MS + 1;
  if (span > 3660) return "Selecione um intervalo de até 3.660 dias.";
  return null;
}

export function formatResultsRange(range: ResultsRange): string {
  const format = (value: string) => {
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
  };
  return range.startDate === range.endDate
    ? format(range.startDate)
    : `${format(range.startDate)} a ${format(range.endDate)}`;
}
