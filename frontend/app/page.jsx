"use client";
import { useEffect, useState } from "react";
import { api, fmt } from "../lib/api";

export default function Dashboard() {
  const [health, setHealth] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [err, setErr] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [h, c, p, o] = await Promise.all([api.health(), api.customers(), api.products(), api.orders()]);
        setHealth(h); setCustomers(c); setProducts(p); setOrders(o);
      } catch (e) { setErr(String(e)); }
    })();
  }, []);

  const revenue = orders.reduce((s, o) => s + (o.grand_total || 0), 0);

  return (
    <>
      <h1>HubSpot Dashboard</h1>
      <p>AI-first CRM — conversation in, structured intelligence out.</p>
      {err && <pre>Error: {err}</pre>}

      <h2>Key metrics</h2>
      <div className="grid cols-3">
        <div className="card"><div className="kpi-label">Consumers</div><div className="stat">{customers.length}</div></div>
        <div className="card"><div className="kpi-label">Products</div><div className="stat">{products.length}</div></div>
        <div className="card"><div className="kpi-label">Orders</div><div className="stat">{orders.length}</div></div>
        <div className="card"><div className="kpi-label">Order value (INR)</div><div className="stat">{fmt(revenue)}</div></div>
        <div className="card"><div className="kpi-label">Proposals</div><div className="stat">auto</div></div>
        <div className="card"><div className="kpi-label">API status</div><div className="stat" style={{ fontSize: 18 }}>{health?.healthy ? "online" : "…"}</div></div>
      </div>

      <h2>Modules</h2>
      <div className="grid cols-2">
        <div className="card"><h3>Conversational CRM</h3><p>Text and voice conversations that the AI records and understands. Open <a href="/web/chat/">the conversation view</a>.</p></div>
        <div className="card"><h3>Proposal Engine</h3><p>Terms extracted from conversation, missing fields detected, proposal rendered automatically.</p></div>
        <div className="card"><h3>Product &amp; Order Workspace</h3><p>Catalog with budget-fit and recommendations. Place orders on the <a href="/web/orders/">orders page</a>.</p></div>
        <div className="card"><h3>Customer 360°</h3><p>Memory, prediction and next-best-action for every consumer. See <a href="/web/consumers/">Customer 360</a>.</p></div>
      </div>

      <h2>Architecture</h2>
      <p>Flowcharts for every module (Mermaid) are available at <a href="/architecture.html">/architecture.html</a>.</p>
    </>
  );
}