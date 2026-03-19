import { useState, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useDrivers, useCars, useCashEntries, useVendorEntries, useFuelEntries, useOtherCosts, useSettlements, useOtherEarnings } from "@/hooks/useApi";
import { getWeekStart, formatCurrency } from "@/lib/utils-date";
import { LoadingSpinner, ErrorState } from "@/components/LoadingState";
import WeekPicker from "@/components/WeekPicker";
import StatCard from "@/components/StatCard";
import { ArrowUpRight, ArrowDownRight, FileText } from "lucide-react";

export default function DriverDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [week, setWeek] = useState(searchParams.get("week") || getWeekStart());

  const driversQ = useDrivers();
  const carsQ = useCars();
  const cashQ = useCashEntries({ driver_id: id, week_start: week });
  const vendorQ = useVendorEntries({ driver_id: id, week_start: week });
  const fuelQ = useFuelEntries({ driver_id: id, week_start: week });
  const otherQ = useOtherCosts({ driver_id: id, week_start: week });
  const settlementsQ = useSettlements({ driver_id: id, week_start: week });
  const otherEarningsQ = useOtherEarnings({ driver_id: id, week_start: week });

  const isLoading = driversQ.isLoading || cashQ.isLoading || vendorQ.isLoading;

  const driver = (driversQ.data ?? []).find((d: any) => d.id === id);
  const car = (carsQ.data ?? []).find((c: any) => c.id === driver?.carId);
  const cash = cashQ.data ?? [];
  const vendor = vendorQ.data ?? [];
  const fuel = fuelQ.data ?? [];
  const other = otherQ.data ?? [];
  const settlements = settlementsQ.data ?? [];
  const otherEarnings = otherEarningsQ.data ?? [];

  const totals = useMemo(() => {
    const totalCash = cash.reduce((s: number, e: any) => s + Number(e.amount), 0);
    const totalVendor = vendor.reduce((s: number, e: any) => s + Number(e.amount), 0);
    const totalOtherEarn = otherEarnings.reduce((s: number, e: any) => s + Number(e.amount), 0);
    const totalFuel = fuel.reduce((s: number, e: any) => s + Number(e.cost), 0);
    const totalOther = other.reduce((s: number, e: any) => s + Number(e.amount), 0);
    const totalSettled = settlements.reduce((s: number, e: any) => s + Number(e.amount), 0);
    const totalEarnings = totalVendor + totalOtherEarn;
    const commission = totalEarnings * ((Number(driver?.commissionPercent) || 30) / 100);
    const netEarnings = totalEarnings - commission - totalFuel - totalOther;
    const pending = totalCash - netEarnings - totalSettled;
    return { totalCash, totalVendor, totalOtherEarn, totalFuel, totalOther, commission, totalSettled, netEarnings, pending };
  }, [cash, vendor, fuel, other, settlements, driver, otherEarnings]);

  const ledger = useMemo(() => {
    const items: { date: string; desc: string; amount: number; type: "credit" | "debit" }[] = [];
    vendor.forEach((e: any) => items.push({ date: e.date, desc: `Vendor — ${e.bookingId || "booking"}`, amount: Number(e.amount), type: "credit" }));
    otherEarnings.forEach((e: any) => items.push({ date: e.date, desc: `Earning — ${e.source}`, amount: Number(e.amount), type: "credit" }));
    cash.forEach((e: any) => items.push({ date: e.date, desc: `Cash — ${e.source}`, amount: Number(e.amount), type: "debit" }));
    fuel.forEach((e: any) => items.push({ date: e.date, desc: `Fuel — ${e.station || "fill"}`, amount: Number(e.cost), type: "debit" }));
    other.forEach((e: any) => items.push({ date: e.date, desc: `Cost — ${e.costType}`, amount: Number(e.amount), type: "debit" }));
    settlements.forEach((e: any) => items.push({ date: e.date, desc: `Payment — ${e.paymentMode || ""}`, amount: Number(e.amount), type: "debit" }));
    return items.sort((a, b) => a.date.localeCompare(b.date));
  }, [vendor, otherEarnings, cash, fuel, other, settlements]);

  if (isLoading) return <LoadingSpinner label="Loading driver..." />;
  if (!driver) return <div className="p-8 text-center text-muted-foreground">Driver not found</div>;

  return (
    <div className="space-y-5">
      <div className="sticky top-0 z-40 bg-background pb-3 pt-2">
        <h1 className="text-xl font-semibold tracking-tight">{driver.name}</h1>
        <p className="text-xs text-muted-foreground mt-0.5">{car?.number} · {car?.model} · {driver.commissionPercent}% commission</p>
        <div className="mt-3"><WeekPicker value={week} onChange={setWeek} /></div>
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

      <div>
        <h2 className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5" /> Weekly Ledger
        </h2>
        {ledger.length === 0 ? (
          <div className="rounded-lg border p-6 text-center"><p className="text-sm text-muted-foreground">No entries this week</p></div>
        ) : (
          <div className="space-y-1">
            {ledger.map((item, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border bg-card px-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  {item.type === "credit" ? (
                    <div className="h-6 w-6 rounded-full bg-success/10 flex items-center justify-center"><ArrowUpRight className="h-3 w-3 text-success" /></div>
                  ) : (
                    <div className="h-6 w-6 rounded-full bg-destructive/10 flex items-center justify-center"><ArrowDownRight className="h-3 w-3 text-destructive" /></div>
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

      <Section title="Cash Collected" items={cash} renderItem={(e: any) => (
        <EntryRow key={e.id} date={e.date} main={formatCurrency(Number(e.amount))} sub={e.source} />
      )} />
      <Section title="Vendor Amounts" items={vendor} renderItem={(e: any) => (
        <EntryRow key={e.id} date={e.date} main={formatCurrency(Number(e.amount))} sub={e.bookingId || "—"} />
      )} />
      <Section title="Other Earnings" items={otherEarnings} renderItem={(e: any) => (
        <EntryRow key={e.id} date={e.date} main={formatCurrency(Number(e.amount))} sub={e.source} />
      )} />
      <Section title="Fuel Entries" items={fuel} renderItem={(e: any) => (
        <EntryRow key={e.id} date={e.date} main={formatCurrency(Number(e.cost))} sub={`${e.liters}L · ${e.odometer} km`} />
      )} />
      <Section title="Other Costs" items={other} renderItem={(e: any) => (
        <EntryRow key={e.id} date={e.date} main={formatCurrency(Number(e.amount))} sub={e.costType} />
      )} />
      <Section title="Payments" items={settlements} renderItem={(e: any) => (
        <EntryRow key={e.id} date={e.date} main={formatCurrency(Number(e.amount))} sub={`${e.type} · ${e.paymentMode ?? ""}`} />
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
