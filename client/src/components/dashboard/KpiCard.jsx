import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { useCountUp } from "../../lib/dashboardHooks.js";
import { cn } from "../../lib/cn.js";
import { Card } from "../ui/index.js";
import InfoTip from "./InfoTip.jsx";

// A tiny trend line with no axes. Decorative detail for a number that is already printed next to it, so `label` states what
// it shows for screen readers.
function Sparkline({ values, label, className }) {
  const w = 72;
  const h = 24;
  const pad = 2;
  const max = Math.max(...values, 1);
  const x = (i) => pad + (i * (w - pad * 2)) / (values.length - 1);
  const y = (v) => h - pad - (v / max) * (h - pad * 2);
  const points = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
  return (
    <svg role="img" aria-label={label} width={w} height={h} viewBox={`0 0 ${w} ${h}`} className={cn("shrink-0", className)}>
      <polygon points={`${x(0)},${h} ${points.join(" ")} ${x(values.length - 1)},${h}`} fill="currentColor" opacity="0.12" />
      <polyline points={points.join(" ")} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(values.length - 1)} cy={y(values[values.length - 1])} r="2" fill="currentColor" />
    </svg>
  );
}

// delta = { amount, unit, against }: only passed when the data supports a comparison. Direction is printed (arrow + sign),
// not left to colour alone.
function Delta({ amount, unit, against }) {
  const Icon = amount > 0 ? ArrowUp : amount < 0 ? ArrowDown : Minus;
  const tone = amount > 0 ? "text-success-ink" : amount < 0 ? "text-danger-ink" : "text-muted";
  return (
    <p className={cn("mt-1 flex items-center gap-1 text-xs", tone)}>
      <Icon size={12} aria-hidden="true" />
      <span>
        {amount > 0 ? "+" : ""}
        {amount}
        {unit} <span className="text-muted">{against}</span>
      </span>
    </p>
  );
}

export default function KpiCard({ label, value, suffix = "", note, info, delta, sparkline, tone = "default" }) {
  const shown = useCountUp(value);
  return (
    <Card className="min-w-0">
      <div className="flex min-h-6 items-center justify-between gap-1">
        <h3 className="text-13 font-medium text-muted-strong">{label}</h3>
        {info && <InfoTip>{info}</InfoTip>}
      </div>
      <div className="mt-1 flex items-end justify-between gap-2">
        <p className={cn("text-2xl font-semibold tracking-tight", tone === "danger" && value > 0 ? "text-danger-ink" : "text-fg")}>
          {shown === null ? "—" : `${shown}${suffix}`}
        </p>
        {sparkline && <Sparkline values={sparkline.values} label={sparkline.label} className="text-accent" />}
      </div>
      {delta && <Delta {...delta} />}
      {note && <p className="mt-1 text-xs text-muted">{note}</p>}
    </Card>
  );
}
