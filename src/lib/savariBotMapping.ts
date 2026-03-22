import type { OutstationRoute, TripToggleId } from "@/data/savariBotDummy";

export type SavariBotConfigRow = Record<string, unknown>;

export type SavariBotSnapshot = {
  config: SavariBotConfigRow | null;
  routes: SavariBotConfigRow[];
};

export type SavariUiState = {
  toggles: Record<TripToggleId, boolean>;
  routesOut: OutstationRoute[];
  routesIn: OutstationRoute[];
  roundTrip: {
    minCostPerKm: number;
    minCostPerDay: number;
    mileageKmPerL: number;
    fuelCostPerL: number;
  };
  rental: { min8h80km: number; min4h40km: number };
  botConfig: {
    pollingIntervalMs: number;
    vendorId: string;
    apiUrl: string;
    carTypes: string;
  };
  vendorLocation: string;
};

function n(v: unknown, d: number): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : d;
}

function b(v: unknown, d: boolean): boolean {
  return typeof v === "boolean" ? v : d;
}

export function applySnapshot(snapshot: SavariBotSnapshot): SavariUiState {
  const cfg = snapshot.config;
  if (!cfg) {
    throw new Error("No bot config in database — run seed_savari_bot.sql or save once.");
  }

  const c = cfg as Record<string, unknown>;
  const toggles: Record<TripToggleId, boolean> = {
    outstation_oneway: b(c.tripOutstationOneway, false),
    outstation_round: b(c.tripOutstationRound, false),
    local_rental: b(c.tripLocalRental, false),
    airport_transfer: b(c.tripAirportTransfer, false),
  };

  const routesOut: OutstationRoute[] = [];
  const routesIn: OutstationRoute[] = [];

  for (const r of snapshot.routes || []) {
    const row = r as Record<string, unknown>;
    const id = String(row.id ?? "");
    const city = String(row.city ?? "").trim();
    const minCost = n(row.minCostInr ?? row.min_cost_inr, 0);
    const enabled = Boolean(row.enabled);
    const direction = String(row.direction ?? "");
    const rec: OutstationRoute = { id, city, minCost, enabled };
    if (direction === "kolkata_out") routesOut.push(rec);
    else if (direction === "into_kolkata") routesIn.push(rec);
  }

  return {
    toggles,
    routesOut,
    routesIn,
    roundTrip: {
      minCostPerKm: n(c.roundMinCostPerKm, 0),
      minCostPerDay: n(c.roundMinCostPerDay, 0),
      mileageKmPerL: n(c.roundMileageKmPerL, 0),
      fuelCostPerL: n(c.roundFuelCostPerL, 0),
    },
    rental: {
      min8h80km: n(c.rentalMin8h80km, 0),
      min4h40km: n(c.rentalMin4h40km, 0),
    },
    botConfig: {
      pollingIntervalMs: n(c.pollingIntervalMs, 0),
      vendorId: String(c.vendorId ?? ""),
      apiUrl: String(c.apiUrl ?? ""),
      carTypes: String(c.carTypesCsv ?? ""),
    },
    vendorLocation: c.vendorLocation != null ? String(c.vendorLocation) : "",
  };
}

export function buildSavariPutBody(
  vendorLocation: string,
  ui: Omit<SavariUiState, "vendorLocation">,
): { config: Record<string, unknown>; routes: Record<string, unknown>[] } {
  const { toggles, routesOut, routesIn, roundTrip, rental, botConfig } = ui;

  const routes: Record<string, unknown>[] = [
    ...routesOut.map((r, i) => ({
      direction: "kolkata_out",
      city: r.city.trim(),
      min_cost_inr: r.minCost,
      enabled: r.enabled,
      sort_order: i,
    })),
    ...routesIn.map((r, i) => ({
      direction: "into_kolkata",
      city: r.city.trim(),
      min_cost_inr: r.minCost,
      enabled: r.enabled,
      sort_order: i,
    })),
  ].filter((x) => String(x.city).length > 0);

  return {
    config: {
      vendor_id: botConfig.vendorId,
      vendor_location: vendorLocation,
      polling_interval_ms: botConfig.pollingIntervalMs,
      api_url: botConfig.apiUrl || "",
      car_types_csv: botConfig.carTypes,
      trip_outstation_oneway: toggles.outstation_oneway,
      trip_outstation_round: toggles.outstation_round,
      trip_local_rental: toggles.local_rental,
      trip_airport_transfer: toggles.airport_transfer,
      round_min_cost_per_km: roundTrip.minCostPerKm,
      round_min_cost_per_day: roundTrip.minCostPerDay,
      round_mileage_km_per_l: roundTrip.mileageKmPerL,
      round_fuel_cost_per_l: roundTrip.fuelCostPerL,
      rental_min_8h_80km: rental.min8h80km,
      rental_min_4h_40km: rental.min4h40km,
    },
    routes,
  };
}

export function countEnabledRoutes(routesOut: OutstationRoute[], routesIn: OutstationRoute[]): number {
  return [...routesOut, ...routesIn].filter((r) => r.enabled).length;
}
