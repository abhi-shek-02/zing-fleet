export type SettlementMode = "commission_30" | "profit_share_50";

export type SettlementModeHistoryRow = {
  driverId: string;
  effectiveWeekStart: string;
  settlementMode: SettlementMode;
};

export type SettlementInputs = {
  cash: number;
  vendor: number;
  fuel: number;
  otherCost: number;
  otherEarning: number;
};

export type SettlementResult = {
  mode: SettlementMode;
  netEarning: number;
  driverCut: number;
  finalSettlement: number;
  te: number;
  tc: number;
};

function round2(n: number) {
  return Math.round(Number(n) * 100) / 100;
}

export function settlementModeForWeek(
  driverId: string,
  weekStart: string,
  history: SettlementModeHistoryRow[]
): SettlementMode {
  let best: SettlementModeHistoryRow | undefined;
  for (const h of history) {
    if (h.driverId !== driverId) continue;
    if (h.effectiveWeekStart > weekStart) continue;
    if (!best || h.effectiveWeekStart > best.effectiveWeekStart) best = h;
  }
  return best?.settlementMode ?? "commission_30";
}

export function computeSettlement(mode: SettlementMode, i: SettlementInputs): SettlementResult {
  const A = round2(i.cash);
  const B = round2(i.vendor);
  const C = round2(i.fuel);
  const D = round2(i.otherCost);
  const E = round2(i.otherEarning);
  const TE = round2(B + E);
  const TC = round2(C + D);

  if (mode === "commission_30") {
    const N = round2(TE - D);
    const K = round2(0.3 * N);
    const S = round2(A - K - C);
    return { mode, netEarning: N, driverCut: K, finalSettlement: S, te: TE, tc: TC };
  }

  const N = round2(TE - TC);
  const L = round2(0.5 * N);
  const S = round2(A - B + L);
  return { mode, netEarning: N, driverCut: L, finalSettlement: S, te: TE, tc: TC };
}

export function unpaidBalance(finalSettlement: number, paidSum: number) {
  const S = round2(finalSettlement);
  const p = round2(paidSum);
  if (S >= 0) return round2(S - p);
  return round2(S + p);
}

function weeksForDriver(
  driverId: string,
  vendor: { driverId: string; weekStart: string }[],
  otherEarn: { driverId: string; weekStart: string }[],
  fuel: { driverId: string; weekStart: string }[],
  other: { driverId: string; weekStart: string }[],
  cash: { driverId: string; weekStart: string }[]
): Set<string> {
  const s = new Set<string>();
  for (const v of vendor) if (v.driverId === driverId) s.add(v.weekStart);
  for (const e of otherEarn) if (e.driverId === driverId) s.add(e.weekStart);
  for (const f of fuel) if (f.driverId === driverId) s.add(f.weekStart);
  for (const o of other) if (o.driverId === driverId) s.add(o.weekStart);
  for (const c of cash) if (c.driverId === driverId) s.add(c.weekStart);
  return s;
}

function sumDriverWeek<T extends { driverId: string; weekStart: string }>(
  rows: T[],
  driverId: string,
  week: string,
  pick: (r: T) => number
) {
  return rows
    .filter((r) => r.driverId === driverId && r.weekStart === week)
    .reduce((s, r) => s + pick(r), 0);
}

export function totalDriverCutAcrossWeeks(
  driverId: string,
  history: SettlementModeHistoryRow[],
  allCash: { driverId: string; weekStart: string; amount: number }[],
  allVendor: { driverId: string; weekStart: string; amount: number }[],
  allOtherEarn: { driverId: string; weekStart: string; amount: number }[],
  allFuel: { driverId: string; weekStart: string; cost: number }[],
  allOther: { driverId: string; weekStart: string; amount: number }[]
): number {
  const weeks = weeksForDriver(driverId, allVendor, allOtherEarn, allFuel, allOther, allCash);
  let total = 0;
  for (const w of weeks) {
    const mode = settlementModeForWeek(driverId, w, history);
    const A = sumDriverWeek(allCash, driverId, w, (r) => Number(r.amount));
    const B = sumDriverWeek(allVendor, driverId, w, (r) => Number(r.amount));
    const E = sumDriverWeek(allOtherEarn, driverId, w, (r) => Number(r.amount));
    const C = sumDriverWeek(allFuel, driverId, w, (r) => Number(r.cost));
    const D = sumDriverWeek(allOther, driverId, w, (r) => Number(r.amount));
    total += computeSettlement(mode, { cash: A, vendor: B, fuel: C, otherCost: D, otherEarning: E }).driverCut;
  }
  return round2(total);
}

function weeksForCar(
  carId: string,
  allVendor: { carId: string; weekStart: string }[],
  allOtherEarn: { carId: string; weekStart: string }[],
  allFuel: { carId: string; weekStart: string }[],
  allOther: { carId: string; weekStart: string }[],
  allCash: { carId: string; weekStart: string }[]
): Set<string> {
  const s = new Set<string>();
  for (const v of allVendor) if (v.carId === carId) s.add(v.weekStart);
  for (const e of allOtherEarn) if (e.carId === carId) s.add(e.weekStart);
  for (const f of allFuel) if (f.carId === carId) s.add(f.weekStart);
  for (const o of allOther) if (o.carId === carId) s.add(o.weekStart);
  for (const c of allCash) if (c.carId === carId) s.add(c.weekStart);
  return s;
}

function sumCarWeek<T extends { carId: string; weekStart: string }>(
  rows: T[],
  carId: string,
  week: string,
  pick: (r: T) => number
) {
  return rows
    .filter((r) => r.carId === carId && r.weekStart === week)
    .reduce((s, r) => s + pick(r), 0);
}

export function totalDriverCutForCarAcrossWeeks(
  carId: string,
  driverId: string | undefined,
  history: SettlementModeHistoryRow[],
  allCash: { driverId: string; carId: string; weekStart: string; amount: number }[],
  allVendor: { driverId: string; carId: string; weekStart: string; amount: number }[],
  allOtherEarn: { driverId: string; carId: string; weekStart: string; amount: number }[],
  allFuel: { driverId: string; carId: string; weekStart: string; cost: number }[],
  allOther: { driverId: string; carId: string; weekStart: string; amount: number }[]
): number {
  if (!driverId) {
    const ev = allVendor.filter((x) => x.carId === carId).reduce((s, e) => s + Number(e.amount), 0);
    const eo = allOtherEarn.filter((x) => x.carId === carId).reduce((s, e) => s + Number(e.amount), 0);
    return computeSettlement("commission_30", {
      cash: 0,
      vendor: ev,
      fuel: 0,
      otherCost: 0,
      otherEarning: eo,
    }).driverCut;
  }
  const weeks = weeksForCar(carId, allVendor, allOtherEarn, allFuel, allOther, allCash);
  let total = 0;
  for (const w of weeks) {
    const mode = settlementModeForWeek(driverId, w, history);
    const A = sumCarWeek(allCash, carId, w, (r) => Number(r.amount));
    const B = sumCarWeek(allVendor, carId, w, (r) => Number(r.amount));
    const E = sumCarWeek(allOtherEarn, carId, w, (r) => Number(r.amount));
    const C = sumCarWeek(allFuel, carId, w, (r) => Number(r.cost));
    const D = sumCarWeek(allOther, carId, w, (r) => Number(r.amount));
    total += computeSettlement(mode, { cash: A, vendor: B, fuel: C, otherCost: D, otherEarning: E }).driverCut;
  }
  return round2(total);
}
