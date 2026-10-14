"use client";
import { useEffect, useState } from "react";
import { api, fmt } from "../lib/api";
import { Bars, Donut, Progress } from "../components/charts";
import { Skeleton, useToasts, Toasts } from "../components/ui";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [portfolio, setPortfolio] = useState(null);
  const { items, push } = useToasts();

  useEffect(() => {
    (async () => {
      try {
        const [h, c, p, o, pf] = await Promise.all([api.health(), api.customers(), api.products(), api.orders(), api.portfolio()]);
        setData({ h, customers: c, products: p.products, orders: o });
        setPortfolio(pf);
      } catch (e) {
        push(`Could not load dashboard: ${e.message}`, "warn");
      }
    })();
  }, []);

  const revenue = (data?.orders ?? []).reduce((s, o) => s + (o.grand_total || 0), 0);
  const spendChart = (portfolio?.high_value ?? []).map((c) => ({ label: c.customer_id.replace("Consumer_", ""), value: c.total_spend }));

  return (
    <>
      <Toasts items={items} />
      <div className="grid g4">
        {[
          ["Consumers", data?.customers.length, "var(--accent)"],
          ["Conversations", portfolio?.conversations, "var(--brand)"],
          ["Orders", data?.orders.length, "var(--violet)"],
          ["Revenue (₹)", revenue ? fmt(revenue) : 0, "var(--ok)"],
        ].map(([label, value, color]) => (
          <div className="card" key={label}>
            <div className="stat-label">{label}</div>
            <div className="stat" style={{ color }}>{value ?? "—"}</div>
            <div className="stat-delta">{data ? "live from API" : "loading…"}</div>
          </div>
        ))}
      </div>

      <div className="section-title">Dealer portfolio</div>
      <div className="grid g2">
        <div className="card">
          <div className="card-title">
            <div><h3>Revenue by customer</h3><p>Total order value per consumer</p></div>
            <span className="badge brand">{portfolio?.orders ?? 0} orders</span>
          </div>
          {spendChart.length ? (
            <Bars data={spendChart} format={(v) => `₹${fmt(v / 1000)}k`} />
          ) : <Skeleton rows={3} />}
        </div>

        <div className="card">
          <div className="card-title">
            <div><h3>Sentiment health</h3><p>Where the dealer needs attention</p></div>
          </div>
          {portfolio ? (
            <Donut
              segments={[
                { label: "Healthy", value: Math.max(0, portfolio.customers - portfolio.negative_sentiment.length), color: "var(--ok)" },
                { label: "Negative", value: portfolio.negative_sentiment.length, color: "var(--danger)" },
              ]}
              center={portfolio.customers}
              centerLabel="customers"
            />
          ) : <Skeleton rows={2} />}
        </div>
      </div>

      <div className="section-title">System</div>
      <div className="grid g3">
        <div className="card">
          <h3>System health</h3>
          <div className="kv"><span className="stat-label">Version</span><b>{data?.h.version ?? "—"}</b></div>
          <div className="kv"><span className="stat-label">Agents</span><b>{data?.h.agents ?? "—"}</b></div>
          <div className="kv"><span className="stat-label">Database</span><b>{data?.h.database ?? "—"}</b></div>
          <div className="kv"><span className="stat-label">LLM</span><b>{data?.h.llm_configured ? "connected" : "rule-based fallback"}</b></div>
        </div>

        <div className="card">
          <h3>Attention required</h3>
          {(portfolio?.negative_sentiment ?? []).length === 0 && <p style={{ color: "var(--text-dim)" }}>No customers flagged as negative.</p>}
          {(portfolio?.negative_sentiment ?? []).map((id) => (
            <div key={id} className="kv"><span className="badge danger">complaint risk</span><a href="/consumers/">{id}</a></div>
          ))}
          <div style={{ marginTop: 12 }}>
            <div className="stat-label" style={{ marginBottom: 6 }}>Conversation coverage</div>
            <Progress value={Math.min(100, (portfolio?.customers ? (portfolio.conversations / portfolio.customers) * 25 : 0))} />
          </div>
        </div>

        <div className="card">
          <h3>Quick actions</h3>
          <div className="list" style={{ marginTop: 8 }}>
            <a className="btn" href="/chat/">Start a conversation</a>
            <a className="btn ghost" href="/proposals/">Generate a proposal</a>
            <a className="btn ghost" href="/platform/">Train the ML model</a>
          </div>
        </div>
      </div>
    </>
  );
}