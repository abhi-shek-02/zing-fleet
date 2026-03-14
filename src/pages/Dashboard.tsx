import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getWeekStart, formatCurrency } from "@/lib/utils-date";
import { getDrivers, getCars, getCashEntries, getVendorEntries, getFuelEntries, getOtherCostEntries, getSettlements } from "@/lib/store";
import WeekPicker from "@/components/WeekPicker";
import StatCard from "@/components/StatCard";
import { ChevronRight, AlertCircle } from "lucide-react";

export default function DashboardPage() {
  const [week, setWeek] = useState(getWeekStart());
  const navigate = useNavigate();

  const drivers = getDrivers();
  const cars = getCars();
  const cash = getCashEntries().filter((e) => e.weekStart === week);
  const vendor = getVendorEntries().filter((e) => e.weekStart === week);
  const fuel = getFuelEntries().filter((e) => e.weekStart === week);
  const other = getOtherCostEntries().filter((e) => e.weekStart === week);
  const settlements = getSettlements().filter((s) => s.weekStart === week);

  const totals = useMemo(() => {
    const totalCash = cash.reduce((s, e) => s + e.amount, 0);
    const totalVendor = vendor.reduce((s, e) => s + e.amount, 0);
    const totalFuel = fuel.reduce((s, e) => s + e.cost, 0);
    const totalOther = other.reduce((s, e) => s + e.amount, 0);
    const totalSettled = settlements.reduce((s, e) => s + e.amount, 0);

    // Commission calc per driver
    let totalCommission = 0;
    drivers.forEach((d) => {
      const driverVendor = vendor.filter((v) => v.driverId === d.id).reduce((s, v) => s + v.amount, 0);
      totalCommission += driverVendor * (d.commissionPercent / 100);
    });

    const netProfit = totalVendor - totalCommission - totalFuel - totalOther;

    return { totalCash, totalVendor, totalFuel, totalOther, totalCommission, totalSettled, netProfit };
  }, [week, cash, vendor, fuel, other, settlements, drivers]);

  // Driver summary rows
  const driverSummary = useMemo(() => {
    return drivers.filter(d => d.status === "active").map((d) => {
      const car = cars.find((c) => c.id === d.carId);
      const dCash = cash.filter((e) => e.driverId === d.id).reduce((s, e) => s + e.amount, 0);
      const dVendor = vendor.filter((e) => e.driverId === d.id).reduce((s, e) => s + e.amount, 0);
      const dFuel = fuel.filter((e) => e.driverId === d.id).reduce((s, e) => s + e.cost, 0);
      const dOther = other.filter((e) => e.driverId === d.id).reduce((s, e) => s + e.amount, 0);
      const dSettled = settlements.filter((e) => e.driverId === d.id).reduce((s, e) => s + e.amount, 0);
      const expenses = dFuel + dOther;
      const commission = dVendor * (d.commissionPercent / 100);
      const netEarnings = dVendor - commission - expenses;
      const pending = dCash - netEarnings - dSettled;

      return { driver: d, car, dCash, dVendor, expenses, dSettled, pending, commission };
    });
  }, [drivers, cars, cash, vendor, fuel, other, settlements]);

  return (
    <div className="space-y-4">
      {/* Week Picker */}
      <div className="sticky top-0 z-40 bg-background pb-2 pt-1">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Dashboard</h1>
        </div>
        <div className="mt-2">
          <WeekPicker value={week} onChange={setWeek} />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Cash Collected" value={formatCurrency(totals.totalCash)} />
        <StatCard label="Vendor Earnings" value={formatCurrency(totals.totalVendor)} />
        <StatCard label="Fuel Cost" value={formatCurrency(totals.totalFuel)} variant="danger" />
        <StatCard label="Other Cost" value={formatCurrency(totals.totalOther)} />
        <StatCard label="Commission" value={formatCurrency(totals.totalCommission)} />
        <StatCard label="Settlements" value={formatCurrency(totals.totalSettled)} variant="success" />
      </div>

      <div className="rounded-md border p-3">
        <p className="text-xs text-muted-foreground font-medium">Net Profit</p>
        <p className={`mt-1 text-2xl font-semibold tabular-nums ${totals.netProfit >= 0 ? "text-success" : "text-destructive"}`}>
          {formatCurrency(totals.netProfit)}
        </p>
      </div>

      {/* Driver Summary */}
      <div>
        <h2 className="mb-2 text-sm font-semibold">Driver Summary</h2>
        {driverSummary.length === 0 ? (
          <p className="rounded-md border p-4 text-center text-sm text-muted-foreground">
            No active drivers. Add drivers to get started.
          </p>
        ) : (
          <div className="space-y-1">
            {driverSummary.map(({ driver, car, dCash, dVendor, expenses, dSettled, pending }) => (
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
                    <p className="text-sm font-medium tabular-nums">{formatCurrency(dVendor)}</p>
                    {pending > 0 && (
                      <p className="flex items-center gap-1 text-xs text-destructive">
                        <AlertCircle className="h-3 w-3" />
                        {formatCurrency(pending)}
                      </p>
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
