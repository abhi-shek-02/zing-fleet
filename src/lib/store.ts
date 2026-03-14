import type { Driver, Car, CashEntry, VendorEntry, FuelEntry, OtherCostEntry, Settlement } from "@/types";

const KEYS = {
  drivers: "zingcab_drivers",
  cars: "zingcab_cars",
  cash: "zingcab_cash",
  vendor: "zingcab_vendor",
  fuel: "zingcab_fuel",
  otherCosts: "zingcab_othercosts",
  settlements: "zingcab_settlements",
  auth: "zingcab_auth",
  settings: "zingcab_settings",
};

function get<T>(key: string): T[] {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

function set<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// Auth
export function isAuthenticated(): boolean {
  return localStorage.getItem(KEYS.auth) === "true";
}
export function login(pin: string): boolean {
  if (pin === "1234") {
    localStorage.setItem(KEYS.auth, "true");
    return true;
  }
  return false;
}
export function logout(): void {
  localStorage.removeItem(KEYS.auth);
}

// Settings
export function getSettings(): { fuelThreshold: number } {
  const s = localStorage.getItem(KEYS.settings);
  return s ? JSON.parse(s) : { fuelThreshold: 10 };
}
export function saveSettings(settings: { fuelThreshold: number }): void {
  localStorage.setItem(KEYS.settings, JSON.stringify(settings));
}

// Drivers
export function getDrivers(): Driver[] { return get<Driver>(KEYS.drivers); }
export function saveDrivers(d: Driver[]): void { set(KEYS.drivers, d); }

// Cars
export function getCars(): Car[] { return get<Car>(KEYS.cars); }
export function saveCars(c: Car[]): void { set(KEYS.cars, c); }

// Cash Entries
export function getCashEntries(): CashEntry[] { return get<CashEntry>(KEYS.cash); }
export function saveCashEntries(e: CashEntry[]): void { set(KEYS.cash, e); }

// Vendor Entries
export function getVendorEntries(): VendorEntry[] { return get<VendorEntry>(KEYS.vendor); }
export function saveVendorEntries(e: VendorEntry[]): void { set(KEYS.vendor, e); }

// Fuel Entries
export function getFuelEntries(): FuelEntry[] { return get<FuelEntry>(KEYS.fuel); }
export function saveFuelEntries(e: FuelEntry[]): void { set(KEYS.fuel, e); }

// Other Cost Entries
export function getOtherCostEntries(): OtherCostEntry[] { return get<OtherCostEntry>(KEYS.otherCosts); }
export function saveOtherCostEntries(e: OtherCostEntry[]): void { set(KEYS.otherCosts, e); }

// Settlements
export function getSettlements(): Settlement[] { return get<Settlement>(KEYS.settlements); }
export function saveSettlements(s: Settlement[]): void { set(KEYS.settlements, s); }
