/**
 * Rule-based Savaari booking math — no AI. ~60%+ of "analysis" is deterministic
 * from numeric fields + payment labels + trip metadata.
 */

export type SavariSortKey = "urgency" | "earnings" | "rpkm" | "prepaidFirst";

export type ListFilterPill = "all" | "prepaid" | "urgent6h";

/** Exported for detail page + cards — camelCase / snake_case tolerant. */
export function savariPick(row: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) {
    if (k in row && row[k] != null && row[k] !== "") return row[k];
  }
  return undefined;
}

export function findRowByBookingId(
  items: Record<string, unknown>[],
  bookingId: string,
): Record<string, unknown> | undefined {
  return items.find((r) => String(savariPick(r, "bookingId", "booking_id")) === bookingId);
}

function pick(row: Record<string, unknown>, ...keys: string[]): unknown {
  return savariPick(row, ...keys);
}

function num(row: Record<string, unknown>, ...keys: string[]): number {
  const v = pick(row, ...keys);
  if (v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function str(row: Record<string, unknown>, ...keys: string[]): string {
  const v = pick(row, ...keys);
  if (v == null) return "";
  return String(v).trim();
}

/** Parse upstream datetime strings (best-effort). */
function parseWhen(v: unknown): number | null {
  if (v == null || v === "") return null;
  const s = String(v).replace(/\//g, "-");
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : null;
}

function normCity(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/** First segment before comma — e.g. "Kolkata, WB" → "Kolkata" for route title. */
export function cityShort(s: string): string {
  if (!s) return "";
  return s.split(",")[0].trim();
}

/**
 * Fleet policy: only Toyota Etios-class and Wagon R (excludes Crysta / Innova / SUV / Ertiga).
 * Applied once after fetch so totals and averages match the visible list.
 */
export function isFleetAllowedCar(carType: string): boolean {
  const n = carType.toLowerCase();
  if (!n.trim()) return false;
  if (/\binnova\b/i.test(n) || /crysta/i.test(n)) return false;
  if (/\bsuv\b/i.test(n)) return false;
  if (/\bertiga\b/i.test(n)) return false;
  const etios = /\betios\b/i.test(n) && !/crysta/i.test(n);
  const wagon =
    /wagon\s*r/i.test(n) || /wagonr/i.test(n) || (n.includes("wagon") && n.includes("maruti"));
  return etios || wagon;
}

export function filterRowsByFleetCar(items: Record<string, unknown>[]): Record<string, unknown>[] {
  return items.filter((row) => isFleetAllowedCar(str(row as Record<string, unknown>, "carType", "car_type")));
}

/** Resolve cities with extra upstream keys + fallback from address lines (helps grouping). */
function resolveCityFields(row: Record<string, unknown>): {
  pickCity: string;
  dropCity: string;
  pickAddress: string;
  dropAddress: string;
} {
  let pickCity = str(
    row,
    "pickCity",
    "pick_city",
    "pickupCity",
    "pickup_city",
    "fromCity",
    "from_city",
    "from_city_name",
    "trip_start_city_name",
    "start_city",
  );
  let dropCity = str(
    row,
    "dropCity",
    "drop_city",
    "dropCityName",
    "drop_city_name",
    "toCity",
    "to_city",
    "to_city_name",
    "trip_end_city_name",
    "end_city",
  );
  const pickAddress = str(
    row,
    "pickLoc",
    "pick_loc",
    "pickupLoc",
    "pickup_loc",
    "pickup_address",
    "pick_address",
    "pickupAddress",
  );
  const dropAddress = str(
    row,
    "dropLoc",
    "drop_loc",
    "dropoffLoc",
    "drop_address",
    "dropAddress",
    "dropoff_address",
  );
  if (!pickCity && pickAddress) pickCity = cityShort(pickAddress);
  if (!dropCity && dropAddress) dropCity = cityShort(dropAddress);
  return { pickCity, dropCity, pickAddress, dropAddress };
}

export type ParsedBooking = {
  row: Record<string, unknown>;
  bookingId: string;
  vendorCost: number;
  totalAmt: number;
  packageKms: number;
  cashToCollect: number;
  rpKm: number;
  cashRiskPct: number;
  msUntilCancel: number | null;
  hoursLeft: number | null;
  paymentLabel: string;
  isPrepaid: boolean;
  isAdvance: boolean;
  /** Heuristic surge / high demand */
  isSurged: boolean;
  /** Left rail: red <6h expiry, else amber if surged, else none */
  borderAccent: "red" | "amber" | "none";
  /** Timer strip: <3h red, <12h amber, else green */
  timerTone: "red" | "amber" | "green";
  compositeScore: number;
  nightAllowance: number;
  carType: string;
  tripTypeName: string;
  pickCity: string;
  dropCity: string;
  /** "Kolkata → Asansol" using short city names */
  routeTitleShort: string;
  routeLabel: string;
  pickAddress: string;
  dropAddress: string;
  pickupTimeLabel: string;
  autoCancelAtRaw: string;
  tripSubType: number | null;
  rateChangeStep1: string;
  step1At: string;
  step2At: string;
  step3At: string;
};

function paymentPoints(label: string, cashRiskPct: number): number {
  const l = label.toLowerCase();
  if (l.includes("pre") && l.includes("paid")) return 30;
  if (l.includes("advance") || l.includes("partial")) return 18;
  if (cashRiskPct <= 5) return 28;
  if (cashRiskPct <= 40) return 15;
  return Math.max(0, 30 - cashRiskPct * 0.25);
}

function earningsPerKmPoints(rpKm: number, packageKms: number): number {
  if (packageKms <= 0) return 10;
  if (rpKm >= 14) return 25;
  if (rpKm >= 11) return 20;
  if (rpKm >= 8) return 14;
  return Math.max(0, (rpKm / 8) * 14);
}

function rawEarningsPoints(vendorCost: number): number {
  if (vendorCost >= 25_000) return 20;
  if (vendorCost >= 15_000) return 17;
  if (vendorCost >= 8_000) return 14;
  if (vendorCost >= 3_000) return 10;
  return Math.min(20, (vendorCost / 3000) * 10);
}

function surgePoints(isSurged: boolean): number {
  return isSurged ? 10 : 4;
}

/** Diesel / luggage / new-car style constraints — deduct from score */
function vasDeduction(row: Record<string, unknown>): number {
  let d = 0;
  const hay = JSON.stringify(row).toLowerCase();
  if (hay.includes("diesel")) d += 8;
  if (hay.includes("luggage") || hay.includes("carrier")) d += 5;
  if (hay.includes("new car") || hay.includes("new_car")) d += 6;
  return Math.min(25, d);
}

function detectSurge(row: Record<string, unknown>): boolean {
  const rc = num(row, "rateChangeStep1", "rate_change_step1");
  if (rc >= 15) return true;
  const s = str(row, "surgeFlag", "surge_flag", "isSurge", "is_surge");
  if (s === "1" || s.toLowerCase() === "yes" || s.toLowerCase() === "true") return true;
  const tn = str(row, "tripTypeName", "trip_type_name");
  if (/\bsurge/i.test(tn)) return true;
  return false;
}

export function parseBooking(row: Record<string, unknown>): ParsedBooking {
  const vendorCost = num(row, "vendorCost", "vendor_cost");
  const totalAmt = num(row, "totalAmt", "total_amt", "grossAmount", "gross_amount");
  const packageKms = num(row, "packageKms", "package_kms", "totalKms", "total_kms");
  const cashToCollect = num(row, "cashtocollect", "cashToCollect", "cash_to_collect");
  const gross = totalAmt > 0 ? totalAmt : vendorCost + cashToCollect;
  const denom = gross > 0 ? gross : 1;
  const cashRiskPct = Math.min(100, Math.max(0, (cashToCollect / denom) * 100));
  const rpKm = packageKms > 0 ? vendorCost / packageKms : 0;

  const paymentLabel = str(row, "paymentStatus", "payment_status") || "—";
  const l = paymentLabel.toLowerCase();
  const isPrepaid = l.includes("pre") && l.includes("paid");
  const isAdvance = l.includes("advance") || l.includes("partial");

  const autoRaw = str(row, "autoCancelAt", "auto_cancel_at");
  const msUntilCancel = parseWhen(pick(row, "autoCancelAt", "auto_cancel_at"));
  const now = Date.now();
  const hoursLeft =
    msUntilCancel != null ? Math.max(0, (msUntilCancel - now) / 3_600_000) : null;

  const isSurged = detectSurge(row);

  let borderAccent: ParsedBooking["borderAccent"] = "none";
  if (hoursLeft != null && hoursLeft < 6) borderAccent = "red";

  let timerTone: ParsedBooking["timerTone"] = "green";
  if (hoursLeft != null) {
    if (hoursLeft < 3) timerTone = "red";
    else if (hoursLeft < 12) timerTone = "amber";
  }

  const vas = vasDeduction(row);
  const compositeScore = Math.round(
    Math.min(
      100,
      Math.max(
        0,
        paymentPoints(paymentLabel, cashRiskPct) +
          earningsPerKmPoints(rpKm, packageKms) +
          rawEarningsPoints(vendorCost) +
          surgePoints(isSurged) -
          vas,
      ),
    ),
  );

  const tripSubRaw = pick(row, "tripSubType", "trip_sub_type");
  const tripSubType =
    tripSubRaw != null && tripSubRaw !== "" ? Number(tripSubRaw) : null;

  const { pickCity, dropCity, pickAddress, dropAddress } = resolveCityFields(row);
  const ps = cityShort(pickCity);
  const ds = cityShort(dropCity);
  const routeTitleShort =
    ps && ds ? `${ps} → ${ds}` : ps || ds || "—";
  const routeLabel =
    pickCity && dropCity ? `${pickCity} → ${dropCity}` : pickCity || dropCity || routeTitleShort;

  const nightAllowance = num(row, "nightAllowance", "night_allowance", "nightCharge", "night_charge");

  return {
    row,
    bookingId: str(row, "bookingId", "booking_id") || "—",
    vendorCost,
    totalAmt: gross,
    packageKms,
    cashToCollect,
    rpKm,
    cashRiskPct,
    msUntilCancel,
    hoursLeft,
    paymentLabel,
    isPrepaid,
    isAdvance,
    isSurged,
    borderAccent,
    timerTone,
    compositeScore,
    nightAllowance,
    carType: str(row, "carType", "car_type"),
    tripTypeName: str(row, "tripTypeName", "trip_type_name"),
    pickCity,
    dropCity,
    routeTitleShort,
    routeLabel,
    pickAddress,
    dropAddress,
    pickupTimeLabel: str(row, "pickupTime", "pickup_time"),
    autoCancelAtRaw: autoRaw,
    tripSubType,
    rateChangeStep1: str(row, "rateChangeStep1", "rate_change_step1"),
    step1At: str(row, "step1At", "step1_at"),
    step2At: str(row, "step2At", "step2_at"),
    step3At: str(row, "step3At", "step3_at"),
  };
}

export function sortParsedBookings(list: ParsedBooking[], key: SavariSortKey): ParsedBooking[] {
  const copy = [...list];
  const urgency = (p: ParsedBooking) =>
    p.msUntilCancel != null ? p.msUntilCancel : Number.POSITIVE_INFINITY;
  const prepaidRank = (p: ParsedBooking) => (p.isPrepaid ? 0 : 1);

  copy.sort((a, b) => {
    switch (key) {
      case "earnings":
        return b.vendorCost - a.vendorCost;
      case "rpkm":
        return b.rpKm - a.rpKm;
      case "prepaidFirst": {
        const pr = prepaidRank(a) - prepaidRank(b);
        if (pr !== 0) return pr;
        return urgency(a) - urgency(b);
      }
      case "urgency":
      default:
        return urgency(a) - urgency(b);
    }
  });
  return copy;
}

export function filterByPill(list: ParsedBooking[], pill: ListFilterPill): ParsedBooking[] {
  if (pill === "all") return list;
  if (pill === "prepaid") return list.filter((p) => p.isPrepaid);
  if (pill === "urgent6h") return list.filter((p) => p.hoursLeft != null && p.hoursLeft < 6);
  return list;
}

/** Average ₹/km across list (vendor-weighted by km if possible). */
export function listAvgRpKm(list: ParsedBooking[]): number {
  if (list.length === 0) return 0;
  let sumK = 0;
  let sumV = 0;
  for (const p of list) {
    if (p.packageKms > 0) {
      sumK += p.packageKms;
      sumV += p.vendorCost;
    }
  }
  if (sumK <= 0) return list.reduce((s, p) => s + p.rpKm, 0) / list.length;
  return sumV / sumK;
}

// ─── Group bookings (client-side clustering) ─────────────────

export type BookingGroupKind = "return_pair" | "repeat_corridor" | "near_same_direction";

export type BookingGroup = {
  id: string;
  kind: BookingGroupKind;
  title: string;
  subtitle: string;
  bookings: ParsedBooking[];
  combinedEarn: number;
  /** Hours between first pickup and second pickup (same-dir / pair timing) */
  gapHours: number | null;
  /** Rough dead km saved narrative — only meaningful for return_pair */
  deadKmSavedEstimate: number | null;
  insight: string;
};

function pickupMs(p: ParsedBooking): number | null {
  const row = p.row;
  const t =
    parseWhen(pick(row, "pickupTime", "pickup_time")) ??
    parseWhen(pick(row, "trip_start_time", "tripStartTime")) ??
    parseWhen(pick(row, "pickupDateTime", "pickup_datetime")) ??
    parseWhen(pick(row, "startTime", "start_time"));
  return t;
}

export function isRoundTripSelfContained(p: ParsedBooking): boolean {
  if (p.tripSubType === 8) return true;
  const n = p.tripTypeName.toLowerCase();
  return n.includes("round trip") || n.includes("round-trip");
}

export type GroupDebugInfo = {
  rawFeedCount: number;
  fleetFilteredCount: number;
  eligibleForPairing: number;
  withBothCities: number;
  withPickupTime: number;
  roundTripSkipped: number;
};

export function computeGroupDebug(
  rawCount: number,
  fleetFiltered: ParsedBooking[],
): GroupDebugInfo {
  const eligible = fleetFiltered.filter((p) => !isRoundTripSelfContained(p));
  const withBothCities = eligible.filter((p) => normCity(p.pickCity) && normCity(p.dropCity));
  const withPickupTime = eligible.filter((p) => pickupMs(p) != null);
  return {
    rawFeedCount: rawCount,
    fleetFilteredCount: fleetFiltered.length,
    eligibleForPairing: eligible.length,
    withBothCities: withBothCities.length,
    withPickupTime: withPickupTime.length,
    roundTripSkipped: fleetFiltered.length - eligible.length,
  };
}

const routeKey = (p: ParsedBooking) =>
  `${normCity(p.pickCity)}|${normCity(p.dropCity)}|${normCity(p.carType)}`;

/**
 * Greedy grouping: (1) return legs A→B + B→A same car within `maxDaysApart` days;
 * (2) repeat corridor — same one-way route + car with 2+ unused bookings.
 */
export function buildBookingGroups(
  items: ParsedBooking[],
  maxDaysApart = 5,
): BookingGroup[] {
  const eligible = items.filter((p) => !isRoundTripSelfContained(p));
  const used = new Set<string>();
  const groups: BookingGroup[] = [];

  const byCar = new Map<string, ParsedBooking[]>();
  for (const p of eligible) {
    const k = normCity(p.carType) || "_";
    if (!byCar.has(k)) byCar.set(k, []);
    byCar.get(k)!.push(p);
  }

  for (const [, arr] of byCar) {
    for (let i = 0; i < arr.length; i++) {
      const a = arr[i];
      if (used.has(a.bookingId)) continue;
      const ca = normCity(a.pickCity);
      const da = normCity(a.dropCity);
      if (!ca || !da) continue;

      let best: ParsedBooking | null = null;
      let bestScore = -1;

      for (let j = 0; j < arr.length; j++) {
        if (i === j) continue;
        const b = arr[j];
        if (used.has(b.bookingId)) continue;
        const cb = normCity(b.pickCity);
        const db = normCity(b.dropCity);
        if (cb !== da || db !== ca) continue;

        const ta = pickupMs(a);
        const tb = pickupMs(b);
        if (ta == null || tb == null) continue;
        const days = Math.abs(tb - ta) / 86_400_000;
        if (days > maxDaysApart) continue;

        const score = a.vendorCost + b.vendorCost;
        if (score > bestScore) {
          bestScore = score;
          best = b;
        }
      }

      if (best) {
        used.add(a.bookingId);
        used.add(best.bookingId);
        const ta = pickupMs(a)!;
        const tb = pickupMs(best)!;
        const gapHrs = Math.abs(tb - ta) / 3_600_000;
        const kmA = num(a.row, "packageKms", "package_kms");
        const kmB = num(best.row, "packageKms", "package_kms");
        const deadEst = kmA > 0 && kmB > 0 ? Math.min(kmA, kmB) : null;

        const [first, second] = ta <= tb ? [a, best] : [best, a];
        groups.push({
          id: `pair-${first.bookingId}-${second.bookingId}`,
          kind: "return_pair",
          title: `${first.pickCity} ↔ ${first.dropCity}`,
          subtitle: `Return candidate · ${first.carType}`,
          bookings: [first, second],
          combinedEarn: first.vendorCost + second.vendorCost,
          gapHours: gapHrs,
          deadKmSavedEstimate: deadEst,
          insight: `Pair #${first.bookingId} with #${second.bookingId} on one car to reduce empty return km.`,
        });
      }
    }
  }

  const corridorMap = new Map<string, ParsedBooking[]>();
  for (const p of eligible) {
    if (used.has(p.bookingId)) continue;
    const k = routeKey(p);
    if (!normCity(p.pickCity) || !normCity(p.dropCity)) continue;
    if (!corridorMap.has(k)) corridorMap.set(k, []);
    corridorMap.get(k)!.push(p);
  }
  for (const [, arr] of corridorMap) {
    if (arr.length < 2) continue;
    arr.sort((x, y) => (pickupMs(x) ?? 0) - (pickupMs(y) ?? 0));
    const combined = arr.reduce((s, p) => s + p.vendorCost, 0);
    const ids = arr.map((p) => p.bookingId);
    for (const p of arr) used.add(p.bookingId);
    groups.push({
      id: `corridor-${ids.slice(0, 6).join("-")}`,
      kind: "repeat_corridor",
      title: `${arr[0].pickCity} → ${arr[0].dropCity}`,
      subtitle: `${arr.length} bookings · ${arr[0].carType}`,
      bookings: arr,
      combinedEarn: combined,
      gapHours: null,
      deadKmSavedEstimate: null,
      insight: `Same corridor ×${arr.length} — good lane to keep a driver positioned.`,
    });
  }

  groups.sort((a, b) => b.combinedEarn - a.combinedEarn);
  return groups;
}

// ─── Detail page: pros/cons / verify (rule templates) ─────────────────

export type ProConItem = { kind: "pro" | "con" | "neutral"; text: string };

export function buildProsCons(
  p: ParsedBooking,
  listAvg: number,
  nextBestEarn: number,
): ProConItem[] {
  const out: ProConItem[] = [];
  if (p.rpKm >= listAvg * 1.15 && listAvg > 0) {
    out.push({
      kind: "pro",
      text: `Strong ₹/km vs your list average (${p.rpKm.toFixed(1)} vs ${listAvg.toFixed(1)}).`,
    });
  }
  if (p.vendorCost >= 15_000) {
    out.push({
      kind: "pro",
      text: `High single-trip payout (${formatInr(p.vendorCost)}).`,
    });
  }
  if (p.isPrepaid && p.cashRiskPct < 5) {
    out.push({ kind: "pro", text: "Pre-paid — minimal collection exposure." });
  }
  if (p.cashToCollect >= 15_000) {
    out.push({
      kind: "con",
      text: `${formatInr(p.cashToCollect)} to collect on trip — verify customer if you accept.`,
    });
  }
  if (p.packageKms >= 800) {
    out.push({
      kind: "con",
      text: `Long haul (~${Math.round(p.packageKms)} km) — multi-day driver commitment and positioning cost.`,
    });
  }
  if (nextBestEarn > 0 && p.vendorCost < nextBestEarn * 0.85) {
    out.push({
      kind: "neutral",
      text: `Another open booking pays ${formatInr(nextBestEarn)} — compare before committing.`,
    });
  }
  if (out.length === 0) {
    out.push({ kind: "neutral", text: "Review payment status and pickup window against your fleet availability." });
  }
  return out;
}

export function buildVerifyChecklist(p: ParsedBooking): { label: string; hint: string; tone: "warn" | "risk" | "ok" }[] {
  const rows: { label: string; hint: string; tone: "warn" | "risk" | "ok" }[] = [];
  rows.push({
    label: "Cash collection plan",
    hint:
      p.cashToCollect > 0
        ? `${formatInr(p.cashToCollect)} on trip`
        : "None — prepaid or settled",
    tone: p.cashRiskPct >= 50 ? "risk" : "ok",
  });
  rows.push({
    label: "Driver / car match",
    hint: p.carType ? `${p.carType} available?` : "Confirm vehicle class",
    tone: "warn",
  });
  if (p.packageKms >= 400) {
    rows.push({
      label: "Outstation duration",
      hint: `~${Math.round(p.packageKms / 70)}–${Math.round(p.packageKms / 60)} hrs driving (indicative)`,
      tone: "warn",
    });
  }
  return rows;
}

export function headlineAnalysis(p: ParsedBooking): { title: string; body: string } {
  if (p.cashToCollect >= 20_000 && p.rpKm >= 12) {
    return {
      title: "Accept with caution — high reward, large collect",
      body: `Strong ₹/km, but ${formatInr(p.cashToCollect)} to collect on trip. Verify before you commit.`,
    };
  }
  if (p.isPrepaid && p.rpKm >= 10) {
    return {
      title: "Strong candidate — prepaid, solid efficiency",
      body: `₹${p.rpKm.toFixed(1)}/km with limited collection left.`,
    };
  }
  if (p.hoursLeft != null && p.hoursLeft < 6) {
    return {
      title: "Time-sensitive — expires soon",
      body: "Decide quickly or you lose the broadcast slot.",
    };
  }
  return {
    title: "Review trip economics",
    body: `Check ₹/km (${p.rpKm.toFixed(1)}), collect ${formatInr(p.cashToCollect)}, and car fit.`,
  };
}

function formatInr(n: number): string {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}
