import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { useDrivers, useCars, useCashEntries, useVendorEntries, useFuelEntries, useOtherCosts, useOtherEarnings, useCreateCashEntry, useDeleteCashEntry, useCreateVendorEntry, useDeleteVendorEntry, useCreateFuelEntry, useDeleteFuelEntry, useCreateOtherCost, useDeleteOtherCost, useCreateOtherEarning, useDeleteOtherEarning } from "@/hooks/useApi";
import { getWeekStart, formatCurrency } from "@/lib/utils-date";
import { LoadingSpinner, ErrorState } from "@/components/LoadingState";
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

export default function AccountingPage() {
  const [week, setWeek] = useState(getWeekStart());
  const [driverId, setDriverId] = useState("");

  const driversQ = useDrivers();
  const carsQ = useCars();
  const drivers = (driversQ.data ?? []).filter((d: any) => d.status === "active");
  const cars = carsQ.data ?? [];
  const driver = drivers.find((d: any) => d.id === driverId);
  const car = cars.find((c: any) => c.id === driver?.carId);

  const cashQ = useCashEntries(driverId ? { driver_id: driverId, week_start: week } : undefined);
  const vendorQ = useVendorEntries(driverId ? { driver_id: driverId, week_start: week } : undefined);
  const fuelQ = useFuelEntries(driverId ? { driver_id: driverId, week_start: week } : undefined);
  const otherQ = useOtherCosts(driverId ? { driver_id: driverId, week_start: week } : undefined);
  const earningQ = useOtherEarnings(driverId ? { driver_id: driverId, week_start: week } : undefined);

  const prevWeekRef = useRef(week);
  useEffect(() => {
    if (!driverId) prevWeekRef.current = week;
  }, [week, driverId]);
  useEffect(() => {
    if (!driverId) return;
    if (prevWeekRef.current === week) return;
    prevWeekRef.current = week;
    void Promise.all([
      cashQ.refetch(),
      vendorQ.refetch(),
      fuelQ.refetch(),
      otherQ.refetch(),
      earningQ.refetch(),
    ]);
  }, [week, driverId, cashQ, vendorQ, fuelQ, otherQ, earningQ]);

  const cashEntries = cashQ.data ?? [];
  const vendorEntries = vendorQ.data ?? [];
  const fuelEntries = fuelQ.data ?? [];
  const otherEntries = otherQ.data ?? [];
  const earningEntries = earningQ.data ?? [];

  const createCash = useCreateCashEntry();
  const deleteCash = useDeleteCashEntry();
  const createVendor = useCreateVendorEntry();
  const deleteVendor = useDeleteVendorEntry();
  const createFuel = useCreateFuelEntry();
  const deleteFuel = useDeleteFuelEntry();
  const createOther = useCreateOtherCost();
  const deleteOther = useDeleteOtherCost();
  const createEarning = useCreateOtherEarning();
  const deleteEarning = useDeleteOtherEarning();

  const [drawer, setDrawer] = useState<"cash" | "vendor" | "fuel" | "other" | "earning" | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: string } | null>(null);

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

  const addCash = async () => {
    await createCash.mutateAsync({ driverId, carId: car?.id || "", weekStart: week, date: fDate, amount: Number(fAmount), source: fSource, notes: fNotes || undefined });
    resetForm(); setDrawer(null);
  };

  const addVendor = async () => {
    await createVendor.mutateAsync({ driverId, carId: car?.id || "", weekStart: week, date: fDate, amount: Number(fAmount), bookingId: fBookingId || undefined, notes: fNotes || undefined });
    resetForm(); setDrawer(null);
  };

  const addFuel = async () => {
    await createFuel.mutateAsync({ driverId, carId: car?.id || "", weekStart: week, date: fDate, cost: Number(fAmount), liters: Number(fLiters), odometer: Number(fOdometer), station: fStation || undefined, notes: fNotes || undefined });
    resetForm(); setDrawer(null);
  };

  const addOther = async () => {
    await createOther.mutateAsync({ driverId, carId: car?.id || "", weekStart: week, date: fDate, amount: Number(fAmount), costType: fCostType, notes: fNotes || undefined });
    resetForm(); setDrawer(null);
  };

  const addEarning = async () => {
    await createEarning.mutateAsync({ driverId, carId: car?.id || "", weekStart: week, date: fDate, amount: Number(fAmount), source: fEarnSource, notes: fNotes || undefined });
    resetForm(); setDrawer(null);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    const { type, id } = deleteConfirm;
    if (type === "cash") await deleteCash.mutateAsync(id);
    else if (type === "vendor") await deleteVendor.mutateAsync(id);
    else if (type === "fuel") await deleteFuel.mutateAsync(id);
    else if (type === "other") await deleteOther.mutateAsync(id);
    else if (type === "earning") await deleteEarning.mutateAsync(id);
    setDeleteConfirm(null);
  };

  const totalCash = cashEntries.reduce((s: number, e: any) => s + Number(e.amount), 0);
  const totalVendor = vendorEntries.reduce((s: number, e: any) => s + Number(e.amount), 0);
  const totalFuel = fuelEntries.reduce((s: number, e: any) => s + Number(e.cost), 0);
  const totalEarnings = earningEntries.reduce((s: number, e: any) => s + Number(e.amount), 0);

  if (driversQ.isLoading) return <LoadingSpinner label="Loading..." />;

  return (
    <div className="space-y-5">
      <div className="sticky top-0 z-40 bg-background pb-3 pt-2">
        <h1 className="text-xl font-semibold tracking-tight">Daily Entries</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Log cash, bookings, fuel, and costs</p>
        <div className="mt-3 space-y-2">
          <Select value={driverId} onValueChange={setDriverId}>
            <SelectTrigger><SelectValue placeholder="Select driver" /></SelectTrigger>
            <SelectContent>{drivers.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
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
              <Button size="sm" className="w-full h-9 text-xs" onClick={() => { resetForm(); setDrawer("cash"); }}><Plus className="mr-1 h-3.5 w-3.5" /> Add Cash Collected</Button>
              {cashEntries.map((e: any) => <EntryRow key={e.id} date={e.date} main={formatCurrency(Number(e.amount))} sub={e.source} onDelete={() => setDeleteConfirm({ type: "cash", id: e.id })} />)}
            </TabsContent>

            <TabsContent value="vendor" className="mt-3 space-y-1.5">
              <Button size="sm" className="w-full h-9 text-xs" onClick={() => { resetForm(); setDrawer("vendor"); }}><Plus className="mr-1 h-3.5 w-3.5" /> Add Vendor Amount</Button>
              {vendorEntries.map((e: any) => <EntryRow key={e.id} date={e.date} main={formatCurrency(Number(e.amount))} sub={e.bookingId || "—"} onDelete={() => setDeleteConfirm({ type: "vendor", id: e.id })} />)}
            </TabsContent>

            <TabsContent value="fuel" className="mt-3 space-y-1.5">
              <Button size="sm" className="w-full h-9 text-xs" onClick={() => { resetForm(); setDrawer("fuel"); }}><Plus className="mr-1 h-3.5 w-3.5" /> Add Fuel Entry</Button>
              {fuelEntries.map((e: any) => <EntryRow key={e.id} date={e.date} main={formatCurrency(Number(e.cost))} sub={`${e.liters}L · ${e.odometer}km`} onDelete={() => setDeleteConfirm({ type: "fuel", id: e.id })} />)}
            </TabsContent>

            <TabsContent value="other" className="mt-3 space-y-1.5">
              <Button size="sm" className="w-full h-9 text-xs" onClick={() => { resetForm(); setDrawer("other"); }}><Plus className="mr-1 h-3.5 w-3.5" /> Add Cost</Button>
              {otherEntries.map((e: any) => <EntryRow key={e.id} date={e.date} main={formatCurrency(Number(e.amount))} sub={e.costType} onDelete={() => setDeleteConfirm({ type: "other", id: e.id })} />)}
            </TabsContent>

            <TabsContent value="earning" className="mt-3 space-y-1.5">
              <Button size="sm" className="w-full h-9 text-xs" onClick={() => { resetForm(); setDrawer("earning"); }}><Plus className="mr-1 h-3.5 w-3.5" /> Add Earning</Button>
              {earningEntries.map((e: any) => <EntryRow key={e.id} date={e.date} main={formatCurrency(Number(e.amount))} sub={e.source} onDelete={() => setDeleteConfirm({ type: "earning", id: e.id })} />)}
            </TabsContent>
          </Tabs>

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
                    <SelectContent><SelectItem value="savari">Savari</SelectItem><SelectItem value="direct">Direct</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Notes</Label><Input value={fNotes} onChange={e => setFNotes(e.target.value)} /></div>
              </div>
              <DrawerFooter>
                <Button onClick={addCash} disabled={!fAmount || createCash.isPending}>{createCash.isPending ? "Saving..." : "Save"}</Button>
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
                <Button onClick={addVendor} disabled={!fAmount || createVendor.isPending}>{createVendor.isPending ? "Saving..." : "Save"}</Button>
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
                <Button onClick={addFuel} disabled={!fAmount || !fLiters || createFuel.isPending}>{createFuel.isPending ? "Saving..." : "Save"}</Button>
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
                    <SelectContent><SelectItem value="toll">Toll</SelectItem><SelectItem value="parking">Parking</SelectItem><SelectItem value="maintenance">Maintenance</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Notes</Label><Input value={fNotes} onChange={e => setFNotes(e.target.value)} /></div>
              </div>
              <DrawerFooter>
                <Button onClick={addOther} disabled={!fAmount || createOther.isPending}>{createOther.isPending ? "Saving..." : "Save"}</Button>
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
                    <SelectContent><SelectItem value="tip">Tip</SelectItem><SelectItem value="incentive">Incentive</SelectItem><SelectItem value="bonus">Bonus</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Notes</Label><Input value={fNotes} onChange={e => setFNotes(e.target.value)} /></div>
              </div>
              <DrawerFooter>
                <Button onClick={addEarning} disabled={!fAmount || createEarning.isPending}>{createEarning.isPending ? "Saving..." : "Save"}</Button>
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
