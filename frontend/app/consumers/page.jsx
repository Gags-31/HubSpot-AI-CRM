"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";

export default function Consumers() {
  const [customers, setCustomers] = useState([]);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState("Consumer_001");
  const [ws, setWs] = useState(null);
  const [an, setAn] = useState(null);
  const [audit, setAudit] = useState([]);
  const [err, setErr] = useState(null);

  async function refresh() {
    try {
      const c = await api.customers();
      setCustomers(c);
      setAudit(await fetch("/security/audit").then((r) => r.json()));
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

  return (
    <>
      <h1>Customer 360° Intelligence</h1>
      <p>Memory, predictions and next-best-action for every consumer.</p>
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
          {ws ? Object.entries(ws.sections).map(([k, v]) => (
            <p key={k}><b>{k}:</b> {v.length === 0 ? "empty" : v.map((x) => JSON.stringify(x)).join(" | ")}</p>
          )) : <p>Load a consumer to view its workspace.</p>}
          {ws && <p><b>Order value:</b> ₹{ws.totals.order_value}</p>}
        </div>

        <div className="card">
          <h3>Predictions &amp; next best action</h3>
          {an ? (
            <>
              <table><tbody>
                <tr><th>Total conversations</th><td>{an.total_conversations}</td></tr>
                <tr><th>Purchase probability</th><td>{an.prediction.purchase_probability}</td></tr>
                <tr><th>Proposal acceptance</th><td>{an.prediction.proposal_acceptance}</td></tr>
                <tr><th>Churn risk</th><td>{an.prediction.churn_risk}</td></tr>
                <tr><th>CLV estimate</th><td>₹{an.prediction.clv_estimate}</td></tr>
                <tr><th>Engagement</th><td>{an.prediction.engagement}</td></tr>
              </tbody></table>
              <h3 style={{ marginTop: 14 }}>Ranked actions</h3>
              {an.next_actions.slice(0, 5).map((a, i) => (
                <p key={a.action}>{i + 1}. {a.action} <span className="badge">score {a.score}</span></p>
              ))}
            </>
          ) : <p>Load a consumer to view predictions.</p>}
        </div>
      </div>

      <h2>Audit log (security &amp; privacy)</h2>
      <div className="card"><pre>{JSON.stringify(audit.slice(-12), null, 2)}</pre></div>
    </>
  );
}