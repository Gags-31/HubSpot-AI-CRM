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
}