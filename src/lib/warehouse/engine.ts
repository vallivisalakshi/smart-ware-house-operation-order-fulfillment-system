import type { AllocationDecision, Order, Sku } from "./types";

export const SERVICE_WEIGHT: Record<Order["service"], number> = {
  "same-day": 40,
  express: 28,
  standard: 14,
  economy: 6,
};

export const CHANNEL_WEIGHT: Record<Order["channel"], number> = {
  "b2b-contract": 16,
  wholesale: 12,
  retail: 8,
  marketplace: 6,
};

export const NOW = new Date("2026-08-18T06:00:00Z").getTime();

export function hoursToPromise(order: Order, now = NOW) {
  return (new Date(order.promisedAt).getTime() - now) / 3_600_000;
}

export interface PriorityBreakdown {
  score: number;
  urgency: number;
  service: number;
  channel: number;
  value: number;
  vip: number;
  slaRisk: "breached" | "critical" | "at-risk" | "on-track";
}

export function priorityOf(order: Order, now = NOW): PriorityBreakdown {
  const h = hoursToPromise(order, now);
  // urgency: 0..40, saturating; negative time (late) pins to max
  const urgency = h <= 0 ? 40 : Math.max(0, Math.min(40, 40 - h * 1.1));
  const service = SERVICE_WEIGHT[order.service];
  const channel = CHANNEL_WEIGHT[order.channel];
  const value = Math.min(20, Math.log10(Math.max(order.value, 10)) * 5.2);
  const vip = order.vip ? 10 : 0;
  const slaRisk: PriorityBreakdown["slaRisk"] =
    h <= 0 ? "breached" : h <= 4 ? "critical" : h <= 12 ? "at-risk" : "on-track";
  return {
    score: Math.round(urgency + service + channel + value + vip),
    urgency: Math.round(urgency),
    service,
    channel,
    value: Math.round(value),
    vip,
    slaRisk,
  };
}

export function available(sku: Sku) {
  return Math.max(0, sku.onHand - sku.reserved - sku.damaged);
}

export function daysOfCover(sku: Sku) {
  if (sku.velocity <= 0) return 99;
  return available(sku) / sku.velocity;
}

export type StockHealth = "healthy" | "watch" | "low" | "critical" | "out";

export function stockHealth(sku: Sku): StockHealth {
  const a = available(sku);
  if (a <= 0) return "out";
  if (a <= sku.reorderPoint * 0.5) return "critical";
  if (a <= sku.reorderPoint) return "low";
  if (a <= sku.reorderPoint * 1.5) return "watch";
  return "healthy";
}

export interface LineAllocation {
  skuId: string;
  requested: number;
  granted: number;
  short: number;
}

export interface AllocationResult {
  orderId: string;
  priority: number;
  decision: AllocationDecision;
  fillRate: number;
  lines: LineAllocation[];
  rationale: string;
  suggestedActions: string[];
}

export interface AllocationRun {
  results: AllocationResult[];
  reorders: { skuId: string; qty: number; reason: string }[];
  contested: string[]; // sku ids where demand > supply
}

/**
 * Greedy priority-ranked allocation. Orders are sorted by score; each order
 * consumes from a virtual pool. Shortages produce an explicit decision plus
 * recommended operator actions instead of silently failing.
 */
export function runAllocation(
  orders: Order[],
  skus: Sku[],
  now = NOW,
): AllocationRun {
  const pool = new Map<string, number>();
  const demand = new Map<string, number>();
  skus.forEach((s) => pool.set(s.id, available(s)));

  const queue = orders.filter((o) =>
    ["received", "allocated", "exception"].includes(o.stage),
  );
  queue.forEach((o) =>
    o.lines.forEach((l) =>
      demand.set(l.skuId, (demand.get(l.skuId) ?? 0) + l.qty),
    ),
  );

  const ranked = [...queue].sort(
    (a, b) => priorityOf(b, now).score - priorityOf(a, now).score,
  );

  const results: AllocationResult[] = [];
  const reorderMap = new Map<string, number>();

  for (const order of ranked) {
    const p = priorityOf(order, now);
    const lines: LineAllocation[] = order.lines.map((l) => {
      const have = pool.get(l.skuId) ?? 0;
      const granted = Math.min(have, l.qty);
      pool.set(l.skuId, have - granted);
      return { skuId: l.skuId, requested: l.qty, granted, short: l.qty - granted };
    });

    const req = lines.reduce((s, l) => s + l.requested, 0);
    const got = lines.reduce((s, l) => s + l.granted, 0);
    const fillRate = req === 0 ? 1 : got / req;

    lines
      .filter((l) => l.short > 0)
      .forEach((l) =>
        reorderMap.set(l.skuId, (reorderMap.get(l.skuId) ?? 0) + l.short),
      );

    let decision: AllocationDecision;
    const actions: string[] = [];
    let rationale: string;

    if (fillRate === 1) {
      decision = "full";
      rationale = `Full stock available; priority ${p.score} secured allocation ahead of ${ranked.length - ranked.indexOf(order) - 1} lower-ranked orders.`;
      actions.push("Release to picking");
    } else if (fillRate === 0) {
      const highValue = order.value > 4000 || order.vip;
      decision = highValue ? "hold-reorder" : "backorder";
      rationale = `Zero coverage on all lines. ${highValue ? "High-value/VIP order — hold and expedite replenishment rather than auto-backorder." : "Standard order — backorder is lowest-cost path."}`;
      actions.push(
        highValue ? "Expedite purchase order" : "Convert to backorder",
        "Notify customer with revised ETA",
      );
    } else {
      const canSplit = order.service !== "economy" && lines.length > 1;
      decision = canSplit ? "partial" : "backorder";
      rationale = `Only ${Math.round(fillRate * 100)}% of units coverable. ${canSplit ? "Multi-line order on a paid service level — split shipment protects the SLA." : "Single-line or economy order — splitting costs more than it saves."}`;
      actions.push(
        canSplit ? "Ship partial now, backorder remainder" : "Hold for full kit",
        "Raise replenishment for short SKUs",
      );
    }

    if (p.slaRisk === "breached") actions.unshift("SLA already breached — escalate");
    else if (p.slaRisk === "critical") actions.unshift("Expedite: <4h to promise");

    results.push({
      orderId: order.id,
      priority: p.score,
      decision,
      fillRate,
      lines,
      rationale,
      suggestedActions: actions,
    });
  }

  const reorders = [...reorderMap.entries()].map(([skuId, short]) => {
    const sku = skus.find((s) => s.id === skuId)!;
    return {
      skuId,
      qty: Math.max(sku.reorderQty, Math.ceil((short + sku.velocity * sku.leadTimeDays) / 10) * 10),
      reason: `${short} units short across open demand; ${sku.leadTimeDays}d lead time at ${sku.velocity}/day.`,
    };
  });

  const contested = [...demand.entries()]
    .filter(([id, d]) => d > (skus.find((s) => s.id === id)?.onHand ?? 0))
    .map(([id]) => id);

  return { results, reorders, contested };
}
