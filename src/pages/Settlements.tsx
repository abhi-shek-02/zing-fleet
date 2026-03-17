import { useState, useRef } from "react";
import { getDrivers, getSettlements, saveSettlements, getVendorEntries, getFuelEntries, getOtherCostEntries, getCashEntries, getOtherEarnings } from "@/lib/store";
import { getWeekStart, formatCurrency, generateId } from "@/lib/utils-date";
import WeekPicker from "@/components/WeekPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { Plus, CheckCircle, AlertCircle, Paperclip, Image as ImageIcon, ChevronDown, ChevronUp, HelpCircle, Wallet, ArrowRight, Minus, Equal } from "lucide-react";
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
    if (!driver) return { cashCollected: 0, vendorAmount: 0, otherEarnings: 0, fuelCost: 0, otherCost: 0, commission: 0, netDriverPay: 0, alreadySettled: 0, balance: 0 };
    
    const cashCollected = getCashEntries().filter(e => e.driverId === driverId && e.weekStart === week).reduce((s, e) => s + e.amount, 0);
    const vendorAmount = getVendorEntries().filter(e => e.driverId === driverId && e.weekStart === week).reduce((s, e) => s + e.amount, 0);
    const otherEarnings = getOtherEarnings().filter(e => e.driverId === driverId && e.weekStart === week).reduce((s, e) => s + e.amount, 0);
    const fuelCost = getFuelEntries().filter(e => e.driverId === driverId && e.weekStart === week).reduce((s, e) => s + e.cost, 0);
    const otherCost = getOtherCostEntries().filter(e => e.driverId === driverId && e.weekStart === week).reduce((s, e) => s + e.amount, 0);
    const alreadySettled = getSettlements().filter(e => e.driverId === driverId && e.weekStart === week).reduce((s, e) => s + e.amount, 0);

    const totalEarnings = vendorAmount + otherEarnings;
    const commission = totalEarnings * (driver.commissionPercent / 100);
    const netDriverPay = totalEarnings - commission - fuelCost - otherCost;
    const balance = cashCollected - netDriverPay - alreadySettled;

    return { cashCollected, vendorAmount, otherEarnings, fuelCost, otherCost, commission, netDriverPay, alreadySettled, balance };
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
      id: generateId(),
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
    <div className="space-y-4">
      <div className="sticky top-0 z-40 bg-background pb-2 pt-1">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Pay Drivers</h1>
          <button onClick={() => setShowHelp(!showHelp)} className="text-muted-foreground hover:text-foreground p-1">
            <HelpCircle className="h-4.5 w-4.5" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">Track what you owe each driver and record payments</p>
        <div className="mt-2"><WeekPicker value={week} onChange={setWeek} /></div>
      </div>

      {/* How it works - collapsible */}
      {showHelp && (
        <div className="rounded-lg border bg-secondary/50 p-3 space-y-2 text-xs text-muted-foreground">
          <p className="font-medium text-foreground text-sm">💡 How driver payments work</p>
          <div className="space-y-1.5">
            <p>① Driver collects <span className="font-medium text-foreground">cash from passengers</span> during the week</p>
            <p>② From total earnings, driver keeps their <span className="font-medium text-foreground">commission (e.g. 30%)</span></p>
            <p>③ Fuel & other costs are deducted from earnings</p>
            <p>④ <span className="font-medium text-foreground">Remaining amount = what driver must return</span> to you</p>
            <p>⑤ If driver collected more cash than they owe → <span className="text-destructive font-medium">they owe you money</span></p>
            <p>⑥ Record each payment here to track who's been paid</p>
          </div>
          <button onClick={() => setShowHelp(false)} className="text-xs underline text-muted-foreground mt-1">Got it, close</button>
        </div>
      )}

      {/* Driver cards with balance */}
      <div className="space-y-2">
        {drivers.map(d => {
          const b = getDriverBreakdown(d.id);
          const isExpanded = expandedDriver === d.id;
          const owesYou = b.balance > 0;
          const isSettled = Math.abs(b.balance) < 1;
          const driverSettlements = settlements.filter(s => s.driverId === d.id);

          return (
            <div key={d.id} className={`rounded-lg border overflow-hidden ${owesYou ? "border-l-[3px] border-l-destructive" : isSettled ? "border-l-[3px] border-l-success" : "border-l-[3px] border-l-muted"}`}>
              {/* Summary row */}
              <button
                onClick={() => setExpandedDriver(isExpanded ? null : d.id)}
                className="flex w-full items-center justify-between px-3 py-3 text-left hover:bg-secondary/30 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {isSettled ? (
                    <CheckCircle className="h-4 w-4 text-success shrink-0" />
                  ) : owesYou ? (
                    <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                  ) : (
                    <Wallet className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{d.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {isSettled ? "✓ All settled" : owesYou ? `Owes you ${formatCurrency(b.balance)}` : `You owe ${formatCurrency(Math.abs(b.balance))}`}
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

              {/* Expanded breakdown */}
              {isExpanded && (
                <div className="border-t bg-secondary/20 px-3 py-3 space-y-3">
                  {/* Money flow visual */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Money Flow This Week</p>
                    
                    <div className="rounded-md bg-background border p-2.5 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Vendor Earnings</span>
                        <span className="tabular-nums font-medium">{formatCurrency(b.vendorAmount)}</span>
                      </div>
                      {b.otherEarnings > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">+ Other Earnings</span>
                          <span className="tabular-nums font-medium">{formatCurrency(b.otherEarnings)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-destructive">
                        <span>− Driver Commission ({d.commissionPercent}%)</span>
                        <span className="tabular-nums font-medium">{formatCurrency(b.commission)}</span>
                      </div>
                      <div className="flex justify-between text-destructive">
                        <span>− Fuel Cost</span>
                        <span className="tabular-nums font-medium">{formatCurrency(b.fuelCost)}</span>
                      </div>
                      {b.otherCost > 0 && (
                        <div className="flex justify-between text-destructive">
                          <span>− Other Costs</span>
                          <span className="tabular-nums font-medium">{formatCurrency(b.otherCost)}</span>
                        </div>
                      )}
                      <div className="border-t pt-1.5 flex justify-between font-medium">
                        <span>Your share (after driver's cut)</span>
                        <span className="tabular-nums">{formatCurrency(b.netDriverPay)}</span>
                      </div>
                    </div>

                    <div className="rounded-md bg-background border p-2.5 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Cash driver collected</span>
                        <span className="tabular-nums font-medium">{formatCurrency(b.cashCollected)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">− Your share (above)</span>
                        <span className="tabular-nums font-medium">{formatCurrency(b.netDriverPay)}</span>
                      </div>
                      {b.alreadySettled > 0 && (
                        <div className="flex justify-between text-success">
                          <span>− Already Paid</span>
                          <span className="tabular-nums font-medium">{formatCurrency(b.alreadySettled)}</span>
                        </div>
                      )}
                      <div className="border-t pt-1.5 flex justify-between font-semibold">
                        <span>{owesYou ? "Driver still owes you" : isSettled ? "All settled ✓" : "You owe driver"}</span>
                        <span className={`tabular-nums ${owesYou ? "text-destructive" : "text-success"}`}>
                          {formatCurrency(Math.abs(b.balance))}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Past settlements this week */}
                  {driverSettlements.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Payments Made</p>
                      {driverSettlements.map(s => (
                        <div key={s.id} className="flex items-center justify-between rounded-md bg-background border px-2.5 py-1.5">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-3.5 w-3.5 text-success shrink-0" />
                            <div>
                              <p className="text-xs">{s.date}</p>
                              <p className="text-[10px] text-muted-foreground capitalize">{s.paymentMode}{s.notes ? ` · ${s.notes}` : ""}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {s.proofData && (
                              <button onClick={() => setViewProof(s.proofData!)} className="text-muted-foreground hover:text-foreground">
                                <ImageIcon className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <p className="text-xs font-semibold tabular-nums text-success">{formatCurrency(s.amount)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    {owesYou && (
                      <Button size="sm" variant="outline" className="flex-1 text-xs h-8" onClick={() => handlePayFull(d.id)}>
                        Settle Full ({formatCurrency(b.balance)})
                      </Button>
                    )}
                    <Button size="sm" className="flex-1 text-xs h-8" onClick={() => { setSDriver(d.id); setSAmount(""); setShowAdd(true); }}>
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
        <p className="rounded-md border p-8 text-center text-sm text-muted-foreground">
          No active drivers. Add drivers first in the Drivers tab.
        </p>
      )}

      {/* View Proof Modal */}
      {viewProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setViewProof(null)}>
          <div className="max-h-[80vh] max-w-[90vw] overflow-auto rounded-lg bg-background p-2">
            <img src={viewProof} alt="Payment proof" className="max-w-full rounded" />
          </div>
        </div>
      )}

      {/* Record Payment Drawer */}
      <Drawer open={showAdd} onOpenChange={setShowAdd}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Record Payment to Driver</DrawerTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Record money you've paid or received from the driver</p>
          </DrawerHeader>
          <div className="space-y-3 px-4">
            <div><Label className="text-xs">Driver</Label>
              <Select value={sDriver} onValueChange={(v) => { setSDriver(v); setSAmount(""); }}>
                <SelectTrigger><SelectValue placeholder="Select driver" /></SelectTrigger>
                <SelectContent>{drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* Show current balance context */}
            {selectedDriverBreakdown && (
              <div className="rounded-md border bg-secondary/30 p-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current balance</span>
                  <span className={`font-medium tabular-nums ${selectedDriverBreakdown.balance > 0 ? "text-destructive" : "text-success"}`}>
                    {selectedDriverBreakdown.balance > 0 ? `Driver owes ${formatCurrency(selectedDriverBreakdown.balance)}` : selectedDriverBreakdown.balance < 0 ? `You owe ${formatCurrency(Math.abs(selectedDriverBreakdown.balance))}` : "All settled ✓"}
                  </span>
                </div>
              </div>
            )}

            <div><Label className="text-xs">Amount (₹)</Label><Input type="number" value={sAmount} onChange={e => setSAmount(e.target.value)} placeholder={selectedDriverBreakdown && selectedDriverBreakdown.balance > 0 ? `Max: ${selectedDriverBreakdown.balance}` : "0"} /></div>
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
            <div><Label className="text-xs">Notes (optional)</Label><Input value={sNotes} onChange={e => setSNotes(e.target.value)} placeholder="e.g. PhonePe ref #123" /></div>
            <div>
              <Label className="text-xs">Payment Screenshot (optional)</Label>
              <input type="file" ref={fileInputRef} accept="image/*" onChange={handleFileChange} className="hidden" />
              <Button variant="outline" size="sm" className="w-full mt-1" onClick={() => fileInputRef.current?.click()}>
                <Paperclip className="mr-1 h-3.5 w-3.5" /> {sProofName || "Attach Screenshot"}
              </Button>
              {sProofData && (
                <img src={sProofData} alt="Preview" className="mt-2 h-20 rounded border object-cover" />
              )}
            </div>
          </div>
          <DrawerFooter>
            <Button onClick={addSettlement} disabled={!sDriver || !sAmount}>Record Payment</Button>
            <DrawerClose asChild><Button variant="outline">Cancel</Button></DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
