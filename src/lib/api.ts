/**
 * ZingCab Fleet — API Client
 * 
 * Pre-configured fetch wrapper pointing to the backend.
 * When VITE_API_URL is not set, falls back to localStorage (current behavior).
 */

const API_BASE = import.meta.env.VITE_API_URL || "";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    const json: ApiResponse<T> = await res.json();

    if (!res.ok || !json.success) {
      throw new Error(json.error || `API error: ${res.status}`);
    }

    return json.data;
  }

  // ─── Drivers ─────────────────────────────────────────
  getDrivers() { return this.request("/api/drivers"); }
  getDriver(id: string) { return this.request(`/api/drivers/${id}`); }
  createDriver(body: Record<string, unknown>) { return this.request("/api/drivers", { method: "POST", body: JSON.stringify(body) }); }
  updateDriver(id: string, body: Record<string, unknown>) { return this.request(`/api/drivers/${id}`, { method: "PUT", body: JSON.stringify(body) }); }
  deleteDriver(id: string) { return this.request(`/api/drivers/${id}`, { method: "DELETE" }); }

  // ─── Cars ────────────────────────────────────────────
  getCars() { return this.request("/api/cars"); }
  getCar(id: string) { return this.request(`/api/cars/${id}`); }
  createCar(body: Record<string, unknown>) { return this.request("/api/cars", { method: "POST", body: JSON.stringify(body) }); }
  updateCar(id: string, body: Record<string, unknown>) { return this.request(`/api/cars/${id}`, { method: "PUT", body: JSON.stringify(body) }); }
  deleteCar(id: string) { return this.request(`/api/cars/${id}`, { method: "DELETE" }); }

  // ─── Cash Entries ────────────────────────────────────
  getCashEntries(params?: { driver_id?: string; week_start?: string }) {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return this.request(`/api/cash?${qs}`);
  }
  createCashEntry(body: Record<string, unknown>) { return this.request("/api/cash", { method: "POST", body: JSON.stringify(body) }); }
  deleteCashEntry(id: string) { return this.request(`/api/cash/${id}`, { method: "DELETE" }); }

  // ─── Vendor Entries ──────────────────────────────────
  getVendorEntries(params?: { driver_id?: string; week_start?: string }) {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return this.request(`/api/vendor?${qs}`);
  }
  createVendorEntry(body: Record<string, unknown>) { return this.request("/api/vendor", { method: "POST", body: JSON.stringify(body) }); }
  deleteVendorEntry(id: string) { return this.request(`/api/vendor/${id}`, { method: "DELETE" }); }

  // ─── Fuel Entries ────────────────────────────────────
  getFuelEntries(params?: { driver_id?: string; week_start?: string; car_id?: string }) {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return this.request(`/api/fuel?${qs}`);
  }
  createFuelEntry(body: Record<string, unknown>) { return this.request("/api/fuel", { method: "POST", body: JSON.stringify(body) }); }
  deleteFuelEntry(id: string) { return this.request(`/api/fuel/${id}`, { method: "DELETE" }); }

  // ─── Other Costs ─────────────────────────────────────
  getOtherCosts(params?: { driver_id?: string; week_start?: string }) {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return this.request(`/api/other-costs?${qs}`);
  }
  createOtherCost(body: Record<string, unknown>) { return this.request("/api/other-costs", { method: "POST", body: JSON.stringify(body) }); }
  deleteOtherCost(id: string) { return this.request(`/api/other-costs/${id}`, { method: "DELETE" }); }

  // ─── Other Earnings ──────────────────────────────────
  getOtherEarnings(params?: { driver_id?: string; week_start?: string }) {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return this.request(`/api/other-earnings?${qs}`);
  }
  createOtherEarning(body: Record<string, unknown>) { return this.request("/api/other-earnings", { method: "POST", body: JSON.stringify(body) }); }
  deleteOtherEarning(id: string) { return this.request(`/api/other-earnings/${id}`, { method: "DELETE" }); }

  // ─── Settlements ─────────────────────────────────────
  getSettlements(params?: { driver_id?: string; week_start?: string }) {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return this.request(`/api/settlements?${qs}`);
  }
  createSettlement(body: Record<string, unknown>) { return this.request("/api/settlements", { method: "POST", body: JSON.stringify(body) }); }
  deleteSettlement(id: string) { return this.request(`/api/settlements/${id}`, { method: "DELETE" }); }

  // ─── Car Costs ───────────────────────────────────────
  getCarCosts(params?: { car_id?: string }) {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return this.request(`/api/car-costs?${qs}`);
  }
  createCarCost(body: Record<string, unknown>) { return this.request("/api/car-costs", { method: "POST", body: JSON.stringify(body) }); }
  deleteCarCost(id: string) { return this.request(`/api/car-costs/${id}`, { method: "DELETE" }); }

  // ─── Car Documents ───────────────────────────────────
  getCarDocs(params?: { car_id?: string }) {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return this.request(`/api/car-docs?${qs}`);
  }
  createCarDoc(body: Record<string, unknown>) { return this.request("/api/car-docs", { method: "POST", body: JSON.stringify(body) }); }
  deleteCarDoc(id: string) { return this.request(`/api/car-docs/${id}`, { method: "DELETE" }); }

  // ─── Analytics ───────────────────────────────────────
  getFleetSummary() { return this.request("/api/analytics/fleet-summary"); }
  getWeeklyAnalytics(weekStart: string) { return this.request(`/api/analytics/weekly?week_start=${weekStart}`); }
  getDriverAnalytics(driverId: string, weekStart: string) { return this.request(`/api/analytics/driver/${driverId}?week_start=${weekStart}`); }
  getMileageData(carId?: string) { return this.request(`/api/analytics/mileage${carId ? `?car_id=${carId}` : ""}`); }

  // ─── Settings ────────────────────────────────────────
  getSettings() { return this.request("/api/settings"); }
  updateSettings(body: Record<string, unknown>) { return this.request("/api/settings", { method: "PUT", body: JSON.stringify(body) }); }

  // ─── Auth ────────────────────────────────────────────
  login(pin: string) { return this.request("/api/auth/login", { method: "POST", body: JSON.stringify({ pin }) }); }

  // ─── Health ──────────────────────────────────────────
  healthCheck() { return this.request("/health"); }
}

export const api = new ApiClient(API_BASE);
