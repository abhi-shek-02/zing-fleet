import { useMemo } from "react";
import { getCars, getDrivers, getVendorEntries, getFuelEntries, getOtherCostEntries, getCarCosts, getOtherEarnings, getSettings } from "@/lib/store";
import { formatCurrency } from "@/lib/utils-date";
import StatCard from "@/components/StatCard";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { format, parseISO } from "date-fns";
import { Fuel, TrendingUp, Car, IndianRupee, AlertTriangle, Trophy, ArrowDown, ArrowUp, Gauge, Target, ShieldAlert, Zap } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const COLORS = [
  "hsl(228, 76%, 52%)",
  "hsl(152, 60%, 40%)",
  "hsl(38, 92%, 50%)",
  "hsl(220, 9%, 46%)",
];

export default function AnalyticsPage() {
  const cars = getCars();
  const drivers = getDrivers();
  const allVendor = getVendorEntries();
  const allFuel = getFuelEntries();
  const allOther = getOtherCostEntries();
  const allCarCosts = getCarCosts();
  const allOtherEarnings = getOtherEarnings();
  const settings = getSettings();

  // Mileage per car from odometer
  const mileagePerCar = useMemo(() => {
    return cars.map(car => {
      const entries = [...allFuel.filter(f => f.carId === car.id)].sort((a, b) => a.odometer - b.odometer);
      const totalLiters = entries.reduce((s, e) => s + e.liters, 0);
      const totalCost = entries.reduce((s, e) => s + e.cost, 0);
      let totalKm = 0;
      for (let i = 1; i < entries.length; i++) {
        totalKm += entries[i].odometer - entries[i - 1].odometer;
      }
      const avgKml = totalLiters > 0 ? totalKm / totalLiters : 0;
      const costPerKm = totalKm > 0 ? totalCost / totalKm : 0;
      const isLow = avgKml > 0 && avgKml < settings.fuelThreshold;
      const efficiency = car.expectedMileage > 0 ? (avgKml / car.expectedMileage) * 100 : 0;
      return { name: car.number, liters: totalLiters, cost: totalCost, km: totalKm, kml: Number(avgKml.toFixed(1)), costPerKm: Number(costPerKm.toFixed(1)), model: car.model, expected: car.expectedMileage, isLow, efficiency: Number(efficiency.toFixed(0)) };
    });
  }, [cars, allFuel, settings]);

  // Monthly earnings trend (line chart)
  const monthlyTrend = useMemo(() => {
    const monthMap: Record<string, { revenue: number; fuel: number; profit: number }> = {};
    allVendor.forEach(v => {
      const month = format(parseISO(v.date), "MMM yy");
      if (!monthMap[month]) monthMap[month] = { revenue: 0, fuel: 0, profit: 0 };
      monthMap[month].revenue += v.amount;
    });
    allOtherEarnings.forEach(e => {
      const month = format(parseISO(e.date), "MMM yy");
      if (!monthMap[month]) monthMap[month] = { revenue: 0, fuel: 0, profit: 0 };
      monthMap[month].revenue += e.amount;
    });
    allFuel.forEach(f => {
      const month = format(parseISO(f.date), "MMM yy");
      if (!monthMap[month]) monthMap[month] = { revenue: 0, fuel: 0, profit: 0 };
      monthMap[month].fuel += f.cost;
    });
    return Object.entries(monthMap).map(([month, data]) => ({
      month,
      revenue: data.revenue,
      fuel: data.fuel,
      profit: data.revenue - data.fuel,
    }));
  }, [allVendor, allFuel, allOtherEarnings]);

  // Monthly earnings per car (bar)
  const monthlyEarnings = useMemo(() => {
    const monthMap: Record<string, Record<string, number>> = {};
    allVendor.forEach(v => {
      const month = format(parseISO(v.date), "MMM yy");
      if (!monthMap[month]) monthMap[month] = {};
      const car = cars.find(c => c.id === v.carId);
      const key = car?.number || v.carId;
      monthMap[month][key] = (monthMap[month][key] || 0) + v.amount;
    });
    return Object.entries(monthMap).map(([month, carData]) => ({ month, ...carData }));
  }, [allVendor, cars]);

  // Cumulative per car
  const cumulativeEarnings = useMemo(() => {
    return cars.map(car => {
      const driver = drivers.find(d => d.carId === car.id);
      const vendor = allVendor.filter(v => v.carId === car.id).reduce((s, v) => s + v.amount, 0);
      const otherEarn = allOtherEarnings.filter(e => e.carId === car.id).reduce((s, e) => s + e.amount, 0);
      const fuel = allFuel.filter(f => f.carId === car.id).reduce((s, f) => s + f.cost, 0);
      const other = allOther.filter(o => o.carId === car.id).reduce((s, o) => s + o.amount, 0);
      const carCost = allCarCosts.filter(c => c.carId === car.id).reduce((s, c) => s + c.amount, 0);
      const totalEarnings = vendor + otherEarn;
      const commission = totalEarnings * ((driver?.commissionPercent ?? 30) / 100);
      const profit = totalEarnings - commission - fuel - other - carCost;
      const margin = totalEarnings > 0 ? (profit / totalEarnings) * 100 : 0;
      return { name: car.number, vendor, otherEarn, fuel, other, carCost, commission, profit, model: car.model, driverName: driver?.name || "Unassigned", margin: Number(margin.toFixed(1)) };
    });
  }, [cars, drivers, allVendor, allFuel, allOther, allCarCosts, allOtherEarnings]);

  // Driver profit leaderboard
  const driverLeaderboard = useMemo(() => {
    return drivers.filter(d => d.status === "active").map(d => {
      const vendor = allVendor.filter(v => v.driverId === d.id).reduce((s, v) => s + v.amount, 0);
      const otherEarn = allOtherEarnings.filter(e => e.driverId === d.id).reduce((s, e) => s + e.amount, 0);
      const fuel = allFuel.filter(f => f.driverId === d.id).reduce((s, f) => s + f.cost, 0);
      const other = allOther.filter(o => o.driverId === d.id).reduce((s, o) => s + o.amount, 0);
      const totalEarnings = vendor + otherEarn;
      const commission = totalEarnings * (d.commissionPercent / 100);
      const profit = totalEarnings - commission - fuel - other;
      const car = cars.find(c => c.id === d.carId);
      const trips = allVendor.filter(v => v.driverId === d.id).length;
      const revenuePerTrip = trips > 0 ? totalEarnings / trips : 0;
      return { name: d.name, car: car?.number || "—", vendor, profit, commission, fuel, trips, revenuePerTrip: Number(revenuePerTrip.toFixed(0)) };
    }).sort((a, b) => b.profit - a.profit);
  }, [drivers, cars, allVendor, allFuel, allOther, allOtherEarnings]);

  // Fleet stats
  const fleetStats = useMemo(() => {
    const totalVendor = allVendor.reduce((s, v) => s + v.amount, 0);
    const totalOtherEarn = allOtherEarnings.reduce((s, e) => s + e.amount, 0);
    const totalFuel = allFuel.reduce((s, f) => s + f.cost, 0);
    const totalProfit = cumulativeEarnings.reduce((s, c) => s + c.profit, 0);
    const avgFuelEff = mileagePerCar.filter(f => f.kml > 0).reduce((s, f, _, a) => s + f.kml / a.length, 0);
    const totalRevenue = totalVendor + totalOtherEarn;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    return { totalRevenue, totalFuel, totalProfit, avgFuelEff, profitMargin: Number(profitMargin.toFixed(1)) };
  }, [allVendor, allFuel, allOtherEarnings, cumulativeEarnings, mileagePerCar]);

  // Actionable insights
  const insights = useMemo(() => {
    const items: { severity: "critical" | "warning" | "positive"; title: string; detail: string; icon: typeof AlertTriangle }[] = [];
    
    // Low mileage alerts
    mileagePerCar.forEach(c => {
      if (c.isLow) items.push({
        severity: "critical",
        title: `${c.name} underperforming on mileage`,
        detail: `Running at ${c.kml} KM/L vs expected ${c.expected} KM/L. Check tire pressure, driving habits, or engine health.`,
        icon: Gauge,
      });
    });
    
    // Loss-making cars
    cumulativeEarnings.forEach(c => {
      if (c.profit < 0) items.push({
        severity: "critical",
        title: `${c.name} is making a loss`,
        detail: `Total loss: ${formatCurrency(Math.abs(c.profit))}. Consider reassigning driver, reducing costs, or increasing trips.`,
        icon: ShieldAlert,
      });
    });

    // Low margin cars
    cumulativeEarnings.forEach(c => {
      if (c.margin > 0 && c.margin < 15) items.push({
        severity: "warning",
        title: `${c.name} has thin margins (${c.margin}%)`,
        detail: `Profit margin below 15%. Revenue: ${formatCurrency(c.vendor)} but high costs eating into profit.`,
        icon: Target,
      });
    });

    // Best performer
    const bestCar = [...cumulativeEarnings].sort((a, b) => b.profit - a.profit)[0];
    if (bestCar && bestCar.profit > 0) items.push({
      severity: "positive",
      title: `${bestCar.name} is your top earner`,
      detail: `Generating ${formatCurrency(bestCar.profit)} profit with ${bestCar.margin}% margin. ${bestCar.driverName} is driving this.`,
      icon: TrendingUp,
    });

    // Best driver
    if (driverLeaderboard.length > 0 && driverLeaderboard[0].profit > 0) {
      const best = driverLeaderboard[0];
      items.push({
        severity: "positive",
        title: `${best.name} leads with ${formatCurrency(best.profit)} profit`,
        detail: `${best.trips} trips completed, avg ${formatCurrency(best.revenuePerTrip)}/trip. Consider rewarding or incentivizing.`,
        icon: Trophy,
      });
    }

    return items;
  }, [mileagePerCar, cumulativeEarnings, driverLeaderboard]);

  const carNumbers = cars.map(c => c.number);

  return (
    <div className="space-y-5 pb-4">
      <div className="sticky top-0 z-40 bg-background pb-3 pt-2">
        <h1 className="text-xl font-semibold tracking-tight">Insights</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Fleet performance and actionable intelligence</p>
      </div>

      {/* Fleet KPIs */}
      <div className="grid grid-cols-2 gap-2.5">
        <StatCard label="Total Revenue" value={formatCurrency(fleetStats.totalRevenue)} icon={<IndianRupee className="h-3.5 w-3.5" />} />
        <StatCard label="Net Profit" value={formatCurrency(fleetStats.totalProfit)} variant={fleetStats.totalProfit >= 0 ? "success" : "danger"} icon={<TrendingUp className="h-3.5 w-3.5" />} />
        <StatCard label="Fuel Spend" value={formatCurrency(fleetStats.totalFuel)} variant="danger" icon={<Fuel className="h-3.5 w-3.5" />} />
        <StatCard label="Profit Margin" value={`${fleetStats.profitMargin}%`} variant={fleetStats.profitMargin >= 20 ? "success" : fleetStats.profitMargin >= 0 ? undefined : "danger"} icon={<Target className="h-3.5 w-3.5" />} />
      </div>

      {/* Actionable Insights */}
      {insights.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5" /> Action Required
          </h2>
          {insights.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className={`rounded-lg border p-3 space-y-1 ${
                item.severity === "critical" ? "border-l-[3px] border-l-destructive" :
                item.severity === "warning" ? "border-l-[3px] border-l-warning" :
                "border-l-[3px] border-l-success"
              }`}>
                <div className="flex items-start gap-2">
                  <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${
                    item.severity === "critical" ? "text-destructive" :
                    item.severity === "warning" ? "text-warning" : "text-success"
                  }`} />
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

      {/* Charts Tabs */}
      <Tabs defaultValue="mileage">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="mileage" className="text-[10px] px-1">Mileage</TabsTrigger>
          <TabsTrigger value="revenue" className="text-[10px] px-1">Revenue</TabsTrigger>
          <TabsTrigger value="profit" className="text-[10px] px-1">Profit</TabsTrigger>
          <TabsTrigger value="drivers" className="text-[10px] px-1">Drivers</TabsTrigger>
        </TabsList>

        {/* Mileage Tab */}
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
                  <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => `${v}`} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid hsl(220, 13%, 91%)' }} formatter={(v: number) => [`₹${v}/km`, "Cost"]} />
                  <Bar dataKey="costPerKm" fill="hsl(0, 72%, 51%)" name="₹/KM" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Mileage detail cards */}
          <div className="space-y-1.5">
            {mileagePerCar.map(f => (
              <div key={f.name} className={`rounded-lg border bg-card p-3 ${f.isLow ? "border-l-[3px] border-l-destructive" : ""}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{f.name}</p>
                    <p className="text-[11px] text-muted-foreground">{f.model} · {f.km.toLocaleString()} km driven</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold tabular-nums ${f.isLow ? "text-destructive" : "text-foreground"}`}>
                      {f.kml} KM/L
                    </p>
                    <p className="text-[10px] text-muted-foreground">{f.efficiency}% efficient</p>
                  </div>
                </div>
                <div className="flex gap-3 mt-1.5 text-[10px] text-muted-foreground tabular-nums">
                  <span>{f.liters}L used</span>
                  <span>₹{f.costPerKm}/km</span>
                  <span>{formatCurrency(f.cost)} total</span>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Revenue Tab */}
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
                  {carNumbers.map((num, i) => (
                    <Bar key={num} dataKey={num} fill={COLORS[i % COLORS.length]} name={num} stackId="a" radius={i === carNumbers.length - 1 ? [3, 3, 0, 0] : undefined} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>

        {/* Profit Tab */}
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
                    {cumulativeEarnings.map((entry, i) => (
                      <Cell key={i} fill={entry.profit >= 0 ? "hsl(152, 60%, 40%)" : "hsl(0, 72%, 51%)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-1.5">
            {cumulativeEarnings.map(c => (
              <div key={c.name} className="rounded-lg border bg-card p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-[11px] text-muted-foreground">{c.model} · {c.driverName}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold tabular-nums ${c.profit >= 0 ? "text-success" : "text-destructive"}`}>
                      {formatCurrency(c.profit)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{c.margin}% margin</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1 text-[10px] text-muted-foreground tabular-nums">
                  <span>Rev {formatCurrency(c.vendor)}</span>
                  <span>Fuel {formatCurrency(c.fuel)}</span>
                  <span>Comm {formatCurrency(c.commission)}</span>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Drivers Leaderboard Tab */}
        <TabsContent value="drivers" className="mt-4 space-y-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5" /> Driver Leaderboard
          </h3>
          <div className="space-y-1.5">
            {driverLeaderboard.map((d, i) => (
              <div key={d.name} className={`rounded-lg border bg-card p-3 ${i === 0 ? "border-l-[3px] border-l-primary" : ""}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                      i === 0 ? "bg-primary text-primary-foreground" :
                      i === 1 ? "bg-secondary text-foreground" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{d.name}</p>
                      <p className="text-[11px] text-muted-foreground">{d.car} · {d.trips} trips</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold tabular-nums ${d.profit >= 0 ? "text-success" : "text-destructive"}`}>
                      {formatCurrency(d.profit)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{formatCurrency(d.revenuePerTrip)}/trip</p>
                  </div>
                </div>
                <div className="flex gap-3 mt-1.5 text-[10px] text-muted-foreground tabular-nums">
                  <span>Rev {formatCurrency(d.vendor)}</span>
                  <span>Comm {formatCurrency(d.commission)}</span>
                  <span>Fuel {formatCurrency(d.fuel)}</span>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
