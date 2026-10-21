"use client";
import { useEffect, useRef, useState } from "react";

export function Sparkline({ data, color = "var(--accent)", height = 36, width = 160 }) {
  const max = Math.max(...data, 1);
  const step = width / Math.max(data.length - 1, 1);
  const pts = data.map((v, i) => `${(i * step).toFixed(1)},${(height - (v / max) * height).toFixed(1)}`).join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="spark">
      <defs>
        <linearGradient id="spk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${pts} ${width},${height}`} fill="url(#spk)" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AreaChart({ data, height = 160, pad = 24 }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const totalH = height;
  const w = 100 / (data.length - 1 || 1);
  const pts = data.map((d, i) => `${(i * w).toFixed(2)},${(totalH - (d.value / max) * (totalH - pad) - pad / 2).toFixed(2)}`).join(" ");
  const x0 = data[0] ? 0 : 0;
  return (
    <svg width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="spark">
      <defs>
        <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="var(--brand)" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${pts} 100,${height}`} fill="url(#area)" />
      <polyline points={pts} fill="none" stroke="var(--brand)" strokeWidth="1.6" />
      {data.map((d, i) => (
        <circle key={i} cx={(i * w).toFixed(2)} cy={(totalH - (d.value / max) * (totalH - pad) - pad / 2).toFixed(2)}
          r="2.2" fill="var(--accent)" />
      ))}
    </svg>
  );
}

export function CountUp({ to }) {
  const ref = useRef(0);
  const [val, setVal] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const dur = 900;
    function tick(now) {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      ref.current = Math.round(eased * (to ?? 0));
      setVal(ref.current);
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [to]);
  return <>{val}</>;
}export function Bars({ data = [], format }) {
  const fmtv = (v) => (format ? format(v) : v);
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 140, padding: "12px 0" }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{ fontSize: 10, color: "var(--text-faint)" }}>{fmtv(d.value)}</div>
          <div
            style={{
              width: "100%",
              height: Math.max(4, (d.value / max) * 100) + "%",
              background: "linear-gradient(180deg, var(--brand), var(--brand-soft))",
              borderRadius: 6,
              minHeight: 4,
            }}
          />
          <span style={{ fontSize: 10, color: "var(--text-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 74 }}>
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export function Donut({ segments = [], center, centerLabel }) {
  let offset = 0;
  const total = segments.reduce((s, x) => s + (x.value || 0), 0) || 1;
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = segments && segments[0] ? ((segments[0].value / total) * circumference) + " " + circumference : "0 " + circumference;
  // gradient removed to avoid parser oddity
  offset = 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
      <svg width="130" height="130" viewBox="0 0 130 130">
        <circle cx="65" cy="65" r={radius} fill="none" stroke="var(--surface-2)" strokeWidth="16" />
        <circle
          cx="65"
          cy="65"
          r={radius}
          fill="none"
          stroke="var(--brand)"
          strokeWidth="16"
          strokeDasharray={strokeDash}
          transform="rotate(-90 65 65)"
        />
        <text x="65" y="60" textAnchor="middle" fill="var(--text)" fontSize="22" fontWeight="700">
          {center}
        </text>
        <text x="65" y="78" textAnchor="middle" fill="var(--text-faint)" fontSize="11">
          {centerLabel}
        </text>
      </svg>
      <div className="list" style={{ minWidth: 120 }}>
        {segments.map((s, i) => (
          <div key={i} className="kv">
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: s.color }} />
              {s.label}
            </span>
            <b>{s.value}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Gauge({ value = 0, label, tone = "var(--brand)" }) {
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <div>
      <div style={{ height: 14, background: "var(--surface-2)", borderRadius: 999, overflow: "hidden", border: "1px solid var(--border-soft)" }}>
        <div style={{ width: clamped * 100 + "%", height: "100%", background: tone, borderRadius: 999 }} />
      </div>
      {label ? <div style={{ marginTop: 6, fontSize: 12, color: "var(--text-dim)" }}>{label}</div> : null}
    </div>
  );
}
export function Progress({ value = 0 }) { return (<div style={{ height: 10, background: "var(--surface-2)", borderRadius: 999, overflow: "hidden" }}><div style={{ width: (value * 100) + "%", height: "100%", background: "linear-gradient(90deg, var(--brand), var(--accent))" }} /></div>); }
