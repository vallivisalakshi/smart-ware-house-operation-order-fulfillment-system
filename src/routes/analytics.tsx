import { createFileRoute } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { KpiCard, Pill, SectionHead, money } from "@/components/warehouse/atoms";
import { STAGE_CYCLE, THROUGHPUT } from "@/lib/warehouse/data";
import { useWarehouse } from "@/lib/warehouse/store";
import { available, daysOfCover, priorityOf } from "@/lib/warehouse/engine";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Warehouse Analytics — Palletworks" },
      {
        name: "description",
        content:
          "Throughput, SLA attainment, cycle times, fill rate and inventory cover analytics for the distribution centre.",
      },
      { property: "og:title", content: "Warehouse Analytics — Palletworks" },
      {
        property: "og:description",
        content: "Throughput, SLA attainment, cycle times and fill-rate analytics.",
      },
    ],
  }),
  component: AnalyticsPage,
});

const AXIS = { stroke: "oklch(0.7 0.02 252)", fontSize: 11 };
const tooltipStyle = {
  background: "oklch(0.24 0.02 252)",
  border: "1px solid oklch(0.32 0.02 253)",
  borderRadius: 8,
  fontSize: 12,
  color: "oklch(0.95 0.008 250)",
};

function AnalyticsPage() {
  const { orders, skus, allocation, exceptions } = useWarehouse();

  const totalReq = allocation.results.reduce(
    (s, r) => s + r.lines.reduce((a, l) => a + l.requested, 0),
    0,
  );
  const totalGot = allocation.results.reduce(
    (s, r) => s + r.lines.reduce((a, l) => a + l.granted, 0),
    0,
  );
  const fillRate = totalReq ? Math.round((totalGot / totalReq) * 100) : 100;
  const onTime = orders.filter((o) => priorityOf(o).slaRisk !== "breached").length;
  const slaPct = Math.round((onTime / Math.max(orders.length, 1)) * 100);

  const byChannel = ["b2b-contract", "wholesale", "retail", "marketplace"].map((c) => ({
    name: c,
    value: orders.filter((o) => o.channel === c).reduce((s, o) => s + o.value, 0),
  }));
  const PIE = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-5)"];

  const coverData = [...skus]
    .sort((a, b) => daysOfCover(a) - daysOfCover(b))
    .slice(0, 8)
    .map((s) => ({ name: s.id.replace("SKU-", ""), cover: Number(daysOfCover(s).toFixed(1)), lead: s.leadTimeDays }));

  const decisionMix = (["full", "partial", "backorder", "hold-reorder"] as const).map((d) => ({
    name: d,
    n: allocation.results.filter((r) => r.decision === d).length,
  }));

  return (
    <div className="space-y-6">
      <SectionHead
        title="Analytics"
        desc="Operational performance for DC-04, plus the decision mix produced by the allocation engine."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Unit fill rate" value={`${fillRate}%`} tone={fillRate > 90 ? "ok" : "warn"} sub="Open demand coverable now" />
        <KpiCard label="SLA attainment" value={`${slaPct}%`} tone={slaPct > 90 ? "ok" : "crit"} sub="Orders not yet breached" />
        <KpiCard label="Avg order cycle" value="54 min" tone="info" sub="Pick → dispatch, 7-day avg" />
        <KpiCard
          label="Shrinkage exposure"
          value={money(
            exceptions
              .filter((e) => e.status === "open")
              .reduce((s, e) => s + (skus.find((x) => x.id === e.skuId)?.unitCost ?? 0) * e.qty, 0),
          )}
          tone="crit"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="panel p-4 xl:col-span-2">
          <SectionHead title="Throughput vs. SLA" desc="Orders received and dispatched per day." />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={THROUGHPUT}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--grid-line)" vertical={false} />
                <XAxis dataKey="day" tick={AXIS} tickLine={false} axisLine={false} />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area dataKey="received" stroke="var(--chart-1)" fill="url(#g1)" strokeWidth={2} />
                <Area dataKey="dispatched" stroke="var(--chart-2)" fill="url(#g2)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel p-4">
          <SectionHead title="Order value by channel" />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byChannel} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                  {byChannel.map((_, i) => (
                    <Cell key={i} fill={PIE[i % PIE.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => money(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 space-y-1 text-xs">
            {byChannel.map((c, i) => (
              <li key={c.name} className="flex items-center gap-2">
                <span className="size-2 rounded-full" style={{ background: PIE[i % PIE.length] }} />
                <span className="flex-1 capitalize text-muted-foreground">{c.name}</span>
                <span className="num">{money(c.value)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel p-4">
          <SectionHead title="SLA attainment trend" desc="% shipped inside promise." />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={THROUGHPUT}>
                <CartesianGrid stroke="var(--grid-line)" vertical={false} />
                <XAxis dataKey="day" tick={AXIS} tickLine={false} axisLine={false} />
                <YAxis domain={[80, 100]} tick={AXIS} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line dataKey="sla" stroke="var(--chart-3)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel p-4">
          <SectionHead title="Cycle time by stage" desc="Median minutes per order." />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={STAGE_CYCLE}>
                <CartesianGrid stroke="var(--grid-line)" vertical={false} />
                <XAxis dataKey="stage" tick={AXIS} tickLine={false} axisLine={false} />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="minutes" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel p-4">
          <SectionHead title="Days of cover vs. lead time" desc="Bars below the lead line will stock out." />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={coverData}>
                <CartesianGrid stroke="var(--grid-line)" vertical={false} />
                <XAxis dataKey="name" tick={AXIS} tickLine={false} axisLine={false} />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="cover" radius={[4, 4, 0, 0]}>
                  {coverData.map((d, i) => (
                    <Cell key={i} fill={d.cover < d.lead ? "var(--chart-4)" : "var(--chart-3)"} />
                  ))}
                </Bar>
                <Line dataKey="lead" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="panel p-4">
        <SectionHead
          title="Allocation decision mix"
          desc="What the engine decided for the current open book."
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {decisionMix.map((d) => (
            <div key={d.name} className="panel-raised p-3">
              <p className="text-[11px] tracking-wider text-muted-foreground capitalize">
                {d.name.replace("-", " + ")}
              </p>
              <p className="num mt-1 text-2xl font-semibold">{d.n}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {allocation.contested.map((id) => (
            <Pill key={id} tone="crit">
              contested {id} · {available(skus.find((s) => s.id === id)!)} available
            </Pill>
          ))}
        </div>
      </div>
    </div>
  );
}
