export interface Driver {
  id: string;
  name: string;
  phone: string;
  carId: string;
  settlementMode: "commission_30" | "profit_share_50";
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

export interface CarCost {
  id: string;
  carId: string;
  date: string;
  amount: number;
  costType: "maintenance" | "cf" | "puc" | "tax" | "insurance" | "other";
  notes?: string;
}

export interface CarDocument {
  id: string;
  carId: string;
  docType: "rc" | "insurance" | "puc" | "permit" | "fitness" | "other";
  docName: string;
  expiryDate?: string;
  notes?: string;
  fileData?: string; // base64 data URL
  fileName?: string;
}

export interface CashEntry {
  id: string;
  driverId: string;
  carId: string;
  weekStart: string;
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

export interface OtherEarningEntry {
  id: string;
  driverId: string;
  carId: string;
  weekStart: string;
  date: string;
  amount: number;
  source: string;
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
  proofData?: string; // base64 data URL for payment screenshot
  proofFileName?: string;
}

export interface WeekSession {
  start: string;
  end: string;
  label: string;
  locked: boolean;
}
