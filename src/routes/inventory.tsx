import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, PackagePlus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { KpiCard, Pill, SectionHead, money } from "@/components/warehouse/atoms";
import { useWarehouse } from "@/lib/warehouse/store";
import { available, daysOfCover, stockHealth } from "@/lib/warehouse/engine";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory Monitoring — Palletworks" },
      {
        name: "description",
        content:
          "Live stock positions, days of cover, damaged quantities and automatic replenishment suggestions.",
      },
      { property: "og:title", content: "Inventory Monitoring — Palletworks" },
      {
        property: "og:description",
        content: "Live stock positions, days of cover and replenishment suggestions.",
      },
    ],
  }),
  component: InventoryPage,
});

const healthTone = {
  healthy: "ok",
  watch: "info",
  low: "warn",
  critical: "crit",
  out: "crit",
} as const;

function InventoryPage() {
  const { skus, reorder, allocation } = useWarehouse();
  const [q, setQ] = useState("");
  const [only, setOnly] = useState<"all" | "risk">("all");

  const rows = useMemo(() => {
    return skus
      .filter((s) =>
        `${s.id} ${s.name} ${s.category} ${s.zone}`.toLowerCase().includes(q.toLowerCase()),
      )
      .filter((s) => (only === "all" ? true : stockHealth(s) !== "healthy" && stockHealth(s) !== "watch"))
      .sort((a, b) => daysOfCover(a) - daysOfCover(b));
  }, [skus, q, only]);

  const atRisk = skus.filter((s) => ["low", "critical", "out"].includes(stockHealth(s)));
  const stockValue = skus.reduce((s, x) => s + x.onHand * x.unitCost, 0);
  const damagedValue = skus.reduce((s, x) => s + x.damaged * x.unitCost, 0);

  return (
    <div className="space-y-6">
      <SectionHead
        title="Inventory monitoring"
        desc="Available = on hand − reserved − damaged. Sorted by days of cover, worst first."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Stock value" value={money(stockValue)} sub={`${skus.length} active SKUs`} />
        <KpiCard
          label="Below reorder point"
          value={atRisk.length}
          tone={atRisk.length ? "warn" : "ok"}
          sub="Replenishment recommended"
        />
        <KpiCard
          label="Damaged / quarantined"
          value={skus.reduce((s, x) => s + x.damaged, 0)}
          tone="crit"
          sub={`${money(damagedValue)} written down`}
        />
        <KpiCard
          label="Contested SKUs"
          value={allocation.contested.length}
          tone={allocation.contested.length ? "warn" : "ok"}
          sub="Open demand exceeds on-hand"
        />
      </div>

      {allocation.reorders.length > 0 && (
        <div className="panel p-4">
          <SectionHead
            title="Suggested replenishment"
            desc="Auto-sized from shortfall plus lead-time demand."
          />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {allocation.reorders.map((r) => {
              const sku = skus.find((s) => s.id === r.skuId)!;
              return (
                <div key={r.skuId} className="panel-raised flex flex-col gap-2 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{sku.name}</p>
                      <p className="num text-xs text-muted-foreground">{sku.id}</p>
                    </div>
                    <Pill tone="warn">{r.qty} units</Pill>
                  </div>
                  <p className="text-xs text-muted-foreground">{r.reason}</p>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-auto w-full"
                    onClick={() => reorder(r.skuId, r.qty)}
                  >
                    <PackagePlus className="size-4" /> Raise PO · {money(r.qty * sku.unitCost)}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="panel overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <div className="relative min-w-56 flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search SKU, name, zone…"
              className="pl-9"
            />
          </div>
          <div className="flex gap-1 rounded-md border border-border p-1">
            {(["all", "risk"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setOnly(k)}
                className={cn(
                  "rounded px-3 py-1 text-xs capitalize transition-colors",
                  only === k ? "bg-secondary text-foreground" : "text-muted-foreground",
                )}
              >
                {k === "all" ? "All SKUs" : "Needs attention"}
              </button>
            ))}
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">
            No SKUs match this filter.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] tracking-wider text-muted-foreground uppercase">
                  <th className="p-3 font-medium">SKU</th>
                  <th className="p-3 font-medium">Location</th>
                  <th className="p-3 text-right font-medium">On hand</th>
                  <th className="p-3 text-right font-medium">Reserved</th>
                  <th className="p-3 text-right font-medium">Damaged</th>
                  <th className="p-3 text-right font-medium">Available</th>
                  <th className="p-3 font-medium">Cover</th>
                  <th className="p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => {
                  const h = stockHealth(s);
                  const cover = daysOfCover(s);
                  const pct = Math.min(100, (available(s) / Math.max(s.reorderPoint * 2, 1)) * 100);
                  return (
                    <tr key={s.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/40">
                      <td className="p-3">
                        <p className="font-medium">{s.name}</p>
                        <p className="num text-xs text-muted-foreground">
                          {s.id} · {s.category}
                        </p>
                      </td>
                      <td className="num p-3 text-xs text-muted-foreground">
                        Zone {s.zone} · {s.bin}
                      </td>
                      <td className="num p-3 text-right">{s.onHand}</td>
                      <td className="num p-3 text-right text-muted-foreground">{s.reserved}</td>
                      <td className="num p-3 text-right">
                        {s.damaged > 0 ? (
                          <span className="text-crit">{s.damaged}</span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="num p-3 text-right font-semibold">{available(s)}</td>
                      <td className="p-3">
                        <div className="w-32">
                          <div className="flex justify-between text-[11px] text-muted-foreground">
                            <span className="num">{cover >= 99 ? "99+" : cover.toFixed(1)}d</span>
                            <span className="num">RP {s.reorderPoint}</span>
                          </div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                h === "healthy" && "bg-ok",
                                h === "watch" && "bg-info",
                                h === "low" && "bg-warn",
                                (h === "critical" || h === "out") && "bg-crit",
                              )}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Pill tone={healthTone[h]}>
                            {h === "out" ? (
                              <>
                                <AlertTriangle className="size-3" /> Out of stock
                              </>
                            ) : (
                              h
                            )}
                          </Pill>
                          {cover < s.leadTimeDays && (
                            <Pill tone="crit">cover &lt; {s.leadTimeDays}d lead</Pill>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
