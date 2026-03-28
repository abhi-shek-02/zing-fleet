import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Link } from "react-router-dom";
import { ArrowLeft, TrendingUp, IndianRupee, BarChart3, Percent, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/LoadingState";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Line, ComposedChart,
} from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const TRIP_COLORS: Record<string, string> = {
  "Local 4hr": "#6366f1",
  "Local 8hr": "#3b82f6",
  "Local 12hr": "#8b5cf6",
  "One Way Drop": "#22c55e",
  "Round Trip": "#f59e0b",
  "Transfer": "#ec4899",
  "Other": "#94a3b8",
};

const FESTIVALS = [
  { name: "Durga Puja", date: "Oct 2–6, 2025", mult: "3.5x", note: "prepare fleet", bg: "bg-red-50 dark:bg-red-950/40", border: "border-red-200 dark:border-red-800/60", text: "text-red-700 dark:text-red-400" },
  { name: "Diwali", date: "Oct 20, 2025", mult: "1.8x", note: "demand", bg: "bg-amber-50 dark:bg-amber-950/40", border: "border-amber-200 dark:border-amber-800/60", text: "text-amber-700 dark:text-amber-400" },
  { name: "Jagadhatri Puja", date: "Nov 5–6, 2025", mult: "1.4x", note: "demand", bg: "bg-blue-50 dark:bg-blue-950/40", border: "border-blue-200 dark:border-blue-800/60", text: "text-blue-700 dark:text-blue-400" },
  { name: "Christmas / New Year", date: "Dec 24 – Jan 1", mult: "1.6x", note: "airport heavy", bg: "bg-yellow-50 dark:bg-yellow-950/40", border: "border-yellow-200 dark:border-yellow-800/60", text: "text-yellow-700 dark:text-yellow-400" },
  { name: "Poila Boishakh", date: "Apr 14–15, 2026", mult: "2x", note: "prepare fleet", bg: "bg-orange-50 dark:bg-orange-950/40", border: "border-orange-200 dark:border-orange-800/60", text: "text-orange-700 dark:text-orange-400" },
  { name: "Eid ul-Fitr", date: "Mar 30, 2026", mult: "1.5x", note: "demand", bg: "bg-emerald-50 dark:bg-emerald-950/40", border: "border-emerald-200 dark:border-emerald-800/60", text: "text-emerald-700 dark:text-emerald-400" },
];

function fmt(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

function heatBg(v: number, max: number) {
  if (v === 0) return "";
  const ratio = max > 0 ? v / max : 0;
  if (ratio >= 0.75) return "bg-blue-600 text-white";
  if (ratio >= 0.5) return "bg-blue-500/80 text-white";
  if (ratio >= 0.25) return "bg-blue-400/60 text-white";
  return "bg-blue-400/30 text-blue-900 dark:text-blue-200";
}

function paymentBadge(status: string | null) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  const s = status.toLowerCase();
  if (s.includes("pre") || s === "paid")
    return <span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">{status}</span>;
  return <span className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">{status}</span>;
}

const GRID_STROKE = "hsl(var(--border))";
const TT_STYLE = { fontSize: 11, borderRadius: 8, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--card-foreground))" };

function SectionHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function YearPicker({ years, value, onChange }: { years: number[]; value: number; onChange: (y: number) => void }) {
  return (
    <div className="flex gap-1">
      {years.map((y) => (
        <button key={y} onClick={() => onChange(y)}
          className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${y === value ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted/60 text-muted-foreground hover:bg-muted"}`}>{y}</button>
      ))}
    </div>
  );
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
    Object.values(matrix).forEach((trips: any) => Object.keys(trips).forEach((t: string) => set.add(t)));
    return Array.from(set).sort();
  }, [matrix]);

  const carTypes = useMemo(() => (matrix ? Object.keys(matrix).sort() : []), [matrix]);

  const heatMax = useMemo(() => {
    if (!matrix) return 1;
    let max = 1;
    for (const car of Object.values(matrix)) {
      for (const v of Object.values(car as Record<string, number>)) {
        if (v > max) max = v;
      }
    }
    return max;
  }, [matrix]);

  const monthlyByType = useMemo(() => {
    if (!monthly) return [];
    return Object.entries(monthly as Record<string, any>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ym, v]: [string, any]) => {
        const [y, m] = ym.split("-");
        return { label: `${MONTHS[Number(m) - 1]} ${y.slice(2)}`, ...v.byType };
      });
  }, [monthly]);

  const yoyData = useMemo(() => {
    if (!monthly) return [];
    return MONTHS.map((m, i) => {
      const key = `${yoyYear}-${String(i + 1).padStart(2, "0")}`;
      const d = (monthly as any)[key];
      return { month: m, trips: d?.trips || 0, earned: d?.earned || 0 };
    });
  }, [monthly, yoyYear]);

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
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" className="shrink-0 rounded-full h-9 w-9" asChild>
          <Link to="/savari"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Savari Vendor Analytics</h1>
          <p className="text-[11px] text-muted-foreground">Booking insights from Savari broadcasts</p>
        </div>
      </div>

      {/* Metric Cards */}
      <section>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border bg-card p-4 space-y-1 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium text-muted-foreground">Total trips</p>
              <BarChart3 className="h-3.5 w-3.5 text-muted-foreground/60" />
            </div>
            <p className="text-2xl font-bold tabular-nums">{summary.totalTrips}</p>
            <p className="text-[10px] text-muted-foreground">all time</p>
          </div>
          <div className="rounded-xl border bg-card p-4 space-y-1 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium text-muted-foreground">Total earned</p>
              <IndianRupee className="h-3.5 w-3.5 text-muted-foreground/60" />
            </div>
            <p className="text-2xl font-bold tabular-nums">{fmt(summary.totalEarned)}</p>
            {summary.earnedTrend !== 0 && (
              <p className={`text-[10px] font-medium ${summary.earnedTrend > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                {summary.earnedTrend > 0 ? "+" : ""}{summary.earnedTrend}% vs last month
              </p>
            )}
          </div>
          <div className="rounded-xl border bg-card p-4 space-y-1 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium text-muted-foreground">Avg payout / trip</p>
              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground/60" />
            </div>
            <p className="text-2xl font-bold tabular-nums">{fmt(summary.avgPayout)}</p>
            {summary.payoutTrend !== 0 && (
              <p className={`text-[10px] font-medium ${summary.payoutTrend > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                {summary.payoutTrend > 0 ? "+" : ""}{summary.payoutTrend}% vs last month
              </p>
            )}
          </div>
          <div className="rounded-xl border bg-card p-4 space-y-1 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium text-muted-foreground">Avg Savari cut</p>
              <Percent className="h-3.5 w-3.5 text-muted-foreground/60" />
            </div>
            <p className="text-2xl font-bold tabular-nums">{summary.avgSavariCutPct}%</p>
            <p className="text-[10px] text-muted-foreground">platform commission</p>
          </div>
        </div>
      </section>

      {/* Demand Heatmap */}
      <section>
        <SectionHead title="Demand heatmap" sub="Booking count per cell — darker = higher demand" />
        <div className="rounded-xl border bg-card p-4 overflow-x-auto shadow-sm">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left font-medium text-muted-foreground py-2 pr-4 whitespace-nowrap">Car Type</th>
                {tripTypes.map((t) => (
                  <th key={t} className="font-medium text-muted-foreground py-2 px-1.5 text-center text-[10px] uppercase tracking-wide whitespace-nowrap">{t}</th>
                ))}
                <th className="font-semibold py-2 px-2 text-center text-[10px] uppercase tracking-wide">Total</th>
              </tr>
            </thead>
            <tbody>
              {carTypes.map((car) => {
                const row = matrix[car] || {};
                const total = Object.values(row as Record<string, number>).reduce((s: number, v: number) => s + v, 0);
                return (
                  <tr key={car} className="border-t border-border/40">
                    <td className="py-2.5 pr-4 font-medium whitespace-nowrap">{car}</td>
                    {tripTypes.map((t) => {
                      const v = (row as any)[t] || 0;
                      return (
                        <td key={t} className="py-2.5 px-1.5 text-center">
                          {v > 0 ? (
                            <span className={`inline-flex items-center justify-center min-w-[30px] rounded-md px-1.5 py-1 text-[11px] font-semibold tabular-nums ${heatBg(v, heatMax)}`}>{v}</span>
                          ) : (
                            <span className="text-muted-foreground/40 text-[11px]">0</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="py-2.5 px-2 text-center font-bold tabular-nums">{total}</td>
                  </tr>
                );
              })}
              <tr className="border-t-2 border-border">
                <td className="py-2.5 pr-4 font-semibold text-muted-foreground">Total</td>
                {tripTypes.map((t) => {
                  const col = carTypes.reduce((s, c) => s + ((matrix[c] as any)?.[t] || 0), 0);
                  return <td key={t} className="py-2.5 px-1.5 text-center font-bold tabular-nums">{col}</td>;
                })}
                <td className="py-2.5 px-2 text-center font-bold tabular-nums text-primary">{summary.totalTrips}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Monthly Trips by Type */}
      <section>
        <SectionHead title="Monthly trips by type" sub="Stacked breakdown of trip categories" />
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyByType} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} opacity={0.5} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={TT_STYLE} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
                {Object.keys(TRIP_COLORS).map((type) => (
                  <Bar key={type} dataKey={type} stackId="a" fill={TRIP_COLORS[type]} radius={[2, 2, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 pt-3 border-t border-border/40">
            {Object.entries(TRIP_COLORS).map(([type, color]) => (
              <span key={type} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="inline-block w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: color }} />{type}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* YoY Growth */}
      <section>
        <div className="flex items-end justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Year-on-year growth</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">Trips (bars) + Earnings (line)</p>
          </div>
          <YearPicker years={availableYears} value={yoyYear} onChange={setYoyYear} />
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={yoyData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} opacity={0.5} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={TT_STYLE} formatter={(v: number, name: string) => [name === "Earnings" ? fmt(v) : v, name]} />
                <Bar yAxisId="left" dataKey="trips" fill="#3b82f6" name="Trips" radius={[4, 4, 0, 0]} barSize={28} />
                <Line yAxisId="right" type="monotone" dataKey="earned" stroke="#22c55e" strokeWidth={2.5} dot={{ r: 4, fill: "#22c55e", strokeWidth: 0 }} name="Earnings" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Monthly Volume Bubbles */}
      <section>
        <div className="flex items-end justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Booking volume</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">Bigger circle = more trips</p>
          </div>
          <YearPicker years={availableYears} value={yoyYear} onChange={setYoyYear} />
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-end justify-around gap-1 min-h-[100px]">
            {monthlyBubble.map((m) => {
              const size = m.trips > 0 ? Math.max(36, Math.min(84, 36 + m.trips * 0.9)) : 0;
              return (
                <div key={m.month} className="flex flex-col items-center gap-2 flex-1">
                  {m.trips > 0 ? (
                    <div className="rounded-full bg-blue-500 dark:bg-blue-400 flex items-center justify-center text-white dark:text-blue-950 font-bold text-xs shadow-md shadow-blue-500/20"
                      style={{ width: size, height: size }}>{m.trips}</div>
                  ) : (
                    <div className="h-9" />
                  )}
                  <span className={`text-[10px] font-medium ${m.trips > 0 ? "text-foreground" : "text-muted-foreground/50"}`}>{m.month}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Festival Calendar */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Festival demand calendar</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">Kolkata 2025–26 — plan fleet before peaks</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {FESTIVALS.map((f) => (
            <div key={f.name} className={`rounded-xl border p-3.5 ${f.bg} ${f.border} transition-shadow hover:shadow-sm`}>
              <p className={`text-xs font-bold ${f.text}`}>{f.name}</p>
              <p className="text-[11px] font-semibold mt-0.5">{f.date}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{f.mult} — {f.note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Bookings */}
      <section>
        <SectionHead title="Last 50 bookings" sub="Most recent broadcast data" />
        <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-[10px] font-semibold">Booking ID</TableHead>
                  <TableHead className="text-[10px] font-semibold">Date</TableHead>
                  <TableHead className="text-[10px] font-semibold">Trip Type</TableHead>
                  <TableHead className="text-[10px] font-semibold">Car</TableHead>
                  <TableHead className="text-[10px] font-semibold">City</TableHead>
                  <TableHead className="text-[10px] font-semibold">Pickup</TableHead>
                  <TableHead className="text-[10px] font-semibold text-right">Vendor Cost</TableHead>
                  <TableHead className="text-[10px] font-semibold text-right">Total Amt</TableHead>
                  <TableHead className="text-[10px] font-semibold text-right">Savari Cut</TableHead>
                  <TableHead className="text-[10px] font-semibold text-right">Cut %</TableHead>
                  <TableHead className="text-[10px] font-semibold">Payment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(recent || []).map((b: any, i: number) => (
                  <TableRow key={b.bookingId} className={i % 2 === 0 ? "" : "bg-muted/20"}>
                    <TableCell className="text-[11px] font-mono font-medium">{b.bookingId}</TableCell>
                    <TableCell className="text-[11px] whitespace-nowrap">{b.startDate || "—"}</TableCell>
                    <TableCell className="text-[11px]">
                      <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium">{b.tripTypeName}</span>
                    </TableCell>
                    <TableCell className="text-[11px] whitespace-nowrap">{b.carType}</TableCell>
                    <TableCell className="text-[11px] whitespace-nowrap">{b.pickCity}</TableCell>
                    <TableCell className="text-[11px] max-w-[140px] truncate">{b.pickLoc || "—"}</TableCell>
                    <TableCell className="text-[11px] text-right tabular-nums font-medium">{fmt(b.vendorCost)}</TableCell>
                    <TableCell className="text-[11px] text-right tabular-nums text-muted-foreground">{fmt(b.totalAmt)}</TableCell>
                    <TableCell className="text-[11px] text-right tabular-nums text-muted-foreground">{fmt(b.savariCut)}</TableCell>
                    <TableCell className="text-[11px] text-right tabular-nums">{b.savariCutPct}%</TableCell>
                    <TableCell className="text-[11px]">{paymentBadge(b.paymentStatus)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </section>
    </div>
  );
}
