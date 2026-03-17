import { useState, useRef } from "react";
import { getDrivers, getSettlements, saveSettlements, getVendorEntries, getFuelEntries, getOtherCostEntries, getCashEntries, getOtherEarnings } from "@/lib/store";
import { getWeekStart, formatCurrency, generateId } from "@/lib/utils-date";
import WeekPicker from "@/components/WeekPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { Plus, CheckCircle, AlertTriangle, Paperclip, Image as ImageIcon, ChevronDown, ChevronUp, Info, CreditCard, ArrowRight, Minus, Equal } from "lucide-react";
import { format } from "date-fns";
import type { Settlement } from "@/types";

export default function SettlementsPage() {
  const [week, setWeek] = useState(getWeekStart());
  const [showAdd, setShowAdd] = useState(false);
  const [viewProof, setViewProof] = useState<string | null>(null);
  const [expandedDriver, setExpandedDriver] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const drivers = getDrivers().filter(d => d.status === "active");
  const settlements = getSettlements().filter(s => s.weekStart === week);

  const [sDriver, setSDriver] = useState("");
  const [sAmount, setSAmount] = useState("");
  const [sMode, setSMode] = useState("upi");
  const [sNotes, setSNotes] = useState("");
  const [sProofData, setSProofData] = useState<string | undefined>();
  const [sProofName, setSProofName] = useState<string | undefined>();

  const getDriverBreakdown = (driverId: string) => {
    const driver = drivers.find(d => d.id === driverId);
    if (!driver) return { cashCollected: 0, vendorAmount: 0, otherEarnings: 0, fuelCost: 0, otherCost: 0, commission: 0, yourShare: 0, alreadySettled: 0, balance: 0 };
    
    const cashCollected = getCashEntries().filter(e => e.driverId === driverId && e.weekStart === week).reduce((s, e) => s + e.amount, 0);
    const vendorAmount = getVendorEntries().filter(e => e.driverId === driverId && e.weekStart === week).reduce((s, e) => s + e.amount, 0);
    const otherEarnings = getOtherEarnings().filter(e => e.driverId === driverId && e.weekStart === week).reduce((s, e) => s + e.amount, 0);
    const fuelCost = getFuelEntries().filter(e => e.driverId === driverId && e.weekStart === week).reduce((s, e) => s + e.cost, 0);
    const otherCost = getOtherCostEntries().filter(e => e.driverId === driverId && e.weekStart === week).reduce((s, e) => s + e.amount, 0);
    const alreadySettled = getSettlements().filter(e => e.driverId === driverId && e.weekStart === week).reduce((s, e) => s + e.amount, 0);

    const totalEarnings = vendorAmount + otherEarnings;
    const commission = totalEarnings * (driver.commissionPercent / 100);
    const yourShare = totalEarnings - commission - fuelCost - otherCost;
    const balance = cashCollected - yourShare - alreadySettled;

    return { cashCollected, vendorAmount, otherEarnings, fuelCost, otherCost, commission, yourShare, alreadySettled, balance };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSProofData(reader.result as string);
      setSProofName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const addSettlement = () => {
    if (!sDriver || !sAmount) return;
    const settlement: Settlement = {
      id: crypto.randomUUID(),
      driverId: sDriver,
      weekStart: week,
      date: format(new Date(), "yyyy-MM-dd"),
      amount: Number(sAmount),
      type: "partial",
      paymentMode: sMode as "upi" | "bank" | "cash",
      notes: sNotes || undefined,
      proofData: sProofData,
      proofFileName: sProofName,
    };
    const all = [...getSettlements(), settlement];
    saveSettlements(all);
    setSDriver(""); setSAmount(""); setSNotes(""); setSProofData(undefined); setSProofName(undefined);
    setShowAdd(false);
  };

  const handlePayFull = (driverId: string) => {
    const breakdown = getDriverBreakdown(driverId);
    if (breakdown.balance <= 0) return;
    setSDriver(driverId);
    setSAmount(String(breakdown.balance));
    setShowAdd(true);
  };

  const selectedDriverBreakdown = sDriver ? getDriverBreakdown(sDriver) : null;

  return (
    <div className="space-y-5">
      <div className="sticky top-0 z-40 bg-background pb-3 pt-2">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-semibold tracking-tight">Pay Drivers</h1>
          <button onClick={() => setShowHelp(!showHelp)} className="rounded-md border p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <Info className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mb-3">Track balances and record payments</p>
        <WeekPicker value={week} onChange={setWeek} />
      </div>

      {showHelp && (
        <div className="rounded-lg border bg-card p-4 space-y-2.5 text-xs text-muted-foreground">
          <p className="font-medium text-foreground text-sm flex items-center gap-1.5">
            <Info className="h-4 w-4 text-primary" /> How payments work
          </p>
          <div className="space-y-1.5 leading-relaxed">
            <p>1. Driver collects <span className="font-medium text-foreground">cash from passengers</span> during the week</p>
            <p>2. From total earnings, driver keeps their <span className="font-medium text-foreground">commission</span></p>
            <p>3. Fuel and other costs are deducted from earnings</p>
            <p>4. <span className="font-medium text-foreground">Remaining = your share</span> (what you keep)</p>
            <p>5. If driver collected more cash than your share, <span className="text-destructive font-medium">they owe you the difference</span></p>
          </div>
          <button onClick={() => setShowHelp(false)} className="text-xs text-primary font-medium">Dismiss</button>
        </div>
      )}

      {/* Driver payment cards */}
      <div className="space-y-2">
        {drivers.map(d => {
          const b = getDriverBreakdown(d.id);
          const isExpanded = expandedDriver === d.id;
          const owesYou = b.balance > 0;
          const isSettled = Math.abs(b.balance) < 1;
          const driverSettlements = settlements.filter(s => s.driverId === d.id);

          return (
            <div key={d.id} className={`rounded-lg border bg-card overflow-hidden transition-shadow ${isExpanded ? "shadow-sm" : ""} ${
              owesYou ? "border-l-[3px] border-l-destructive" : isSettled ? "border-l-[3px] border-l-success" : "border-l-[3px] border-l-border"
            }`}>
              <button
                onClick={() => setExpandedDriver(isExpanded ? null : d.id)}
                className="flex w-full items-center justify-between px-3 py-3 text-left hover:bg-secondary/30 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    isSettled ? "bg-success/10 text-success" : owesYou ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
                  }`}>
                    {d.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{d.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {isSettled ? "All settled" : owesYou ? `Owes you ${formatCurrency(b.balance)}` : `You owe ${formatCurrency(Math.abs(b.balance))}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-semibold tabular-nums ${owesYou ? "text-destructive" : isSettled ? "text-success" : "text-foreground"}`}>
                    {isSettled ? "₹0" : formatCurrency(Math.abs(b.balance))}
                  </p>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t px-3 py-3 space-y-3 bg-secondary/10">
                  {/* Breakdown */}
                  <div className="rounded-lg border bg-card p-3 space-y-1.5 text-xs">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Calculation</p>
                    <Row label="Vendor Earnings" value={formatCurrency(b.vendorAmount)} />
                    {b.otherEarnings > 0 && <Row label="+ Other Earnings" value={formatCurrency(b.otherEarnings)} />}
                    <Row label={`- Commission (${d.commissionPercent}%)`} value={formatCurrency(b.commission)} negative />
                    <Row label="- Fuel Cost" value={formatCurrency(b.fuelCost)} negative />
                    {b.otherCost > 0 && <Row label="- Other Costs" value={formatCurrency(b.otherCost)} negative />}
                    <div className="border-t pt-1.5 flex justify-between font-semibold text-foreground">
                      <span>Your Share</span>
                      <span className="tabular-nums">{formatCurrency(b.yourShare)}</span>
                    </div>
                  </div>

                  <div className="rounded-lg border bg-card p-3 space-y-1.5 text-xs">
                    <Row label="Cash Collected" value={formatCurrency(b.cashCollected)} />
                    <Row label="- Your Share" value={formatCurrency(b.yourShare)} />
                    {b.alreadySettled > 0 && <Row label="- Already Paid" value={formatCurrency(b.alreadySettled)} positive />}
                    <div className="border-t pt-1.5 flex justify-between font-semibold">
                      <span>{owesYou ? "Driver owes you" : isSettled ? "Settled" : "You owe driver"}</span>
                      <span className={`tabular-nums ${owesYou ? "text-destructive" : "text-success"}`}>
                        {formatCurrency(Math.abs(b.balance))}
                      </span>
                    </div>
                  </div>

                  {/* Past settlements */}
                  {driverSettlements.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Payment History</p>
                      {driverSettlements.map(s => (
                        <div key={s.id} className="flex items-center justify-between rounded-lg border bg-card px-3 py-2">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-3.5 w-3.5 text-success shrink-0" />
                            <div>
                              <p className="text-xs font-medium">{s.date}</p>
                              <p className="text-[10px] text-muted-foreground capitalize">{s.paymentMode}{s.notes ? ` — ${s.notes}` : ""}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {s.proofData && (
                              <button onClick={(e) => { e.stopPropagation(); setViewProof(s.proofData!); }} className="text-muted-foreground hover:text-foreground">
                                <ImageIcon className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <p className="text-xs font-semibold tabular-nums text-success">{formatCurrency(s.amount)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    {owesYou && (
                      <Button size="sm" variant="outline" className="flex-1 text-xs h-9" onClick={() => handlePayFull(d.id)}>
                        Settle Full
                      </Button>
                    )}
                    <Button size="sm" className="flex-1 text-xs h-9" onClick={() => { setSDriver(d.id); setSAmount(""); setShowAdd(true); }}>
                      <Plus className="mr-1 h-3 w-3" /> Record Payment
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {drivers.length === 0 && (
        <div className="rounded-lg border p-8 text-center">
          <CreditCard className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No active drivers</p>
        </div>
      )}

      {/* Proof viewer */}
      {viewProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4" onClick={() => setViewProof(null)}>
          <div className="max-h-[80vh] max-w-[90vw] overflow-auto rounded-lg bg-card p-2">
            <img src={viewProof} alt="Payment proof" className="max-w-full rounded" />
          </div>
        </div>
      )}

      {/* Record Payment Drawer */}
      <Drawer open={showAdd} onOpenChange={setShowAdd}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Record Payment</DrawerTitle>
          </DrawerHeader>
          <div className="space-y-3 px-4">
            <div><Label className="text-xs">Driver</Label>
              <Select value={sDriver} onValueChange={(v) => { setSDriver(v); setSAmount(""); }}>
                <SelectTrigger><SelectValue placeholder="Select driver" /></SelectTrigger>
                <SelectContent>{drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {selectedDriverBreakdown && (
              <div className="rounded-lg border bg-secondary/30 p-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Balance</span>
                  <span className={`font-medium tabular-nums ${selectedDriverBreakdown.balance > 0 ? "text-destructive" : "text-success"}`}>
                    {selectedDriverBreakdown.balance > 0 ? `Owes ${formatCurrency(selectedDriverBreakdown.balance)}` : selectedDriverBreakdown.balance < 0 ? `You owe ${formatCurrency(Math.abs(selectedDriverBreakdown.balance))}` : "Settled"}
                  </span>
                </div>
              </div>
            )}

            <div><Label className="text-xs">Amount</Label><Input type="number" value={sAmount} onChange={e => setSAmount(e.target.value)} placeholder="0" /></div>
            <div><Label className="text-xs">Payment Method</Label>
              <Select value={sMode} onValueChange={setSMode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Notes</Label><Input value={sNotes} onChange={e => setSNotes(e.target.value)} placeholder="Reference or note" /></div>
            <div>
              <Label className="text-xs">Payment Screenshot</Label>
              <input type="file" ref={fileInputRef} accept="image/*" onChange={handleFileChange} className="hidden" />
              <Button variant="outline" size="sm" className="w-full mt-1" onClick={() => fileInputRef.current?.click()}>
                <Paperclip className="mr-1.5 h-3.5 w-3.5" /> {sProofName || "Attach screenshot"}
              </Button>
              {sProofData && <img src={sProofData} alt="Proof" className="mt-2 h-20 rounded border object-cover" />}
            </div>
          </div>
          <DrawerFooter>
            <Button onClick={addSettlement} disabled={!sDriver || !sAmount}>Save Payment</Button>
            <DrawerClose asChild><Button variant="outline">Cancel</Button></DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

function Row({ label, value, negative, positive }: { label: string; value: string; negative?: boolean; positive?: boolean }) {
  return (
    <div className={`flex justify-between ${negative ? "text-destructive" : positive ? "text-success" : "text-muted-foreground"}`}>
      <span>{label}</span>
      <span className="tabular-nums font-medium">{value}</span>
    </div>
  );
}
