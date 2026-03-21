import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getWeekStart, formatCurrency } from "@/lib/utils-date";
import { useDrivers, useCars, useAllCash, useAllVendor, useAllFuel, useAllOtherCosts, useAllSettlements, useAllOtherEarnings, useSettlementModeHistory } from "@/hooks/useApi";
import {
  computeSettlement,
  settlementModeForWeek,
  unpaidBalance,
  type SettlementModeHistoryRow,
} from "@/lib/settlement";
import { useRefetchAllFinancialOnWeekChange } from "@/hooks/useRefetchAllFinancialOnWeekChange";
import { LoadingSpinner, ErrorState } from "@/components/LoadingState";
import WeekPicker from "@/components/WeekPicker";
import StatCard from "@/components/StatCard";
import { ChevronRight, Info, Banknote, Receipt, Fuel, Users, TrendingUp, CircleDollarSign } from "lucide-react";

export default function DashboardPage() {
  const [week, setWeek] = useState(getWeekStart());
  const [showHelp, setShowHelp] = useState(false);
  const navigate = useNavigate();

  useRefetchAllFinancialOnWeekChange(week);

  const driversQ = useDrivers();
  const carsQ = useCars();
  const cashQ = useAllCash();
  const vendorQ = useAllVendor();
  const fuelQ = useAllFuel();
  const otherQ = useAllOtherCosts();
  const settlementsQ = useAllSettlements();
  const otherEarningsQ = useAllOtherEarnings();
  const modeHQ = useSettlementModeHistory();

  const isLoading =
    driversQ.isLoading ||
    carsQ.isLoading ||
    cashQ.isLoading ||
    vendorQ.isLoading ||
    fuelQ.isLoading ||
    otherQ.isLoading ||
    settlementsQ.isLoading ||
    otherEarningsQ.isLoading ||
    modeHQ.isLoading;
  const isError = driversQ.isError || cashQ.isError || vendorQ.isError;

  const drivers = driversQ.data ?? [];
  const cars = carsQ.data ?? [];
  const allCash = cashQ.data ?? [];
  const allVendor = vendorQ.data ?? [];
  const allFuel = fuelQ.data ?? [];
  const allOther = otherQ.data ?? [];
  const allSettlements = settlementsQ.data ?? [];
  const allOtherEarnings = otherEarningsQ.data ?? [];

  const cash = allCash.filter((e: { weekStart: string }) => e.weekStart === week);
  const vendor = allVendor.filter((e: { weekStart: string }) => e.weekStart === week);
  const fuel = allFuel.filter((e: { weekStart: string }) => e.weekStart === week);
  const other = allOther.filter((e: { weekStart: string }) => e.weekStart === week);
  const settlements = allSettlements.filter((s: { weekStart: string }) => s.weekStart === week);
  const otherEarnings = allOtherEarnings.filter((e: { weekStart: string }) => e.weekStart === week);
  const modeRows = (modeHQ.data ?? []) as SettlementModeHistoryRow[];

  const totals = useMemo(() => {
    const totalCash = cash.reduce((s: number, e: { amount: number | string }) => s + Number(e.amount), 0);
    const totalVendor = vendor.reduce((s: number, e: { amount: number | string }) => s + Number(e.amount), 0);
    const totalOtherEarn = otherEarnings.reduce((s: number, e: { amount: number | string }) => s + Number(e.amount), 0);
    const totalFuel = fuel.reduce((s: number, e: { cost: number | string }) => s + Number(e.cost), 0);
    const totalOther = other.reduce((s: number, e: { amount: number | string }) => s + Number(e.amount), 0);
    const totalSettled = settlements.reduce((s: number, e: { amount: number | string }) => s + Number(e.amount), 0);

    let totalDriverShare = 0;
    drivers.forEach((d: { id: string }) => {
      const driverVendor = vendor.filter((v: { driverId: string }) => v.driverId === d.id).reduce((s: number, v: { amount: number | string }) => s + Number(v.amount), 0);
      const driverOtherEarn = otherEarnings.filter((e: { driverId: string }) => e.driverId === d.id).reduce((s: number, e: { amount: number | string }) => s + Number(e.amount), 0);
      const dFuel = fuel.filter((e: { driverId: string }) => e.driverId === d.id).reduce((s: number, e: { cost: number | string }) => s + Number(e.cost), 0);
      const dOther = other.filter((e: { driverId: string }) => e.driverId === d.id).reduce((s: number, e: { amount: number | string }) => s + Number(e.amount), 0);
      const dCash = cash.filter((e: { driverId: string }) => e.driverId === d.id).reduce((s: number, e: { amount: number | string }) => s + Number(e.amount), 0);
      const mode = settlementModeForWeek(d.id, week, modeRows);
      totalDriverShare += computeSettlement(mode, {
        cash: dCash,
        vendor: driverVendor,
        fuel: dFuel,
        otherCost: dOther,
        otherEarning: driverOtherEarn,
      }).driverCut;
    });

    const netEarnings = totalVendor + totalOtherEarn;
    const netProfit = netEarnings - totalDriverShare - totalFuel - totalOther;

    return { totalCash, totalVendor, totalOtherEarn, totalFuel, totalOther, totalDriverShare, totalSettled, netProfit };
  }, [week, cash, vendor, fuel, other, settlements, drivers, otherEarnings, modeRows]);

  const driverSummary = useMemo(() => {
    return drivers.filter((d: { status: string }) => d.status === "active").map((d: { id: string; name: string; carId?: string }) => {
      const car = cars.find((c: { id: string }) => c.id === d.carId);
      const dCash = cash.filter((e: { driverId: string }) => e.driverId === d.id).reduce((s: number, e: { amount: number | string }) => s + Number(e.amount), 0);
      const dVendor = vendor.filter((e: { driverId: string }) => e.driverId === d.id).reduce((s: number, e: { amount: number | string }) => s + Number(e.amount), 0);
      const dOtherEarn = otherEarnings.filter((e: { driverId: string }) => e.driverId === d.id).reduce((s: number, e: { amount: number | string }) => s + Number(e.amount), 0);
      const dFuel = fuel.filter((e: { driverId: string }) => e.driverId === d.id).reduce((s: number, e: { cost: number | string }) => s + Number(e.cost), 0);
      const dOther = other.filter((e: { driverId: string }) => e.driverId === d.id).reduce((s: number, e: { amount: number | string }) => s + Number(e.amount), 0);
      const dSettled = settlements.filter((e: { driverId: string }) => e.driverId === d.id).reduce((s: number, e: { amount: number | string }) => s + Number(e.amount), 0);
      const mode = settlementModeForWeek(d.id, week, modeRows);
      const calc = computeSettlement(mode, {
        cash: dCash,
        vendor: dVendor,
        fuel: dFuel,
        otherCost: dOther,
        otherEarning: dOtherEarn,
      });
      const pending = unpaidBalance(calc.finalSettlement, dSettled);
      const modeLabel = mode === "profit_share_50" ? "50%" : "30%";

      return { driver: d, car, dVendor, dOtherEarn, pending, driverShare: calc.driverCut, modeLabel };
    });
  }, [drivers, cars, cash, vendor, fuel, other, settlements, otherEarnings, modeRows, week]);

  if (isLoading) return <LoadingSpinner label="Loading dashboard..." />;
  if (isError) return <ErrorState message="Failed to load dashboard data" onRetry={() => { driversQ.refetch(); cashQ.refetch(); vendorQ.refetch(); }} />;

  return (
    <div className="space-y-5">
      <div className="sticky top-0 z-40 bg-background pb-3 pt-2">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Weekly fleet overview</p>
          </div>
          <button onClick={() => setShowHelp(!showHelp)} className="rounded-md border p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <Info className="h-4 w-4" />
          </button>
        </div>
        <WeekPicker value={week} onChange={setWeek} />
      </div>

      {showHelp && (
        <div className="rounded-lg border bg-card p-4 space-y-2 text-xs text-muted-foreground">
          <p className="font-medium text-foreground text-sm flex items-center gap-1.5">
            <Info className="h-4 w-4 text-primary" /> Understanding your numbers
          </p>
          <div className="grid gap-1.5">
            <p><span className="font-medium text-foreground">Vendor Amount</span> — Total booking fare from platforms</p>
            <p><span className="font-medium text-foreground">Cash Collected</span> — Cash drivers handed to you</p>
            <p><span className="font-medium text-foreground">Driver share</span> — 30% commission or 50% profit share (per driver)</p>
            <p><span className="font-medium text-foreground">Net Profit</span> — Earnings minus driver share, fuel, and costs</p>
          </div>
          <button onClick={() => setShowHelp(false)} className="text-xs text-primary font-medium mt-1">Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        <StatCard label="Cash Collected" value={formatCurrency(totals.totalCash)} icon={<Banknote className="h-3.5 w-3.5" />} hint="From drivers" />
        <StatCard label="Vendor Amount" value={formatCurrency(totals.totalVendor)} icon={<Receipt className="h-3.5 w-3.5" />} hint="Booking fares" />
        <StatCard label="Other Earnings" value={formatCurrency(totals.totalOtherEarn)} variant="success" icon={<CircleDollarSign className="h-3.5 w-3.5" />} hint="Tips, bonuses" />
        <StatCard label="Fuel Cost" value={formatCurrency(totals.totalFuel)} variant="danger" icon={<Fuel className="h-3.5 w-3.5" />} />
        <StatCard label="Driver share" value={formatCurrency(totals.totalDriverShare)} icon={<Users className="h-3.5 w-3.5" />} hint="Commission / profit share" />
        <StatCard label="Payments Done" value={formatCurrency(totals.totalSettled)} variant="success" icon={<TrendingUp className="h-3.5 w-3.5" />} />
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Net Profit</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Earnings − driver share − fuel − other costs</p>
          </div>
          <TrendingUp className={`h-5 w-5 ${totals.netProfit >= 0 ? "text-success" : "text-destructive"}`} />
        </div>
        <p className={`mt-2 text-3xl font-bold tabular-nums tracking-tight ${totals.netProfit >= 0 ? "text-success" : "text-destructive"}`}>
          {formatCurrency(totals.netProfit)}
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold">Drivers</h2>
          <span className="text-[10px] text-muted-foreground">{driverSummary.length} active</span>
        </div>

        {driverSummary.length === 0 ? (
          <div className="rounded-lg border p-6 text-center">
            <Users className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No active drivers</p>
            <p className="text-xs text-muted-foreground mt-0.5">Add drivers in the Fleet tab</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {driverSummary.map(({ driver, car, dVendor, dOtherEarn, pending, modeLabel }: any) => (
              <button
                key={driver.id}
                onClick={() => navigate(`/drivers/${driver.id}?week=${week}`)}
                className="flex w-full items-center justify-between rounded-lg border bg-card p-3 text-left transition-all hover:shadow-sm hover:border-primary/20 active:scale-[0.99]"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{driver.name}</p>
                  <p className="text-[11px] text-muted-foreground">{car?.number ?? "No car"} · {modeLabel}</p>
                </div>
                <div className="flex items-center gap-2.5 text-right">
                  <div>
                    <p className="text-sm font-semibold tabular-nums">{formatCurrency(dVendor + dOtherEarn)}</p>
                    {pending > 0 && (
                      <p className="flex items-center justify-end gap-0.5 text-[10px] text-destructive font-medium">
                        <AlertTriangle className="h-2.5 w-2.5" />
                        Owes {formatCurrency(pending)}
                      </p>
                    )}
                    {pending <= 0 && Math.abs(pending) < 1 && (
                      <p className="text-[10px] text-success font-medium">Settled</p>
                    )}
                    {pending < 0 && Math.abs(pending) >= 1 && (
                      <p className="text-[10px] text-muted-foreground font-medium">You owe {formatCurrency(Math.abs(pending))}</p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
