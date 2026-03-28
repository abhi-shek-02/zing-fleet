import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/LoadingState";
import StatCard from "@/components/StatCard";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, ComposedChart,
} from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const TRIP_COLORS: Record<string, string> = {
  "Local 4hr": "hsl(210,70%,55%)",
  "Local 8hr": "hsl(228,76%,52%)",
  "Local 12hr": "hsl(250,60%,55%)",
  "One Way Drop": "hsl(152,60%,40%)",
  "Round Trip": "hsl(38,92%,50%)",
  "Transfer": "hsl(340,65%,50%)",
  "Other": "hsl(220,9%,46%)",
};

const FESTIVALS = [
  { name: "Durga Puja", date: "Oct 2-6, 2025", multiplier: "3.5x demand", color: "border-red-500/40 bg-red-500/10" },
  { name: "Diwali", date: "Oct 20, 2025", multiplier: "1.8x demand", color: "border-orange-500/40 bg-orange-500/10" },
  { name: "Jagadhatri Puja", date: "Nov 5-6, 2025", multiplier: "1.4x demand", color: "border-blue-500/40 bg-blue-500/10" },
  { name: "Christmas / New Year", date: "Dec 24-Jan 1", multiplier: "1.6x — airport heavy", color: "border-yellow-500/40 bg-yellow-500/10" },
  { name: "Poila Boishakh", date: "Apr 14-15, 2026", multiplier: "2x demand", color: "border-orange-500/40 bg-orange-500/10" },
  { name: "Eid ul-Fitr", date: "Mar 30, 2026", multiplier: "1.5x demand", color: "border-green-500/40 bg-green-500/10" },
];

function fmt(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

function heatColor(v: number) {
  if (v >= 56) return "bg-blue-500 text-white";
  if (v >= 41) return "bg-blue-500/80 text-white";
  if (v >= 26) return "bg-blue-500/60 text-white";
  if (v >= 11) return "bg-blue-500/40 text-white";
  if (v > 0) return "bg-blue-500/20 text-blue-200";
  return "text-muted-foreground";
}

export default function SavariAnalytics() {
  const { data, isLoading } = useQuery({
    queryKey: ["savari-analytics"],
    queryFn: api.getSavariAnalyticsDashboard,
  });

  const [yoyYear, setYoyYear] = useState(new Date().getFullYear());

  const { summary, matrix, monthly, recent } = data || {};

  const tripTypes = useMemo(() => {
    if (!matrix) return [];
    const set = new Set<string>();
    Object.values(matrix).forEach((trips: any) => Object.keys(trips).forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [matrix]);

  const carTypes = useMemo(() => (matrix ? Object.keys(matrix).sort() : []), [matrix]);

  const monthlyByType = useMemo(() => {
    if (!monthly) return [];
    return Object.entries(monthly as Record<string, any>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ym, v]: [string, any]) => {
        const [y, m] = ym.split("-");
        const label = `${MONTHS[Number(m) - 1]} ${y.slice(2)}`;
        return { label, ...v.byType };
      });
  }, [monthly]);

  const yoyData = useMemo(() => {
    if (!monthly) return [];
    const years = [...new Set(Object.keys(monthly as object).map((k) => Number(k.slice(0, 4))))].sort();
    return MONTHS.map((m, i) => {
      const row: any = { month: m };
      for (const y of years) {
        const key = `${y}-${String(i + 1).padStart(2, "0")}`;
        const d = (monthly as any)[key];
        row[`trips_${y}`] = d?.trips || 0;
        row[`earned_${y}`] = d?.earned || 0;
      }
      return row;
    });
  }, [monthly]);

  const availableYears = useMemo(() => {
    if (!monthly) return [];
    return [...new Set(Object.keys(monthly as object).map((k) => Number(k.slice(0, 4))))].sort((a, b) => b - a);
  }, [monthly]);

  const monthlyBubble = useMemo(() => {
    if (!monthly) return [];
    return MONTHS.map((m, i) => {
      const key = `${yoyYear}-${String(i + 1).padStart(2, "0")}`;
      const d = (monthly as any)[key];
      return { month: m, trips: d?.trips || 0 };
    });
  }, [monthly, yoyYear]);

  if (isLoading) return <LoadingSpinner label="Loading Savari analytics..." />;
  if (!data) return <div className="p-8 text-center text-muted-foreground">No data yet</div>;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 pb-20">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="shrink-0" asChild>
          <Link to="/savari" aria-label="Back"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Savari Vendor Analytics</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Booking insights from Savari broadcasts</p>
        </div>
      </div>

      {/* SECTION 1 — Top Metric Cards */}
      <section>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Section 1 — Top Metric Cards</p>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <StatCard label="Total trips" value={String(summary.totalTrips)} hint="all time" trend={summary.tripsTrend} />
          <StatCard label="Total earned" value={fmt(summary.totalEarned)} hint="sum of vendor_cost" trend={summary.earnedTrend} />
          <StatCard label="Avg payout / trip" value={fmt(summary.avgPayout)} hint="avg vendor_cost" trend={summary.payoutTrend} />
          <StatCard label="Avg Savari cut" value={`${summary.avgSavariCutPct}%`} hint="avg savari_cut_pct" />
        </div>
      </section>

      {/* SECTION 2 — Car Type × Trip Type Demand Matrix */}
      <section>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Section 2 — Car Type x Trip Type Demand Matrix</p>
        <div className="rounded-lg border bg-card p-3 overflow-x-auto">
          <h2 className="text-sm font-semibold mb-0.5">Demand heatmap</h2>
          <p className="text-[10px] text-muted-foreground mb-3">booking count per cell — darker cells = higher demand</p>
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left font-medium text-muted-foreground py-1.5 pr-3">Car Type</th>
                {tripTypes.map((t) => (
                  <th key={t} className="font-medium text-muted-foreground py-1.5 px-2 text-center uppercase text-[10px]">{t}</th>
                ))}
                <th className="font-semibold py-1.5 px-2 text-center">Total</th>
              </tr>
            </thead>
            <tbody>
              {carTypes.map((car) => {
                const row = matrix[car] || {};
                const total = Object.values(row as Record<string, number>).reduce((s: number, v: number) => s + v, 0);
                return (
                  <tr key={car} className="border-t border-border/50">
                    <td className="py-2 pr-3 font-medium">{car}</td>
                    {tripTypes.map((t) => {
                      const v = (row as any)[t] || 0;
                      return (
                        <td key={t} className="py-2 px-2 text-center">
                          <span className={`inline-block min-w-[28px] rounded px-1.5 py-0.5 text-xs tabular-nums ${heatColor(v)}`}>{v}</span>
                        </td>
                      );
                    })}
                    <td className="py-2 px-2 text-center font-semibold">{total}</td>
                  </tr>
                );
              })}
              <tr className="border-t-2 border-border">
                <td className="py-2 pr-3 font-semibold text-muted-foreground">Column total</td>
                {tripTypes.map((t) => {
                  const col = carTypes.reduce((s, c) => s + ((matrix[c] as any)?.[t] || 0), 0);
                  return <td key={t} className="py-2 px-2 text-center font-semibold tabular-nums">{col}</td>;
                })}
                <td className="py-2 px-2 text-center font-bold tabular-nums">{summary.totalTrips}</td>
              </tr>
            </tbody>
          </table>
          <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground">
            <span>intensity:</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-blue-500/20" /> 0-10</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-blue-500/40" /> 11-25</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-blue-500/60" /> 26-40</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-blue-500/80" /> 41-55</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-blue-500" /> 56+</span>
          </div>
        </div>
      </section>

      {/* SECTION 3 — Monthly Trips by Trip Type */}
      <section>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Section 3 — Monthly Trips by Trip Type</p>
        <div className="rounded-lg border bg-card p-3">
          <h2 className="text-sm font-semibold mb-3">Trips per month by type</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyByType} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,20%)" />
                <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, background: "hsl(220,13%,14%)", border: "1px solid hsl(220,13%,20%)" }} />
                {Object.keys(TRIP_COLORS).map((type) => (
                  <Bar key={type} dataKey={type} stackId="a" fill={TRIP_COLORS[type]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-3 mt-2">
            {Object.entries(TRIP_COLORS).map(([type, color]) => (
              <span key={type} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: color }} />{type}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4 — YoY Growth */}
      <section>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Section 4 — Year-on-Year Growth</p>
        <div className="rounded-lg border bg-card p-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Trips (bars) + Earnings (line)</h2>
            <div className="flex gap-1">
              {availableYears.map((y) => (
                <button key={y} onClick={() => setYoyYear(y)}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium ${y === yoyYear ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{y}</button>
              ))}
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={yoyData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,20%)" />
                <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 9 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, background: "hsl(220,13%,14%)", border: "1px solid hsl(220,13%,20%)" }}
                  formatter={(v: number, name: string) => [name.includes("earned") ? fmt(v) : v, name.includes("earned") ? "Earnings" : "Trips"]} />
                <Bar yAxisId="left" dataKey={`trips_${yoyYear}`} fill="hsl(228,76%,52%)" name="Trips" radius={[3, 3, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey={`earned_${yoyYear}`} stroke="hsl(152,60%,40%)" strokeWidth={2} dot={{ r: 3 }} name="Earnings" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* SECTION 5 — Monthly Booking Count */}
      <section>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Section 5 — Monthly Booking Count</p>
        <div className="rounded-lg border bg-card p-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold">Booking volume per month</h2>
              <p className="text-[10px] text-muted-foreground">bigger circle = more trips — hover for details</p>
            </div>
            <div className="flex gap-1">
              {availableYears.map((y) => (
                <button key={y} onClick={() => setYoyYear(y)}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium ${y === yoyYear ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{y}</button>
              ))}
            </div>
          </div>
          <div className="flex items-end gap-3 overflow-x-auto pb-2">
            {monthlyBubble.map((m) => {
              const size = Math.max(32, Math.min(80, 32 + m.trips * 1.2));
              return (
                <div key={m.month} className="flex flex-col items-center gap-1.5 min-w-[48px]">
                  {m.trips > 0 && (
                    <div className="rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-xs"
                      style={{ width: size, height: size }}>{m.trips}</div>
                  )}
                  <span className={`text-[10px] ${m.trips > 0 ? "text-foreground" : "text-muted-foreground"}`}>{m.month}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 6 — Festival Demand Calendar */}
      <section>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Section 6 — Festival Demand Calendar</p>
        <div className="rounded-lg border bg-card p-3">
          <h2 className="text-sm font-semibold">Kolkata festival demand map — 2025-26</h2>
          <p className="text-[10px] text-muted-foreground mb-3">plan fleet availability before highlighted weeks</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {FESTIVALS.map((f) => (
              <div key={f.name} className={`rounded-lg border p-2.5 ${f.color}`}>
                <p className="text-xs font-semibold">{f.name}</p>
                <p className="text-[10px] font-medium">{f.date}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{f.multiplier}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 7 — Last 50 Bookings */}
      <section>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Section 7 — Last 50 Bookings</p>
        <div className="rounded-lg border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px]">Booking ID</TableHead>
                <TableHead className="text-[10px]">Date</TableHead>
                <TableHead className="text-[10px]">Trip Type</TableHead>
                <TableHead className="text-[10px]">Car</TableHead>
                <TableHead className="text-[10px]">City</TableHead>
                <TableHead className="text-[10px]">Pickup</TableHead>
                <TableHead className="text-[10px] text-right">Vendor Cost</TableHead>
                <TableHead className="text-[10px] text-right">Total Amt</TableHead>
                <TableHead className="text-[10px] text-right">Savari Cut</TableHead>
                <TableHead className="text-[10px] text-right">Cut %</TableHead>
                <TableHead className="text-[10px]">Payment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(recent || []).map((b: any) => (
                <TableRow key={b.bookingId}>
                  <TableCell className="text-[10px] font-mono">{b.bookingId}</TableCell>
                  <TableCell className="text-[10px]">{b.startDate || "—"}</TableCell>
                  <TableCell className="text-[10px]">{b.tripTypeName}</TableCell>
                  <TableCell className="text-[10px]">{b.carType}</TableCell>
                  <TableCell className="text-[10px]">{b.pickCity}</TableCell>
                  <TableCell className="text-[10px] max-w-[120px] truncate">{b.pickLoc || "—"}</TableCell>
                  <TableCell className="text-[10px] text-right tabular-nums">{fmt(b.vendorCost)}</TableCell>
                  <TableCell className="text-[10px] text-right tabular-nums">{fmt(b.totalAmt)}</TableCell>
                  <TableCell className="text-[10px] text-right tabular-nums">{fmt(b.savariCut)}</TableCell>
                  <TableCell className="text-[10px] text-right tabular-nums">{b.savariCutPct}%</TableCell>
                  <TableCell className="text-[10px]">{b.paymentStatus || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
