import type { ExceptionRecord, Order, Shipment, Sku } from "./types";

const iso = (hoursFromBase: number) =>
  new Date(new Date("2026-08-18T06:00:00Z").getTime() + hoursFromBase * 3_600_000).toISOString();

export const SKUS: Sku[] = [
  { id: "SKU-1001", name: "Thermal Label Roll 4x6", category: "Consumables", zone: "A", bin: "A-01-3", onHand: 1840, reserved: 320, reorderPoint: 600, reorderQty: 1200, leadTimeDays: 4, unitCost: 12.5, damaged: 12, velocity: 145 },
  { id: "SKU-1002", name: 'Corrugated Box 12"', category: "Packaging", zone: "A", bin: "A-04-1", onHand: 420, reserved: 180, reorderPoint: 400, reorderQty: 800, leadTimeDays: 3, unitCost: 1.8, damaged: 30, velocity: 210 },
  { id: "SKU-2001", name: "Wireless Barcode Scanner", category: "Devices", zone: "B", bin: "B-02-2", onHand: 64, reserved: 40, reorderPoint: 35, reorderQty: 60, leadTimeDays: 12, unitCost: 189, damaged: 2, velocity: 6.5 },
  { id: "SKU-2002", name: "Rugged Tablet 8in", category: "Devices", zone: "B", bin: "B-02-5", onHand: 18, reserved: 16, reorderPoint: 20, reorderQty: 40, leadTimeDays: 18, unitCost: 640, damaged: 1, velocity: 2.4 },
  { id: "SKU-2003", name: "Forklift Battery Pack", category: "Equipment", zone: "D", bin: "D-01-1", onHand: 7, reserved: 6, reorderPoint: 6, reorderQty: 8, leadTimeDays: 25, unitCost: 2450, damaged: 0, velocity: 0.4 },
  { id: "SKU-3001", name: "Pallet Wrap 20in", category: "Packaging", zone: "A", bin: "A-06-2", onHand: 960, reserved: 210, reorderPoint: 300, reorderQty: 600, leadTimeDays: 5, unitCost: 22, damaged: 8, velocity: 78 },
  { id: "SKU-3002", name: "Safety Vest Hi-Vis", category: "PPE", zone: "C", bin: "C-03-4", onHand: 140, reserved: 95, reorderPoint: 120, reorderQty: 200, leadTimeDays: 7, unitCost: 14, damaged: 4, velocity: 18 },
  { id: "SKU-3003", name: "Steel Toe Boots 42", category: "PPE", zone: "C", bin: "C-03-7", onHand: 26, reserved: 24, reorderPoint: 30, reorderQty: 60, leadTimeDays: 14, unitCost: 88, damaged: 3, velocity: 5.2 },
  { id: "SKU-4001", name: "Shelf Bracket Kit", category: "Fixtures", zone: "D", bin: "D-05-2", onHand: 310, reserved: 60, reorderPoint: 150, reorderQty: 300, leadTimeDays: 9, unitCost: 34, damaged: 0, velocity: 22 },
  { id: "SKU-4002", name: "Conveyor Roller 600mm", category: "Fixtures", zone: "D", bin: "D-06-1", onHand: 82, reserved: 74, reorderPoint: 60, reorderQty: 120, leadTimeDays: 16, unitCost: 57, domainless: undefined as never, damaged: 6, velocity: 9 } as unknown as Sku,
  { id: "SKU-5001", name: "Cold Chain Gel Pack", category: "Cold Chain", zone: "E", bin: "E-01-2", onHand: 2400, reserved: 900, reorderPoint: 1000, reorderQty: 2000, leadTimeDays: 6, unitCost: 2.4, damaged: 40, velocity: 320 },
  { id: "SKU-5002", name: "Insulated Shipper 30L", category: "Cold Chain", zone: "E", bin: "E-02-1", onHand: 96, reserved: 88, reorderPoint: 90, reorderQty: 150, leadTimeDays: 11, unitCost: 43, damaged: 5, velocity: 14 },
];

export const ORDERS: Order[] = [
  { id: "SO-88412", customer: "Northwind Retail", channel: "b2b-contract", service: "same-day", placedAt: iso(-5), promisedAt: iso(3), value: 12480, vip: true, stage: "received", lines: [{ skuId: "SKU-2002", qty: 8, allocated: 0 }, { skuId: "SKU-2001", qty: 12, allocated: 0 }] },
  { id: "SO-88413", customer: "Acme Logistics", channel: "wholesale", service: "express", placedAt: iso(-8), promisedAt: iso(-1), value: 6420, vip: false, stage: "received", lines: [{ skuId: "SKU-5002", qty: 40, allocated: 0 }, { skuId: "SKU-5001", qty: 600, allocated: 0 }] },
  { id: "SO-88414", customer: "Bluepeak Foods", channel: "retail", service: "standard", placedAt: iso(-22), promisedAt: iso(26), value: 890, vip: false, stage: "received", lines: [{ skuId: "SKU-1002", qty: 120, allocated: 0 }] },
  { id: "SO-88415", customer: "Vertex Industrial", channel: "b2b-contract", service: "express", placedAt: iso(-11), promisedAt: iso(6), value: 9800, vip: true, stage: "received", lines: [{ skuId: "SKU-2003", qty: 3, allocated: 0 }, { skuId: "SKU-4002", qty: 20, allocated: 0 }] },
  { id: "SO-88416", customer: "Marketplace Bulk #4471", channel: "marketplace", service: "economy", placedAt: iso(-40), promisedAt: iso(52), value: 310, vip: false, stage: "received", lines: [{ skuId: "SKU-1001", qty: 60, allocated: 0 }] },
  { id: "SO-88417", customer: "Harborline Ports", channel: "wholesale", service: "same-day", placedAt: iso(-3), promisedAt: iso(2), value: 3150, vip: false, stage: "received", lines: [{ skuId: "SKU-3002", qty: 60, allocated: 0 }, { skuId: "SKU-3003", qty: 14, allocated: 0 }] },
  { id: "SO-88418", customer: "Corewell Clinics", channel: "b2b-contract", service: "express", placedAt: iso(-6), promisedAt: iso(9), value: 5240, vip: false, stage: "received", lines: [{ skuId: "SKU-5001", qty: 900, allocated: 0 }, { skuId: "SKU-5002", qty: 24, allocated: 0 }] },
  { id: "SO-88419", customer: "Rally Sports Co", channel: "retail", service: "standard", placedAt: iso(-30), promisedAt: iso(18), value: 1420, vip: false, stage: "received", lines: [{ skuId: "SKU-3001", qty: 40, allocated: 0 }, { skuId: "SKU-1002", qty: 80, allocated: 0 }] },
  { id: "SO-88420", customer: "Tessellate Design", channel: "marketplace", service: "express", placedAt: iso(-9), promisedAt: iso(5), value: 2260, vip: false, stage: "received", lines: [{ skuId: "SKU-4001", qty: 30, allocated: 0 }, { skuId: "SKU-4002", qty: 18, allocated: 0 }] },
  { id: "SO-88405", customer: "Northwind Retail", channel: "b2b-contract", service: "express", placedAt: iso(-28), promisedAt: iso(4), value: 7300, vip: true, stage: "picking", decision: "full", lines: [{ skuId: "SKU-1001", qty: 200, allocated: 200 }, { skuId: "SKU-3001", qty: 45, allocated: 45 }] },
  { id: "SO-88406", customer: "Grid & Co", channel: "wholesale", service: "standard", placedAt: iso(-34), promisedAt: iso(14), value: 2980, vip: false, stage: "packing", decision: "full", lines: [{ skuId: "SKU-1002", qty: 150, allocated: 150 }] },
  { id: "SO-88407", customer: "Lumen Health", channel: "b2b-contract", service: "same-day", placedAt: iso(-12), promisedAt: iso(1), value: 4610, vip: true, stage: "quality-check", decision: "partial", lines: [{ skuId: "SKU-5001", qty: 400, allocated: 400 }, { skuId: "SKU-5002", qty: 20, allocated: 12 }] },
  { id: "SO-88401", customer: "Acme Logistics", channel: "wholesale", service: "express", placedAt: iso(-52), promisedAt: iso(-6), value: 5120, vip: false, stage: "dispatched", decision: "full", lines: [{ skuId: "SKU-3001", qty: 90, allocated: 90 }] },
  { id: "SO-88402", customer: "Bluepeak Foods", channel: "retail", service: "standard", placedAt: iso(-60), promisedAt: iso(-10), value: 1180, vip: false, stage: "dispatched", decision: "full", lines: [{ skuId: "SKU-1001", qty: 300, allocated: 300 }] },
  { id: "SO-88408", customer: "Ironvale Mining", channel: "wholesale", service: "express", placedAt: iso(-20), promisedAt: iso(-2), value: 3390, vip: false, stage: "exception", decision: "partial", note: "QC found 6 damaged safety vests in tote T-2291.", lines: [{ skuId: "SKU-3002", qty: 50, allocated: 44 }] },
];

export const EXCEPTIONS: ExceptionRecord[] = [
  { id: "EX-3301", orderId: "SO-88408", skuId: "SKU-3002", type: "damaged", qty: 6, reportedAt: iso(-2), reportedBy: "M. Okafor", status: "open" },
  { id: "EX-3302", skuId: "SKU-5001", type: "damaged", qty: 40, reportedAt: iso(-9), reportedBy: "Cycle count", status: "open" },
  { id: "EX-3303", orderId: "SO-88407", skuId: "SKU-5002", type: "missing", qty: 8, reportedAt: iso(-4), reportedBy: "J. Alvarez", status: "open" },
  { id: "EX-3304", skuId: "SKU-1002", type: "mismatch", qty: 30, reportedAt: iso(-16), reportedBy: "Cycle count", status: "open" },
  { id: "EX-3305", orderId: "SO-88401", skuId: "SKU-3001", type: "qc-fail", qty: 3, reportedAt: iso(-30), reportedBy: "QC Station 2", status: "resolved", resolution: "Repacked from bin A-06-3; order shipped complete." },
];

export const SHIPMENTS: Shipment[] = [
  { id: "SHP-7701", orderId: "SO-88401", carrier: "Meridian Freight", tracking: "MF884213771", dispatchedAt: iso(-6), eta: iso(18), status: "in-transit" },
  { id: "SHP-7702", orderId: "SO-88402", carrier: "Cityline Courier", tracking: "CL55120934", dispatchedAt: iso(-10), eta: iso(2), status: "out-for-delivery" },
  { id: "SHP-7699", orderId: "SO-88399", carrier: "Meridian Freight", tracking: "MF884210042", dispatchedAt: iso(-34), eta: iso(-8), status: "delivered" },
];

export const THROUGHPUT = [
  { day: "Mon", received: 148, dispatched: 132, sla: 96 },
  { day: "Tue", received: 162, dispatched: 155, sla: 94 },
  { day: "Wed", received: 139, dispatched: 141, sla: 97 },
  { day: "Thu", received: 187, dispatched: 160, sla: 89 },
  { day: "Fri", received: 205, dispatched: 191, sla: 91 },
  { day: "Sat", received: 121, dispatched: 128, sla: 98 },
  { day: "Sun", received: 96, dispatched: 102, sla: 99 },
];

export const STAGE_CYCLE = [
  { stage: "Pick", minutes: 22 },
  { stage: "Pack", minutes: 11 },
  { stage: "QC", minutes: 7 },
  { stage: "Stage", minutes: 9 },
  { stage: "Dispatch", minutes: 5 },
];
