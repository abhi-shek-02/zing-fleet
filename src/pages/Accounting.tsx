import { useState, useEffect } from "react";
import { format } from "date-fns";
import { getDrivers, getCars, getCashEntries, saveCashEntries, getVendorEntries, saveVendorEntries, getFuelEntries, saveFuelEntries, getOtherCostEntries, saveOtherCostEntries } from "@/lib/store";
import { getWeekStart, formatCurrency, generateId } from "@/lib/utils-date";
import WeekPicker from "@/components/WeekPicker";
import StatCard from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { Plus, Trash2 } from "lucide-react";
import type { CashEntry, VendorEntry, FuelEntry, OtherCostEntry } from "@/types";

export default function AccountingPage() {
  const [week, setWeek] = useState(getWeekStart());
  const [driverId, setDriverId] = useState("");
  const drivers = getDrivers().filter(d => d.status === "active");
  const cars = getCars();
  const driver = drivers.find(d => d.id === driverId);
  const car = cars.find(c => c.id === driver?.carId);

  // Entries state
  const [cashEntries, setCashEntries] = useState<CashEntry[]>([]);
  const [vendorEntries, setVendorEntries] = useState<VendorEntry[]>([]);
  const [fuelEntries, setFuelEntries] = useState<FuelEntry[]>([]);
  const [otherEntries, setOtherEntries] = useState<OtherCostEntry[]>([]);

  // Drawer state
  const [drawer, setDrawer] = useState<"cash" | "vendor" | "fuel" | "other" | null>(null);

  useEffect(() => {
    if (!driverId) return;
    setCashEntries(getCashEntries().filter(e => e.driverId === driverId && e.weekStart === week));
    setVendorEntries(getVendorEntries().filter(e => e.driverId === driverId && e.weekStart === week));
    setFuelEntries(getFuelEntries().filter(e => e.driverId === driverId && e.weekStart === week));
    setOtherEntries(getOtherCostEntries().filter(e => e.driverId === driverId && e.weekStart === week));
  }, [driverId, week]);

  // Form state
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

  const resetForm = () => {
    setFDate(today); setFAmount(""); setFSource("savari"); setFNotes("");
    setFBookingId(""); setFLiters(""); setFOdometer(""); setFStation(""); setFCostType("toll");
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

  const deleteCash = (id: string) => {
    const all = getCashEntries().filter(e => e.id !== id);
    saveCashEntries(all);
    setCashEntries(all.filter(e => e.driverId === driverId && e.weekStart === week));
  };
  const deleteVendor = (id: string) => {
    const all = getVendorEntries().filter(e => e.id !== id);
    saveVendorEntries(all);
    setVendorEntries(all.filter(e => e.driverId === driverId && e.weekStart === week));
  };
  const deleteFuel = (id: string) => {
    const all = getFuelEntries().filter(e => e.id !== id);
    saveFuelEntries(all);
    setFuelEntries(all.filter(e => e.driverId === driverId && e.weekStart === week));
  };
  const deleteOther = (id: string) => {
    const all = getOtherCostEntries().filter(e => e.id !== id);
    saveOtherCostEntries(all);
    setOtherEntries(all.filter(e => e.driverId === driverId && e.weekStart === week));
  };

  const totalCash = cashEntries.reduce((s, e) => s + e.amount, 0);
  const totalVendor = vendorEntries.reduce((s, e) => s + e.amount, 0);
  const totalFuel = fuelEntries.reduce((s, e) => s + e.cost, 0);
  const totalOther = otherEntries.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-40 bg-background pb-2 pt-1">
        <h1 className="text-lg font-semibold">Accounting</h1>
        <div className="mt-2 space-y-2">
          <Select value={driverId} onValueChange={setDriverId}>
            <SelectTrigger><SelectValue placeholder="Select driver" /></SelectTrigger>
            <SelectContent>
              {drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <WeekPicker value={week} onChange={setWeek} />
          {car && <p className="text-xs text-muted-foreground">Car: {car.number} · {car.model}</p>}
        </div>
      </div>

      {!driverId ? (
        <p className="rounded-md border p-8 text-center text-sm text-muted-foreground">Select a driver to start</p>
      ) : (
        <>
          {/* Live Totals */}
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="Cash" value={formatCurrency(totalCash)} />
            <StatCard label="Vendor" value={formatCurrency(totalVendor)} />
            <StatCard label="Fuel" value={formatCurrency(totalFuel)} variant="danger" />
            <StatCard label="Other" value={formatCurrency(totalOther)} />
          </div>

          {/* Tabs */}
          <Tabs defaultValue="cash" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="cash" className="text-xs">Cash</TabsTrigger>
              <TabsTrigger value="vendor" className="text-xs">Vendor</TabsTrigger>
              <TabsTrigger value="fuel" className="text-xs">Fuel</TabsTrigger>
              <TabsTrigger value="other" className="text-xs">Other</TabsTrigger>
            </TabsList>

            <TabsContent value="cash" className="mt-2 space-y-2">
              <Button size="sm" className="w-full" onClick={() => { resetForm(); setDrawer("cash"); }}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Add Cash Entry
              </Button>
              {cashEntries.map(e => (
                <EntryRow key={e.id} date={e.date} main={formatCurrency(e.amount)} sub={e.source} onDelete={() => deleteCash(e.id)} />
              ))}
            </TabsContent>

            <TabsContent value="vendor" className="mt-2 space-y-2">
              <Button size="sm" className="w-full" onClick={() => { resetForm(); setDrawer("vendor"); }}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Add Vendor Entry
              </Button>
              {vendorEntries.map(e => (
                <EntryRow key={e.id} date={e.date} main={formatCurrency(e.amount)} sub={e.bookingId || "—"} onDelete={() => deleteVendor(e.id)} />
              ))}
            </TabsContent>

            <TabsContent value="fuel" className="mt-2 space-y-2">
              <Button size="sm" className="w-full" onClick={() => { resetForm(); setDrawer("fuel"); }}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Add Fuel Entry
              </Button>
              {fuelEntries.map(e => (
                <EntryRow key={e.id} date={e.date} main={formatCurrency(e.cost)} sub={`${e.liters}L · ${e.odometer}km`} onDelete={() => deleteFuel(e.id)} />
              ))}
            </TabsContent>

            <TabsContent value="other" className="mt-2 space-y-2">
              <Button size="sm" className="w-full" onClick={() => { resetForm(); setDrawer("other"); }}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Add Other Cost
              </Button>
              {otherEntries.map(e => (
                <EntryRow key={e.id} date={e.date} main={formatCurrency(e.amount)} sub={e.costType} onDelete={() => deleteOther(e.id)} />
              ))}
            </TabsContent>
          </Tabs>

          {/* Drawers */}
          <Drawer open={drawer === "cash"} onOpenChange={(o) => !o && setDrawer(null)}>
            <DrawerContent>
              <DrawerHeader><DrawerTitle>Cash Entry</DrawerTitle></DrawerHeader>
              <div className="space-y-3 px-4">
                <div><Label className="text-xs">Date</Label><Input type="date" value={fDate} onChange={e => setFDate(e.target.value)} /></div>
                <div><Label className="text-xs">Amount (₹)</Label><Input type="number" value={fAmount} onChange={e => setFAmount(e.target.value)} placeholder="0" /></div>
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
              <DrawerHeader><DrawerTitle>Vendor Entry</DrawerTitle></DrawerHeader>
              <div className="space-y-3 px-4">
                <div><Label className="text-xs">Date</Label><Input type="date" value={fDate} onChange={e => setFDate(e.target.value)} /></div>
                <div><Label className="text-xs">Amount (₹)</Label><Input type="number" value={fAmount} onChange={e => setFAmount(e.target.value)} placeholder="0" /></div>
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
                <div><Label className="text-xs">Fuel Cost (₹)</Label><Input type="number" value={fAmount} onChange={e => setFAmount(e.target.value)} placeholder="0" /></div>
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
                <div><Label className="text-xs">Amount (₹)</Label><Input type="number" value={fAmount} onChange={e => setFAmount(e.target.value)} placeholder="0" /></div>
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
        </>
      )}
    </div>
  );
}

function EntryRow({ date, main, sub, onDelete }: { date: string; main: string; sub: string; onDelete: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-md border px-3 py-2">
      <div>
        <p className="text-xs text-muted-foreground">{date}</p>
        <p className="text-xs capitalize">{sub}</p>
      </div>
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium tabular-nums">{main}</p>
        <button onClick={onDelete} className="text-muted-foreground hover:text-destructive transition-colors">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
