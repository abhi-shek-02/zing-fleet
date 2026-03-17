import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getDrivers, saveDrivers, getCars, saveCars, getCarCosts, saveCarCosts, getCarDocs, saveCarDocs } from "@/lib/store";
import { generateId, formatCurrency } from "@/lib/utils-date";
import type { Driver, Car, CarCost, CarDocument } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, ChevronRight, Phone, Pencil, FileText, Wrench, AlertTriangle, Download, Eye, Paperclip, Truck, X } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { differenceInDays, parseISO } from "date-fns";
import { format } from "date-fns";

export default function DriversPage() {
  const [drivers, setDrivers] = useState(getDrivers());
  const [cars, setCars] = useState(getCars());
  const [carCosts, setCarCosts] = useState(getCarCosts());
  const [carDocs, setCarDocs] = useState(getCarDocs());
  const [showDriver, setShowDriver] = useState(false);
  const [showCar, setShowCar] = useState(false);
  const [editDriver, setEditDriver] = useState<Driver | null>(null);
  const [editCar, setEditCar] = useState<Car | null>(null);
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null);
  const [showCarCost, setShowCarCost] = useState(false);
  const [showCarDoc, setShowCarDoc] = useState(false);
  const [docFilter, setDocFilter] = useState<string>("all");
  const [viewDoc, setViewDoc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Driver form
  const [dName, setDName] = useState("");
  const [dPhone, setDPhone] = useState("");
  const [dCar, setDCar] = useState("");
  const [dCommission, setDCommission] = useState("30");

  // Car form
  const [cNumber, setCNumber] = useState("");
  const [cModel, setCModel] = useState("");
  const [cFuelType, setCFuelType] = useState("petrol");
  const [cMileage, setCMileage] = useState("12");

  // Car cost form
  const [ccDate, setCcDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [ccAmount, setCcAmount] = useState("");
  const [ccType, setCcType] = useState<CarCost["costType"]>("maintenance");
  const [ccNotes, setCcNotes] = useState("");

  // Car doc form
  const [cdType, setCdType] = useState<CarDocument["docType"]>("rc");
  const [cdName, setCdName] = useState("");
  const [cdExpiry, setCdExpiry] = useState("");
  const [cdNotes, setCdNotes] = useState("");
  const [cdFileData, setCdFileData] = useState<string | undefined>();
  const [cdFileName, setCdFileName] = useState<string | undefined>();

  const resetDriverForm = () => { setDName(""); setDPhone(""); setDCar(""); setDCommission("30"); };
  const resetCarForm = () => { setCNumber(""); setCModel(""); setCFuelType("petrol"); setCMileage("12"); };

  const openEditDriver = (d: Driver) => {
    setEditDriver(d);
    setDName(d.name); setDPhone(d.phone); setDCar(d.carId); setDCommission(String(d.commissionPercent));
    setShowDriver(true);
  };

  const openEditCar = (c: Car) => {
    setEditCar(c);
    setCNumber(c.number); setCModel(c.model); setCFuelType(c.fuelType); setCMileage(String(c.expectedMileage));
    setShowCar(true);
  };

  const saveDriver = () => {
    if (!dName || !dCar) return;
    if (editDriver) {
      const updated = drivers.map(d => d.id === editDriver.id ? { ...d, name: dName, phone: dPhone, carId: dCar, commissionPercent: Number(dCommission) || 30 } : d);
      saveDrivers(updated); setDrivers(updated);
    } else {
      const driver: Driver = { id: generateId(), name: dName, phone: dPhone, carId: dCar, commissionPercent: Number(dCommission) || 30, status: "active" };
      const updated = [...drivers, driver];
      saveDrivers(updated); setDrivers(updated);
    }
    resetDriverForm(); setEditDriver(null); setShowDriver(false);
  };

  const saveCar = () => {
    if (!cNumber) return;
    if (editCar) {
      const updated = cars.map(c => c.id === editCar.id ? { ...c, number: cNumber, model: cModel, fuelType: cFuelType, expectedMileage: Number(cMileage) || 12 } : c);
      saveCars(updated); setCars(updated);
    } else {
      const car: Car = { id: generateId(), number: cNumber, model: cModel, fuelType: cFuelType, expectedMileage: Number(cMileage) || 12, status: "active" };
      const updated = [...cars, car];
      saveCars(updated); setCars(updated);
    }
    resetCarForm(); setEditCar(null); setShowCar(false);
  };

  const addCarCost = () => {
    if (!selectedCarId || !ccAmount) return;
    const cost: CarCost = { id: generateId(), carId: selectedCarId, date: ccDate, amount: Number(ccAmount), costType: ccType, notes: ccNotes || undefined };
    const updated = [...carCosts, cost];
    saveCarCosts(updated); setCarCosts(updated);
    setCcAmount(""); setCcNotes(""); setShowCarCost(false);
  };

  const handleDocFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setCdFileData(reader.result as string); setCdFileName(file.name); };
    reader.readAsDataURL(file);
  };

  const addCarDoc = () => {
    if (!selectedCarId || !cdName) return;
    const doc: CarDocument = {
      id: generateId(), carId: selectedCarId, docType: cdType, docName: cdName,
      expiryDate: cdExpiry || undefined, notes: cdNotes || undefined,
      fileData: cdFileData, fileName: cdFileName,
    };
    const updated = [...carDocs, doc];
    saveCarDocs(updated); setCarDocs(updated);
    setCdName(""); setCdExpiry(""); setCdNotes(""); setCdFileData(undefined); setCdFileName(undefined); setShowCarDoc(false);
  };

  const downloadDoc = (doc: CarDocument) => {
    if (!doc.fileData) return;
    const link = document.createElement("a");
    link.href = doc.fileData;
    link.download = doc.fileName || `${doc.docType}-${doc.id}`;
    link.click();
  };

  const getExpiryStatus = (expiry?: string) => {
    if (!expiry) return null;
    const days = differenceInDays(parseISO(expiry), new Date());
    if (days < 0) return "expired";
    if (days < 30) return "expiring";
    return "valid";
  };

  const selectedCar = cars.find(c => c.id === selectedCarId);
  const filteredDocs = carDocs.filter(d => d.carId === selectedCarId && (docFilter === "all" || d.docType === docFilter));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Fleet</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Manage drivers and vehicles</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { resetCarForm(); setEditCar(null); setShowCar(true); }}>
            <Plus className="mr-1 h-3 w-3" /> Car
          </Button>
          <Button size="sm" className="h-8 text-xs" onClick={() => { resetDriverForm(); setEditDriver(null); setShowDriver(true); }}>
            <Plus className="mr-1 h-3 w-3" /> Driver
          </Button>
        </div>
      </div>

      {/* Cars */}
      <div>
        <h2 className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vehicles ({cars.length})</h2>
        <div className="space-y-1.5">
          {cars.map(car => {
            const costs = carCosts.filter(c => c.carId === car.id);
            const docs = carDocs.filter(d => d.carId === car.id);
            const totalCost = costs.reduce((s, c) => s + c.amount, 0);
            const expiringDocs = docs.filter(d => {
              const st = getExpiryStatus(d.expiryDate);
              return st === "expired" || st === "expiring";
            });

            return (
              <div key={car.id} className="rounded-lg border bg-card p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{car.number}</p>
                      <p className="text-[11px] text-muted-foreground">{car.model} · {car.fuelType} · {car.expectedMileage} KM/L</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditCar(car)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="flex gap-3 text-[11px]">
                  {totalCost > 0 && <span className="text-muted-foreground">Costs: {formatCurrency(totalCost)}</span>}
                  {expiringDocs.length > 0 && (
                    <span className="flex items-center gap-0.5 text-destructive font-medium">
                      <AlertTriangle className="h-3 w-3" /> {expiringDocs.length} doc{expiringDocs.length > 1 ? "s" : ""} expiring
                    </span>
                  )}
                </div>

                <div className="flex gap-1.5">
                  <Button variant="outline" size="sm" className="text-[10px] h-7 flex-1" onClick={() => { setSelectedCarId(car.id); setDocFilter("all"); }}>
                    <FileText className="mr-1 h-3 w-3" /> Details
                  </Button>
                  <Button variant="outline" size="sm" className="text-[10px] h-7" onClick={() => { setSelectedCarId(car.id); setShowCarCost(true); }}>
                    <Wrench className="mr-1 h-3 w-3" /> Cost
                  </Button>
                  <Button variant="outline" size="sm" className="text-[10px] h-7" onClick={() => { setSelectedCarId(car.id); setCdFileData(undefined); setCdFileName(undefined); setShowCarDoc(true); }}>
                    <FileText className="mr-1 h-3 w-3" /> Doc
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Car Detail Panel */}
      {selectedCar && (
        <div className="rounded-lg border bg-card p-3 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">{selectedCar.number}</h2>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedCarId(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <Tabs defaultValue="costs">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="costs" className="text-xs">Costs</TabsTrigger>
              <TabsTrigger value="docs" className="text-xs">Documents</TabsTrigger>
            </TabsList>

            <TabsContent value="costs" className="mt-2 space-y-1">
              {carCosts.filter(c => c.carId === selectedCarId).length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">No costs recorded</p>
              ) : (
                carCosts.filter(c => c.carId === selectedCarId).sort((a, b) => b.date.localeCompare(a.date)).map(c => (
                  <div key={c.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <div>
                      <p className="text-[11px] text-muted-foreground">{c.date}</p>
                      <p className="text-xs capitalize font-medium">{c.costType}{c.notes ? ` · ${c.notes}` : ""}</p>
                    </div>
                    <p className="text-sm font-semibold tabular-nums">{formatCurrency(c.amount)}</p>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="docs" className="mt-2 space-y-2">
              <Select value={docFilter} onValueChange={setDocFilter}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Filter" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Documents</SelectItem>
                  <SelectItem value="rc">RC</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                  <SelectItem value="puc">PUC</SelectItem>
                  <SelectItem value="permit">Permit</SelectItem>
                  <SelectItem value="fitness">Fitness</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>

              {filteredDocs.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">No documents</p>
              ) : (
                filteredDocs.map(d => {
                  const status = getExpiryStatus(d.expiryDate);
                  return (
                    <div key={d.id} className={`rounded-lg border bg-card p-3 space-y-1 ${status === "expired" ? "border-l-[3px] border-l-destructive" : status === "expiring" ? "border-l-[3px] border-l-warning" : ""}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium uppercase">{d.docType}</p>
                          <p className="text-[11px] text-muted-foreground">{d.docName}</p>
                          {d.fileName && <p className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Paperclip className="h-2.5 w-2.5" /> {d.fileName}</p>}
                        </div>
                        <div className="flex items-center gap-1">
                          {d.fileData && (
                            <>
                              <button onClick={() => setViewDoc(d.fileData!)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => downloadDoc(d)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                                <Download className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      {d.expiryDate && (
                        <p className={`text-[11px] tabular-nums ${status === "expired" ? "text-destructive font-medium" : status === "expiring" ? "text-warning font-medium" : "text-muted-foreground"}`}>
                          {status === "expired" ? "Expired" : status === "expiring" ? "Expiring soon" : "Valid"} · {d.expiryDate}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* View Document Modal */}
      {viewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4" onClick={() => setViewDoc(null)}>
          <div className="max-h-[80vh] max-w-[90vw] overflow-auto rounded-lg bg-card p-2">
            {viewDoc.startsWith("data:application/pdf") ? (
              <iframe src={viewDoc} className="h-[70vh] w-[85vw]" />
            ) : (
              <img src={viewDoc} alt="Document" className="max-w-full rounded" />
            )}
          </div>
        </div>
      )}

      {/* Drivers */}
      <div>
        <h2 className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Drivers ({drivers.length})</h2>
        <div className="space-y-1.5">
          {drivers.map(driver => {
            const car = cars.find(c => c.id === driver.carId);
            return (
              <div key={driver.id} className="flex items-center justify-between rounded-lg border bg-card p-3">
                <button onClick={() => navigate(`/drivers/${driver.id}`)} className="flex-1 text-left flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {driver.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{driver.name}</p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {driver.phone} · {car?.number ?? "—"} · {driver.commissionPercent}%
                    </p>
                  </div>
                </button>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDriver(driver)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add/Edit Driver Drawer */}
      <Drawer open={showDriver} onOpenChange={(o) => { if (!o) { setShowDriver(false); setEditDriver(null); resetDriverForm(); } else setShowDriver(true); }}>
        <DrawerContent>
          <DrawerHeader><DrawerTitle>{editDriver ? "Edit Driver" : "Add Driver"}</DrawerTitle></DrawerHeader>
          <div className="space-y-3 px-4">
            <div><Label className="text-xs">Name</Label><Input value={dName} onChange={e => setDName(e.target.value)} placeholder="Driver name" /></div>
            <div><Label className="text-xs">Phone</Label><Input value={dPhone} onChange={e => setDPhone(e.target.value)} placeholder="9876543210" /></div>
            <div><Label className="text-xs">Assign Car</Label>
              <Select value={dCar} onValueChange={setDCar}>
                <SelectTrigger><SelectValue placeholder="Select car" /></SelectTrigger>
                <SelectContent>{cars.map(c => <SelectItem key={c.id} value={c.id}>{c.number} — {c.model}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Commission %</Label><Input type="number" value={dCommission} onChange={e => setDCommission(e.target.value)} /></div>
          </div>
          <DrawerFooter>
            <Button onClick={saveDriver} disabled={!dName || !dCar}>{editDriver ? "Update" : "Add"} Driver</Button>
            <DrawerClose asChild><Button variant="outline">Cancel</Button></DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Add/Edit Car Drawer */}
      <Drawer open={showCar} onOpenChange={(o) => { if (!o) { setShowCar(false); setEditCar(null); resetCarForm(); } else setShowCar(true); }}>
        <DrawerContent>
          <DrawerHeader><DrawerTitle>{editCar ? "Edit Car" : "Add Car"}</DrawerTitle></DrawerHeader>
          <div className="space-y-3 px-4">
            <div><Label className="text-xs">Number</Label><Input value={cNumber} onChange={e => setCNumber(e.target.value)} placeholder="KA01AB1234" /></div>
            <div><Label className="text-xs">Model</Label><Input value={cModel} onChange={e => setCModel(e.target.value)} placeholder="Swift Dzire" /></div>
            <div><Label className="text-xs">Fuel Type</Label>
              <Select value={cFuelType} onValueChange={setCFuelType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="petrol">Petrol</SelectItem>
                  <SelectItem value="diesel">Diesel</SelectItem>
                  <SelectItem value="cng">CNG</SelectItem>
                  <SelectItem value="ev">Electric</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Expected Mileage (KM/L)</Label><Input type="number" value={cMileage} onChange={e => setCMileage(e.target.value)} /></div>
          </div>
          <DrawerFooter>
            <Button onClick={saveCar} disabled={!cNumber}>{editCar ? "Update" : "Add"} Car</Button>
            <DrawerClose asChild><Button variant="outline">Cancel</Button></DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Add Car Cost Drawer */}
      <Drawer open={showCarCost} onOpenChange={(o) => !o && setShowCarCost(false)}>
        <DrawerContent>
          <DrawerHeader><DrawerTitle>Add Car Cost</DrawerTitle></DrawerHeader>
          <div className="space-y-3 px-4">
            <div><Label className="text-xs">Date</Label><Input type="date" value={ccDate} onChange={e => setCcDate(e.target.value)} /></div>
            <div><Label className="text-xs">Amount</Label><Input type="number" value={ccAmount} onChange={e => setCcAmount(e.target.value)} placeholder="0" /></div>
            <div><Label className="text-xs">Type</Label>
              <Select value={ccType} onValueChange={(v) => setCcType(v as CarCost["costType"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="cf">Fitness Certificate</SelectItem>
                  <SelectItem value="puc">PUC</SelectItem>
                  <SelectItem value="tax">Tax</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Notes</Label><Input value={ccNotes} onChange={e => setCcNotes(e.target.value)} /></div>
          </div>
          <DrawerFooter>
            <Button onClick={addCarCost} disabled={!ccAmount}>Save Cost</Button>
            <DrawerClose asChild><Button variant="outline">Cancel</Button></DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Add Car Doc Drawer */}
      <Drawer open={showCarDoc} onOpenChange={(o) => !o && setShowCarDoc(false)}>
        <DrawerContent>
          <DrawerHeader><DrawerTitle>Add Document</DrawerTitle></DrawerHeader>
          <div className="space-y-3 px-4">
            <div><Label className="text-xs">Document Type</Label>
              <Select value={cdType} onValueChange={(v) => setCdType(v as CarDocument["docType"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rc">RC</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                  <SelectItem value="puc">PUC</SelectItem>
                  <SelectItem value="permit">Permit</SelectItem>
                  <SelectItem value="fitness">Fitness</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Name</Label><Input value={cdName} onChange={e => setCdName(e.target.value)} placeholder="Document name" /></div>
            <div><Label className="text-xs">Expiry Date</Label><Input type="date" value={cdExpiry} onChange={e => setCdExpiry(e.target.value)} /></div>
            <div><Label className="text-xs">Notes</Label><Input value={cdNotes} onChange={e => setCdNotes(e.target.value)} /></div>
            <div>
              <Label className="text-xs">Upload File</Label>
              <input type="file" ref={fileInputRef} accept="image/*,.pdf" onChange={handleDocFile} className="hidden" />
              <Button variant="outline" size="sm" className="w-full mt-1" onClick={() => fileInputRef.current?.click()}>
                <Paperclip className="mr-1.5 h-3.5 w-3.5" /> {cdFileName || "Choose file"}
              </Button>
              {cdFileData && !cdFileData.startsWith("data:application/pdf") && (
                <img src={cdFileData} alt="Preview" className="mt-2 h-20 rounded border object-cover" />
              )}
            </div>
          </div>
          <DrawerFooter>
            <Button onClick={addCarDoc} disabled={!cdName}>Save Document</Button>
            <DrawerClose asChild><Button variant="outline">Cancel</Button></DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
