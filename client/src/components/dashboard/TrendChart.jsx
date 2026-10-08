import { useState } from "react";
import { useElementWidth } from "../../lib/dashboardHooks.js";
import { Card } from "../ui/index.js";
import InfoTip from "./InfoTip.jsx";

const HEIGHT = 200;
const M = { l: 28, r: 8, t: 8, b: 24 }; // room for the y labels and the day labels
const CREATED = "var(--accent)";
const RESOLVED = "var(--success)";

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
const dayText = (date) => date.toLocaleDateString(undefined, { month: "short", day: "numeric" });

// Created vs resolved per day: two lines with a light fill. `days` = [{ date, created, resolved }], oldest first.
// Drawn at the element's real width (not scaled), so the text keeps its size on a phone.
// Hover or arrow keys pick a day; the tooltip is plain HTML over the SVG. The data table underneath is the screen-reader view.
export default function TrendChart({ days, info }) {
  const [ref, width] = useElementWidth();
  const [active, setActive] = useState(null);
  const n = days.length;

  const innerW = Math.max(width - M.l - M.r, 10);
  const innerH = HEIGHT - M.t - M.b;
  const maxValue = Math.max(...days.flatMap((d) => [d.created, d.resolved]), 0);
  const yMax = Math.max(4, Math.ceil(maxValue / 4) * 4); // a multiple of 4, so the 4 gridlines land on whole numbers
  const x = (i) => M.l + (i * innerW) / (n - 1);
  const y = (v) => M.t + innerH - (v / yMax) * innerH;
  const line = (key) => days.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join(" ");
  const area = (key) => `${line(key)} L${x(n - 1)},${y(0)} L${x(0)},${y(0)} Z`;

  const totalCreated = days.reduce((s, d) => s + d.created, 0);
  const totalResolved = days.reduce((s, d) => s + d.resolved, 0);
  const labelEvery = width < 480 ? 3 : 2;

  const pickFromPointer = (event) => {
    const box = event.currentTarget.getBoundingClientRect();
    setActive(clamp(Math.round(((event.clientX - box.left - M.l) / innerW) * (n - 1)), 0, n - 1));
  };
  const onKeyDown = (event) => {
    if (event.key === "ArrowLeft") setActive((a) => clamp((a ?? n) - 1, 0, n - 1));
    else if (event.key === "ArrowRight") setActive((a) => clamp((a ?? -1) + 1, 0, n - 1));
    else return;
    event.preventDefault();
  };

  const day = active === null ? null : days[active];

  return (
    <Card title="Created vs resolved" description={`Last ${n} days`} action={info && <InfoTip>{info}</InfoTip>}>
      <div className="mb-2 flex gap-4 text-xs text-muted-strong">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-3 rounded-full" style={{ background: CREATED }} aria-hidden="true" /> Created
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-3 rounded-full" style={{ background: RESOLVED }} aria-hidden="true" /> Resolved
        </span>
      </div>

      <div ref={ref} className="relative">
        <svg
          role="img"
          aria-label={`Tickets created and resolved per day over the last ${n} days. ${totalCreated} created, ${totalResolved} resolved. Use the left and right arrow keys to read each day.`}
          width={width}
          height={HEIGHT}
          tabIndex={0}
          className="block touch-pan-y"
          onPointerMove={pickFromPointer}
          onPointerDown={pickFromPointer}
          onPointerLeave={() => setActive(null)}
          onFocus={() => setActive((a) => a ?? n - 1)}
          onBlur={() => setActive(null)}
          onKeyDown={onKeyDown}
        >
          {[0, 1, 2, 3, 4].map((i) => {
            const v = (yMax / 4) * i;
            return (
              <g key={i}>
                <line x1={M.l} x2={width - M.r} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeWidth="1" />
                <text x={M.l - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">
                  {v}
                </text>
              </g>
            );
          })}
          {days.map(
            (d, i) =>
              i % labelEvery === 0 && (
                <text key={d.from} x={x(i)} y={HEIGHT - 6} textAnchor="middle" fontSize="11" fill="var(--muted)">
                  {dayText(d.date)}
                </text>
              )
          )}

          <path d={area("created")} fill={CREATED} opacity="0.1" />
          <path d={area("resolved")} fill={RESOLVED} opacity="0.1" />
          <path d={line("created")} fill="none" stroke={CREATED} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          <path d={line("resolved")} fill="none" stroke={RESOLVED} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

          {day && (
            <g>
              <line x1={x(active)} x2={x(active)} y1={M.t} y2={y(0)} stroke="var(--control)" strokeWidth="1" strokeDasharray="3 3" />
              <circle cx={x(active)} cy={y(day.created)} r="4" fill="var(--surface)" stroke={CREATED} strokeWidth="2" />
              <circle cx={x(active)} cy={y(day.resolved)} r="4" fill="var(--surface)" stroke={RESOLVED} strokeWidth="2" />
            </g>
          )}
        </svg>

        {day && (
          <div
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs shadow-popover"
            style={{ left: clamp(x(active), 60, width - 60) }}
          >
            <p className="font-medium text-fg">{dayText(day.date)}</p>
            <p className="text-muted-strong">Created: {day.created}</p>
            <p className="text-muted-strong">Resolved: {day.resolved}</p>
          </div>
        )}
      </div>

      <table className="sr-only">
        <caption>Tickets created and resolved per day, last {n} days</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Created</th>
            <th scope="col">Resolved</th>
          </tr>
        </thead>
        <tbody>
          {days.map((d) => (
            <tr key={d.from}>
              <th scope="row">{dayText(d.date)}</th>
              <td>{d.created}</td>
              <td>{d.resolved}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
