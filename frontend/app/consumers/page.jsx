"use client";
import { useEffect, useState } from "react";
import { api, fmt } from "../../lib/api";
import { Donut } from "../../components/charts";
import { Empty, KV, Skeleton, Toasts, useToasts } from "../../components/ui";

export default function Consumers() {
  const [customers, setCustomers] = useState([]);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState("Consumer_DEMO01");
  const [ws, setWs] = useState(null);
  const [an, setAn] = useState(null);
  const [audit, setAudit] = useState([]);
  const { items, push } = useToasts();

  async function refresh() {
    try {
      setCustomers(await api.customers());
      setAudit(await api.audit(12));
    } catch (e) { push(e.message, "warn"); }
  }

  useEffect(() => { refresh(); load("Consumer_DEMO01"); }, []);

  async function load(id) {
    setSelected(id);
    setWs(await api.workspace(id));
    setAn(await api.analytics(id));
  }

  async function create() {
    if (!name.trim()) return;
    const c = await api.createCustomer(name.trim());
    setName("");
    await refresh();
    await load(c.id);
    push(`Workspace created for ${c.id}`, "ok");
  }

  const p = an?.profile;
  const pred = an?.prediction;

  return (
    <>
      <Toasts items={items} />
      <div className="card">
        <div className="row">
          <input placeholder="New consumer name" value={name} onChange={(e) => setName(e.target.value)}
            style={{ maxWidth: 260 }} />
          <button className="btn" onClick={create}>Create consumer workspace</button>
          <span className="spacer" />
          <div className="pill-row">
            {customers.slice(0, 8).map((c) => (
              <button key={c.id} className={`pill ${selected === c.id ? "active" : ""}`} onClick={() => load(c.id)}>
                {c.id.replace("Consumer_", "")}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="section-title">{selected}</div>
      <div className="grid g2" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
        <div className="card">
          <div className="card-title"><div><h3>Digital workspace</h3><p>8 sections filled by the agents</p></div></div>
          {ws ? Object.entries(ws.sections).map(([k, v]) => (
            <div className="kv" key={k}>
              <span style={{ fontSize: 13 }}>{k}</span>
              <b>{v.length === 0 ? <span className="badge">empty</span> : <span className="badge ok">{v.length}</span>}</b>
            </div>
          )) : <Skeleton rows={6} />}
          {ws && (
            <div style={{ marginTop: 12 }}>
              <KV label="Order value" value={`₹${fmt(ws.totals.order_value)}`} />
              <KV label="Proposals" value={ws.totals.proposals} />
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-title"><div><h3>360° profile</h3><p>AI-generated view of the consumer</p></div></div>
          {p ? (
            <>
              <KV label="Conversations" value={p.total_conversations} />
              <KV label="Orders" value={p.total_orders} />
              <KV label="Total spend" value={`₹${fmt(p.total_spend)}`} />
              <KV label="Sentiment" value={p.sentiment} />
              <KV label="Intents" value={p.intents.join(", ") || "—"} />
              <div className="stat-label" style={{ margin: "14px 0 6px" }}>Products of interest</div>
              {p.products_of_interest.length === 0 ? <Empty>No orders yet.</Empty> :
                <div className="pill-row">{p.products_of_interest.map((x) => <span key={x} className="pill">{x}</span>)}</div>}
              <div style={{ marginTop: 16 }}>
                <Donut
                  segments={[
                    { label: "Conversations", value: p.total_conversations, color: "var(--brand)" },
                    { label: "Orders", value: p.total_orders * 3, color: "var(--ok)" },
                  ]}
                  center={p.total_conversations + p.total_orders}
                  centerLabel="touchpoints"
                />
              </div>
            </>
          ) : <Skeleton rows={6} />}
        </div>

        <div className="card">
          <div className="card-title">
            <div><h3>Predictive intelligence</h3><p>{pred?.engine ?? "loading model…"}</p></div>
          </div>
          {pred ? (
            <>
              <KV label="Purchase probability" value={pred.purchase_probability} />
              <KV label="Proposal acceptance" value={pred.proposal_acceptance} />
              <KV label="Churn risk" value={<span className={pred.churn_risk > 0.5 ? "danger" : "ok"}>{pred.churn_risk}</span>} />
              <KV label="CLV estimate" value={`₹${fmt(pred.clv_estimate)}`} />
              <KV label="Engagement" value={pred.engagement} />
              <p style={{ marginTop: 12, color: "var(--text-dim)" }}>{pred.recommendation}</p>

              <div className="stat-label" style={{ margin: "16px 0 8px" }}>Ranked next-best-actions</div>
              <div className="list">
                {(an?.next_actions ?? []).slice(0, 5).map((a, i) => (
                  <div className="row" key={a.action} style={{ gap: 10 }}>
                    <span className="badge">{i + 1}</span>
                    <span style={{ flex: 1, fontSize: 13.5 }}>{a.action}</span>
                    <span className={`badge ${a.priority === "high" ? "warn" : ""}`}>{a.score}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <Skeleton rows={6} />}
        </div>
      </div>

      <div className="section-title">Memory &amp; audit</div>
      <div className="grid g2">
        <div className="card">
          <h3>Long-term customer memory</h3>
          {ws ? <pre style={{ maxHeight: 220 }}>{JSON.stringify(ws.memory, null, 2)}</pre> : <Skeleton rows={4} />}
        </div>
        <div className="card">
          <h3>Security audit trail</h3>
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            <table>
              <tbody>
                {audit.map((a, i) => (
                  <tr key={i}><td className="mono">{String(a.ts).slice(11, 19)}</td><td>{a.action}</td><td>{a.resource}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}