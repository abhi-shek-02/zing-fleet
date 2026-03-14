export interface Driver {
  id: string;
  name: string;
  phone: string;
  carId: string;
  commissionPercent: number;
  status: "active" | "inactive";
}

export interface Car {
  id: string;
  number: string;
  model: string;
  fuelType: string;
  expectedMileage: number;
  status: "active" | "inactive";
}

export interface CashEntry {
  id: string;
  driverId: string;
  carId: string;
  weekStart: string; // ISO date string of Monday
  date: string;
  amount: number;
  source: "savari" | "direct" | "other";
  notes?: string;
}

export interface VendorEntry {
  id: string;
  driverId: string;
  carId: string;
  weekStart: string;
  date: string;
  amount: number;
  bookingId?: string;
  notes?: string;
}

export interface FuelEntry {
  id: string;
  driverId: string;
  carId: string;
  weekStart: string;
  date: string;
  cost: number;
  liters: number;
  odometer: number;
  station?: string;
  notes?: string;
}

export interface OtherCostEntry {
  id: string;
  driverId: string;
  carId: string;
  weekStart: string;
  date: string;
  amount: number;
  costType: "toll" | "parking" | "maintenance" | "other";
  notes?: string;
}

export interface Settlement {
  id: string;
  driverId: string;
  weekStart: string;
  date: string;
  amount: number;
  type: "full" | "partial";
  paymentMode?: "upi" | "bank" | "cash";
  notes?: string;
  proofUrl?: string;
}

export interface WeekSession {
  start: string; // ISO Monday
  end: string;   // ISO Sunday
  label: string;
  locked: boolean;
}
