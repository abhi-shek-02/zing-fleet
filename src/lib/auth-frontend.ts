import { differenceInCalendarDays, parseISO } from "date-fns";

/** Hardcoded PINs (frontend only — backend unchanged). */
export const PIN_ADMIN = "superuser1234";
export const PIN_STAFF = "zingfleet";

export type UserRole = "admin" | "staff";

export function resolveRoleFromPin(pin: string): UserRole | null {
  if (pin === PIN_ADMIN) return "admin";
  if (pin === PIN_STAFF) return "staff";
  return null;
}

/** Weeks whose Monday is 14+ calendar days ago cannot be deleted from the UI (even admin). */
export function isFinancialWeekLockedForDeletion(weekStart: string): boolean {
  if (!weekStart) return true;
  try {
    const ws = parseISO(weekStart);
    if (Number.isNaN(ws.getTime())) return true;
    return differenceInCalendarDays(new Date(), ws) >= 14;
  } catch {
    return true;
  }
}

export function canDeleteFinancialRow(role: UserRole | null, weekStart: string): boolean {
  if (role !== "admin") return false;
  return !isFinancialWeekLockedForDeletion(weekStart);
}
