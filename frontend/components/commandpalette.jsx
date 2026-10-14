"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const ITEMS = [
  { group: "Navigate", label: "Dashboard", desc: "KPIs and portfolio", href: "/web/" },
  { group: "Navigate", label: "Conversations", desc: "Live WebSocket chat", href: "/web/chat/" },
  { group: "Navigate", label: "Customers 360°", desc: "Memory, prediction, NBA", href: "/web/consumers/" },
  { group: "Navigate", label: "Catalog", desc: "Products and cart", href: "/web/products/" },
  { group: "Navigate", label: "Orders", desc: "Order lifecycle", href: "/web/orders/" },
  { group: "Navigate", label: "Proposals", desc: "Versioned + PDF", href: "/web/proposals/" },
  { group: "Navigate", label: "Platform", desc: "Agents, ML, jobs", href: "/web/platform/" },
  { group: "Reference", label: "Architecture", desc: "16 module flowcharts", href: "/architecture.html" },
  { group: "Reference", label: "API docs", desc: "Swagger / OpenAPI", href: "/docs" },
];
const ACTIONS = [
  { group: "Action", label: "Seed demo data", desc: "POST /ops/seed", run: async (api) => (await fetch("/ops/seed", { method: "POST" })).json() },
  { group: "Action", label: "Train ML model", desc: "POST /ops/ml/train", run: async (api) => (await fetch("/ops/ml/train", { method: "POST" })).json() },
  { group: "Action", label: "Run Spark job", desc: "POST /ops/stream/spark", run: async (api) => (await fetch("/ops/stream/spark")).json() },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState(0);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const list = [...ITEMS, ...ACTIONS].filter((it) => {
    const needle = q.toLowerCase();
    if (!needle) return true;
    return (it.label + " " + (it.desc ?? "")).toLowerCase().includes(needle);
  });

  async function pick(item) {
    setOpen(false); setQ("");
    if (item.href) window.location.href = item.href;
    else if (item.run) {
      try {
        const r = await item.run();
        setToast(JSON.stringify(r).slice(0, 120));
        setTimeout(() => setToast(null), 2600);
      } catch (e) { setToast("Action failed"); setTimeout(() => setToast(null), 2000); }
    }
  }

  if (!open) {
    return toast ? <div className="toasts"><div className="toast ok">{toast}</div></div> : null;
  }

  return (
    <>
      <div className="cmdk-overlay" onClick={() => setOpen(false)}>
        <div className="cmdk" onClick={(e) => e.stopPropagation()}>
          <input autoFocus value={q} onChange={(e) => { setQ(e.target.value); setCursor(0); }}
            placeholder="Search pages and actions…" onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(list.length - 1, c + 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(0, c - 1)); }
              if (e.key === "Enter" && list[cursor]) pick(list[cursor]);
            }} />
          <div className="cmdk-list">
            {list.map((it, i) => (
              <div key={it.label + (it.href || "")} className={`cmdk-item ${i === cursor ? "active" : ""}`}
                onMouseEnter={() => setCursor(i)} onClick={() => pick(it)}>
                <div>
                  <b>{it.label}</b>
                  <small style={{ marginLeft: 8 }}>{it.desc}</small>
                </div>
                <small>{it.group}</small>
              </div>
            ))}
            {list.length === 0 && <div className="empty">No matches.</div>}
          </div>
          <div className="cmdk-foot">
            <span><kbd>↑↓</kbd> move</span><span><kbd>↵</kbd> open</span><span><kbd>esc</kbd> close</span>
            <span style={{ marginLeft: "auto" }}><kbd>⌘/Ctrl K</kbd> to reopen</span>
          </div>
        </div>
      </div>
      {toast && <div className="toasts"><div className="toast ok">{toast}</div></div>}
    </>
  );
}