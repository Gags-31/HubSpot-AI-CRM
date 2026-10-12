"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";

export default function Consumers() {
  const [customers, setCustomers] = useState([]);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState("Consumer_DEMO01");
  const [ws, setWs] = useState(null);
  const [an, setAn] = useState(null);
  const [audit, setAudit] = useState([]);
  const [err, setErr] = useState(null);

  async function refresh() {
    try {
      setCustomers(await api.customers());
      setAudit(await api.audit(12));
    } catch (e) { setErr(String(e)); }
  }

  useEffect(() => { refresh(); }, []);

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
    load(c.id);
  }

  const profile = an?.profile;
  const pred = an?.prediction;

  return (
    <>
      <h1>Customer 360° Intelligence</h1>
      <p>Digital workspace, long-term memory, ML predictions and ranked next-best-actions.</p>
      {err && <pre>{err}</pre>}

      <div className="card" style={{ marginTop: 12 }}>
        <div className="row">
          <input value={name} placeholder="New consumer name" onChange={(e) => setName(e.target.value)} style={{ maxWidth: 240 }} />
          <button onClick={create}>Create consumer workspace</button>
        </div>
        <div className="row" style={{ marginTop: 10 }}>
          {customers.map((c) => (
            <button key={c.id} className="ghost" onClick={() => load(c.id)}>{c.id} · {c.name}</button>
          ))}
        </div>
      </div>

      <h2>{selected}</h2>
      <div className="grid cols-2">
        <div className="card">
          <h3>Digital workspace</h3>
          {ws && Object.entries(ws.sections).map(([k, v]) => (
            <p key={k}><b>{k}</b>: {v.length === 0 ? "empty" : `${v.length} entr${v.length > 1 ? "ies" : "y"}`}</p>
          ))}
          {ws && <p><b>Order value:</b> ₹{ws.totals.order_value} · <b>orders:</b> {ws.totals.orders} · <b>proposals:</b> {ws.totals.proposals}</p>}
          {ws && <p><b>Memory keys:</b> {Object.keys(ws.memory).join(", ") || "none"}</p>}
        </div>

        <div className="card">
          <h3>360° profile</h3>
          {profile ? (
            <table><tbody>
              <tr><th>Conversations</th><td>{profile.total_conversations}</td></tr>
              <tr><th>Orders</th><td>{profile.total_orders}</td></tr>
              <tr><th>Total spend</th><td>₹{profile.total_spend}</td></tr>
              <tr><th>Sentiment</th><td>{profile.sentiment}</td></tr>
              <tr><th>Intents</th><td>{profile.intents.join(", ") || "—"}</td></tr>
              <tr><th>Products of interest</th><td>{profile.products_of_interest.join(", ") || "—"}</td></tr>
            </tbody></table>
          ) : <p>Load a consumer.</p>}

          {pred && (
            <>
              <h3 style={{ marginTop: 14 }}>ML predictions <span className="badge">{pred.engine}</span></h3>
              <table><tbody>
                <tr><th>Purchase probability</th><td>{pred.purchase_probability}</td></tr>
                <tr><th>Proposal acceptance</th><td>{pred.proposal_acceptance}</td></tr>
                <tr><th>Churn risk</th><td>{pred.churn_risk}</td></tr>
                <tr><th>CLV estimate</th><td>₹{pred.clv_estimate}</td></tr>
                <tr><th>Engagement</th><td>{pred.engagement}</td></tr>
              </tbody></table>
              <p style={{ marginTop: 8 }}>{pred.recommendation}</p>
            </>
          )}

          {an?.next_actions && (
            <>
              <h3 style={{ marginTop: 14 }}>Ranked next-best-actions</h3>
              {an.next_actions.slice(0, 5).map((a, i) => (
                <p key={a.action}>{i + 1}. {a.action} <span className={`badge ${a.priority === "high" ? "warn" : ""}`}>{a.score} · {a.priority}</span></p>
              ))}
            </>
          )}
        </div>
      </div>

      <h2>Audit log (security &amp; privacy)</h2>
      <div className="card">
        <table><tbody>
          {audit.map((a, i) => <tr key={i}><td>{a.ts}</td><td>{a.user}</td><td>{a.action}</td><td>{a.resource}</td></tr>)}
        </tbody></table>
      </div>
    </>
  );
}