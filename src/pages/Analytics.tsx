import { useMemo } from "react";
import { getCars, getDrivers, getVendorEntries, getFuelEntries, getOtherCostEntries, getCarCosts, getOtherEarnings, getSettings } from "@/lib/store";
import { formatCurrency } from "@/lib/utils-date";
import StatCard from "@/components/StatCard";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format, parseISO } from "date-fns";
import { Fuel, TrendingUp, Car, IndianRupee, AlertTriangle, Trophy, ArrowDown, ArrowUp } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const COLORS = ["hsl(240, 5.9%, 10%)", "hsl(240, 3.8%, 46.1%)", "hsl(240, 4.8%, 70%)", "hsl(240, 4.8%, 85%)"];

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
      return { name: car.number, liters: totalLiters, cost: totalCost, km: totalKm, kml: Number(avgKml.toFixed(1)), costPerKm: Number(costPerKm.toFixed(1)), model: car.model, expected: car.expectedMileage, isLow };
    });
  }, [cars, allFuel, settings]);

  // Monthly earnings per car
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
      .sort((a, b) => Object.keys(monthMap).indexOf(a.month) - Object.keys(monthMap).indexOf(b.month));
  }, [allVendor, cars]);

  // Cumulative per car (profit = vendor + otherEarnings - commission - fuel - other - carCost)
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
      return { name: car.number, vendor, otherEarn, fuel, other, carCost, commission, profit, model: car.model, driverName: driver?.name || "Unassigned" };
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
      return { name: d.name, car: car?.number || "—", vendor, profit, commission, fuel, trips: allVendor.filter(v => v.driverId === d.id).length };
    }).sort((a, b) => b.profit - a.profit);
  }, [drivers, cars, allVendor, allFuel, allOther, allOtherEarnings]);

  // Booking source breakdown
  const sourceBreakdown = useMemo(() => {
    const cashEntries = JSON.parse(localStorage.getItem("zingcab_cash") || "[]");
    const sources: Record<string, number> = { savari: 0, direct: 0, other: 0 };
    cashEntries.forEach((e: any) => { sources[e.source] = (sources[e.source] || 0) + e.amount; });
    return Object.entries(sources).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
  }, []);

  // Fleet stats
  const fleetStats = useMemo(() => {
    const totalVendor = allVendor.reduce((s, v) => s + v.amount, 0);
    const totalOtherEarn = allOtherEarnings.reduce((s, e) => s + e.amount, 0);
    const totalFuel = allFuel.reduce((s, f) => s + f.cost, 0);
    const totalOther = allOther.reduce((s, o) => s + o.amount, 0);
    const totalCarCost = allCarCosts.reduce((s, c) => s + c.amount, 0);
    const totalProfit = cumulativeEarnings.reduce((s, c) => s + c.profit, 0);
    const avgFuelEff = mileagePerCar.filter(f => f.kml > 0).reduce((s, f, _, a) => s + f.kml / a.length, 0);
    const lowMileageCars = mileagePerCar.filter(f => f.isLow).length;
    return { totalVendor, totalOtherEarn, totalFuel, totalOther, totalCarCost, totalProfit, avgFuelEff, lowMileageCars };
  }, [allVendor, allFuel, allOther, allCarCosts, allOtherEarnings, cumulativeEarnings, mileagePerCar]);

  // Actionable alerts
  const alerts = useMemo(() => {
    const items: { type: "danger" | "warning" | "info"; message: string }[] = [];
    mileagePerCar.forEach(c => {
      if (c.isLow) items.push({ type: "danger", message: `${c.name}: Low mileage ${c.kml} KM/L (expected ${c.expected})` });
    });
    cumulativeEarnings.forEach(c => {
      if (c.profit < 0) items.push({ type: "danger", message: `${c.name}: Making loss of ${formatCurrency(Math.abs(c.profit))}` });
    });
    const bestCar = [...cumulativeEarnings].sort((a, b) => b.profit - a.profit)[0];
    const worstCar = [...cumulativeEarnings].sort((a, b) => a.profit - b.profit)[0];
    if (bestCar) items.push({ type: "info", message: `Best performer: ${bestCar.name} (${formatCurrency(bestCar.profit)} profit)` });
    if (worstCar && worstCar.name !== bestCar?.name) items.push({ type: "warning", message: `Needs attention: ${worstCar.name} (${formatCurrency(worstCar.profit)})` });
    return items;
  }, [mileagePerCar, cumulativeEarnings]);

  const carNumbers = cars.map(c => c.number);

  return (
    <div className="space-y-4 pb-4">
      <div className="sticky top-0 z-40 bg-background pb-2 pt-1">
        <h1 className="text-lg font-semibold">Analytics</h1>
      </div>

      {/* Actionable Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-1">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">⚡ Action Required</h2>
          {alerts.map((a, i) => (
            <div key={i} className={`flex items-start gap-2 rounded-md border px-3 py-2 text-xs ${a.type === "danger" ? "border-l-[3px] border-l-destructive" : a.type === "warning" ? "border-l-[3px] border-l-warning" : "border-l-[3px] border-l-success"}`}>
              {a.type === "danger" ? <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" /> :
               a.type === "warning" ? <ArrowDown className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" /> :
               <ArrowUp className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />}
              <span>{a.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Fleet Overview */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Total Revenue" value={formatCurrency(fleetStats.totalVendor + fleetStats.totalOtherEarn)} icon={<IndianRupee className="h-4 w-4 text-muted-foreground" />} />
        <StatCard label="Net Profit" value={formatCurrency(fleetStats.totalProfit)} variant={fleetStats.totalProfit >= 0 ? "success" : "danger"} icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />} />
        <StatCard label="Total Fuel" value={formatCurrency(fleetStats.totalFuel)} variant="danger" icon={<Fuel className="h-4 w-4 text-muted-foreground" />} />
        <StatCard label="Avg Mileage" value={`${fleetStats.avgFuelEff.toFixed(1)} KM/L`} variant={fleetStats.lowMileageCars > 0 ? "danger" : undefined} icon={<Car className="h-4 w-4 text-muted-foreground" />} />
      </div>

      <Tabs defaultValue="mileage">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="mileage" className="text-[10px] px-1">Mileage</TabsTrigger>
          <TabsTrigger value="monthly" className="text-[10px] px-1">Monthly</TabsTrigger>
          <TabsTrigger value="profit" className="text-[10px] px-1">Profit</TabsTrigger>
          <TabsTrigger value="drivers" className="text-[10px] px-1">Drivers</TabsTrigger>
          <TabsTrigger value="source" className="text-[10px] px-1">Sources</TabsTrigger>
        </TabsList>

        {/* Mileage / Fuel Analytics */}
        <TabsContent value="mileage" className="mt-3 space-y-3">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Mileage Per Car (from Odometer)</h2>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mileagePerCar} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 5.9%, 90%)" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="kml" fill="hsl(240, 5.9%, 10%)" name="Actual KM/L" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expected" fill="hsl(240, 4.8%, 70%)" name="Expected KM/L" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cost Per KM (₹)</h2>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mileagePerCar} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 5.9%, 90%)" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${v}`} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: number) => `₹${v}/km`} />
                <Bar dataKey="costPerKm" fill="hsl(0, 84.2%, 60.2%)" name="₹/KM" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Mileage detail cards */}
          <div className="space-y-1">
            {mileagePerCar.map(f => (
              <div key={f.name} className={`flex items-center justify-between rounded-md border px-3 py-2 ${f.isLow ? "border-l-[3px] border-l-destructive" : ""}`}>
                <div>
                  <p className="text-sm font-medium">{f.name}</p>
                  <p className="text-xs text-muted-foreground">{f.model} · {f.km} km · {f.liters}L</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium tabular-nums ${f.isLow ? "text-destructive" : ""}`}>
                    {f.isLow && <AlertTriangle className="inline h-3 w-3 mr-1" />}
                    {f.kml} KM/L
                  </p>
                  <p className="text-xs text-muted-foreground">₹{f.costPerKm}/km · {formatCurrency(f.cost)}</p>
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
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cumulative Profit / Car</h2>
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

          <div className="space-y-1">
            {cumulativeEarnings.map(c => (
              <div key={c.name} className="rounded-md border p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.model} · {c.driverName}</p>
                  </div>
                  <p className={`text-sm font-semibold tabular-nums ${c.profit >= 0 ? "text-success" : "text-destructive"}`}>
                    {formatCurrency(c.profit)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground tabular-nums">
                  <span>Rev: {formatCurrency(c.vendor)}</span>
                  <span>Other: {formatCurrency(c.otherEarn)}</span>
                  <span>Fuel: {formatCurrency(c.fuel)}</span>
                  <span>Comm: {formatCurrency(c.commission)}</span>
                  <span>Maint: {formatCurrency(c.carCost)}</span>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Driver Leaderboard */}
        <TabsContent value="drivers" className="mt-3 space-y-3">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">🏆 Driver Profit Leaderboard</h2>
          <div className="space-y-1">
            {driverLeaderboard.map((d, i) => (
              <div key={d.name} className={`rounded-md border p-3 space-y-1 ${i === 0 ? "border-l-[3px] border-l-success" : ""}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {i === 0 && <Trophy className="h-4 w-4 text-success" />}
                    <div>
                      <p className="text-sm font-medium">#{i + 1} {d.name}</p>
                      <p className="text-xs text-muted-foreground">{d.car} · {d.trips} trips</p>
                    </div>
                  </div>
                  <p className={`text-sm font-semibold tabular-nums ${d.profit >= 0 ? "text-success" : "text-destructive"}`}>
                    {formatCurrency(d.profit)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground tabular-nums">
                  <span>Rev: {formatCurrency(d.vendor)}</span>
                  <span>Comm: {formatCurrency(d.commission)}</span>
                  <span>Fuel: {formatCurrency(d.fuel)}</span>
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
