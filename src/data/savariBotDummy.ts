/**
 * Seed data for Savaari Booking Bot dashboard (UI only — replace with API/Supabase later).
 */

export type TripToggleId = "outstation_oneway" | "outstation_round" | "local_rental" | "airport_transfer";

export type RouteDirection = "kolkata_out" | "into_kolkata";

/** `enabled: false` keeps the route configured but excludes it from automation until turned on again. */
export type OutstationRoute = { id: string; city: string; minCost: number; enabled: boolean };

export const DUMMY_VENDOR = {
  id: "175236",
  location: "Kolkata, West Bengal",
};

export const DUMMY_KPIS = {
  bidsToday: 0,
  scanned: 0,
  filteredOut: 0,
  routesActive: 17,
};

export const DUMMY_TRIP_TOGGLES: Record<TripToggleId, boolean> = {
  outstation_oneway: true,
  outstation_round: true,
  local_rental: false,
  airport_transfer: false,
};

export const DUMMY_ROUTES_KOLKATA_OUT: OutstationRoute[] = [
  { id: "1", city: "Kharagpur", minCost: 2000, enabled: true },
  { id: "2", city: "Durgapur", minCost: 3000, enabled: true },
  { id: "3", city: "Asansol", minCost: 3300, enabled: true },
  { id: "4", city: "Digha", minCost: 3000, enabled: true },
  { id: "5", city: "Ranchi", minCost: 7000, enabled: true },
  { id: "6", city: "Jamshedpur", minCost: 4500, enabled: true },
];

export const DUMMY_ROUTES_INTO_KOLKATA: OutstationRoute[] = [
  { id: "a", city: "Kharagpur", minCost: 2100, enabled: true },
  { id: "b", city: "Durgapur", minCost: 3100, enabled: true },
  { id: "c", city: "Asansol", minCost: 3200, enabled: true },
];

export const DUMMY_ROUND_TRIP = {
  minCostPerKm: 15,
  minCostPerDay: 2000,
  mileageKmPerL: 22,
  fuelCostPerL: 94,
};

export const DUMMY_RENTAL = {
  min8h80km: 1950,
  min4h40km: 1200,
};

export const DUMMY_BOT_CONFIG = {
  pollingIntervalMs: 120_000,
  vendorId: "175236",
  apiUrl: "https://vendor.savaari.com/vendor/api/booking/v1/booking.php",
  carTypes: "Toyota Etios or Equivalent, Wagon R or Equivalent",
};

export const DUMMY_ACTIVITY_LOG = [
  "[18:32:56] Poll complete — no new bookings",
];
