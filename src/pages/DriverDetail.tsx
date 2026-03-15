import { useState, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { getDrivers, getCars, getCashEntries, getVendorEntries, getFuelEntries, getOtherCostEntries, getSettlements, getOtherEarnings } from "@/lib/store";
import { getWeekStart, formatCurrency } from "@/lib/utils-date";
import WeekPicker from "@/components/WeekPicker";
import StatCard from "@/components/StatCard";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

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

  // Driver ledger: chronological list of all transactions
  const ledger = useMemo(() => {
    const items: { date: string; desc: string; amount: number; type: "credit" | "debit" }[] = [];
    vendor.forEach(e => items.push({ date: e.date, desc: `Vendor: ${e.bookingId || "booking"}`, amount: e.amount, type: "credit" }));
    otherEarnings.forEach(e => items.push({ date: e.date, desc: `Earning: ${e.source}`, amount: e.amount, type: "credit" }));
    cash.forEach(e => items.push({ date: e.date, desc: `Cash: ${e.source}`, amount: e.amount, type: "debit" }));
    fuel.forEach(e => items.push({ date: e.date, desc: `Fuel: ${e.station || "fill"}`, amount: e.cost, type: "debit" }));
    other.forEach(e => items.push({ date: e.date, desc: `Cost: ${e.costType}`, amount: e.amount, type: "debit" }));
    settlements.forEach(e => items.push({ date: e.date, desc: `Settlement: ${e.paymentMode || ""}`, amount: e.amount, type: "debit" }));
    return items.sort((a, b) => a.date.localeCompare(b.date));
  }, [vendor, otherEarnings, cash, fuel, other, settlements]);

  if (!driver) return <div className="p-4 text-center text-muted-foreground">Driver not found</div>;

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-40 bg-background pb-2 pt-1">
        <h1 className="text-lg font-semibold">{driver.name}</h1>
        <p className="text-xs text-muted-foreground">{car?.number} · {car?.model} · {driver.commissionPercent}% commission</p>
        <div className="mt-2">
          <WeekPicker value={week} onChange={setWeek} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Cash Collected" value={formatCurrency(totals.totalCash)} />
        <StatCard label="Vendor Amount" value={formatCurrency(totals.totalVendor)} />
        <StatCard label="Other Earnings" value={formatCurrency(totals.totalOtherEarn)} variant="success" />
        <StatCard label="Fuel Cost" value={formatCurrency(totals.totalFuel)} variant="danger" />
        <StatCard label="Other Cost" value={formatCurrency(totals.totalOther)} />
        <StatCard label="Commission" value={formatCurrency(totals.commission)} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md border p-3">
          <p className="text-xs text-muted-foreground font-medium">Net Earnings</p>
          <p className={`mt-1 text-lg font-semibold tabular-nums ${totals.netEarnings >= 0 ? "text-success" : "text-destructive"}`}>
            {formatCurrency(totals.netEarnings)}
          </p>
        </div>
        <div className="rounded-md border p-3">
          <p className="text-xs text-muted-foreground font-medium">Pending</p>
          <p className={`mt-1 text-lg font-semibold tabular-nums ${totals.pending > 0 ? "text-destructive" : "text-success"}`}>
            {formatCurrency(Math.abs(totals.pending))}
          </p>
        </div>
      </div>

      {/* Driver Ledger */}
      <div>
        <h2 className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">📒 Weekly Ledger</h2>
        {ledger.length === 0 ? (
          <p className="rounded-md border p-4 text-center text-sm text-muted-foreground">No entries this week</p>
        ) : (
          <div className="space-y-0.5">
            {ledger.map((item, i) => (
              <div key={i} className="flex items-center justify-between rounded-md border px-3 py-2">
                <div className="flex items-center gap-2">
                  {item.type === "credit" ? (
                    <ArrowUpRight className="h-3.5 w-3.5 text-success shrink-0" />
                  ) : (
                    <ArrowDownRight className="h-3.5 w-3.5 text-destructive shrink-0" />
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">{item.date}</p>
                    <p className="text-xs capitalize">{item.desc}</p>
                  </div>
                </div>
                <p className={`text-sm font-medium tabular-nums ${item.type === "credit" ? "text-success" : "text-destructive"}`}>
                  {item.type === "credit" ? "+" : "−"}{formatCurrency(item.amount)}
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
      <Section title="Settlements" items={settlements} renderItem={(e) => (
        <EntryRow key={e.id} date={e.date} main={formatCurrency(e.amount)} sub={`${e.type} · ${e.paymentMode ?? ""}`} />
      )} />
    </div>
  );
}

function Section<T>({ title, items, renderItem }: { title: string; items: T[]; renderItem: (item: T) => React.ReactNode }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h2 className="mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</h2>
      <div className="space-y-0.5">{items.map(renderItem)}</div>
    </div>
  );
}

function EntryRow({ date, main, sub }: { date: string; main: string; sub: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border px-3 py-2">
      <div>
        <p className="text-xs text-muted-foreground">{date}</p>
        <p className="text-xs capitalize">{sub}</p>
      </div>
      <p className="text-sm font-medium tabular-nums">{main}</p>
    </div>
  );
}
