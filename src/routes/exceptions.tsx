import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PackagePlus, ShieldCheck, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KpiCard, Pill, SectionHead, money, relTime } from "@/components/warehouse/atoms";
import { useWarehouse } from "@/lib/warehouse/store";
import type { ExceptionRecord } from "@/lib/warehouse/types";
import { available } from "@/lib/warehouse/engine";

export const Route = createFileRoute("/exceptions")({
  head: () => ({
    meta: [
      { title: "Exception Handling — Palletworks" },
      {
        name: "description",
        content:
          "Damaged, missing and QC-failed stock with recommended recovery actions and inventory write-downs.",
      },
      { property: "og:title", content: "Exception Handling — Palletworks" },
      {
        property: "og:description",
        content: "Resolve damaged, missing and QC-failed stock with recommended recovery actions.",
      },
    ],
  }),
  component: ExceptionsPage,
});

const TYPE_TONE = {
  damaged: "crit",
  missing: "warn",
  mismatch: "info",
  "qc-fail": "crit",
} as const;

function recommend(e: ExceptionRecord, availQty: number) {
  switch (e.type) {
    case "damaged":
      return availQty >= e.qty
        ? `Re-pick ${e.qty} replacement units from remaining ${availQty} available, write down damaged stock and keep the original SLA.`
        : `No spare cover (${availQty} available). Ship short, backorder ${e.qty} units and expedite replenishment.`;
    case "missing":
      return `Trigger a cycle count on the bin. If the count confirms the shortfall, adjust on-hand and re-run allocation so higher-priority orders keep their stock.`;
    case "mismatch":
      return `Quarantine the tote, correct the bin mapping and re-scan. Recurring mismatches on this SKU should trigger a slotting review.`;
    case "qc-fail":
      return `Repack from a different lot and re-run QC. If the batch fails twice, quarantine the lot and notify the supplier.`;
  }
}

function ExceptionsPage() {
  const { exceptions, skus, orders, resolveException, reportException, reorder } = useWarehouse();
  const [skuId, setSkuId] = useState(skus[0]?.id ?? "");
  const [type, setType] = useState<ExceptionRecord["type"]>("damaged");
  const [qty, setQty] = useState("1");
  const [orderId, setOrderId] = useState("none");

  const open = exceptions.filter((e) => e.status === "open");
  const resolved = exceptions.filter((e) => e.status === "resolved");
  const lostValue = open.reduce((s, e) => {
    const sku = skus.find((x) => x.id === e.skuId);
    return s + (sku ? sku.unitCost * e.qty : 0);
  }, 0);

  return (
    <div className="space-y-6">
      <SectionHead
        title="Exception desk"
        desc="Every damaged or missing unit is quarantined out of available stock, so allocation never promises what isn't there."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Open exceptions" value={open.length} tone={open.length ? "crit" : "ok"} />
        <KpiCard label="Units affected" value={open.reduce((s, e) => s + e.qty, 0)} tone="warn" />
        <KpiCard label="Value at risk" value={money(lostValue)} tone="crit" />
        <KpiCard label="Resolved" value={resolved.length} tone="ok" sub="This shift" />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-3 xl:col-span-2">
          {open.length === 0 && (
            <div className="panel p-10 text-center text-sm text-muted-foreground">
              No open exceptions. The floor is clean.
            </div>
          )}
          {open.map((e) => {
            const sku = skus.find((s) => s.id === e.skuId);
            const avail = sku ? available(sku) : 0;
            const advice = recommend(e, avail);
            return (
              <div key={e.id} className="panel p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="num text-sm font-semibold">{e.id}</span>
                      <Pill tone={TYPE_TONE[e.type]}>
                        <TriangleAlert className="size-3" />
                        {e.qty} × {e.type}
                      </Pill>
                      {e.orderId && <Pill tone="info">{e.orderId}</Pill>}
                    </div>
                    <p className="mt-1 text-sm">
                      {sku?.name ?? e.skuId}{" "}
                      <span className="num text-xs text-muted-foreground">
                        · {e.skuId} · {avail} available now
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Reported by {e.reportedBy} · {relTime(e.reportedAt)}
                    </p>
                  </div>
                  {sku && (
                    <Pill tone="warn">{money(sku.unitCost * e.qty)} exposure</Pill>
                  )}
                </div>

                <div className="mt-3 rounded-md border border-primary/25 bg-primary/5 p-3">
                  <p className="text-[11px] tracking-wider text-primary uppercase">
                    Recommended action
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{advice}</p>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => resolveException(e.id, advice)}>
                    <ShieldCheck className="size-4" /> Accept & resolve
                  </Button>
                  {sku && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => reorder(sku.id, sku.reorderQty)}
                    >
                      <PackagePlus className="size-4" /> Reorder {sku.reorderQty}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => resolveException(e.id, "Written off to shrinkage after review.")}
                  >
                    Write off
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-4">
          <div className="panel p-4">
            <SectionHead title="Log an exception" />
            <div className="space-y-2">
              <Select value={skuId} onValueChange={setSkuId}>
                <SelectTrigger>
                  <SelectValue placeholder="SKU" />
                </SelectTrigger>
                <SelectContent>
                  {skus.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.id} · {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={type} onValueChange={(v) => setType(v as ExceptionRecord["type"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="damaged">Damaged</SelectItem>
                  <SelectItem value="missing">Missing</SelectItem>
                  <SelectItem value="mismatch">Mismatch</SelectItem>
                  <SelectItem value="qc-fail">QC fail</SelectItem>
                </SelectContent>
              </Select>
              <Select value={orderId} onValueChange={setOrderId}>
                <SelectTrigger>
                  <SelectValue placeholder="Linked order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No linked order</SelectItem>
                  {orders
                    .filter((o) => o.stage !== "dispatched")
                    .map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.id} · {o.customer}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                placeholder="Quantity"
              />
              <Button
                className="w-full"
                disabled={!skuId || Number(qty) < 1}
                onClick={() =>
                  reportException({
                    skuId,
                    type,
                    qty: Number(qty),
                    ...(orderId !== "none" ? { orderId } : {}),
                  })
                }
              >
                Log exception
              </Button>
            </div>
          </div>

          <div className="panel p-4">
            <SectionHead title="Resolved" />
            <ul className="space-y-2">
              {resolved.length === 0 && (
                <li className="text-sm text-muted-foreground">Nothing resolved yet.</li>
              )}
              {resolved.map((e) => (
                <li key={e.id} className="panel-raised p-3">
                  <p className="text-sm font-medium capitalize">
                    <span className="num">{e.id}</span> · {e.qty} × {e.type}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{e.resolution}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
