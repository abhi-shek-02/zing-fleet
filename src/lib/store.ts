// Auth store — role from frontend PIN flow; data still loads from API as today.
import type { UserRole } from "@/lib/auth-frontend";

const AUTH_KEY = "zingcab_auth";
const ROLE_KEY = "zingcab_role";

export function getRole(): UserRole | null {
  const r = localStorage.getItem(ROLE_KEY);
  if (r === "admin" || r === "staff") return r;
  return null;
}

export function isAuthenticated(): boolean {
  return localStorage.getItem(AUTH_KEY) === "true" && getRole() !== null;
}

export function setSession(role: UserRole): void {
  localStorage.setItem(AUTH_KEY, "true");
  localStorage.setItem(ROLE_KEY, role);
}

export function logout(): void {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(ROLE_KEY);
}
