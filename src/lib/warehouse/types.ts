export type Channel = "retail" | "wholesale" | "marketplace" | "b2b-contract";
export type ServiceLevel = "same-day" | "express" | "standard" | "economy";

export type OrderStage =
  | "received"
  | "allocated"
  | "picking"
  | "packing"
  | "quality-check"
  | "dispatched"
  | "exception";

export type AllocationDecision =
  | "full"
  | "partial"
  | "backorder"
  | "hold-reorder";

export interface Sku {
  id: string;
  name: string;
  category: string;
  zone: string;
  bin: string;
  onHand: number;
  reserved: number;
  reorderPoint: number;
  reorderQty: number;
  leadTimeDays: number;
  unitCost: number;
  damaged: number;
  velocity: number; // units/day
}

export interface OrderLine {
  skuId: string;
  qty: number;
  allocated: number;
}

export interface Order {
  id: string;
  customer: string;
  channel: Channel;
  service: ServiceLevel;
  placedAt: string; // ISO
  promisedAt: string; // ISO
  value: number;
  vip: boolean;
  lines: OrderLine[];
  stage: OrderStage;
  decision?: AllocationDecision;
  note?: string;
}

export interface ExceptionRecord {
  id: string;
  orderId?: string;
  skuId?: string;
  type: "damaged" | "missing" | "mismatch" | "qc-fail";
  qty: number;
  reportedAt: string;
  reportedBy: string;
  status: "open" | "resolved";
  resolution?: string;
}

export interface Shipment {
  id: string;
  orderId: string;
  carrier: string;
  tracking: string;
  dispatchedAt: string;
  eta: string;
  status: "in-transit" | "out-for-delivery" | "delivered";
}
