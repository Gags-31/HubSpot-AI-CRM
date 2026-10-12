"use client";

export function Bars({ data, max, format = (v) => v }) {
  const top = max ?? Math.max(1, ...data.map((d) => d.value));
  return (
    <div>
      <div className="bars">
        {data.map((d) => (
          <div key={d.label} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
            <div className="bar-value">{format(d.value)}</div>
            <div className="bar" style={{ height: `${Math.max(4, (d.value / top) * 100)}%`, background: d.color }} />
            <span style={{ display: "block", textAlign: "center", fontSize: 10.5, color: "var(--text-faint)", marginTop: 6 }}>
              {d.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Gauge({ value, label, tone = "var(--accent)" }) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  const r = 54;
  const c = 2 * Math.PI * r;
  return (
    <div className="gauge" style={{ width: 150, height: 150 }}>
      <svg width="150" height="150" viewBox="0 0 150 150">
        <circle cx="75" cy="75" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="11" />
        <circle cx="75" cy="75" r={r} fill="none" stroke={tone} strokeWidth="11" strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * c} ${c}`} transform="rotate(-90 75 75)" />
      </svg>
      <div style={{ textAlign: "center" }}>
        <div className="gauge-val" style={{ color: tone }}>{pct}%</div>
        <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

export function Donut({ segments, center, centerLabel }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = 54, c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div>
      <div className="gauge" style={{ width: 160, height: 160 }}>
        <svg width="160" height="160" viewBox="0 0 160 160">
          <circle cx="80" cy="80" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="14" />
          {segments.map((s) => {
            const len = (s.value / total) * c;
            const el = (
              <circle key={s.label} cx="80" cy="80" r={r} fill="none" stroke={s.color} strokeWidth="14"
                strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset}
                transform="rotate(-90 80 80)" strokeLinecap="butt" />
            );
            offset += len;
            return el;
          })}
        </svg>
        <div style={{ textAlign: "center" }}>
          <div className="gauge-val">{center}</div>
          <div style={{ fontSize: 11, color: "var(--text-faint)" }}>{centerLabel}</div>
        </div>
      </div>
      <div className="legend">
        {segments.map((s) => (
          <span key={s.label}><i style={{ background: s.color }} />{s.label} · {s.value}</span>
        ))}
      </div>
    </div>
  );
}

export function Progress({ value, tone = "var(--brand)" }) {
  return (
    <div className="bar-track">
      <div className="bar-fill" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: tone }} />
    </div>
  );
}