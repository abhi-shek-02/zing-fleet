import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDrivers, saveDrivers, getCars, saveCars } from "@/lib/store";
import { generateId } from "@/lib/utils-date";
import type { Driver, Car } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, ChevronRight, Phone } from "lucide-react";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerFooter, DrawerClose,
} from "@/components/ui/drawer";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export default function DriversPage() {
  const [drivers, setDrivers] = useState(getDrivers());
  const [cars, setCars] = useState(getCars());
  const [showDriver, setShowDriver] = useState(false);
  const [showCar, setShowCar] = useState(false);
  const navigate = useNavigate();

  // New driver form
  const [dName, setDName] = useState("");
  const [dPhone, setDPhone] = useState("");
  const [dCar, setDCar] = useState("");
  const [dCommission, setDCommission] = useState("30");

  // New car form
  const [cNumber, setCNumber] = useState("");
  const [cModel, setCModel] = useState("");
  const [cFuelType, setCFuelType] = useState("petrol");
  const [cMileage, setCMileage] = useState("12");

  const addDriver = () => {
    if (!dName || !dCar) return;
    const driver: Driver = {
      id: generateId(),
      name: dName,
      phone: dPhone,
      carId: dCar,
      commissionPercent: Number(dCommission) || 30,
      status: "active",
    };
    const updated = [...drivers, driver];
    saveDrivers(updated);
    setDrivers(updated);
    setDName(""); setDPhone(""); setDCar(""); setDCommission("30");
    setShowDriver(false);
  };

  const addCar = () => {
    if (!cNumber) return;
    const car: Car = {
      id: generateId(),
      number: cNumber,
      model: cModel,
      fuelType: cFuelType,
      expectedMileage: Number(cMileage) || 12,
      status: "active",
    };
    const updated = [...cars, car];
    saveCars(updated);
    setCars(updated);
    setCNumber(""); setCModel(""); setCFuelType("petrol"); setCMileage("12");
    setShowCar(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Drivers & Cars</h1>
        <div className="flex gap-2">
          <Drawer open={showCar} onOpenChange={setShowCar}>
            <DrawerTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="mr-1 h-3.5 w-3.5" /> Car
              </Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader><DrawerTitle>Add Car</DrawerTitle></DrawerHeader>
              <div className="space-y-3 px-4">
                <div><Label className="text-xs">Car Number</Label><Input value={cNumber} onChange={e => setCNumber(e.target.value)} placeholder="KA01AB1234" /></div>
                <div><Label className="text-xs">Model</Label><Input value={cModel} onChange={e => setCModel(e.target.value)} placeholder="Swift Dzire" /></div>
                <div><Label className="text-xs">Fuel Type</Label>
                  <Select value={cFuelType} onValueChange={setCFuelType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="petrol">Petrol</SelectItem>
                      <SelectItem value="diesel">Diesel</SelectItem>
                      <SelectItem value="cng">CNG</SelectItem>
                      <SelectItem value="ev">EV</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Expected Mileage (KM/L)</Label><Input type="number" value={cMileage} onChange={e => setCMileage(e.target.value)} /></div>
              </div>
              <DrawerFooter>
                <Button onClick={addCar}>Add Car</Button>
                <DrawerClose asChild><Button variant="outline">Cancel</Button></DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>

          <Drawer open={showDriver} onOpenChange={setShowDriver}>
            <DrawerTrigger asChild>
              <Button size="sm"><Plus className="mr-1 h-3.5 w-3.5" /> Driver</Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader><DrawerTitle>Add Driver</DrawerTitle></DrawerHeader>
              <div className="space-y-3 px-4">
                <div><Label className="text-xs">Name</Label><Input value={dName} onChange={e => setDName(e.target.value)} placeholder="Driver name" /></div>
                <div><Label className="text-xs">Phone</Label><Input value={dPhone} onChange={e => setDPhone(e.target.value)} placeholder="9876543210" /></div>
                <div><Label className="text-xs">Assign Car</Label>
                  <Select value={dCar} onValueChange={setDCar}>
                    <SelectTrigger><SelectValue placeholder="Select car" /></SelectTrigger>
                    <SelectContent>
                      {cars.map(c => <SelectItem key={c.id} value={c.id}>{c.number} – {c.model}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Commission %</Label><Input type="number" value={dCommission} onChange={e => setDCommission(e.target.value)} /></div>
              </div>
              <DrawerFooter>
                <Button onClick={addDriver} disabled={!dName || !dCar}>Add Driver</Button>
                <DrawerClose asChild><Button variant="outline">Cancel</Button></DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        </div>
      </div>

      {/* Cars List */}
      <div>
        <h2 className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Cars ({cars.length})</h2>
        <div className="space-y-1">
          {cars.map(car => (
            <div key={car.id} className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">{car.number}</p>
                <p className="text-xs text-muted-foreground">{car.model} · {car.fuelType} · {car.expectedMileage} KM/L</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Drivers List */}
      <div>
        <h2 className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Drivers ({drivers.length})</h2>
        <div className="space-y-1">
          {drivers.map(driver => {
            const car = cars.find(c => c.id === driver.carId);
            return (
              <button
                key={driver.id}
                onClick={() => navigate(`/drivers/${driver.id}`)}
                className="flex w-full items-center justify-between rounded-md border p-3 text-left transition-colors hover:bg-secondary"
              >
                <div>
                  <p className="text-sm font-medium">{driver.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {driver.phone} · {car?.number ?? "—"} · {driver.commissionPercent}%
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
