import { useMemo } from "react";
import { useCars, useDrivers, useAllVendor, useAllFuel, useAllOtherCosts, useAllCarCosts, useAllOtherEarnings, useSettings, useSettlementModeHistory, useAllCash } from "@/hooks/useApi";
import {
  totalDriverCutForCarAcrossWeeks,
  totalDriverCutAcrossWeeks,
  type SettlementModeHistoryRow,
} from "@/lib/settlement";
import { LoadingSpinner, ErrorState } from "@/components/LoadingState";
import { formatCurrency } from "@/lib/utils-date";
import StatCard from "@/components/StatCard";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Cell } from "recharts";
import { format, parseISO } from "date-fns";
import { Fuel, TrendingUp, IndianRupee, AlertTriangle, Trophy, Gauge, Target, ShieldAlert, Zap } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const COLORS = ["hsl(228, 76%, 52%)", "hsl(152, 60%, 40%)", "hsl(38, 92%, 50%)", "hsl(220, 9%, 46%)"];

export default function AnalyticsPage() {
  const carsQ = useCars();
  const driversQ = useDrivers();
  const vendorQ = useAllVendor();
  const fuelQ = useAllFuel();
  const otherQ = useAllOtherCosts();
  const carCostsQ = useAllCarCosts();
  const otherEarnQ = useAllOtherEarnings();
  const settingsQ = useSettings();
  const modeHQ = useSettlementModeHistory();
  const cashQ = useAllCash();

  const isLoading = carsQ.isLoading || driversQ.isLoading || vendorQ.isLoading || fuelQ.isLoading || modeHQ.isLoading || cashQ.isLoading;

  const cars = carsQ.data ?? [];
  const drivers = driversQ.data ?? [];
  const allVendor = vendorQ.data ?? [];
  const allFuel = fuelQ.data ?? [];
  const allOther = otherQ.data ?? [];
  const allCarCosts = carCostsQ.data ?? [];
  const allOtherEarnings = otherEarnQ.data ?? [];
  const settings = settingsQ.data ?? { fuelThreshold: 10 };
  const allCash = cashQ.data ?? [];
  const modeRows = (modeHQ.data ?? []) as SettlementModeHistoryRow[];

  const mileagePerCar = useMemo(() => {
    return cars.map((car: any) => {
      const entries = [...allFuel.filter((f: any) => f.carId === car.id)].sort((a: any, b: any) => Number(a.odometer) - Number(b.odometer));
      const totalLiters = entries.reduce((s: number, e: any) => s + Number(e.liters), 0);
      const totalCost = entries.reduce((s: number, e: any) => s + Number(e.cost), 0);
      let totalKm = 0;
      for (let i = 1; i < entries.length; i++) totalKm += Number(entries[i].odometer) - Number(entries[i - 1].odometer);
      const avgKml = totalLiters > 0 ? totalKm / totalLiters : 0;
      const costPerKm = totalKm > 0 ? totalCost / totalKm : 0;
      const isLow = avgKml > 0 && avgKml < Number(settings.fuelThreshold);
      const efficiency = Number(car.expectedMileage) > 0 ? (avgKml / Number(car.expectedMileage)) * 100 : 0;
      return { name: car.number, liters: totalLiters, cost: totalCost, km: totalKm, kml: Number(avgKml.toFixed(1)), costPerKm: Number(costPerKm.toFixed(1)), model: car.model, expected: Number(car.expectedMileage), isLow, efficiency: Number(efficiency.toFixed(0)) };
    });
  }, [cars, allFuel, settings]);

  const monthlyTrend = useMemo(() => {
    const monthMap: Record<string, { revenue: number; fuel: number }> = {};
    allVendor.forEach((v: any) => { const m = format(parseISO(v.date), "MMM yy"); if (!monthMap[m]) monthMap[m] = { revenue: 0, fuel: 0 }; monthMap[m].revenue += Number(v.amount); });
    allOtherEarnings.forEach((e: any) => { const m = format(parseISO(e.date), "MMM yy"); if (!monthMap[m]) monthMap[m] = { revenue: 0, fuel: 0 }; monthMap[m].revenue += Number(e.amount); });
    allFuel.forEach((f: any) => { const m = format(parseISO(f.date), "MMM yy"); if (!monthMap[m]) monthMap[m] = { revenue: 0, fuel: 0 }; monthMap[m].fuel += Number(f.cost); });
    return Object.entries(monthMap).map(([month, data]) => ({ month, revenue: data.revenue, fuel: data.fuel, profit: data.revenue - data.fuel }));
  }, [allVendor, allFuel, allOtherEarnings]);

  const monthlyEarnings = useMemo(() => {
    const monthMap: Record<string, Record<string, number>> = {};
    allVendor.forEach((v: any) => {
      const month = format(parseISO(v.date), "MMM yy");
      if (!monthMap[month]) monthMap[month] = {};
      const car = cars.find((c: any) => c.id === v.carId);
      const key = car?.number || v.carId;
      monthMap[month][key] = (monthMap[month][key] || 0) + Number(v.amount);
    });
    return Object.entries(monthMap).map(([month, carData]) => ({ month, ...carData }));
  }, [allVendor, cars]);

  const cumulativeEarnings = useMemo(() => {
    return cars.map((car: any) => {
      const driver = drivers.find((d: any) => d.carId === car.id);
      const vendor = allVendor.filter((v: any) => v.carId === car.id).reduce((s: number, v: any) => s + Number(v.amount), 0);
      const otherEarn = allOtherEarnings.filter((e: any) => e.carId === car.id).reduce((s: number, e: any) => s + Number(e.amount), 0);
      const fuel = allFuel.filter((f: any) => f.carId === car.id).reduce((s: number, f: any) => s + Number(f.cost), 0);
      const other = allOther.filter((o: any) => o.carId === car.id).reduce((s: number, o: any) => s + Number(o.amount), 0);
      const carCost = allCarCosts.filter((c: any) => c.carId === car.id).reduce((s: number, c: any) => s + Number(c.amount), 0);
      const totalEarnings = vendor + otherEarn;
      const commission = totalDriverCutForCarAcrossWeeks(car.id, driver?.id, modeRows, allCash, allVendor, allOtherEarnings, allFuel, allOther);
      const profit = totalEarnings - commission - fuel - other - carCost;
      const margin = totalEarnings > 0 ? (profit / totalEarnings) * 100 : 0;
      return { name: car.number, vendor, otherEarn, fuel, other, carCost, commission, profit, model: car.model, driverName: driver?.name || "Unassigned", margin: Number(margin.toFixed(1)) };
    });
  }, [cars, drivers, allVendor, allFuel, allOther, allCarCosts, allOtherEarnings, modeRows, allCash]);

  const driverLeaderboard = useMemo(() => {
    return drivers.filter((d: any) => d.status === "active").map((d: any) => {
      const vendor = allVendor.filter((v: any) => v.driverId === d.id).reduce((s: number, v: any) => s + Number(v.amount), 0);
      const otherEarn = allOtherEarnings.filter((e: any) => e.driverId === d.id).reduce((s: number, e: any) => s + Number(e.amount), 0);
      const fuel = allFuel.filter((f: any) => f.driverId === d.id).reduce((s: number, f: any) => s + Number(f.cost), 0);
      const other = allOther.filter((o: any) => o.driverId === d.id).reduce((s: number, o: any) => s + Number(o.amount), 0);
      const totalEarnings = vendor + otherEarn;
      const commission = totalDriverCutAcrossWeeks(d.id, modeRows, allCash, allVendor, allOtherEarnings, allFuel, allOther);
      const profit = totalEarnings - commission - fuel - other;
      const car = cars.find((c: any) => c.id === d.carId);
      const trips = allVendor.filter((v: any) => v.driverId === d.id).length;
      const revenuePerTrip = trips > 0 ? totalEarnings / trips : 0;
      return { name: d.name, car: car?.number || "—", vendor, profit, commission, fuel, trips, revenuePerTrip: Number(revenuePerTrip.toFixed(0)) };
    }).sort((a: any, b: any) => b.profit - a.profit);
  }, [drivers, cars, allVendor, allFuel, allOther, allOtherEarnings, modeRows, allCash]);

  const fleetStats = useMemo(() => {
    const totalVendor = allVendor.reduce((s: number, v: any) => s + Number(v.amount), 0);
    const totalOtherEarn = allOtherEarnings.reduce((s: number, e: any) => s + Number(e.amount), 0);
    const totalFuel = allFuel.reduce((s: number, f: any) => s + Number(f.cost), 0);
    const totalProfit = cumulativeEarnings.reduce((s: number, c: any) => s + c.profit, 0);
    const avgFuelEff = mileagePerCar.filter((f: any) => f.kml > 0).reduce((s: number, f: any, _, a: any[]) => s + f.kml / a.length, 0);
    const totalRevenue = totalVendor + totalOtherEarn;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    return { totalRevenue, totalFuel, totalProfit, avgFuelEff, profitMargin: Number(profitMargin.toFixed(1)) };
  }, [allVendor, allFuel, allOtherEarnings, cumulativeEarnings, mileagePerCar]);

  const insights = useMemo(() => {
    const items: { severity: "critical" | "warning" | "positive"; title: string; detail: string; icon: any }[] = [];
    mileagePerCar.forEach((c: any) => { if (c.isLow) items.push({ severity: "critical", title: `${c.name} underperforming on mileage`, detail: `Running at ${c.kml} KM/L vs expected ${c.expected} KM/L.`, icon: Gauge }); });
    cumulativeEarnings.forEach((c: any) => { if (c.profit < 0) items.push({ severity: "critical", title: `${c.name} is making a loss`, detail: `Total loss: ${formatCurrency(Math.abs(c.profit))}.`, icon: ShieldAlert }); });
    cumulativeEarnings.forEach((c: any) => { if (c.margin > 0 && c.margin < 15) items.push({ severity: "warning", title: `${c.name} has thin margins (${c.margin}%)`, detail: `Profit margin below 15%.`, icon: Target }); });
    const bestCar = [...cumulativeEarnings].sort((a: any, b: any) => b.profit - a.profit)[0];
    if (bestCar && bestCar.profit > 0) items.push({ severity: "positive", title: `${bestCar.name} is your top earner`, detail: `Generating ${formatCurrency(bestCar.profit)} profit with ${bestCar.margin}% margin.`, icon: TrendingUp });
    if (driverLeaderboard.length > 0 && driverLeaderboard[0].profit > 0) {
      const best = driverLeaderboard[0];
      items.push({ severity: "positive", title: `${best.name} leads with ${formatCurrency(best.profit)} profit`, detail: `${best.trips} trips, avg ${formatCurrency(best.revenuePerTrip)}/trip.`, icon: Trophy });
    }
    return items;
  }, [mileagePerCar, cumulativeEarnings, driverLeaderboard]);

  const carNumbers = cars.map((c: any) => c.number);

  if (isLoading) return <LoadingSpinner label="Loading insights..." />;

  return (
    <div className="space-y-5 pb-4">
      <div className="sticky top-0 z-40 bg-background pb-3 pt-2">
        <h1 className="text-xl font-semibold tracking-tight">Insights</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Fleet performance and actionable intelligence</p>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <StatCard label="Total Revenue" value={formatCurrency(fleetStats.totalRevenue)} icon={<IndianRupee className="h-3.5 w-3.5" />} />
        <StatCard label="Net Profit" value={formatCurrency(fleetStats.totalProfit)} variant={fleetStats.totalProfit >= 0 ? "success" : "danger"} icon={<TrendingUp className="h-3.5 w-3.5" />} />
        <StatCard label="Fuel Spend" value={formatCurrency(fleetStats.totalFuel)} variant="danger" icon={<Fuel className="h-3.5 w-3.5" />} />
        <StatCard label="Profit Margin" value={`${fleetStats.profitMargin}%`} variant={fleetStats.profitMargin >= 20 ? "success" : fleetStats.profitMargin >= 0 ? undefined : "danger"} icon={<Target className="h-3.5 w-3.5" />} />
      </div>

      {insights.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><Zap className="h-3.5 w-3.5" /> Action Required</h2>
          {insights.map((item: any, i: number) => {
            const Icon = item.icon;
            return (
              <div key={i} className={`rounded-lg border p-3 space-y-1 ${item.severity === "critical" ? "border-l-[3px] border-l-destructive" : item.severity === "warning" ? "border-l-[3px] border-l-warning" : "border-l-[3px] border-l-success"}`}>
                <div className="flex items-start gap-2">
                  <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${item.severity === "critical" ? "text-destructive" : item.severity === "warning" ? "text-warning" : "text-success"}`} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium">{item.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{item.detail}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Tabs defaultValue="mileage">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="mileage" className="text-[10px] px-1">Mileage</TabsTrigger>
          <TabsTrigger value="revenue" className="text-[10px] px-1">Revenue</TabsTrigger>
          <TabsTrigger value="profit" className="text-[10px] px-1">Profit</TabsTrigger>
          <TabsTrigger value="drivers" className="text-[10px] px-1">Drivers</TabsTrigger>
        </TabsList>

        <TabsContent value="mileage" className="mt-4 space-y-4">
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Actual vs Expected KM/L</h3>
            <div className="h-48 rounded-lg border bg-card p-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mileagePerCar} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid hsl(220, 13%, 91%)' }} />
                  <Bar dataKey="kml" fill="hsl(228, 76%, 52%)" name="Actual KM/L" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="expected" fill="hsl(220, 13%, 91%)" name="Expected KM/L" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Cost Per Kilometer</h3>
            <div className="h-40 rounded-lg border bg-card p-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mileagePerCar} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid hsl(220, 13%, 91%)' }} formatter={(v: number) => [`₹${v}/km`, "Cost"]} />
                  <Bar dataKey="costPerKm" fill="hsl(0, 72%, 51%)" name="₹/KM" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="space-y-1.5">
            {mileagePerCar.map((f: any) => (
              <div key={f.name} className={`rounded-lg border bg-card p-3 ${f.isLow ? "border-l-[3px] border-l-destructive" : ""}`}>
                <div className="flex items-center justify-between">
                  <div><p className="text-sm font-medium">{f.name}</p><p className="text-[11px] text-muted-foreground">{f.model} · {f.km.toLocaleString()} km driven</p></div>
                  <div className="text-right"><p className={`text-sm font-semibold tabular-nums ${f.isLow ? "text-destructive" : "text-foreground"}`}>{f.kml} KM/L</p><p className="text-[10px] text-muted-foreground">{f.efficiency}% efficient</p></div>
                </div>
                <div className="flex gap-3 mt-1.5 text-[10px] text-muted-foreground tabular-nums"><span>{f.liters}L used</span><span>₹{f.costPerKm}/km</span><span>{formatCurrency(f.cost)} total</span></div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="mt-4 space-y-4">
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Monthly Revenue Trend</h3>
            <div className="h-48 rounded-lg border bg-card p-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrend} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid hsl(220, 13%, 91%)' }} formatter={(value: number) => formatCurrency(value)} />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(228, 76%, 52%)" strokeWidth={2} dot={{ r: 3 }} name="Revenue" />
                  <Line type="monotone" dataKey="fuel" stroke="hsl(0, 72%, 51%)" strokeWidth={2} dot={{ r: 3 }} name="Fuel" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Revenue Per Car (Monthly)</h3>
            <div className="h-48 rounded-lg border bg-card p-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyEarnings} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid hsl(220, 13%, 91%)' }} formatter={(value: number) => formatCurrency(value)} />
                  {carNumbers.map((num: string, i: number) => (
                    <Bar key={num} dataKey={num} fill={COLORS[i % COLORS.length]} name={num} stackId="a" radius={i === carNumbers.length - 1 ? [3, 3, 0, 0] : undefined} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="profit" className="mt-4 space-y-4">
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Profit Per Vehicle</h3>
            <div className="h-48 rounded-lg border bg-card p-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cumulativeEarnings} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid hsl(220, 13%, 91%)' }} formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="profit" name="Profit" radius={[3, 3, 0, 0]}>
                    {cumulativeEarnings.map((_: any, i: number) => (
                      <Cell key={i} fill={cumulativeEarnings[i].profit >= 0 ? "hsl(152, 60%, 40%)" : "hsl(0, 72%, 51%)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="space-y-1.5">
            {cumulativeEarnings.map((c: any) => (
              <div key={c.name} className="rounded-lg border bg-card p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div><p className="text-sm font-medium">{c.name}</p><p className="text-[11px] text-muted-foreground">{c.model} · {c.driverName}</p></div>
                  <div className="text-right"><p className={`text-sm font-semibold tabular-nums ${c.profit >= 0 ? "text-success" : "text-destructive"}`}>{formatCurrency(c.profit)}</p><p className="text-[10px] text-muted-foreground">{c.margin}% margin</p></div>
                </div>
                <div className="grid grid-cols-3 gap-1 text-[10px] text-muted-foreground tabular-nums"><span>Rev {formatCurrency(c.vendor)}</span><span>Fuel {formatCurrency(c.fuel)}</span><span>Comm {formatCurrency(c.commission)}</span></div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="drivers" className="mt-4 space-y-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><Trophy className="h-3.5 w-3.5" /> Driver Leaderboard</h3>
          <div className="space-y-1.5">
            {driverLeaderboard.map((d: any, i: number) => (
              <div key={d.name} className={`rounded-lg border bg-card p-3 ${i === 0 ? "border-l-[3px] border-l-primary" : ""}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${i === 0 ? "bg-primary text-primary-foreground" : i === 1 ? "bg-secondary text-foreground" : "bg-muted text-muted-foreground"}`}>{i + 1}</span>
                    <div><p className="text-sm font-medium">{d.name}</p><p className="text-[11px] text-muted-foreground">{d.car} · {d.trips} trips</p></div>
                  </div>
                  <div className="text-right"><p className={`text-sm font-semibold tabular-nums ${d.profit >= 0 ? "text-success" : "text-destructive"}`}>{formatCurrency(d.profit)}</p><p className="text-[10px] text-muted-foreground">{formatCurrency(d.revenuePerTrip)}/trip</p></div>
                </div>
                <div className="flex gap-3 mt-1.5 text-[10px] text-muted-foreground tabular-nums"><span>Rev {formatCurrency(d.vendor)}</span><span>Comm {formatCurrency(d.commission)}</span><span>Fuel {formatCurrency(d.fuel)}</span></div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
