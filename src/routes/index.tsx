import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Boxes,
  Clock,
  Gauge,
  PlayCircle,
  RotateCcw,
  Timer,
  TriangleAlert,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { priorityOf, stockHealth } from "@/lib/warehouse/engine";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Control Tower — Palletworks Warehouse Ops" },
      {
        name: "description",
        content:
          "Live warehouse control tower: SLA risk, priority queue, smart allocation decisions, alerts and dispatch tracking.",
      },
      { property: "og:title", content: "Control Tower — Palletworks Warehouse Ops" },
      {
        property: "og:description",
        content: "Decision-driven fulfilment: priority scoring, allocation, picking, QC and dispatch.",
      },
    ],
  }),
  component: ControlTower,
});

const FLOW = [
  "received",
  "allocated",
  "picking",
  "packing",
  "quality-check",
  "dispatched",
] as const;

function ControlTower() {
  const { orders, skus, exceptions, shipments, allocation, applyAllocation, resetDay } =
    useWarehouse();

  const open = orders.filter((o) => o.stage !== "dispatched");
  const scored = open
    .map((o) => ({ o, p: priorityOf(o) }))
    .sort((a, b) => b.p.score - a.p.score);
  const breached = scored.filter((x) => x.p.slaRisk === "breached").length;
  const critical = scored.filter((x) => x.p.slaRisk === "critical").length;
  const lowStock = skus.filter((s) => ["low", "critical", "out"].includes(stockHealth(s)));
  const openExceptions = exceptions.filter((e) => e.status === "open");
  const needsDecision = allocation.results.filter((r) => r.decision !== "full");
  const openValue = open.reduce((s, o) => s + o.value, 0);

  const counts = FLOW.map((stage) => ({
    stage,
    n: orders.filter((o) => o.stage === stage).length,
  }));

  return (
    <div className="space-y-6">
      <div className="panel relative overflow-hidden p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Pill tone="primary">Live · mock dataset</Pill>
            <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">Control tower</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {open.length} open orders worth {money(openValue)}. The allocation engine ranks every
              order by SLA urgency, service level, channel and value, then commits stock top-down
              and recommends an action for anything it can't fill.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={resetDay}>
              <RotateCcw className="size-4" /> Reset shift
            </Button>
            <Button onClick={applyAllocation}>
              <PlayCircle className="size-4" /> Run allocation
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="SLA breached"
          value={breached}
          tone={breached ? "crit" : "ok"}
          sub={`${critical} more inside 4h`}
          icon={<Timer className="size-4" />}
        />
        <KpiCard
          label="Needs a decision"
          value={needsDecision.length}
          tone={needsDecision.length ? "warn" : "ok"}
          sub="Partial / backorder / hold"
          icon={<Gauge className="size-4" />}
        />
        <KpiCard
          label="Low stock alerts"
          value={lowStock.length}
          tone={lowStock.length ? "warn" : "ok"}
          sub={`${allocation.reorders.length} reorders suggested`}
          icon={<Boxes className="size-4" />}
        />
        <KpiCard
          label="Open exceptions"
          value={openExceptions.length}
          tone={openExceptions.length ? "crit" : "ok"}
          sub="Damaged, missing, QC fails"
          icon={<TriangleAlert className="size-4" />}
        />
        <KpiCard
          label="In transit"
          value={shipments.filter((s) => s.status !== "delivered").length}
          tone="info"
          sub={`${shipments.length} shipments today`}
          icon={<Truck className="size-4" />}
        />
      </div>

      <div className="panel p-4 sm:p-5">
        <SectionHead title="Fulfilment pipeline" desc="Orders currently sitting at each stage." />
        <div className="flex flex-wrap items-stretch gap-2">
          {counts.map(({ stage, n }, i) => (
            <div key={stage} className="flex items-center gap-2">
              <div className="panel-raised min-w-32 px-3 py-2">
                <p className="text-[11px] tracking-wider text-muted-foreground uppercase">
                  {stage.replace("-", " ")}
                </p>
                <p className="num mt-1 text-2xl font-semibold">{n}</p>
              </div>
              {i < counts.length - 1 && (
                <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
              )}
            </div>
          ))}
          <div className="panel-raised min-w-32 border-crit/40 px-3 py-2">
            <p className="text-[11px] tracking-wider text-crit uppercase">Exception</p>
            <p className="num mt-1 text-2xl font-semibold text-crit">
              {orders.filter((o) => o.stage === "exception").length}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="panel p-4 sm:p-5 xl:col-span-2">
          <SectionHead
            title="Priority queue"
            desc="Highest scored orders get stock first."
            right={
              <Link to="/orders" className="text-sm text-primary hover:underline">
                All orders →
              </Link>
            }
          />
          <ul className="divide-y divide-border">
            {scored.slice(0, 7).map(({ o, p }) => {
              const res = allocation.results.find((r) => r.orderId === o.id);
              return (
                <li key={o.id} className="flex flex-wrap items-center gap-3 py-3">
                  <PriorityMeter order={o} />
                  <div className="min-w-40 flex-1">
                    <p className="text-sm font-medium">
                      <span className="num">{o.id}</span> · {o.customer}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {o.service} · {o.channel} · promised {relTime(o.promisedAt)} ·{" "}
                      {money(o.value)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {o.vip && <Pill tone="primary">VIP</Pill>}
                    <SlaBadge risk={p.slaRisk} />
                    <StageBadge stage={o.stage} />
                    {res && res.decision !== "full" && <DecisionBadge decision={res.decision} />}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="space-y-4">
          <div className="panel p-4 sm:p-5">
            <SectionHead
              title="Alerts"
              right={
                <Link to="/exceptions" className="text-sm text-primary hover:underline">
                  Handle →
                </Link>
              }
            />
            <ul className="space-y-2">
              {lowStock.slice(0, 4).map((s) => (
                <li key={s.id} className="panel-raised flex items-center gap-3 p-3">
                  <Boxes className="size-4 shrink-0 text-warn" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{s.name}</p>
                    <p className="num text-xs text-muted-foreground">
                      {s.onHand - s.reserved - s.damaged} available · RP {s.reorderPoint} ·{" "}
                      {s.leadTimeDays}d lead
                    </p>
                  </div>
                  <Pill tone={stockHealth(s) === "out" ? "crit" : "warn"}>{stockHealth(s)}</Pill>
                </li>
              ))}
              {openExceptions.slice(0, 3).map((e) => (
                <li key={e.id} className="panel-raised flex items-center gap-3 p-3">
                  <TriangleAlert className="size-4 shrink-0 text-crit" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium capitalize">
                      {e.qty} × {e.type} · <span className="num">{e.skuId}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {e.orderId ? `${e.orderId} · ` : ""}
                      {e.reportedBy} · {relTime(e.reportedAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="panel p-4 sm:p-5">
            <SectionHead
              title="Dispatch"
              right={
                <Link to="/fulfillment" className="text-sm text-primary hover:underline">
                  Floor →
                </Link>
              }
            />
            <ul className="space-y-2">
              {shipments.slice(0, 4).map((s) => (
                <li key={s.id} className="panel-raised flex items-center gap-3 p-3">
                  <Truck className="size-4 shrink-0 text-info" />
                  <div className="min-w-0 flex-1">
                    <p className="num truncate text-sm font-medium">
                      {s.orderId} · {s.tracking}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {s.carrier} · ETA {relTime(s.eta)}
                    </p>
                  </div>
                  <Pill tone={s.status === "delivered" ? "ok" : "info"}>
                    <Clock className="size-3" />
                    {s.status.replace(/-/g, " ")}
                  </Pill>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
