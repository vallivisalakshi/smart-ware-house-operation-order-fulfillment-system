import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { EXCEPTIONS, ORDERS, SHIPMENTS, SKUS } from "./data";
import { runAllocation } from "./engine";
import type { ExceptionRecord, Order, OrderStage, Shipment, Sku } from "./types";

const CARRIERS = ["Meridian Freight", "Cityline Courier", "Northgate Express"];

interface WarehouseState {
  skus: Sku[];
  orders: Order[];
  exceptions: ExceptionRecord[];
  shipments: Shipment[];
  allocation: ReturnType<typeof runAllocation>;
  applyAllocation: () => void;
  applyDecision: (orderId: string) => void;
  advance: (orderId: string) => void;
  reportException: (input: {
    orderId?: string;
    skuId: string;
    type: ExceptionRecord["type"];
    qty: number;
  }) => void;
  resolveException: (id: string, resolution: string) => void;
  reorder: (skuId: string, qty: number) => void;
  resetDay: () => void;
}

const Ctx = createContext<WarehouseState | null>(null);

const NEXT: Record<OrderStage, OrderStage | null> = {
  received: "allocated",
  allocated: "picking",
  picking: "packing",
  packing: "quality-check",
  "quality-check": "dispatched",
  dispatched: null,
  exception: "packing",
};

export const STAGE_LABEL: Record<OrderStage, string> = {
  received: "Received",
  allocated: "Allocated",
  picking: "Picking",
  packing: "Packing",
  "quality-check": "Quality check",
  dispatched: "Dispatched",
  exception: "Exception",
};

export function WarehouseProvider({ children }: { children: ReactNode }) {
  const [skus, setSkus] = useState<Sku[]>(SKUS);
  const [orders, setOrders] = useState<Order[]>(ORDERS);
  const [exceptions, setExceptions] = useState<ExceptionRecord[]>(EXCEPTIONS);
  const [shipments, setShipments] = useState<Shipment[]>(SHIPMENTS);

  const allocation = useMemo(() => runAllocation(orders, skus), [orders, skus]);

  const commit = useCallback(
    (orderIds?: string[]) => {
      const results = allocation.results.filter(
        (r) => !orderIds || orderIds.includes(r.orderId),
      );
      if (results.length === 0) return 0;
      const byId = new Map(results.map((r) => [r.orderId, r]));

      setSkus((prev) =>
        prev.map((s) => {
          const add = results.reduce(
            (sum, r) => sum + (r.lines.find((l) => l.skuId === s.id)?.granted ?? 0),
            0,
          );
          return add ? { ...s, reserved: s.reserved + add } : s;
        }),
      );

      setOrders((prev) =>
        prev.map((o) => {
          const r = byId.get(o.id);
          if (!r) return o;
          const lines = o.lines.map((l) => ({
            ...l,
            allocated: r.lines.find((x) => x.skuId === l.skuId)?.granted ?? 0,
          }));
          const stage: OrderStage =
            r.decision === "full" || r.decision === "partial" ? "allocated" : "exception";
          return { ...o, lines, stage, decision: r.decision, note: r.rationale };
        }),
      );
      return results.length;
    },
    [allocation],
  );

  const applyAllocation = useCallback(() => {
    const n = commit();
    toast.success(`Allocation engine ran on ${n} open orders`, {
      description: "Stock reserved by priority rank; shortages routed to exceptions.",
    });
  }, [commit]);

  const applyDecision = useCallback(
    (orderId: string) => {
      commit([orderId]);
      toast.success(`${orderId} allocated`);
    },
    [commit],
  );

  const advance = useCallback((orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        const next = NEXT[o.stage];
        if (!next) return o;
        if (next === "dispatched") {
          const carrier = CARRIERS[Math.floor(Math.random() * CARRIERS.length)];
          const shp: Shipment = {
            id: `SHP-${7700 + Math.floor(Math.random() * 900)}`,
            orderId: o.id,
            carrier,
            tracking: `${carrier.slice(0, 2).toUpperCase()}${Math.floor(Math.random() * 9e8) + 1e8}`,
            dispatchedAt: new Date().toISOString(),
            eta: new Date(Date.now() + 26 * 3.6e6).toISOString(),
            status: "in-transit",
          };
          setShipments((s) => [shp, ...s]);
          // consume reserved stock from on-hand
          setSkus((prev2) =>
            prev2.map((s) => {
              const line = o.lines.find((l) => l.skuId === s.id);
              if (!line) return s;
              return {
                ...s,
                onHand: Math.max(0, s.onHand - line.allocated),
                reserved: Math.max(0, s.reserved - line.allocated),
              };
            }),
          );
          toast.success(`${o.id} dispatched via ${carrier}`, {
            description: `Tracking ${shp.tracking} · inventory decremented`,
          });
        } else {
          toast(`${o.id} → ${STAGE_LABEL[next]}`);
        }
        return { ...o, stage: next };
      }),
    );
  }, []);

  const reportException = useCallback<WarehouseState["reportException"]>((input) => {
    const rec: ExceptionRecord = {
      id: `EX-${3300 + Math.floor(Math.random() * 700)}`,
      orderId: input.orderId,
      skuId: input.skuId,
      type: input.type,
      qty: input.qty,
      reportedAt: new Date().toISOString(),
      reportedBy: "You",
      status: "open",
    };
    setExceptions((p) => [rec, ...p]);
    if (input.type === "damaged" || input.type === "missing") {
      setSkus((p) =>
        p.map((s) => (s.id === input.skuId ? { ...s, damaged: s.damaged + input.qty } : s)),
      );
    }
    if (input.orderId) {
      setOrders((p) =>
        p.map((o) =>
          o.id === input.orderId
            ? { ...o, stage: "exception", note: `${input.qty} × ${input.type} reported on ${input.skuId}` }
            : o,
        ),
      );
    }
    toast.warning(`Exception ${rec.id} logged`, {
      description: `${input.qty} × ${input.type} on ${input.skuId}. Available stock adjusted.`,
    });
  }, []);

  const resolveException = useCallback((id: string, resolution: string) => {
    setExceptions((p) =>
      p.map((e) => (e.id === id ? { ...e, status: "resolved", resolution } : e)),
    );
    toast.success(`Exception ${id} resolved`, { description: resolution });
  }, []);

  const reorder = useCallback((skuId: string, qty: number) => {
    setSkus((p) => p.map((s) => (s.id === skuId ? { ...s, onHand: s.onHand + qty } : s)));
    toast.success(`Purchase order raised for ${skuId}`, {
      description: `${qty} units inbound — receipt simulated into on-hand.`,
    });
  }, []);

  const resetDay = useCallback(() => {
    setSkus(SKUS);
    setOrders(ORDERS);
    setExceptions(EXCEPTIONS);
    setShipments(SHIPMENTS);
    toast("Shift reset to opening state");
  }, []);

  const value: WarehouseState = {
    skus,
    orders,
    exceptions,
    shipments,
    allocation,
    applyAllocation,
    applyDecision,
    advance,
    reportException,
    resolveException,
    reorder,
    resetDay,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWarehouse() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useWarehouse must be used inside WarehouseProvider");
  return c;
}
