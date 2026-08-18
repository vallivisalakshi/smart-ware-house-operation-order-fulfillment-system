import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  ClipboardCheck,
  MapPin,
  PackageCheck,
  ScanLine,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  KpiCard,
  Pill,
  SectionHead,
  SlaBadge,
  StageBadge,
  relTime,
} from "@/components/warehouse/atoms";
import { STAGE_LABEL, useWarehouse } from "@/lib/warehouse/store";
import { priorityOf } from "@/lib/warehouse/engine";
import type { ExceptionRecord, Order, OrderStage } from "@/lib/warehouse/types";

export const Route = createFileRoute("/fulfillment")({
  head: () => ({
    meta: [
      { title: "Picking, Packing & Dispatch — Palletworks" },
      {
        name: "description",
        content:
          "Zone-optimised pick lists, packing and quality check stations, and live dispatch tracking.",
      },
      { property: "og:title", content: "Picking, Packing & Dispatch — Palletworks" },
      {
        property: "og:description",
        content: "Run the floor: pick lists, QC stations and carrier dispatch in one console.",
      },
    ],
  }),
  component: FulfillmentPage,
});

const LANES: OrderStage[] = ["allocated", "picking", "packing", "quality-check"];

function FulfillmentPage() {
  const { orders, skus, shipments, advance, reportException } = useWarehouse();
  const [selected, setSelected] = useState<string | null>(null);

  const order = orders.find((o) => o.id === selected) ?? null;
  const dispatched = orders.filter((o) => o.stage === "dispatched");

  return (
    <div className="space-y-6">
      <SectionHead
        title="Picking, packing & dispatch"
        desc="Pick paths are sorted by zone and bin to minimise travel. Report damage or shorts inline."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="On the floor"
          value={orders.filter((o) => LANES.includes(o.stage)).length}
          tone="primary"
          sub="Allocated → QC"
        />
        <KpiCard
          label="Awaiting QC"
          value={orders.filter((o) => o.stage === "quality-check").length}
          tone="warn"
        />
        <KpiCard label="Dispatched today" value={dispatched.length} tone="ok" />
        <KpiCard
          label="Shipments live"
          value={shipments.filter((s) => s.status !== "delivered").length}
          tone="info"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        {LANES.map((lane) => {
          const items = orders
            .filter((o) => o.stage === lane)
            .sort((a, b) => priorityOf(b).score - priorityOf(a).score);
          return (
            <div key={lane} className="panel flex flex-col p-3">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">{STAGE_LABEL[lane]}</h3>
                <Pill>{items.length}</Pill>
              </div>
              <div className="space-y-2">
                {items.length === 0 && (
                  <p className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                    Lane clear
                  </p>
                )}
                {items.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => setSelected(o.id)}
                    className="panel-raised w-full p-3 text-left transition-colors hover:border-primary/50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="num text-sm font-medium">{o.id}</span>
                      <SlaBadge risk={priorityOf(o).slaRisk} />
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{o.customer}</p>
                    <p className="num mt-1 text-xs text-muted-foreground">
                      {o.lines.reduce((s, l) => s + l.allocated, 0)} units ·{" "}
                      {relTime(o.promisedAt)}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <span className="text-xs text-primary">Open station →</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {order ? (
        <Station
          order={order}
          skus={skus}
          onAdvance={() => {
            advance(order.id);
            setSelected(null);
          }}
          onException={(payload) => {
            reportException({ orderId: order.id, ...payload });
            setSelected(null);
          }}
          onClose={() => setSelected(null)}
        />
      ) : (
        <div className="panel p-8 text-center text-sm text-muted-foreground">
          Select an order from a lane above to open its pick / pack / QC station.
        </div>
      )}

      <div className="panel overflow-hidden">
        <div className="border-b border-border p-4">
          <SectionHead title="Dispatch tracking" desc="Outbound consignments and carrier ETAs." />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] tracking-wider text-muted-foreground uppercase">
                <th className="p-3 font-medium">Shipment</th>
                <th className="p-3 font-medium">Order</th>
                <th className="p-3 font-medium">Carrier</th>
                <th className="p-3 font-medium">Tracking</th>
                <th className="p-3 font-medium">ETA</th>
                <th className="p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((s) => (
                <tr key={s.id} className="border-b border-border/60 last:border-0">
                  <td className="num p-3">{s.id}</td>
                  <td className="num p-3">{s.orderId}</td>
                  <td className="p-3">{s.carrier}</td>
                  <td className="num p-3 text-muted-foreground">{s.tracking}</td>
                  <td className="p-3 text-muted-foreground">{relTime(s.eta)}</td>
                  <td className="p-3">
                    <Pill tone={s.status === "delivered" ? "ok" : s.status === "out-for-delivery" ? "primary" : "info"}>
                      <Truck className="size-3" />
                      {s.status.replace(/-/g, " ")}
                    </Pill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Station({
  order,
  skus,
  onAdvance,
  onException,
  onClose,
}: {
  order: Order;
  skus: ReturnType<typeof useWarehouse>["skus"];
  onAdvance: () => void;
  onException: (p: { skuId: string; type: ExceptionRecord["type"]; qty: number }) => void;
  onClose: () => void;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const [exSku, setExSku] = useState(order.lines[0]?.skuId ?? "");
  const [exType, setExType] = useState<ExceptionRecord["type"]>("damaged");
  const [exQty, setExQty] = useState("1");

  const path = [...order.lines].sort((a, b) => {
    const sa = skus.find((s) => s.id === a.skuId);
    const sb = skus.find((s) => s.id === b.skuId);
    return `${sa?.zone}${sa?.bin}`.localeCompare(`${sb?.zone}${sb?.bin}`);
  });
  const allPicked = picked.length === path.length;
  const isPicking = order.stage === "picking" || order.stage === "allocated";

  return (
    <div className="panel p-4 sm:p-5">
      <SectionHead
        title={`Station · ${order.id}`}
        desc={`${order.customer} · ${STAGE_LABEL[order.stage]} · promised ${relTime(order.promisedAt)}`}
        right={
          <div className="flex items-center gap-2">
            <StageBadge stage={order.stage} />
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="panel-raised p-3 lg:col-span-2">
          <p className="flex items-center gap-2 text-[11px] tracking-wider text-muted-foreground uppercase">
            <MapPin className="size-3.5" /> Zone-optimised pick path
          </p>
          <ul className="mt-3 space-y-2">
            {path.map((l, i) => {
              const sku = skus.find((s) => s.id === l.skuId);
              const done = picked.includes(l.skuId);
              return (
                <li
                  key={l.skuId}
                  className="flex items-center gap-3 rounded-md border border-border p-3"
                >
                  <span className="num flex size-7 items-center justify-center rounded-md bg-secondary text-xs">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{sku?.name}</p>
                    <p className="num text-xs text-muted-foreground">
                      Zone {sku?.zone} · {sku?.bin} · {l.skuId}
                    </p>
                  </div>
                  <span className="num text-sm">
                    {l.allocated}
                    <span className="text-muted-foreground">/{l.qty}</span>
                  </span>
                  {l.allocated < l.qty && <Pill tone="warn">short pick</Pill>}
                  <Button
                    size="sm"
                    variant={done ? "secondary" : "outline"}
                    disabled={!isPicking}
                    onClick={() =>
                      setPicked((p) => (p.includes(l.skuId) ? p.filter((x) => x !== l.skuId) : [...p, l.skuId]))
                    }
                  >
                    <ScanLine className="size-4" />
                    {done ? "Scanned" : "Scan"}
                  </Button>
                </li>
              );
            })}
          </ul>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button onClick={onAdvance} disabled={isPicking && !allPicked}>
              {order.stage === "quality-check" ? (
                <>
                  <PackageCheck className="size-4" /> Pass QC & dispatch
                </>
              ) : (
                <>
                  <ArrowRight className="size-4" /> Complete {STAGE_LABEL[order.stage].toLowerCase()}
                </>
              )}
            </Button>
            {isPicking && !allPicked && (
              <span className="text-xs text-muted-foreground">
                Scan all {path.length} bins to continue ({picked.length} done).
              </span>
            )}
            {order.stage === "quality-check" && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ClipboardCheck className="size-3.5" /> Dispatching decrements on-hand stock.
              </span>
            )}
          </div>
        </div>

        <div className="panel-raised p-3">
          <p className="text-[11px] tracking-wider text-muted-foreground uppercase">
            Report exception
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Damaged or missing units are quarantined immediately and the order is routed to the
            exception desk.
          </p>
          <div className="mt-3 space-y-2">
            <Select value={exSku} onValueChange={setExSku}>
              <SelectTrigger>
                <SelectValue placeholder="SKU" />
              </SelectTrigger>
              <SelectContent>
                {order.lines.map((l) => (
                  <SelectItem key={l.skuId} value={l.skuId}>
                    {l.skuId} · {skus.find((s) => s.id === l.skuId)?.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={exType} onValueChange={(v) => setExType(v as ExceptionRecord["type"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="damaged">Damaged</SelectItem>
                <SelectItem value="missing">Missing / not in bin</SelectItem>
                <SelectItem value="mismatch">Wrong item</SelectItem>
                <SelectItem value="qc-fail">QC fail</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              min={1}
              value={exQty}
              onChange={(e) => setExQty(e.target.value)}
              placeholder="Quantity"
            />
            <Button
              variant="destructive"
              className="w-full"
              disabled={!exSku || Number(exQty) < 1}
              onClick={() => onException({ skuId: exSku, type: exType, qty: Number(exQty) })}
            >
              Log exception
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
