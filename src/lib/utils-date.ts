import { startOfWeek, endOfWeek, format, addWeeks, subWeeks, parseISO, isMonday } from "date-fns";
import type { WeekSession } from "@/types";

export function getWeekStart(date: Date = new Date()): string {
  const monday = startOfWeek(date, { weekStartsOn: 1 });
  return format(monday, "yyyy-MM-dd");
}

export function getWeekEnd(weekStart: string): string {
  const monday = parseISO(weekStart);
  const sunday = endOfWeek(monday, { weekStartsOn: 1 });
  return format(sunday, "yyyy-MM-dd");
}

export function getWeekLabel(weekStart: string): string {
  const start = parseISO(weekStart);
  const end = endOfWeek(start, { weekStartsOn: 1 });
  return `${format(start, "d MMM")} – ${format(end, "d MMM")}`;
}

export function getWeekSessions(count: number = 8): WeekSession[] {
  const sessions: WeekSession[] = [];
  const currentWeekStart = getWeekStart();

  for (let i = 0; i < count; i++) {
    const start = format(subWeeks(parseISO(currentWeekStart), i), "yyyy-MM-dd");
    const end = getWeekEnd(start);
    sessions.push({
      start,
      end,
      label: getWeekLabel(start),
      locked: start < currentWeekStart,
    });
  }

  return sessions;
}

export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function generateId(): string {
  return crypto.randomUUID();
}
