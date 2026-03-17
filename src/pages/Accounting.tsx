import { useState, useEffect } from "react";
import { format } from "date-fns";
import { getDrivers, getCars, getCashEntries, saveCashEntries, getVendorEntries, saveVendorEntries, getFuelEntries, saveFuelEntries, getOtherCostEntries, saveOtherCostEntries, getOtherEarnings, saveOtherEarnings } from "@/lib/store";
import { getWeekStart, formatCurrency, generateId } from "@/lib/utils-date";
import WeekPicker from "@/components/WeekPicker";
import StatCard from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Trash2, Banknote, Receipt, Fuel, CircleDollarSign } from "lucide-react";
import type { CashEntry, VendorEntry, FuelEntry, OtherCostEntry, OtherEarningEntry } from "@/types";

export default function AccountingPage() {
  const [week, setWeek] = useState(getWeekStart());
  const [driverId, setDriverId] = useState("");
  const drivers = getDrivers().filter(d => d.status === "active");
  const cars = getCars();
  const driver = drivers.find(d => d.id === driverId);
  const car = cars.find(c => c.id === driver?.carId);

  const [cashEntries, setCashEntries] = useState<CashEntry[]>([]);
  const [vendorEntries, setVendorEntries] = useState<VendorEntry[]>([]);
  const [fuelEntries, setFuelEntries] = useState<FuelEntry[]>([]);
  const [otherEntries, setOtherEntries] = useState<OtherCostEntry[]>([]);
  const [earningEntries, setEarningEntries] = useState<OtherEarningEntry[]>([]);

  const [drawer, setDrawer] = useState<"cash" | "vendor" | "fuel" | "other" | "earning" | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: string } | null>(null);

  useEffect(() => {
    if (!driverId) return;
    setCashEntries(getCashEntries().filter(e => e.driverId === driverId && e.weekStart === week));
    setVendorEntries(getVendorEntries().filter(e => e.driverId === driverId && e.weekStart === week));
    setFuelEntries(getFuelEntries().filter(e => e.driverId === driverId && e.weekStart === week));
    setOtherEntries(getOtherCostEntries().filter(e => e.driverId === driverId && e.weekStart === week));
    setEarningEntries(getOtherEarnings().filter(e => e.driverId === driverId && e.weekStart === week));
  }, [driverId, week]);

  const today = format(new Date(), "yyyy-MM-dd");
  const [fDate, setFDate] = useState(today);
  const [fAmount, setFAmount] = useState("");
  const [fSource, setFSource] = useState("savari");
  const [fNotes, setFNotes] = useState("");
  const [fBookingId, setFBookingId] = useState("");
  const [fLiters, setFLiters] = useState("");
  const [fOdometer, setFOdometer] = useState("");
  const [fStation, setFStation] = useState("");
  const [fCostType, setFCostType] = useState("toll");
  const [fEarnSource, setFEarnSource] = useState("tip");

  const resetForm = () => {
    setFDate(today); setFAmount(""); setFSource("savari"); setFNotes("");
    setFBookingId(""); setFLiters(""); setFOdometer(""); setFStation(""); setFCostType("toll"); setFEarnSource("tip");
  };

  const addCash = () => {
    const entry: CashEntry = { id: generateId(), driverId, carId: car?.id || "", weekStart: week, date: fDate, amount: Number(fAmount), source: fSource as any, notes: fNotes || undefined };
    const all = [...getCashEntries(), entry];
    saveCashEntries(all);
    setCashEntries(all.filter(e => e.driverId === driverId && e.weekStart === week));
    resetForm(); setDrawer(null);
  };

  const addVendor = () => {
    const entry: VendorEntry = { id: generateId(), driverId, carId: car?.id || "", weekStart: week, date: fDate, amount: Number(fAmount), bookingId: fBookingId || undefined, notes: fNotes || undefined };
    const all = [...getVendorEntries(), entry];
    saveVendorEntries(all);
    setVendorEntries(all.filter(e => e.driverId === driverId && e.weekStart === week));
    resetForm(); setDrawer(null);
  };

  const addFuel = () => {
    const entry: FuelEntry = { id: generateId(), driverId, carId: car?.id || "", weekStart: week, date: fDate, cost: Number(fAmount), liters: Number(fLiters), odometer: Number(fOdometer), station: fStation || undefined, notes: fNotes || undefined };
    const all = [...getFuelEntries(), entry];
    saveFuelEntries(all);
    setFuelEntries(all.filter(e => e.driverId === driverId && e.weekStart === week));
    resetForm(); setDrawer(null);
  };

  const addOther = () => {
    const entry: OtherCostEntry = { id: generateId(), driverId, carId: car?.id || "", weekStart: week, date: fDate, amount: Number(fAmount), costType: fCostType as any, notes: fNotes || undefined };
    const all = [...getOtherCostEntries(), entry];
    saveOtherCostEntries(all);
    setOtherEntries(all.filter(e => e.driverId === driverId && e.weekStart === week));
    resetForm(); setDrawer(null);
  };

  const addEarning = () => {
    const entry: OtherEarningEntry = { id: generateId(), driverId, carId: car?.id || "", weekStart: week, date: fDate, amount: Number(fAmount), source: fEarnSource, notes: fNotes || undefined };
    const all = [...getOtherEarnings(), entry];
    saveOtherEarnings(all);
    setEarningEntries(all.filter(e => e.driverId === driverId && e.weekStart === week));
    resetForm(); setDrawer(null);
  };

  const confirmDelete = () => {
    if (!deleteConfirm) return;
    const { type, id } = deleteConfirm;
    if (type === "cash") { const all = getCashEntries().filter(e => e.id !== id); saveCashEntries(all); setCashEntries(all.filter(e => e.driverId === driverId && e.weekStart === week)); }
    else if (type === "vendor") { const all = getVendorEntries().filter(e => e.id !== id); saveVendorEntries(all); setVendorEntries(all.filter(e => e.driverId === driverId && e.weekStart === week)); }
    else if (type === "fuel") { const all = getFuelEntries().filter(e => e.id !== id); saveFuelEntries(all); setFuelEntries(all.filter(e => e.driverId === driverId && e.weekStart === week)); }
    else if (type === "other") { const all = getOtherCostEntries().filter(e => e.id !== id); saveOtherCostEntries(all); setOtherEntries(all.filter(e => e.driverId === driverId && e.weekStart === week)); }
    else if (type === "earning") { const all = getOtherEarnings().filter(e => e.id !== id); saveOtherEarnings(all); setEarningEntries(all.filter(e => e.driverId === driverId && e.weekStart === week)); }
    setDeleteConfirm(null);
  };

  const totalCash = cashEntries.reduce((s, e) => s + e.amount, 0);
  const totalVendor = vendorEntries.reduce((s, e) => s + e.amount, 0);
  const totalFuel = fuelEntries.reduce((s, e) => s + e.cost, 0);
  const totalOther = otherEntries.reduce((s, e) => s + e.amount, 0);
  const totalEarnings = earningEntries.reduce((s, e) => s + e.amount, 0);
  const netEarnings = totalVendor + totalEarnings;

  return (
    <div className="space-y-5">
      <div className="sticky top-0 z-40 bg-background pb-3 pt-2">
        <h1 className="text-xl font-semibold tracking-tight">Daily Entries</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Log cash, bookings, fuel, and costs</p>
        <div className="mt-3 space-y-2">
          <Select value={driverId} onValueChange={setDriverId}>
            <SelectTrigger><SelectValue placeholder="Select driver" /></SelectTrigger>
            <SelectContent>
              {drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <WeekPicker value={week} onChange={setWeek} />
          {car && <p className="text-[11px] text-muted-foreground">{car.number} · {car.model}</p>}
        </div>
      </div>

      {!driverId ? (
        <div className="rounded-lg border p-8 text-center">
          <Banknote className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Select a driver to start</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5">
            <StatCard label="Cash Collected" value={formatCurrency(totalCash)} icon={<Banknote className="h-3.5 w-3.5" />} />
            <StatCard label="Vendor Amount" value={formatCurrency(totalVendor)} icon={<Receipt className="h-3.5 w-3.5" />} />
            <StatCard label="Other Earnings" value={formatCurrency(totalEarnings)} variant="success" icon={<CircleDollarSign className="h-3.5 w-3.5" />} />
            <StatCard label="Fuel Cost" value={formatCurrency(totalFuel)} variant="danger" icon={<Fuel className="h-3.5 w-3.5" />} />
          </div>

          <Tabs defaultValue="cash" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="cash" className="text-[10px] px-1">Cash</TabsTrigger>
              <TabsTrigger value="vendor" className="text-[10px] px-1">Vendor</TabsTrigger>
              <TabsTrigger value="fuel" className="text-[10px] px-1">Fuel</TabsTrigger>
              <TabsTrigger value="other" className="text-[10px] px-1">Costs</TabsTrigger>
              <TabsTrigger value="earning" className="text-[10px] px-1">Earnings</TabsTrigger>
            </TabsList>

            <TabsContent value="cash" className="mt-3 space-y-1.5">
              <Button size="sm" className="w-full h-9 text-xs" onClick={() => { resetForm(); setDrawer("cash"); }}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Add Cash Collected
              </Button>
              {cashEntries.map(e => (
                <EntryRow key={e.id} date={e.date} main={formatCurrency(e.amount)} sub={e.source} onDelete={() => setDeleteConfirm({ type: "cash", id: e.id })} />
              ))}
            </TabsContent>

            <TabsContent value="vendor" className="mt-3 space-y-1.5">
              <Button size="sm" className="w-full h-9 text-xs" onClick={() => { resetForm(); setDrawer("vendor"); }}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Add Vendor Amount
              </Button>
              {vendorEntries.map(e => (
                <EntryRow key={e.id} date={e.date} main={formatCurrency(e.amount)} sub={e.bookingId || "—"} onDelete={() => setDeleteConfirm({ type: "vendor", id: e.id })} />
              ))}
            </TabsContent>

            <TabsContent value="fuel" className="mt-3 space-y-1.5">
              <Button size="sm" className="w-full h-9 text-xs" onClick={() => { resetForm(); setDrawer("fuel"); }}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Add Fuel Entry
              </Button>
              {fuelEntries.map(e => (
                <EntryRow key={e.id} date={e.date} main={formatCurrency(e.cost)} sub={`${e.liters}L · ${e.odometer}km`} onDelete={() => setDeleteConfirm({ type: "fuel", id: e.id })} />
              ))}
            </TabsContent>

            <TabsContent value="other" className="mt-3 space-y-1.5">
              <Button size="sm" className="w-full h-9 text-xs" onClick={() => { resetForm(); setDrawer("other"); }}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Add Cost
              </Button>
              {otherEntries.map(e => (
                <EntryRow key={e.id} date={e.date} main={formatCurrency(e.amount)} sub={e.costType} onDelete={() => setDeleteConfirm({ type: "other", id: e.id })} />
              ))}
            </TabsContent>

            <TabsContent value="earning" className="mt-3 space-y-1.5">
              <Button size="sm" className="w-full h-9 text-xs" onClick={() => { resetForm(); setDrawer("earning"); }}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Add Earning
              </Button>
              {earningEntries.map(e => (
                <EntryRow key={e.id} date={e.date} main={formatCurrency(e.amount)} sub={e.source} onDelete={() => setDeleteConfirm({ type: "earning", id: e.id })} />
              ))}
            </TabsContent>
          </Tabs>

          {/* Delete Confirmation */}
          <AlertDialog open={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Entry</AlertDialogTitle>
                <AlertDialogDescription>This action cannot be undone. Are you sure?</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Drawers */}
          <Drawer open={drawer === "cash"} onOpenChange={(o) => !o && setDrawer(null)}>
            <DrawerContent>
              <DrawerHeader><DrawerTitle>Cash Collected</DrawerTitle></DrawerHeader>
              <div className="space-y-3 px-4">
                <div><Label className="text-xs">Date</Label><Input type="date" value={fDate} onChange={e => setFDate(e.target.value)} /></div>
                <div><Label className="text-xs">Amount</Label><Input type="number" value={fAmount} onChange={e => setFAmount(e.target.value)} placeholder="0" /></div>
                <div><Label className="text-xs">Source</Label>
                  <Select value={fSource} onValueChange={setFSource}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="savari">Savari</SelectItem>
                      <SelectItem value="direct">Direct</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Notes</Label><Input value={fNotes} onChange={e => setFNotes(e.target.value)} /></div>
              </div>
              <DrawerFooter>
                <Button onClick={addCash} disabled={!fAmount}>Save</Button>
                <DrawerClose asChild><Button variant="outline">Cancel</Button></DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>

          <Drawer open={drawer === "vendor"} onOpenChange={(o) => !o && setDrawer(null)}>
            <DrawerContent>
              <DrawerHeader><DrawerTitle>Vendor Amount</DrawerTitle></DrawerHeader>
              <div className="space-y-3 px-4">
                <div><Label className="text-xs">Date</Label><Input type="date" value={fDate} onChange={e => setFDate(e.target.value)} /></div>
                <div><Label className="text-xs">Amount</Label><Input type="number" value={fAmount} onChange={e => setFAmount(e.target.value)} placeholder="0" /></div>
                <div><Label className="text-xs">Booking ID</Label><Input value={fBookingId} onChange={e => setFBookingId(e.target.value)} /></div>
                <div><Label className="text-xs">Notes</Label><Input value={fNotes} onChange={e => setFNotes(e.target.value)} /></div>
              </div>
              <DrawerFooter>
                <Button onClick={addVendor} disabled={!fAmount}>Save</Button>
                <DrawerClose asChild><Button variant="outline">Cancel</Button></DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>

          <Drawer open={drawer === "fuel"} onOpenChange={(o) => !o && setDrawer(null)}>
            <DrawerContent>
              <DrawerHeader><DrawerTitle>Fuel Entry</DrawerTitle></DrawerHeader>
              <div className="space-y-3 px-4">
                <div><Label className="text-xs">Date</Label><Input type="date" value={fDate} onChange={e => setFDate(e.target.value)} /></div>
                <div><Label className="text-xs">Cost</Label><Input type="number" value={fAmount} onChange={e => setFAmount(e.target.value)} placeholder="0" /></div>
                <div><Label className="text-xs">Liters</Label><Input type="number" value={fLiters} onChange={e => setFLiters(e.target.value)} placeholder="0" /></div>
                <div><Label className="text-xs">Odometer (KM)</Label><Input type="number" value={fOdometer} onChange={e => setFOdometer(e.target.value)} placeholder="0" /></div>
                <div><Label className="text-xs">Station</Label><Input value={fStation} onChange={e => setFStation(e.target.value)} /></div>
                <div><Label className="text-xs">Notes</Label><Input value={fNotes} onChange={e => setFNotes(e.target.value)} /></div>
              </div>
              <DrawerFooter>
                <Button onClick={addFuel} disabled={!fAmount || !fLiters}>Save</Button>
                <DrawerClose asChild><Button variant="outline">Cancel</Button></DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>

          <Drawer open={drawer === "other"} onOpenChange={(o) => !o && setDrawer(null)}>
            <DrawerContent>
              <DrawerHeader><DrawerTitle>Other Cost</DrawerTitle></DrawerHeader>
              <div className="space-y-3 px-4">
                <div><Label className="text-xs">Date</Label><Input type="date" value={fDate} onChange={e => setFDate(e.target.value)} /></div>
                <div><Label className="text-xs">Amount</Label><Input type="number" value={fAmount} onChange={e => setFAmount(e.target.value)} placeholder="0" /></div>
                <div><Label className="text-xs">Type</Label>
                  <Select value={fCostType} onValueChange={setFCostType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="toll">Toll</SelectItem>
                      <SelectItem value="parking">Parking</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Notes</Label><Input value={fNotes} onChange={e => setFNotes(e.target.value)} /></div>
              </div>
              <DrawerFooter>
                <Button onClick={addOther} disabled={!fAmount}>Save</Button>
                <DrawerClose asChild><Button variant="outline">Cancel</Button></DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>

          <Drawer open={drawer === "earning"} onOpenChange={(o) => !o && setDrawer(null)}>
            <DrawerContent>
              <DrawerHeader><DrawerTitle>Other Earning</DrawerTitle></DrawerHeader>
              <div className="space-y-3 px-4">
                <div><Label className="text-xs">Date</Label><Input type="date" value={fDate} onChange={e => setFDate(e.target.value)} /></div>
                <div><Label className="text-xs">Amount</Label><Input type="number" value={fAmount} onChange={e => setFAmount(e.target.value)} placeholder="0" /></div>
                <div><Label className="text-xs">Source</Label>
                  <Select value={fEarnSource} onValueChange={setFEarnSource}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tip">Tip</SelectItem>
                      <SelectItem value="incentive">Incentive</SelectItem>
                      <SelectItem value="bonus">Bonus</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Notes</Label><Input value={fNotes} onChange={e => setFNotes(e.target.value)} /></div>
              </div>
              <DrawerFooter>
                <Button onClick={addEarning} disabled={!fAmount}>Save</Button>
                <DrawerClose asChild><Button variant="outline">Cancel</Button></DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        </>
      )}
    </div>
  );
}

function EntryRow({ date, main, sub, onDelete }: { date: string; main: string; sub: string; onDelete: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-card px-3 py-2.5">
      <div>
        <p className="text-[11px] text-muted-foreground">{date}</p>
        <p className="text-xs capitalize font-medium">{sub}</p>
      </div>
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold tabular-nums">{main}</p>
        <button onClick={onDelete} className="rounded-md p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
