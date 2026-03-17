import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getWeekStart, formatCurrency } from "@/lib/utils-date";
import { getDrivers, getCars, getCashEntries, getVendorEntries, getFuelEntries, getOtherCostEntries, getSettlements, getOtherEarnings } from "@/lib/store";
import WeekPicker from "@/components/WeekPicker";
import StatCard from "@/components/StatCard";
import { ChevronRight, AlertCircle, HelpCircle } from "lucide-react";

export default function DashboardPage() {
  const [week, setWeek] = useState(getWeekStart());
  const [showHelp, setShowHelp] = useState(false);
  const navigate = useNavigate();

  const drivers = getDrivers();
  const cars = getCars();
  const cash = getCashEntries().filter((e) => e.weekStart === week);
  const vendor = getVendorEntries().filter((e) => e.weekStart === week);
  const fuel = getFuelEntries().filter((e) => e.weekStart === week);
  const other = getOtherCostEntries().filter((e) => e.weekStart === week);
  const settlements = getSettlements().filter((s) => s.weekStart === week);
  const otherEarnings = getOtherEarnings().filter((e) => e.weekStart === week);

  const totals = useMemo(() => {
    const totalCash = cash.reduce((s, e) => s + e.amount, 0);
    const totalVendor = vendor.reduce((s, e) => s + e.amount, 0);
    const totalOtherEarn = otherEarnings.reduce((s, e) => s + e.amount, 0);
    const totalFuel = fuel.reduce((s, e) => s + e.cost, 0);
    const totalOther = other.reduce((s, e) => s + e.amount, 0);
    const totalSettled = settlements.reduce((s, e) => s + e.amount, 0);

    let totalCommission = 0;
    drivers.forEach((d) => {
      const driverVendor = vendor.filter((v) => v.driverId === d.id).reduce((s, v) => s + v.amount, 0);
      const driverOtherEarn = otherEarnings.filter((e) => e.driverId === d.id).reduce((s, e) => s + e.amount, 0);
      totalCommission += (driverVendor + driverOtherEarn) * (d.commissionPercent / 100);
    });

    const netEarnings = totalVendor + totalOtherEarn;
    const netProfit = netEarnings - totalCommission - totalFuel - totalOther;

    return { totalCash, totalVendor, totalOtherEarn, totalFuel, totalOther, totalCommission, totalSettled, netProfit };
  }, [week, cash, vendor, fuel, other, settlements, drivers, otherEarnings]);

  const driverSummary = useMemo(() => {
    return drivers.filter(d => d.status === "active").map((d) => {
      const car = cars.find((c) => c.id === d.carId);
      const dCash = cash.filter((e) => e.driverId === d.id).reduce((s, e) => s + e.amount, 0);
      const dVendor = vendor.filter((e) => e.driverId === d.id).reduce((s, e) => s + e.amount, 0);
      const dOtherEarn = otherEarnings.filter((e) => e.driverId === d.id).reduce((s, e) => s + e.amount, 0);
      const dFuel = fuel.filter((e) => e.driverId === d.id).reduce((s, e) => s + e.cost, 0);
      const dOther = other.filter((e) => e.driverId === d.id).reduce((s, e) => s + e.amount, 0);
      const dSettled = settlements.filter((e) => e.driverId === d.id).reduce((s, e) => s + e.amount, 0);
      const expenses = dFuel + dOther;
      const totalEarnings = dVendor + dOtherEarn;
      const commission = totalEarnings * (d.commissionPercent / 100);
      const netEarnings = totalEarnings - commission - expenses;
      const pending = dCash - netEarnings - dSettled;

      return { driver: d, car, dCash, dVendor, dOtherEarn, expenses, dSettled, pending, commission };
    });
  }, [drivers, cars, cash, vendor, fuel, other, settlements, otherEarnings]);

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-40 bg-background pb-2 pt-1">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">ZingCab Fleet</h1>
            <p className="text-xs text-muted-foreground">Weekly overview of your fleet business</p>
          </div>
          <button onClick={() => setShowHelp(!showHelp)} className="text-muted-foreground hover:text-foreground p-1">
            <HelpCircle className="h-4.5 w-4.5" />
          </button>
        </div>
        <div className="mt-2">
          <WeekPicker value={week} onChange={setWeek} />
        </div>
      </div>

      {showHelp && (
        <div className="rounded-lg border bg-secondary/50 p-3 space-y-1.5 text-xs text-muted-foreground">
          <p className="font-medium text-foreground text-sm">📊 Understanding your dashboard</p>
          <p><span className="font-medium text-foreground">Vendor Amount</span> = Total booking fare (from Savari, etc.)</p>
          <p><span className="font-medium text-foreground">Cash Collected</span> = Cash drivers handed to you</p>
          <p><span className="font-medium text-foreground">Commission</span> = Driver's share (e.g. 30% of earnings)</p>
          <p><span className="font-medium text-foreground">Net Profit</span> = Earnings − Commission − Fuel − Other Costs</p>
          <p><span className="font-medium text-foreground">Pending</span> = Money a driver still owes you</p>
          <button onClick={() => setShowHelp(false)} className="text-xs underline mt-1">Got it</button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Cash Collected" value={formatCurrency(totals.totalCash)} hint="Cash drivers gave you" />
        <StatCard label="Vendor Amount" value={formatCurrency(totals.totalVendor)} hint="Total booking fares" />
        <StatCard label="Other Earnings" value={formatCurrency(totals.totalOtherEarn)} variant="success" hint="Tips, bonuses, etc." />
        <StatCard label="Fuel Cost" value={formatCurrency(totals.totalFuel)} variant="danger" hint="Total fuel spent" />
        <StatCard label="Driver Commission" value={formatCurrency(totals.totalCommission)} hint="Driver's cut from earnings" />
        <StatCard label="Payments Done" value={formatCurrency(totals.totalSettled)} variant="success" hint="Settled with drivers" />
      </div>

      <div className="rounded-md border p-3">
        <p className="text-xs text-muted-foreground font-medium">Your Net Profit</p>
        <p className="text-[10px] text-muted-foreground">Earnings − Commission − Fuel − Other Costs</p>
        <p className={`mt-1 text-2xl font-semibold tabular-nums ${totals.netProfit >= 0 ? "text-success" : "text-destructive"}`}>
          {formatCurrency(totals.netProfit)}
        </p>
      </div>

      <div>
        <h2 className="mb-1 text-sm font-semibold">Driver Summary</h2>
        <p className="mb-2 text-[11px] text-muted-foreground">Tap a driver to see full breakdown</p>
        {driverSummary.length === 0 ? (
          <p className="rounded-md border p-4 text-center text-sm text-muted-foreground">
            No active drivers. Go to Drivers tab to add one.
          </p>
        ) : (
          <div className="space-y-1">
            {driverSummary.map(({ driver, car, dVendor, dOtherEarn, pending }) => (
              <button
                key={driver.id}
                onClick={() => navigate(`/drivers/${driver.id}?week=${week}`)}
                className="flex w-full items-center justify-between rounded-md border p-3 text-left transition-colors hover:bg-secondary"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{driver.name}</p>
                  <p className="text-xs text-muted-foreground">{car?.number ?? "No car"}</p>
                </div>
                <div className="flex items-center gap-2 text-right">
                  <div>
                    <p className="text-sm font-medium tabular-nums">{formatCurrency(dVendor + dOtherEarn)}</p>
                    {pending > 0 && (
                      <p className="flex items-center gap-1 text-xs text-destructive">
                        <AlertCircle className="h-3 w-3" />
                        Owes {formatCurrency(pending)}
                      </p>
                    )}
                    {pending <= 0 && Math.abs(pending) < 1 && (
                      <p className="text-xs text-success">✓ Settled</p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
