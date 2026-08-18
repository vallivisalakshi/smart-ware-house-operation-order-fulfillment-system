import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { AllocationDecision, Order, OrderStage } from "@/lib/warehouse/types";
import { priorityOf, type PriorityBreakdown } from "@/lib/warehouse/engine";
import { STAGE_LABEL } from "@/lib/warehouse/store";

export function Pill({
  tone = "muted",
  children,
  className,
}: {
  tone?: "muted" | "ok" | "warn" | "crit" | "info" | "primary";
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    muted: "bg-muted text-muted-foreground border-border",
    ok: "bg-ok/15 text-ok border-ok/30",
    warn: "bg-warn/15 text-warn border-warn/30",
    crit: "bg-crit/15 text-crit border-crit/40",
    info: "bg-info/15 text-info border-info/30",
    primary: "bg-primary/15 text-primary border-primary/30",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function KpiCard({
  label,
  value,
  sub,
  tone = "muted",
  icon,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "muted" | "ok" | "warn" | "crit" | "info" | "primary";
  icon?: ReactNode;
}) {
  const bar = {
    muted: "bg-muted-foreground/40",
    ok: "bg-ok",
    warn: "bg-warn",
    crit: "bg-crit",
    info: "bg-info",
    primary: "bg-primary",
  } as const;
  return (
    <div className="panel relative overflow-hidden p-4">
      <span className={cn("absolute inset-x-0 top-0 h-0.5", bar[tone])} />
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium tracking-widest text-muted-foreground uppercase">
          {label}
        </p>
        {icon ? <span className="text-muted-foreground">{icon}</span> : null}
      </div>
      <p className="num mt-2 text-3xl leading-none font-semibold">{value}</p>
      {sub ? <p className="mt-2 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

const stageTone: Record<OrderStage, "muted" | "ok" | "warn" | "crit" | "info" | "primary"> = {
  received: "muted",
  allocated: "info",
  picking: "primary",
  packing: "primary",
  "quality-check": "warn",
  dispatched: "ok",
  exception: "crit",
};

export function StageBadge({ stage }: { stage: OrderStage }) {
  return <Pill tone={stageTone[stage]}>{STAGE_LABEL[stage]}</Pill>;
}

export function SlaBadge({ risk }: { risk: PriorityBreakdown["slaRisk"] }) {
  const map = {
    breached: ["crit", "SLA breached"],
    critical: ["crit", "< 4h left"],
    "at-risk": ["warn", "At risk"],
    "on-track": ["ok", "On track"],
  } as const;
  const [tone, label] = map[risk];
  return <Pill tone={tone}>{label}</Pill>;
}

export function DecisionBadge({ decision }: { decision: AllocationDecision }) {
  const map = {
    full: ["ok", "Full fulfilment"],
    partial: ["warn", "Partial ship"],
    backorder: ["info", "Backorder"],
    "hold-reorder": ["crit", "Hold + reorder"],
  } as const;
  const [tone, label] = map[decision];
  return <Pill tone={tone}>{label}</Pill>;
}

export function PriorityMeter({ order }: { order: Order }) {
  const p = priorityOf(order);
  const pct = Math.min(100, (p.score / 120) * 100);
  const tone = p.score >= 80 ? "bg-crit" : p.score >= 60 ? "bg-warn" : "bg-info";
  return (
    <div className="w-28">
      <div className="flex items-baseline justify-between">
        <span className="num text-sm font-semibold">{p.score}</span>
        <span className="text-[10px] text-muted-foreground">/120</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", tone)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function SectionHead({
  title,
  desc,
  right,
}: {
  title: string;
  desc?: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {desc ? <p className="mt-0.5 text-sm text-muted-foreground">{desc}</p> : null}
      </div>
      {right}
    </div>
  );
}

export function relTime(iso: string, now = new Date("2026-08-18T06:00:00Z").getTime()) {
  const diff = (new Date(iso).getTime() - now) / 3_600_000;
  const abs = Math.abs(diff);
  const unit = abs < 1 ? `${Math.round(abs * 60)}m` : abs < 48 ? `${abs.toFixed(1)}h` : `${(abs / 24).toFixed(1)}d`;
  return diff >= 0 ? `in ${unit}` : `${unit} ago`;
}

export const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
