import { useState, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { getDrivers, getCars, getCashEntries, getVendorEntries, getFuelEntries, getOtherCostEntries, getSettlements, getOtherEarnings } from "@/lib/store";
import { getWeekStart, formatCurrency } from "@/lib/utils-date";
import WeekPicker from "@/components/WeekPicker";
import StatCard from "@/components/StatCard";
import { ArrowUpRight, ArrowDownRight, FileText } from "lucide-react";

export default function DriverDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [week, setWeek] = useState(searchParams.get("week") || getWeekStart());

  const driver = getDrivers().find((d) => d.id === id);
  const car = getCars().find((c) => c.id === driver?.carId);

  const cash = getCashEntries().filter((e) => e.driverId === id && e.weekStart === week);
  const vendor = getVendorEntries().filter((e) => e.driverId === id && e.weekStart === week);
  const fuel = getFuelEntries().filter((e) => e.driverId === id && e.weekStart === week);
  const other = getOtherCostEntries().filter((e) => e.driverId === id && e.weekStart === week);
  const settlements = getSettlements().filter((s) => s.driverId === id && s.weekStart === week);
  const otherEarnings = getOtherEarnings().filter((e) => e.driverId === id && e.weekStart === week);

  const totals = useMemo(() => {
    const totalCash = cash.reduce((s, e) => s + e.amount, 0);
    const totalVendor = vendor.reduce((s, e) => s + e.amount, 0);
    const totalOtherEarn = otherEarnings.reduce((s, e) => s + e.amount, 0);
    const totalFuel = fuel.reduce((s, e) => s + e.cost, 0);
    const totalOther = other.reduce((s, e) => s + e.amount, 0);
    const totalSettled = settlements.reduce((s, e) => s + e.amount, 0);
    const totalEarnings = totalVendor + totalOtherEarn;
    const commission = totalEarnings * ((driver?.commissionPercent ?? 30) / 100);
    const netEarnings = totalEarnings - commission - totalFuel - totalOther;
    const pending = totalCash - netEarnings - totalSettled;

    return { totalCash, totalVendor, totalOtherEarn, totalFuel, totalOther, commission, totalSettled, netEarnings, pending };
  }, [cash, vendor, fuel, other, settlements, driver, otherEarnings]);

  const ledger = useMemo(() => {
    const items: { date: string; desc: string; amount: number; type: "credit" | "debit" }[] = [];
    vendor.forEach(e => items.push({ date: e.date, desc: `Vendor — ${e.bookingId || "booking"}`, amount: e.amount, type: "credit" }));
    otherEarnings.forEach(e => items.push({ date: e.date, desc: `Earning — ${e.source}`, amount: e.amount, type: "credit" }));
    cash.forEach(e => items.push({ date: e.date, desc: `Cash — ${e.source}`, amount: e.amount, type: "debit" }));
    fuel.forEach(e => items.push({ date: e.date, desc: `Fuel — ${e.station || "fill"}`, amount: e.cost, type: "debit" }));
    other.forEach(e => items.push({ date: e.date, desc: `Cost — ${e.costType}`, amount: e.amount, type: "debit" }));
    settlements.forEach(e => items.push({ date: e.date, desc: `Payment — ${e.paymentMode || ""}`, amount: e.amount, type: "debit" }));
    return items.sort((a, b) => a.date.localeCompare(b.date));
  }, [vendor, otherEarnings, cash, fuel, other, settlements]);

  if (!driver) return <div className="p-8 text-center text-muted-foreground">Driver not found</div>;

  return (
    <div className="space-y-5">
      <div className="sticky top-0 z-40 bg-background pb-3 pt-2">
        <h1 className="text-xl font-semibold tracking-tight">{driver.name}</h1>
        <p className="text-xs text-muted-foreground mt-0.5">{car?.number} · {car?.model} · {driver.commissionPercent}% commission</p>
        <div className="mt-3">
          <WeekPicker value={week} onChange={setWeek} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <StatCard label="Cash Collected" value={formatCurrency(totals.totalCash)} hint="From passengers" />
        <StatCard label="Vendor Amount" value={formatCurrency(totals.totalVendor)} hint="Booking fares" />
        <StatCard label="Other Earnings" value={formatCurrency(totals.totalOtherEarn)} variant="success" />
        <StatCard label="Fuel Cost" value={formatCurrency(totals.totalFuel)} variant="danger" />
        <StatCard label="Other Costs" value={formatCurrency(totals.totalOther)} />
        <StatCard label="Commission" value={formatCurrency(totals.commission)} hint={`${driver.commissionPercent}% of earnings`} />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-lg border bg-card p-3">
          <p className="text-[11px] font-medium text-muted-foreground">Net Earnings</p>
          <p className={`mt-1 text-lg font-bold tabular-nums ${totals.netEarnings >= 0 ? "text-success" : "text-destructive"}`}>
            {formatCurrency(totals.netEarnings)}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-[11px] font-medium text-muted-foreground">Balance</p>
          <p className={`mt-1 text-lg font-bold tabular-nums ${totals.pending > 0 ? "text-destructive" : "text-success"}`}>
            {totals.pending > 0 ? `Owes ${formatCurrency(totals.pending)}` : formatCurrency(Math.abs(totals.pending))}
          </p>
        </div>
      </div>

      {/* Ledger */}
      <div>
        <h2 className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5" /> Weekly Ledger
        </h2>
        {ledger.length === 0 ? (
          <div className="rounded-lg border p-6 text-center">
            <p className="text-sm text-muted-foreground">No entries this week</p>
          </div>
        ) : (
          <div className="space-y-1">
            {ledger.map((item, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border bg-card px-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  {item.type === "credit" ? (
                    <div className="h-6 w-6 rounded-full bg-success/10 flex items-center justify-center">
                      <ArrowUpRight className="h-3 w-3 text-success" />
                    </div>
                  ) : (
                    <div className="h-6 w-6 rounded-full bg-destructive/10 flex items-center justify-center">
                      <ArrowDownRight className="h-3 w-3 text-destructive" />
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-medium capitalize">{item.desc}</p>
                    <p className="text-[10px] text-muted-foreground">{item.date}</p>
                  </div>
                </div>
                <p className={`text-sm font-semibold tabular-nums ${item.type === "credit" ? "text-success" : "text-destructive"}`}>
                  {item.type === "credit" ? "+" : "-"}{formatCurrency(item.amount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Entry sections */}
      <Section title="Cash Collected" items={cash} renderItem={(e) => (
        <EntryRow key={e.id} date={e.date} main={formatCurrency(e.amount)} sub={e.source} />
      )} />
      <Section title="Vendor Amounts" items={vendor} renderItem={(e) => (
        <EntryRow key={e.id} date={e.date} main={formatCurrency(e.amount)} sub={e.bookingId || "—"} />
      )} />
      <Section title="Other Earnings" items={otherEarnings} renderItem={(e) => (
        <EntryRow key={e.id} date={e.date} main={formatCurrency(e.amount)} sub={e.source} />
      )} />
      <Section title="Fuel Entries" items={fuel} renderItem={(e) => (
        <EntryRow key={e.id} date={e.date} main={formatCurrency(e.cost)} sub={`${e.liters}L · ${e.odometer} km`} />
      )} />
      <Section title="Other Costs" items={other} renderItem={(e) => (
        <EntryRow key={e.id} date={e.date} main={formatCurrency(e.amount)} sub={e.costType} />
      )} />
      <Section title="Payments" items={settlements} renderItem={(e) => (
        <EntryRow key={e.id} date={e.date} main={formatCurrency(e.amount)} sub={`${e.type} · ${e.paymentMode ?? ""}`} />
      )} />
    </div>
  );
}

function Section<T>({ title, items, renderItem }: { title: string; items: T[]; renderItem: (item: T) => React.ReactNode }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h2 className="mb-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</h2>
      <div className="space-y-1">{items.map(renderItem)}</div>
    </div>
  );
}

function EntryRow({ date, main, sub }: { date: string; main: string; sub: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-card px-3 py-2">
      <div>
        <p className="text-[11px] text-muted-foreground">{date}</p>
        <p className="text-xs capitalize font-medium">{sub}</p>
      </div>
      <p className="text-sm font-semibold tabular-nums">{main}</p>
    </div>
  );
}
