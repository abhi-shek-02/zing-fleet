// Auth-only store — all data now comes from the backend API
const AUTH_KEY = "zingcab_auth";

export function isAuthenticated(): boolean {
  return localStorage.getItem(AUTH_KEY) === "true";
}

export function login(pin: string): boolean {
  // Client-side check removed — use api.login() and set flag on success
  if (pin) {
    localStorage.setItem(AUTH_KEY, "true");
    return true;
  }
  return false;
}

export function setAuthenticated(): void {
  localStorage.setItem(AUTH_KEY, "true");
}

export function logout(): void {
  localStorage.removeItem(AUTH_KEY);
}
