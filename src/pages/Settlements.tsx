import { useState, useRef } from "react";
import {
  useDrivers,
  useAllCash,
  useAllVendor,
  useAllFuel,
  useAllOtherCosts,
  useAllOtherEarnings,
  useAllSettlements,
  useCreateSettlement,
  useUpdateSettlement,
  useDeleteSettlement,
  useSettlementModeHistory,
} from "@/hooks/useApi";
import {
  computeSettlement,
  settlementModeForWeek,
  unpaidBalance,
  type SettlementModeHistoryRow,
} from "@/lib/settlement";
import { useRefetchAllFinancialOnWeekChange } from "@/hooks/useRefetchAllFinancialOnWeekChange";
import { getWeekStart, formatCurrency } from "@/lib/utils-date";
import { LoadingSpinner } from "@/components/LoadingState";
import WeekPicker from "@/components/WeekPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { Plus, CheckCircle, Info, CreditCard, ChevronDown, ChevronUp, Paperclip, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export default function SettlementsPage() {
  const [week, setWeek] = useState(getWeekStart());
  useRefetchAllFinancialOnWeekChange(week);
  const [showAdd, setShowAdd] = useState(false);
  const [expandedDriver, setExpandedDriver] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const driversQ = useDrivers();
  const cashQ = useAllCash();
  const vendorQ = useAllVendor();
  const fuelQ = useAllFuel();
  const otherQ = useAllOtherCosts();
  const otherEarnQ = useAllOtherEarnings();
  const settlementsQ = useAllSettlements();
  const createSettlement = useCreateSettlement();
  const updateSettlement = useUpdateSettlement();
  const deleteSettlement = useDeleteSettlement();
  const modeHQ = useSettlementModeHistory();

  const [editingSettlementId, setEditingSettlementId] = useState<string | null>(null);
  const [deleteSettlementId, setDeleteSettlementId] = useState<string | null>(null);
  const [sDate, setSDate] = useState(() => format(new Date(), "yyyy-MM-dd"));

  const isLoading =
    driversQ.isLoading ||
    cashQ.isLoading ||
    vendorQ.isLoading ||
    fuelQ.isLoading ||
    otherQ.isLoading ||
    otherEarnQ.isLoading ||
    settlementsQ.isLoading ||
    modeHQ.isLoading;

  const drivers = (driversQ.data ?? []).filter((d: { status: string }) => d.status === "active");
  const allCash = cashQ.data ?? [];
  const allVendor = vendorQ.data ?? [];
  const allFuel = fuelQ.data ?? [];
  const allOther = otherQ.data ?? [];
  const allOtherEarn = otherEarnQ.data ?? [];
  const allSettlements = settlementsQ.data ?? [];
  const modeRows = (modeHQ.data ?? []) as SettlementModeHistoryRow[];

  const settlements = allSettlements.filter((s: { weekStart: string }) => s.weekStart === week);

  const [sDriver, setSDriver] = useState("");
  const [sAmount, setSAmount] = useState("");
  const [sMode, setSMode] = useState("upi");
  const [sNotes, setSNotes] = useState("");
  const [sProofName, setSProofName] = useState<string | undefined>();

  const getDriverBreakdown = (driverId: string) => {
    const driver = drivers.find((d: { id: string }) => d.id === driverId);
    if (!driver) {
      return {
        cashCollected: 0,
        vendorAmount: 0,
        otherEarnings: 0,
        fuelCost: 0,
        otherCost: 0,
        netEarning: 0,
        driverShare: 0,
        finalSettlement: 0,
        alreadySettled: 0,
        balance: 0,
        mode: "commission_30" as const,
        netProfit: 0,
      };
    }

    const cashCollected = allCash.filter((e: { driverId: string; weekStart: string }) => e.driverId === driverId && e.weekStart === week).reduce((s: number, e: { amount: number | string }) => s + Number(e.amount), 0);
    const vendorAmount = allVendor.filter((e: { driverId: string; weekStart: string }) => e.driverId === driverId && e.weekStart === week).reduce((s: number, e: { amount: number | string }) => s + Number(e.amount), 0);
    const otherEarnings = allOtherEarn.filter((e: { driverId: string; weekStart: string }) => e.driverId === driverId && e.weekStart === week).reduce((s: number, e: { amount: number | string }) => s + Number(e.amount), 0);
    const fuelCost = allFuel.filter((e: { driverId: string; weekStart: string }) => e.driverId === driverId && e.weekStart === week).reduce((s: number, e: { cost: number | string }) => s + Number(e.cost), 0);
    const otherCost = allOther.filter((e: { driverId: string; weekStart: string }) => e.driverId === driverId && e.weekStart === week).reduce((s: number, e: { amount: number | string }) => s + Number(e.amount), 0);
    const alreadySettled = allSettlements.filter((e: { driverId: string; weekStart: string }) => e.driverId === driverId && e.weekStart === week).reduce((s: number, e: { amount: number | string }) => s + Number(e.amount), 0);

    const mode = settlementModeForWeek(driverId, week, modeRows);
    const calc = computeSettlement(mode, {
      cash: cashCollected,
      vendor: vendorAmount,
      fuel: fuelCost,
      otherCost,
      otherEarning: otherEarnings,
    });
    const balance = unpaidBalance(calc.finalSettlement, alreadySettled);
    const gross = vendorAmount + otherEarnings;
    const netProfit = Math.round((gross - calc.driverCut - fuelCost - otherCost) * 100) / 100;

    return {
      cashCollected,
      vendorAmount,
      otherEarnings,
      fuelCost,
      otherCost,
      netEarning: calc.netEarning,
      driverShare: calc.driverCut,
      finalSettlement: calc.finalSettlement,
      alreadySettled,
      balance,
      mode,
      netProfit,
    };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSProofName(file.name);
  };

  const resetPaymentForm = () => {
    setSDriver("");
    setSAmount("");
    setSNotes("");
    setSProofName(undefined);
    setSMode("upi");
    setSDate(format(new Date(), "yyyy-MM-dd"));
    setEditingSettlementId(null);
  };

  const openRecordPayment = (driverId?: string) => {
    setEditingSettlementId(null);
    if (driverId) setSDriver(driverId);
    setSAmount("");
    setSNotes("");
    setSProofName(undefined);
    setSMode("upi");
    setSDate(format(new Date(), "yyyy-MM-dd"));
    setShowAdd(true);
  };

  const openEditPayment = (s: {
    id: string;
    driverId?: string;
    amount: number | string;
    paymentMode?: string;
    notes?: string;
    date?: string;
  }) => {
    setEditingSettlementId(s.id);
    if (s.driverId) setSDriver(s.driverId);
    setSAmount(String(s.amount));
    setSMode(s.paymentMode || "upi");
    setSNotes(s.notes || "");
    setSDate(s.date || format(new Date(), "yyyy-MM-dd"));
    setShowAdd(true);
  };

  const savePayment = async () => {
    if (!sDriver || !sAmount) return;
    if (editingSettlementId) {
      await updateSettlement.mutateAsync({
        id: editingSettlementId,
        data: {
          amount: Number(sAmount),
          date: sDate,
          paymentMode: sMode,
          notes: sNotes || undefined,
        },
      });
    } else {
      await createSettlement.mutateAsync({
        driverId: sDriver,
        weekStart: week,
        date: sDate,
        amount: Number(sAmount),
        type: "partial",
        paymentMode: sMode,
        notes: sNotes || undefined,
        proofFileName: sProofName,
      });
    }
    resetPaymentForm();
    setShowAdd(false);
  };

  const confirmDeletePayment = async () => {
    if (!deleteSettlementId) return;
    await deleteSettlement.mutateAsync(deleteSettlementId);
    setDeleteSettlementId(null);
  };

  const handlePayFull = (driverId: string) => {
    const breakdown = getDriverBreakdown(driverId);
    if (breakdown.balance <= 0) return;
    setEditingSettlementId(null);
    setSDriver(driverId);
    setSAmount(String(Math.round(breakdown.balance)));
    setSDate(format(new Date(), "yyyy-MM-dd"));
    setShowAdd(true);
  };

  const selectedDriverBreakdown = sDriver ? getDriverBreakdown(sDriver) : null;

  if (isLoading) return <LoadingSpinner label="Loading settlements..." />;

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur pb-3 pt-2">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-semibold tracking-tight">Pay Drivers</h1>
          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            className="rounded-md border p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            aria-label="Help"
          >
            <Info className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mb-3">Track balances and record payments</p>
        <WeekPicker value={week} onChange={setWeek} />
      </div>

      {showHelp && (
        <div className="rounded-xl border bg-card p-4 space-y-2.5 text-xs text-muted-foreground">
          <p className="font-medium text-foreground text-sm flex items-center gap-1.5">
            <Info className="h-4 w-4 text-primary" /> How payments work
          </p>
          <div className="space-y-1.5 leading-relaxed">
            <p><span className="font-medium text-foreground">30% commission</span> — Net earning uses vendor + other earnings minus other costs; driver keeps 30% of that net; fuel is separate in the settlement.</p>
            <p><span className="font-medium text-foreground">50% profit sharing</span> — Net is all earnings minus all costs; driver keeps half; settlement uses cash vs vendor plus that share.</p>
            <p>Record payments to reduce the remaining balance. If a payment was entered wrong, use <span className="font-medium text-foreground">Edit</span> or <span className="font-medium text-foreground">Delete</span> on that row — deleting ledger entries does not remove recorded payments.</p>
          </div>
          <button type="button" onClick={() => setShowHelp(false)} className="text-xs text-primary font-medium">Dismiss</button>
        </div>
      )}

      <div className="space-y-2">
        {drivers.map((d: { id: string; name: string }) => {
          const b = getDriverBreakdown(d.id);
          const isExpanded = expandedDriver === d.id;
          const owesYou = b.balance > 0;
          const isSettled = Math.abs(b.balance) < 1;
          const driverSettlements = settlements.filter((s: { driverId: string }) => s.driverId === d.id);
          const modeLabel = b.mode === "profit_share_50" ? "50% profit sharing" : "30% commission";
          const statusLabel = isSettled ? "All settled" : owesYou ? "Owes you" : "You owe driver";

          return (
            <div
              key={d.id}
              className={cn(
                "rounded-xl border bg-card overflow-hidden transition-shadow",
                isExpanded ? "shadow-sm" : "",
                owesYou ? "border-l-4 border-l-destructive" : isSettled ? "border-l-4 border-l-success" : "border-l-4 border-l-border",
              )}
            >
              <button
                type="button"
                onClick={() => setExpandedDriver(isExpanded ? null : d.id)}
                className="flex w-full items-center justify-between px-3 py-3 text-left hover:bg-secondary/30 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={cn(
                      "h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold",
                      isSettled ? "bg-success/10 text-success" : owesYou ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {d.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{d.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {statusLabel}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex flex-col items-end">
                    <p
                      className={cn(
                        "text-sm font-semibold tabular-nums",
                        owesYou ? "text-destructive" : isSettled ? "text-success" : "text-foreground",
                      )}
                    >
                      {isSettled ? "₹0" : formatCurrency(Math.abs(b.balance))}
                    </p>
                    <div className="mt-1">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "border",
                          isSettled
                            ? "bg-success/10 text-success border-success/20"
                            : owesYou
                              ? "bg-destructive/10 text-destructive border-destructive/20"
                              : "bg-secondary text-foreground border-border",
                        )}
                      >
                        {modeLabel}
                      </Badge>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t bg-secondary/10 px-3 py-3 space-y-3">
                  <div className="rounded-xl border bg-card p-3 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Calculation</p>
                      <Badge variant="outline" className="text-[10px] px-2 py-0.5">{modeLabel}</Badge>
                    </div>
                    <Row label="Net earning" value={formatCurrency(b.netEarning)} />
                    <Row label={b.mode === "profit_share_50" ? "Driver share (50%)" : "Driver commission (30%)"} value={formatCurrency(b.driverShare)} negative />
                    <div className="border-t pt-1.5 flex justify-between font-semibold text-foreground">
                      <span>Final settlement</span>
                      <span className="tabular-nums">{formatCurrency(b.finalSettlement)}</span>
                    </div>
                  </div>

                  <div className="rounded-xl border bg-card p-3 space-y-1.5 text-xs">
                    <Row label="Cash collected" value={formatCurrency(b.cashCollected)} />
                    <Row
                      label="Net Profit"
                      value={formatCurrency(b.netProfit)}
                      negative={b.netProfit < 0}
                      positive={b.netProfit > 0}
                    />
                    {b.fuelCost > 0 && <Row label="Fuel" value={formatCurrency(b.fuelCost)} negative />}
                    {b.otherCost > 0 && <Row label="Other costs" value={formatCurrency(b.otherCost)} negative />}
                    {b.alreadySettled > 0 && <Row label="Payments recorded" value={formatCurrency(b.alreadySettled)} positive />}
                    <div className="border-t pt-1.5 flex justify-between font-semibold">
                      <span>{owesYou ? "Driver owes you" : isSettled ? "Settled" : "You owe driver"}</span>
                      <span className={cn("tabular-nums", owesYou ? "text-destructive" : "text-success")}>
                        {formatCurrency(Math.abs(b.balance))}
                      </span>
                    </div>
                  </div>

                  {driverSettlements.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Payment History</p>
                      {driverSettlements.map((s: { id: string; driverId?: string; date: string; paymentMode?: string; notes?: string; amount: number | string }) => (
                        <div key={s.id} className="flex items-center gap-2 rounded-lg border bg-card px-2 py-2">
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            <CheckCircle className="h-3.5 w-3.5 shrink-0 text-success" />
                            <div className="min-w-0">
                              <p className="text-xs font-medium">{s.date}</p>
                              <p className="text-[10px] text-muted-foreground capitalize">
                                {s.paymentMode}
                                {s.notes ? ` — ${s.notes}` : ""}
                              </p>
                            </div>
                          </div>
                          <p className="text-xs font-semibold tabular-nums text-success shrink-0">{formatCurrency(Number(s.amount))}</p>
                          <div className="flex shrink-0 items-center gap-0.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              aria-label="Edit payment"
                              onClick={() => openEditPayment({ ...s, driverId: d.id })}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              aria-label="Delete payment"
                              onClick={() => setDeleteSettlementId(s.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    {owesYou && (
                      <Button size="sm" variant="outline" className="flex-1 text-xs h-9" onClick={() => handlePayFull(d.id)}>Settle Full</Button>
                    )}
                    <Button size="sm" className="flex-1 text-xs h-9" onClick={() => openRecordPayment(d.id)}>
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

      <Drawer
        open={showAdd}
        onOpenChange={(open) => {
          setShowAdd(open);
          if (!open) resetPaymentForm();
        }}
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{editingSettlementId ? "Edit payment" : "Record payment"}</DrawerTitle>
          </DrawerHeader>
          <div className="space-y-3 px-4">
            <div><Label className="text-xs">Driver</Label>
              <Select
                value={sDriver}
                disabled={!!editingSettlementId}
                onValueChange={(v) => { setSDriver(v); setSAmount(""); }}
              >
                <SelectTrigger><SelectValue placeholder="Select driver" /></SelectTrigger>
                <SelectContent>{drivers.map((dr: { id: string; name: string }) => <SelectItem key={dr.id} value={dr.id}>{dr.name}</SelectItem>)}</SelectContent>
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
            <div><Label className="text-xs">Date</Label><Input type="date" value={sDate} onChange={(e) => setSDate(e.target.value)} /></div>
            <div><Label className="text-xs">Amount</Label><Input type="number" value={sAmount} onChange={e => setSAmount(e.target.value)} placeholder="0" /></div>
            <div><Label className="text-xs">Payment Method</Label>
              <Select value={sMode} onValueChange={setSMode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="upi">UPI</SelectItem><SelectItem value="bank">Bank Transfer</SelectItem><SelectItem value="cash">Cash</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Notes</Label><Input value={sNotes} onChange={e => setSNotes(e.target.value)} placeholder="Reference or note" /></div>
            {!editingSettlementId && (
              <div>
                <Label className="text-xs">Payment Screenshot</Label>
                <input type="file" ref={fileInputRef} accept="image/*" onChange={handleFileChange} className="hidden" />
                <Button variant="outline" size="sm" className="w-full mt-1" onClick={() => fileInputRef.current?.click()}>
                  <Paperclip className="mr-1.5 h-3.5 w-3.5" /> {sProofName || "Attach screenshot"}
                </Button>
              </div>
            )}
          </div>
          <DrawerFooter>
            <Button
              onClick={savePayment}
              disabled={
                !sDriver ||
                !sAmount ||
                createSettlement.isPending ||
                updateSettlement.isPending
              }
            >
              {createSettlement.isPending || updateSettlement.isPending
                ? "Saving..."
                : editingSettlementId
                  ? "Save changes"
                  : "Save payment"}
            </Button>
            <DrawerClose asChild><Button variant="outline">Cancel</Button></DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <AlertDialog open={!!deleteSettlementId} onOpenChange={(o) => !o && setDeleteSettlementId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this payment?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the recorded payout from the week. Balances will update immediately. This does not delete cash or vendor entries.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={deleteSettlement.isPending}
              onClick={() => void confirmDeletePayment()}
            >
              {deleteSettlement.isPending ? "Deleting..." : "Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Row({ label, value, negative, positive }: { label: string; value: string; negative?: boolean; positive?: boolean }) {
  return (
    <div className={`flex justify-between ${negative ? "text-destructive" : positive ? "text-success" : "text-muted-foreground"}`}>
      <span>{label}</span><span className="tabular-nums font-medium">{value}</span>
    </div>
  );
}
