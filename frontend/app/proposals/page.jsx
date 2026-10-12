"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";

export default function Proposals() {
  const [proposals, setProposals] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [out, setOut] = useState(null);

  async function refresh(id) {
    setProposals(await api.proposals(id));
  }

  useEffect(() => { api.customers().then(setCustomers).catch(() => {}); refresh(); }, []);

  async function generateForCustomer() {
    if (!customerId) return;
    const r = await api.generateProposal(customerId, ["I need 80 sensor kits, budget Rs 2 lakh, delivery before the 25th"]);
    setOut(r);
    refresh(customerId);
  }

  async function backgroundJob() {
    const r = await api.generateProposal("Consumer_DEMO03", ["Need 15 control units and AMC"], true);
    setOut(r);
  }

  return (
    <>
      <h1>Proposals</h1>
      <p>Generated from conversation, versioned, with missing information auto-detected. PDFs are downloadable.</p>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="row">
          <select value={customerId} onChange={(e) => { setCustomerId(e.target.value); refresh(e.target.value); }} style={{ maxWidth: 240 }}>
            <option value="">All customers</option>
            {customers.map((c) => <option key={c.id}>{c.id}</option>)}
          </select>
          <button onClick={generateForCustomer} disabled={!customerId}>Generate for customer</button>
          <button className="ghost" onClick={backgroundJob}>Generate in background job</button>
        </div>
      </div>

      {out?.job && (
        <div className="card" style={{ marginTop: 12 }}>
          <h3>Background job {out.job.id}</h3>
          <p>status: {out.job.status} — poll <code>/ops/jobs/{out.job.id}</code></p>
        </div>
      )}
      {out?.id && (
        <div className="card" style={{ marginTop: 12 }}>
          <h3>{out.id} · {out.completeness.complete ? "complete" : `${Math.round(out.completeness.score * 100)}% filled`}</h3>
          <pre>{out.body}</pre>
          <div className="row">
            <a className="badge ok" href={`/proposals/${out.id}/pdf`} target="_blank">Download PDF</a>
            <button className="ghost" onClick={async () => { await api.setProposalStatus(out.id, "approved"); refresh(customerId); }}>Approve</button>
            <button className="ghost" onClick={async () => { await api.setProposalStatus(out.id, "sent"); refresh(customerId); }}>Mark sent</button>
          </div>
        </div>
      )}

      <h2>All proposals</h2>
      <div className="card">
        {proposals.length === 0 && <p>No proposals yet.</p>}
        {proposals.map((p) => (
          <div key={p.id} style={{ borderBottom: "1px solid #1e293b", padding: "8px 0" }}>
            <b>{p.id}</b> · {p.customer_id} · v{p.version} · <span className="badge">{p.status}</span>{" "}
            <a className="badge ok" href={`/proposals/${p.id}/pdf`} target="_blank">PDF</a>
            <p style={{ margin: "4px 0 0" }}>{p.body.splitlines()[0]}</p>
          </div>
        ))}
      </div>
    </>
  );
}