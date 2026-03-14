import { useState, useMemo } from "react";
import { getCars, getDrivers, getVendorEntries, getFuelEntries, getOtherCostEntries, getCarCosts } from "@/lib/store";
import { formatCurrency } from "@/lib/utils-date";
import StatCard from "@/components/StatCard";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { format, parseISO, startOfMonth } from "date-fns";
import { Fuel, TrendingUp, Car, IndianRupee } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const COLORS = ["hsl(240, 5.9%, 10%)", "hsl(240, 3.8%, 46.1%)", "hsl(240, 4.8%, 70%)", "hsl(240, 4.8%, 85%)"];

export default function AnalyticsPage() {
  const cars = getCars();
  const drivers = getDrivers();
  const allVendor = getVendorEntries();
  const allFuel = getFuelEntries();
  const allOther = getOtherCostEntries();
  const allCarCosts = getCarCosts();

  // Fuel consumption per car
  const fuelPerCar = useMemo(() => {
    return cars.map(car => {
      const entries = allFuel.filter(f => f.carId === car.id);
      const totalLiters = entries.reduce((s, e) => s + e.liters, 0);
      const totalCost = entries.reduce((s, e) => s + e.cost, 0);
      const sorted = [...entries].sort((a, b) => a.odometer - b.odometer);
      let totalKm = 0;
      for (let i = 1; i < sorted.length; i++) {
        totalKm += sorted[i].odometer - sorted[i - 1].odometer;
      }
      const avgKml = totalLiters > 0 ? totalKm / totalLiters : 0;
      return { name: car.number, liters: totalLiters, cost: totalCost, km: totalKm, kml: Number(avgKml.toFixed(1)), model: car.model };
    });
  }, [cars, allFuel]);

  // Month-wise earnings per car
  const monthlyEarnings = useMemo(() => {
    const monthMap: Record<string, Record<string, number>> = {};
    allVendor.forEach(v => {
      const month = format(parseISO(v.date), "MMM yy");
      if (!monthMap[month]) monthMap[month] = {};
      const car = cars.find(c => c.id === v.carId);
      const key = car?.number || v.carId;
      monthMap[month][key] = (monthMap[month][key] || 0) + v.amount;
    });

    return Object.entries(monthMap)
      .map(([month, carData]) => ({ month, ...carData }))
      .sort((a, b) => {
        // Sort chronologically
        const months = Object.keys(monthMap);
        return months.indexOf(a.month) - months.indexOf(b.month);
      });
  }, [allVendor, cars]);

  // Cumulative earning per car
  const cumulativeEarnings = useMemo(() => {
    return cars.map(car => {
      const driver = drivers.find(d => d.carId === car.id);
      const vendor = allVendor.filter(v => v.carId === car.id).reduce((s, v) => s + v.amount, 0);
      const fuel = allFuel.filter(f => f.carId === car.id).reduce((s, f) => s + f.cost, 0);
      const other = allOther.filter(o => o.carId === car.id).reduce((s, o) => s + o.amount, 0);
      const carCost = allCarCosts.filter(c => c.carId === car.id).reduce((s, c) => s + c.amount, 0);
      const commission = vendor * ((driver?.commissionPercent ?? 30) / 100);
      const profit = vendor - commission - fuel - other - carCost;
      return { name: car.number, vendor, fuel, other, carCost, commission, profit, model: car.model };
    });
  }, [cars, drivers, allVendor, allFuel, allOther, allCarCosts]);

  // Booking source breakdown
  const sourceBreakdown = useMemo(() => {
    const cashEntries = JSON.parse(localStorage.getItem("zingcab_cash") || "[]");
    const sources: Record<string, number> = { savari: 0, direct: 0, other: 0 };
    cashEntries.forEach((e: any) => { sources[e.source] = (sources[e.source] || 0) + e.amount; });
    return Object.entries(sources).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
  }, []);

  // Total fleet stats
  const fleetStats = useMemo(() => {
    const totalVendor = allVendor.reduce((s, v) => s + v.amount, 0);
    const totalFuel = allFuel.reduce((s, f) => s + f.cost, 0);
    const totalOther = allOther.reduce((s, o) => s + o.amount, 0);
    const totalCarCost = allCarCosts.reduce((s, c) => s + c.amount, 0);
    const totalProfit = cumulativeEarnings.reduce((s, c) => s + c.profit, 0);
    const avgFuelEff = fuelPerCar.filter(f => f.kml > 0).reduce((s, f, _, a) => s + f.kml / a.length, 0);
    return { totalVendor, totalFuel, totalOther, totalCarCost, totalProfit, avgFuelEff };
  }, [allVendor, allFuel, allOther, allCarCosts, cumulativeEarnings, fuelPerCar]);

  const carNumbers = cars.map(c => c.number);

  return (
    <div className="space-y-4 pb-4">
      <div className="sticky top-0 z-40 bg-background pb-2 pt-1">
        <h1 className="text-lg font-semibold">Analytics</h1>
      </div>

      {/* Fleet Overview */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Total Revenue" value={formatCurrency(fleetStats.totalVendor)} icon={<IndianRupee className="h-4 w-4 text-muted-foreground" />} />
        <StatCard label="Net Profit" value={formatCurrency(fleetStats.totalProfit)} variant={fleetStats.totalProfit >= 0 ? "success" : "danger"} icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />} />
        <StatCard label="Total Fuel" value={formatCurrency(fleetStats.totalFuel)} variant="danger" icon={<Fuel className="h-4 w-4 text-muted-foreground" />} />
        <StatCard label="Avg Fuel Eff." value={`${fleetStats.avgFuelEff.toFixed(1)} KM/L`} icon={<Car className="h-4 w-4 text-muted-foreground" />} />
      </div>

      <Tabs defaultValue="fuel">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="fuel" className="text-xs">Fuel</TabsTrigger>
          <TabsTrigger value="monthly" className="text-xs">Monthly</TabsTrigger>
          <TabsTrigger value="profit" className="text-xs">Profit</TabsTrigger>
          <TabsTrigger value="source" className="text-xs">Sources</TabsTrigger>
        </TabsList>

        {/* Fuel Consumption Per Car */}
        <TabsContent value="fuel" className="mt-3 space-y-3">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Fuel Consumption / Car</h2>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fuelPerCar} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 5.9%, 90%)" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="liters" fill="hsl(240, 5.9%, 10%)" name="Liters" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Fuel Efficiency (KM/L)</h2>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fuelPerCar} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 5.9%, 90%)" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="kml" fill="hsl(160, 84%, 39.4%)" name="KM/L" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Fuel table */}
          <div className="space-y-1">
            {fuelPerCar.map(f => (
              <div key={f.name} className="flex items-center justify-between rounded-md border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{f.name}</p>
                  <p className="text-xs text-muted-foreground">{f.model} · {f.km} km · {f.liters}L</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium tabular-nums">{f.kml} KM/L</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(f.cost)}</p>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Monthly Earnings */}
        <TabsContent value="monthly" className="mt-3 space-y-3">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Monthly Earnings / Car</h2>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyEarnings} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 5.9%, 90%)" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(value: number) => formatCurrency(value)} />
                {carNumbers.map((num, i) => (
                  <Bar key={num} dataKey={num} fill={COLORS[i % COLORS.length]} name={num} stackId="a" radius={i === carNumbers.length - 1 ? [4, 4, 0, 0] : undefined} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        {/* Cumulative Profit */}
        <TabsContent value="profit" className="mt-3 space-y-3">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cumulative Earnings / Car</h2>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cumulativeEarnings} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 5.9%, 90%)" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="vendor" fill="hsl(240, 5.9%, 10%)" name="Revenue" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" fill="hsl(160, 84%, 39.4%)" name="Profit" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Profit breakdown cards */}
          <div className="space-y-1">
            {cumulativeEarnings.map(c => (
              <div key={c.name} className="rounded-md border p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.model}</p>
                  </div>
                  <p className={`text-sm font-semibold tabular-nums ${c.profit >= 0 ? "text-success" : "text-destructive"}`}>
                    {formatCurrency(c.profit)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground tabular-nums">
                  <span>Rev: {formatCurrency(c.vendor)}</span>
                  <span>Fuel: {formatCurrency(c.fuel)}</span>
                  <span>Comm: {formatCurrency(c.commission)}</span>
                  <span>Maint: {formatCurrency(c.carCost)}</span>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Booking Sources */}
        <TabsContent value="source" className="mt-3 space-y-3">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Booking Source Breakdown</h2>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={sourceBreakdown} cx="50%" cy="50%" outerRadius={80} innerRadius={40} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {sourceBreakdown.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1">
            {sourceBreakdown.map((s, i) => (
              <div key={s.name} className="flex items-center justify-between rounded-md border px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <p className="text-sm font-medium capitalize">{s.name}</p>
                </div>
                <p className="text-sm font-medium tabular-nums">{formatCurrency(s.value)}</p>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
