import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, PlayCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DecisionBadge,
  KpiCard,
  Pill,
  PriorityMeter,
  SectionHead,
  SlaBadge,
  StageBadge,
  money,
  relTime,
} from "@/components/warehouse/atoms";
import { useWarehouse } from "@/lib/warehouse/store";
import { priorityOf } from "@/lib/warehouse/engine";
import { cn } from "@/lib/utils";
import type { OrderStage } from "@/lib/warehouse/types";

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: "Order Management & Priority Scoring — Palletworks" },
      {
        name: "description",
        content:
          "Every order scored on urgency, service level, channel and value, with an explainable allocation decision.",
      },
      { property: "og:title", content: "Order Management & Priority Scoring — Palletworks" },
      {
        property: "og:description",
        content: "Explainable priority scoring and allocation decisions for every order.",
      },
    ],
  }),
  component: OrdersPage,
});

const FILTERS: Array<{ key: "all" | OrderStage; label: string }> = [
  { key: "all", label: "All" },
  { key: "received", label: "Received" },
  { key: "allocated", label: "Allocated" },
  { key: "picking", label: "Picking" },
  { key: "packing", label: "Packing" },
  { key: "quality-check", label: "QC" },
  { key: "exception", label: "Exception" },
  { key: "dispatched", label: "Dispatched" },
];

function OrdersPage() {
  const { orders, skus, allocation, applyAllocation, applyDecision, advance } = useWarehouse();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | OrderStage>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      orders
        .filter((o) => (filter === "all" ? true : o.stage === filter))
        .filter((o) => `${o.id} ${o.customer} ${o.channel}`.toLowerCase().includes(q.toLowerCase()))
        .sort((a, b) => priorityOf(b).score - priorityOf(a).score),
    [orders, filter, q],
  );

  const unallocated = orders.filter((o) => o.stage === "received").length;
  const avgScore =
    orders.length === 0
      ? 0
      : Math.round(orders.reduce((s, o) => s + priorityOf(o).score, 0) / orders.length);

  return (
    <div className="space-y-6">
      <SectionHead
        title="Order management"
        desc="Score = urgency (40) + service level (40) + channel (16) + value (20) + VIP (10)."
        right={
          <Button onClick={applyAllocation} disabled={allocation.results.length === 0}>
            <PlayCircle className="size-4" /> Run allocation on {allocation.results.length} orders
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total orders" value={orders.length} sub="Today's book" />
        <KpiCard label="Awaiting allocation" value={unallocated} tone={unallocated ? "warn" : "ok"} />
        <KpiCard label="Avg priority score" value={avgScore} tone="info" sub="Across the book" />
        <KpiCard
          label="Order value open"
          value={money(
            orders.filter((o) => o.stage !== "dispatched").reduce((s, o) => s + o.value, 0),
          )}
          tone="primary"
        />
      </div>

      <div className="panel overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <div className="relative min-w-56 flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search order, customer, channel…"
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-1 rounded-md border border-border p-1">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "rounded px-2.5 py-1 text-xs transition-colors",
                  filter === f.key
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">No orders in this view.</p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((o) => {
              const p = priorityOf(o);
              const res = allocation.results.find((r) => r.orderId === o.id);
              const isOpen = openId === o.id;
              return (
                <li key={o.id}>
                  <button
                    onClick={() => setOpenId(isOpen ? null : o.id)}
                    className="flex w-full flex-wrap items-center gap-3 p-4 text-left transition-colors hover:bg-secondary/40"
                  >
                    <PriorityMeter order={o} />
                    <div className="min-w-44 flex-1">
                      <p className="text-sm font-medium">
                        <span className="num">{o.id}</span> · {o.customer}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {o.lines.length} line{o.lines.length > 1 ? "s" : ""} ·{" "}
                        {o.lines.reduce((s, l) => s + l.qty, 0)} units · {money(o.value)} ·
                        promised {relTime(o.promisedAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {o.vip && <Pill tone="primary">VIP</Pill>}
                      <Pill>{o.service}</Pill>
                      <SlaBadge risk={p.slaRisk} />
                      <StageBadge stage={o.stage} />
                      {res && <DecisionBadge decision={res.decision} />}
                    </div>
                    <ChevronDown
                      className={cn(
                        "size-4 text-muted-foreground transition-transform",
                        isOpen && "rotate-180",
                      )}
                    />
                  </button>

                  {isOpen && (
                    <div className="grid gap-4 border-t border-border bg-background/40 p-4 lg:grid-cols-3">
                      <div className="panel-raised p-3">
                        <p className="text-[11px] tracking-wider text-muted-foreground uppercase">
                          Score breakdown
                        </p>
                        <ul className="mt-2 space-y-1.5 text-sm">
                          {[
                            ["Urgency to promise", p.urgency, 40],
                            ["Service level", p.service, 40],
                            ["Channel", p.channel, 16],
                            ["Order value", p.value, 20],
                            ["VIP account", p.vip, 10],
                          ].map(([label, val, max]) => (
                            <li key={label as string} className="flex items-center gap-2">
                              <span className="flex-1 text-muted-foreground">{label}</span>
                              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                                <div
                                  className="h-full bg-primary"
                                  style={{ width: `${((val as number) / (max as number)) * 100}%` }}
                                />
                              </div>
                              <span className="num w-10 text-right">{val as number}</span>
                            </li>
                          ))}
                        </ul>
                        <p className="num mt-3 border-t border-border pt-2 text-right text-sm font-semibold">
                          Total {p.score}
                        </p>
                      </div>

                      <div className="panel-raised p-3">
                        <p className="text-[11px] tracking-wider text-muted-foreground uppercase">
                          Lines & coverage
                        </p>
                        <ul className="mt-2 space-y-2 text-sm">
                          {o.lines.map((l) => {
                            const sku = skus.find((s) => s.id === l.skuId);
                            const grant =
                              res?.lines.find((x) => x.skuId === l.skuId)?.granted ?? l.allocated;
                            const short = l.qty - grant;
                            return (
                              <li key={l.skuId} className="flex items-center gap-2">
                                <div className="min-w-0 flex-1">
                                  <p className="truncate">{sku?.name ?? l.skuId}</p>
                                  <p className="num text-xs text-muted-foreground">
                                    {l.skuId} · {sku?.zone ? `Zone ${sku.zone} ${sku.bin}` : "—"}
                                  </p>
                                </div>
                                <span className="num text-xs">
                                  {grant}/{l.qty}
                                </span>
                                {short > 0 ? (
                                  <Pill tone="crit">{short} short</Pill>
                                ) : (
                                  <Pill tone="ok">covered</Pill>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>

                      <div className="panel-raised flex flex-col p-3">
                        <p className="text-[11px] tracking-wider text-muted-foreground uppercase">
                          Engine decision
                        </p>
                        {res ? (
                          <>
                            <div className="mt-2 flex items-center gap-2">
                              <DecisionBadge decision={res.decision} />
                              <span className="num text-xs text-muted-foreground">
                                fill {Math.round(res.fillRate * 100)}%
                              </span>
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground">{res.rationale}</p>
                            <ul className="mt-2 space-y-1 text-sm">
                              {res.suggestedActions.map((a) => (
                                <li key={a} className="flex gap-2">
                                  <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-primary" />
                                  {a}
                                </li>
                              ))}
                            </ul>
                            <div className="mt-auto flex gap-2 pt-3">
                              <Button size="sm" onClick={() => applyDecision(o.id)}>
                                Apply decision
                              </Button>
                              {o.stage !== "dispatched" && (
                                <Button size="sm" variant="secondary" onClick={() => advance(o.id)}>
                                  Advance stage
                                </Button>
                              )}
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="mt-2 text-sm text-muted-foreground">
                              {o.note ?? "Order already committed and moving through the floor."}
                            </p>
                            {o.stage !== "dispatched" && (
                              <Button
                                size="sm"
                                variant="secondary"
                                className="mt-auto"
                                onClick={() => advance(o.id)}
                              >
                                Advance stage
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
