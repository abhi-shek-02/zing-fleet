const MODES = { COMMISSION_30: "commission_30", PROFIT_SHARE_50: "profit_share_50" };

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

function computeSettlement(mode, { cash, vendor, fuel, otherCost, otherEarning }) {
  const A = round2(cash);
  const B = round2(vendor);
  const C = round2(fuel);
  const D = round2(otherCost);
  const E = round2(otherEarning);
  const TE = round2(B + E);
  const TC = round2(C + D);

  if (mode === MODES.COMMISSION_30) {
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

function unpaidBalance(finalSettlement, paidSum) {
  const S = round2(finalSettlement);
  const p = round2(paidSum);
  if (S >= 0) return round2(S - p);
  return round2(S + p);
}

module.exports = { MODES, computeSettlement, unpaidBalance, round2 };
