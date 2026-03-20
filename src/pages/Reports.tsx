import { useState, useMemo } from "react";
import { useDrivers, useCars, useAllVendor, useAllFuel, useAllOtherCosts, useSettings, useUpdateSettings, useCommissionHistory } from "@/hooks/useApi";
import { commissionPercentForWeek, type CommissionHistoryRow } from "@/lib/commission";
import { getWeekStart, formatCurrency } from "@/lib/utils-date";
import { LoadingSpinner } from "@/components/LoadingState";
import WeekPicker from "@/components/WeekPicker";
import StatCard from "@/components/StatCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Fuel } from "lucide-react";

export default function ReportsPage() {
  const [week, setWeek] = useState(getWeekStart());

  const driversQ = useDrivers();
  const carsQ = useCars();
  const vendorQ = useAllVendor();
  const fuelQ = useAllFuel();
  const otherQ = useAllOtherCosts();
  const settingsQ = useSettings();
  const updateSettings = useUpdateSettings();
  const commissionHQ = useCommissionHistory();

  const isLoading = driversQ.isLoading || carsQ.isLoading || vendorQ.isLoading || commissionHQ.isLoading;

  const drivers = driversQ.data ?? [];
  const cars = carsQ.data ?? [];
  const allVendor = vendorQ.data ?? [];
  const allFuel = fuelQ.data ?? [];
  const allOther = otherQ.data ?? [];
  const settings = settingsQ.data ?? { fuelThreshold: 10 };
  const commissionRows = (commissionHQ.data ?? []) as CommissionHistoryRow[];
  const [threshold, setThreshold] = useState(Number(settings.fuelThreshold));

  const vendor = allVendor.filter((e: any) => e.weekStart === week);
  const fuel = allFuel.filter((e: any) => e.weekStart === week);
  const other = allOther.filter((e: any) => e.weekStart === week);

  const carProfits = useMemo(() => {
    return cars.map((car: any) => {
      const driver = drivers.find((d: any) => d.carId === car.id);
      const carVendor = vendor.filter((e: any) => e.carId === car.id).reduce((s: number, e: any) => s + Number(e.amount), 0);
      const carFuel = fuel.filter((e: any) => e.carId === car.id).reduce((s: number, e: any) => s + Number(e.cost), 0);
      const carOther = other.filter((e: any) => e.carId === car.id).reduce((s: number, e: any) => s + Number(e.amount), 0);
      const pct = driver?.id ? commissionPercentForWeek(driver.id, week, commissionRows) : 30;
      const commission = carVendor * (pct / 100);
      const profit = carVendor - commission - carFuel - carOther;
      return { car, driver, carVendor, carFuel, carOther, commission, profit };
    });
  }, [cars, drivers, vendor, fuel, other, week, commissionRows]);

  const fuelEfficiency = useMemo(() => {
    const sorted = [...fuel].sort((a: any, b: any) => Number(a.odometer) - Number(b.odometer));
    return sorted.map((entry: any, i: number) => {
      if (i === 0) return { ...entry, distance: 0, kml: 0 };
      const prev = sorted.filter((e: any) => e.carId === entry.carId && Number(e.odometer) < Number(entry.odometer)).pop();
      if (!prev) return { ...entry, distance: 0, kml: 0 };
      const distance = Number(entry.odometer) - Number(prev.odometer);
      const kml = Number(entry.liters) > 0 ? distance / Number(entry.liters) : 0;
      return { ...entry, distance, kml };
    });
  }, [fuel]);

  const avgKml = fuelEfficiency.filter((e: any) => e.kml > 0).reduce((s: number, e: any, _: number, a: any[]) => s + e.kml / a.length, 0);

  const updateThreshold = (val: string) => {
    const n = Number(val);
    setThreshold(n);
    updateSettings.mutate({ fuelThreshold: n });
  };

  if (isLoading) return <LoadingSpinner label="Loading reports..." />;

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-40 bg-background pb-2 pt-1">
        <h1 className="text-lg font-semibold">Reports</h1>
        <div className="mt-2"><WeekPicker value={week} onChange={setWeek} /></div>
      </div>

      <div>
        <h2 className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Car Profit</h2>
        {carProfits.length === 0 ? (
          <p className="rounded-md border p-4 text-center text-sm text-muted-foreground">No cars added</p>
        ) : (
          <div className="space-y-1">
            {carProfits.map(({ car, driver, carVendor, carFuel, commission, profit }: any) => (
              <div key={car.id} className="rounded-md border p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <div><p className="text-sm font-medium">{car.number}</p><p className="text-xs text-muted-foreground">{driver?.name ?? "Unassigned"}</p></div>
                  <p className={`text-sm font-semibold tabular-nums ${profit >= 0 ? "text-success" : "text-destructive"}`}>{formatCurrency(profit)}</p>
                </div>
                <div className="flex gap-3 text-xs text-muted-foreground tabular-nums">
                  <span>Vendor: {formatCurrency(carVendor)}</span><span>Fuel: {formatCurrency(carFuel)}</span><span>Comm: {formatCurrency(commission)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Fuel Efficiency</h2>
          <div className="flex items-center gap-1">
            <Label className="text-xs text-muted-foreground">Threshold:</Label>
            <Input type="number" className="h-7 w-16 text-xs" value={threshold} onChange={e => updateThreshold(e.target.value)} />
          </div>
        </div>
        <StatCard label="Avg KM/L" value={avgKml > 0 ? `${avgKml.toFixed(1)} KM/L` : "—"} icon={<Fuel className="h-4 w-4 text-muted-foreground" />} />
        <div className="mt-2 space-y-1">
          {fuelEfficiency.filter((e: any) => e.kml > 0).map((e: any) => {
            const isLow = e.kml < threshold;
            const car = cars.find((c: any) => c.id === e.carId);
            return (
              <div key={e.id} className={`flex items-center justify-between rounded-md border px-3 py-2 ${isLow ? "border-l-[3px] border-l-destructive" : ""}`}>
                <div><p className="text-xs text-muted-foreground">{e.date} · {car?.number}</p><p className="text-xs text-muted-foreground">{e.distance} km · {e.liters}L</p></div>
                <div className="flex items-center gap-1">
                  {isLow && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
                  <p className={`text-sm font-medium tabular-nums ${isLow ? "text-destructive" : ""}`}>{e.kml.toFixed(1)} KM/L</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
