import { useState } from "react";
import { getDrivers, getSettlements, saveSettlements, getVendorEntries, getFuelEntries, getOtherCostEntries, getCashEntries } from "@/lib/store";
import { getWeekStart, formatCurrency, generateId } from "@/lib/utils-date";
import WeekPicker from "@/components/WeekPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { Plus, CheckCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import type { Settlement } from "@/types";

export default function SettlementsPage() {
  const [week, setWeek] = useState(getWeekStart());
  const [showAdd, setShowAdd] = useState(false);

  const drivers = getDrivers().filter(d => d.status === "active");
  const settlements = getSettlements().filter(s => s.weekStart === week);

  const [sDriver, setSDriver] = useState("");
  const [sAmount, setSAmount] = useState("");
  const [sMode, setSMode] = useState("upi");
  const [sType, setSType] = useState("partial");
  const [sNotes, setSNotes] = useState("");

  const getDriverBalance = (driverId: string) => {
    const driver = drivers.find(d => d.id === driverId);
    if (!driver) return 0;
    const cash = getCashEntries().filter(e => e.driverId === driverId && e.weekStart === week).reduce((s, e) => s + e.amount, 0);
    const vendor = getVendorEntries().filter(e => e.driverId === driverId && e.weekStart === week).reduce((s, e) => s + e.amount, 0);
    const fuel = getFuelEntries().filter(e => e.driverId === driverId && e.weekStart === week).reduce((s, e) => s + e.cost, 0);
    const other = getOtherCostEntries().filter(e => e.driverId === driverId && e.weekStart === week).reduce((s, e) => s + e.amount, 0);
    const settled = getSettlements().filter(e => e.driverId === driverId && e.weekStart === week).reduce((s, e) => s + e.amount, 0);
    const commission = vendor * (driver.commissionPercent / 100);
    const netEarnings = vendor - commission - fuel - other;
    return cash - netEarnings - settled;
  };

  const addSettlement = () => {
    if (!sDriver || !sAmount) return;
    const settlement: Settlement = {
      id: generateId(),
      driverId: sDriver,
      weekStart: week,
      date: format(new Date(), "yyyy-MM-dd"),
      amount: Number(sAmount),
      type: sType as "full" | "partial",
      paymentMode: sMode as "upi" | "bank" | "cash",
      notes: sNotes || undefined,
    };
    const all = [...getSettlements(), settlement];
    saveSettlements(all);
    setSDriver(""); setSAmount(""); setSNotes("");
    setShowAdd(false);
  };

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-40 bg-background pb-2 pt-1">
        <h1 className="text-lg font-semibold">Settlements</h1>
        <div className="mt-2"><WeekPicker value={week} onChange={setWeek} /></div>
      </div>

      {/* Driver Balances */}
      <div>
        <h2 className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Pending Balances</h2>
        <div className="space-y-1">
          {drivers.map(d => {
            const balance = getDriverBalance(d.id);
            return (
              <div key={d.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                <div className="flex items-center gap-2">
                  {balance > 0 ? <AlertCircle className="h-4 w-4 text-destructive" /> : <CheckCircle className="h-4 w-4 text-success" />}
                  <p className="text-sm font-medium">{d.name}</p>
                </div>
                <p className={`text-sm font-medium tabular-nums ${balance > 0 ? "text-destructive" : "text-success"}`}>
                  {formatCurrency(Math.abs(balance))}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <Button className="w-full" onClick={() => setShowAdd(true)}>
        <Plus className="mr-1 h-4 w-4" /> Add Settlement
      </Button>

      {/* Settlement History */}
      <div>
        <h2 className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">This Week's Settlements</h2>
        {settlements.length === 0 ? (
          <p className="rounded-md border p-4 text-center text-sm text-muted-foreground">No settlements yet</p>
        ) : (
          <div className="space-y-1">
            {settlements.map(s => {
              const d = drivers.find(dr => dr.id === s.driverId);
              return (
                <div key={s.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{d?.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{s.date} · {s.type} · {s.paymentMode}</p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums text-success">{formatCurrency(s.amount)}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Drawer open={showAdd} onOpenChange={setShowAdd}>
        <DrawerContent>
          <DrawerHeader><DrawerTitle>Add Settlement</DrawerTitle></DrawerHeader>
          <div className="space-y-3 px-4">
            <div><Label className="text-xs">Driver</Label>
              <Select value={sDriver} onValueChange={setSDriver}>
                <SelectTrigger><SelectValue placeholder="Select driver" /></SelectTrigger>
                <SelectContent>{drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Amount (₹)</Label><Input type="number" value={sAmount} onChange={e => setSAmount(e.target.value)} /></div>
            <div><Label className="text-xs">Type</Label>
              <Select value={sType} onValueChange={setSType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Payment Mode</Label>
              <Select value={sMode} onValueChange={setSMode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="bank">Bank</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Notes</Label><Input value={sNotes} onChange={e => setSNotes(e.target.value)} /></div>
          </div>
          <DrawerFooter>
            <Button onClick={addSettlement} disabled={!sDriver || !sAmount}>Save</Button>
            <DrawerClose asChild><Button variant="outline">Cancel</Button></DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
