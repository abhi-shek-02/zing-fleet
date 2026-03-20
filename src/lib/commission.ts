export type CommissionHistoryRow = {
  driverId: string;
  effectiveWeekStart: string;
  commissionPercent: number;
};

/** Latest applicable rate for `weekStart` (Monday yyyy-MM-dd), compared as strings (ISO dates). */
export function commissionPercentForWeek(
  driverId: string,
  weekStart: string,
  history: CommissionHistoryRow[]
): number {
  let best: CommissionHistoryRow | undefined;
  for (const h of history) {
    if (h.driverId !== driverId) continue;
    if (h.effectiveWeekStart > weekStart) continue;
    if (!best || h.effectiveWeekStart > best.effectiveWeekStart) best = h;
  }
  return best?.commissionPercent ?? 30;
}

function collectWeeksForDriver(
  driverId: string,
  vendor: { driverId: string; weekStart: string }[],
  otherEarn: { driverId: string; weekStart: string }[],
  fuel: { driverId: string; weekStart: string }[],
  other: { driverId: string; weekStart: string }[]
): Set<string> {
  const s = new Set<string>();
  for (const v of vendor) if (v.driverId === driverId) s.add(v.weekStart);
  for (const e of otherEarn) if (e.driverId === driverId) s.add(e.weekStart);
  for (const f of fuel) if (f.driverId === driverId) s.add(f.weekStart);
  for (const o of other) if (o.driverId === driverId) s.add(o.weekStart);
  return s;
}

/** Lifetime commission across weeks (each week uses its locked rate). */
export function totalCommissionForDriverAcrossWeeks(
  driverId: string,
  history: CommissionHistoryRow[],
  allVendor: any[],
  allOtherEarn: any[]
): number {
  const weeks = collectWeeksForDriver(driverId, allVendor, allOtherEarn, [], []);
  let total = 0;
  for (const w of weeks) {
    const v = allVendor.filter((x: any) => x.driverId === driverId && x.weekStart === w).reduce((s: number, e: any) => s + Number(e.amount), 0);
    const o = allOtherEarn.filter((x: any) => x.driverId === driverId && x.weekStart === w).reduce((s: number, e: any) => s + Number(e.amount), 0);
    const pct = commissionPercentForWeek(driverId, w, history);
    total += (v + o) * (pct / 100);
  }
  return total;
}

function collectWeeksForCar(
  carId: string,
  allVendor: any[],
  allOtherEarn: any[],
  allFuel: any[],
  allOther: any[]
): Set<string> {
  const s = new Set<string>();
  for (const v of allVendor) if (v.carId === carId) s.add(v.weekStart);
  for (const e of allOtherEarn) if (e.carId === carId) s.add(e.weekStart);
  for (const f of allFuel) if (f.carId === carId) s.add(f.weekStart);
  for (const o of allOther) if (o.carId === carId) s.add(o.weekStart);
  return s;
}

/** Per-car lifetime commission: earnings grouped by week × rate( driver, week ). */
export function totalCommissionForCarAcrossWeeks(
  carId: string,
  driverId: string | undefined,
  history: CommissionHistoryRow[],
  allVendor: any[],
  allOtherEarn: any[]
): number {
  if (!driverId) {
    const ev = allVendor.filter((x: any) => x.carId === carId).reduce((s: number, e: any) => s + Number(e.amount), 0);
    const eo = allOtherEarn.filter((x: any) => x.carId === carId).reduce((s: number, e: any) => s + Number(e.amount), 0);
    return (ev + eo) * 0.3;
  }
  const weeks = collectWeeksForCar(carId, allVendor, allOtherEarn, [], []);
  let total = 0;
  for (const w of weeks) {
    const v = allVendor.filter((x: any) => x.carId === carId && x.weekStart === w).reduce((s: number, e: any) => s + Number(e.amount), 0);
    const o = allOtherEarn.filter((x: any) => x.carId === carId && x.weekStart === w).reduce((s: number, e: any) => s + Number(e.amount), 0);
    const pct = commissionPercentForWeek(driverId, w, history);
    total += (v + o) * (pct / 100);
  }
  return total;
}
