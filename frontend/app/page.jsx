"use client";
import { useEffect, useState } from "react";
import { api, fmt } from "../lib/api";

export default function Dashboard() {
  const [health, setHealth] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [portfolio, setPortfolio] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [h, c, p, o, pf] = await Promise.all([api.health(), api.customers(), api.products(), api.orders(), api.portfolio()]);
        setHealth(h); setCustomers(c); setProducts(p.products); setOrders(o); setPortfolio(pf);
      } catch (e) { setErr(String(e)); }
    })();
  }, []);

  const revenue = orders.reduce((s, o) => s + (o.grand_total || 0), 0);

  return (
    <>
      <h1>HubSpot Dashboard</h1>
      <p>Conversation in, structured intelligence out. Version {health?.version ?? "—"} · {health?.agents ?? "—"} agents · DB: {health?.database}</p>
      {err && <pre>Error: {err}</pre>}

      <h2>Key metrics</h2>
      <div className="grid cols-3">
        <div className="card"><div className="kpi-label">Consumers</div><div className="stat">{customers.length}</div></div>
        <div className="card"><div className="kpi-label">Conversations</div><div className="stat">{portfolio?.conversations ?? 0}</div></div>
        <div className="card"><div className="kpi-label">Orders</div><div className="stat">{orders.length}</div></div>
        <div className="card"><div className="kpi-label">Revenue (INR)</div><div className="stat">{fmt(revenue)}</div></div>
        <div className="card"><div className="kpi-label">Catalog items</div><div className="stat">{products.length}</div></div>
        <div className="card"><div className="kpi-label">Negative sentiment</div><div className="stat">{portfolio?.negative_sentiment?.length ?? 0}</div></div>
      </div>

      <h2>Portfolio</h2>
      <div className="card">
        {(portfolio?.high_value ?? []).map((c) => (
          <p key={c.customer_id}><b>{c.customer_id}</b> · {c.total_conversations} conversations · {c.total_orders} orders · ₹{fmt(c.total_spend)}</p>
        ))}
        {!portfolio?.high_value?.length && <p>No data yet — open the Live Chat page and start a conversation.</p>}
      </div>

      <h2>Modules</h2>
      <div className="grid cols-2">
        <div className="card"><h3>Conversational CRM</h3><p>Real-time WebSocket chat with live entity extraction. <a href="/web/chat/">Open live chat</a>.</p></div>
        <div className="card"><h3>Proposal Engine</h3><p>Terms extracted from conversation, missing fields auto-asked, versioning and PDF export. <a href="/web/proposals/">Proposals</a>.</p></div>
        <div className="card"><h3>Commerce</h3><p>Catalog with budget-fit and recommendations, cart and order lifecycle. <a href="/web/products/">Products</a> · <a href="/web/orders/">Orders</a>.</p></div>
        <div className="card"><h3>Intelligence</h3><p>Customer 360°, memory, ML predictions and next-best-action. <a href="/web/consumers/">Customer 360</a>.</p></div>
        <div className="card"><h3>Platform</h3><p>Agents, telemetry, model training, background jobs, Kafka/Spark hooks, audit trail. <a href="/web/platform/">Platform</a>.</p></div>
        <div className="card"><h3>Architecture</h3><p>Per-module flowcharts render live at <a href="/architecture.html">/architecture.html</a>.</p></div>
      </div>
    </>
  );
}