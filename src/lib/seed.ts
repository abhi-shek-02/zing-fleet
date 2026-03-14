import { format, subWeeks, startOfWeek, addDays } from "date-fns";
import type { Car, Driver, CashEntry, VendorEntry, FuelEntry, OtherCostEntry, Settlement, CarCost, CarDocument } from "@/types";
import { saveCars, saveDrivers, saveCashEntries, saveVendorEntries, saveFuelEntries, saveOtherCostEntries, saveSettlements, saveCarCosts, saveCarDocs, isSeeded, markSeeded } from "./store";

function id() { return crypto.randomUUID(); }
function fmt(d: Date) { return format(d, "yyyy-MM-dd"); }

export function seedDummyData() {
  if (isSeeded()) return;

  const cars: Car[] = [
    { id: "car1", number: "KA01AB1234", model: "Swift Dzire", fuelType: "petrol", expectedMileage: 14, status: "active" },
    { id: "car2", number: "KA01CD5678", model: "Ertiga", fuelType: "diesel", expectedMileage: 16, status: "active" },
    { id: "car3", number: "KA02EF9012", model: "WagonR", fuelType: "cng", expectedMileage: 22, status: "active" },
    { id: "car4", number: "KA03GH3456", model: "Innova", fuelType: "diesel", expectedMileage: 12, status: "active" },
  ];

  const drivers: Driver[] = [
    { id: "drv1", name: "Raju Kumar", phone: "9876543210", carId: "car1", commissionPercent: 30, status: "active" },
    { id: "drv2", name: "Suresh Patil", phone: "9876543211", carId: "car2", commissionPercent: 25, status: "active" },
    { id: "drv3", name: "Amit Singh", phone: "9876543212", carId: "car3", commissionPercent: 30, status: "active" },
    { id: "drv4", name: "Venkat Rao", phone: "9876543213", carId: "car4", commissionPercent: 35, status: "active" },
  ];

  const cashEntries: CashEntry[] = [];
  const vendorEntries: VendorEntry[] = [];
  const fuelEntries: FuelEntry[] = [];
  const otherEntries: OtherCostEntry[] = [];
  const settlements: Settlement[] = [];

  // Generate 8 weeks of data
  for (let w = 0; w < 8; w++) {
    const monday = startOfWeek(subWeeks(new Date(), w), { weekStartsOn: 1 });
    const weekStart = fmt(monday);

    drivers.forEach((drv, di) => {
      const car = cars[di];
      const baseOdo = 50000 + di * 10000 - w * 700;

      // 5-6 entries per week per driver
      for (let d = 0; d < 6; d++) {
        const date = fmt(addDays(monday, d));
        const cashAmt = 800 + Math.floor(Math.random() * 1200);
        const vendorAmt = 1200 + Math.floor(Math.random() * 1800);

        cashEntries.push({
          id: id(), driverId: drv.id, carId: car.id, weekStart, date,
          amount: cashAmt,
          source: d % 3 === 0 ? "direct" : d % 3 === 1 ? "savari" : "other",
        });

        vendorEntries.push({
          id: id(), driverId: drv.id, carId: car.id, weekStart, date,
          amount: vendorAmt,
          bookingId: `BK${1000 + w * 100 + di * 10 + d}`,
        });
      }

      // 2 fuel entries per week
      for (let f = 0; f < 2; f++) {
        const date = fmt(addDays(monday, f * 3));
        const liters = 20 + Math.floor(Math.random() * 15);
        const odo = baseOdo + f * 350 + Math.floor(Math.random() * 50);
        fuelEntries.push({
          id: id(), driverId: drv.id, carId: car.id, weekStart, date,
          cost: liters * (car.fuelType === "diesel" ? 90 : car.fuelType === "cng" ? 55 : 105),
          liters, odometer: odo,
          station: f === 0 ? "HP Pump" : "Indian Oil",
        });
      }

      // 1-2 other costs per week
      const otherDate = fmt(addDays(monday, 2));
      otherEntries.push({
        id: id(), driverId: drv.id, carId: car.id, weekStart, date: otherDate,
        amount: 50 + Math.floor(Math.random() * 200),
        costType: ["toll", "parking", "maintenance", "other"][di % 4] as any,
        notes: di % 2 === 0 ? "Highway toll" : undefined,
      });

      // Settlements for past weeks
      if (w > 0) {
        settlements.push({
          id: id(), driverId: drv.id, weekStart, date: fmt(addDays(monday, 6)),
          amount: 2000 + Math.floor(Math.random() * 3000),
          type: w % 3 === 0 ? "full" : "partial",
          paymentMode: ["upi", "bank", "cash"][di % 3] as any,
        });
      }
    });
  }

  // Car costs
  const carCosts: CarCost[] = [];
  cars.forEach((car, i) => {
    carCosts.push(
      { id: id(), carId: car.id, date: "2026-01-15", amount: 3500, costType: "maintenance", notes: "Oil change + filter" },
      { id: id(), carId: car.id, date: "2026-02-01", amount: 500, costType: "puc", notes: "PUC renewal" },
      { id: id(), carId: car.id, date: "2025-12-01", amount: 8500 + i * 1000, costType: "insurance", notes: "Annual premium" },
      { id: id(), carId: car.id, date: "2026-01-10", amount: 2800, costType: "tax", notes: "Road tax quarterly" },
      { id: id(), carId: car.id, date: "2025-11-20", amount: 1200, costType: "cf", notes: "Fitness certificate" },
    );
  });

  // Car documents
  const carDocs: CarDocument[] = [];
  cars.forEach(car => {
    carDocs.push(
      { id: id(), carId: car.id, docType: "rc", docName: "Registration Certificate", expiryDate: "2030-06-15" },
      { id: id(), carId: car.id, docType: "insurance", docName: "Comprehensive Insurance", expiryDate: "2026-12-01" },
      { id: id(), carId: car.id, docType: "puc", docName: "PUC Certificate", expiryDate: "2026-08-01" },
      { id: id(), carId: car.id, docType: "permit", docName: "Commercial Permit", expiryDate: "2027-03-15" },
      { id: id(), carId: car.id, docType: "fitness", docName: "Fitness Certificate", expiryDate: "2026-11-20" },
    );
  });

  saveCars(cars);
  saveDrivers(drivers);
  saveCashEntries(cashEntries);
  saveVendorEntries(vendorEntries);
  saveFuelEntries(fuelEntries);
  saveOtherCostEntries(otherEntries);
  saveSettlements(settlements);
  saveCarCosts(carCosts);
  saveCarDocs(carDocs);
  markSeeded();
}
