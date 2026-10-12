"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Gauge } from "../../components/charts";
import { Empty, Skeleton, Toasts, useToasts } from "../../components/ui";

export default function Proposals() {
  const [proposals, setProposals] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [active, setActive] = useState(null);
  const { items, push } = useToasts();

  async function refresh(id) {
    setProposals(await api.proposals(id));
  }

  useEffect(() => {
    api.customers().then(setCustomers).catch(() => {});
    refresh().then((p) => setActive(p[0] ?? null)).catch(() => {});
  }, []);

  async function generate() {
    if (!customerId) return push("Pick a customer first", "warn");
    const r = await api.generateProposal(customerId, ["I need 80 sensor kits, budget Rs 2 lakh, delivery before the 25th"]);
    setActive(r);
    await refresh(customerId);
    push(`Proposal ${r.id} generated`, "ok");
  }

  async function backgroundJob() {
    const r = await api.generateProposal("Consumer_DEMO03", ["Need 15 control units and AMC"], true);
    setActive(null);
    push(`Background job ${r.job.id} queued`, "ok");
    await refresh();
  }

  async function setStatus(id, status) {
    await api.setProposalStatus(id, status);
    await refresh(customerId);
    setActive((a) => ({ ...a, status }));
    push(`${id} marked ${status}`, "ok");
  }

  return (
    <>
      <Toasts items={items} />
      <div className="card">
        <div className="row">
          <div style={{ minWidth: 230 }}>
            <select value={customerId} onChange={(e) => { setCustomerId(e.target.value); refresh(e.target.value); }}>
              <option value="">All customers</option>
              {customers.map((c) => <option key={c.id}>{c.id}</option>)}
            </select>
          </div>
          <button className="btn" onClick={generate} disabled={!customerId}>Generate for customer</button>
          <button className="btn ghost" onClick={backgroundJob}>Run in background</button>
          <span className="spacer" />
          <span className="badge">{proposals.length} proposal(s)</span>
        </div>
      </div>

      <div className="grid g2" style={{ marginTop: 16, gridTemplateColumns: "1fr 1.1fr" }}>
        <div className="card">
          <div className="card-title"><div><h3>Proposals</h3><p>Generated from conversation, versioned</p></div></div>
          {proposals.length === 0 ? <Empty>No proposals yet.</Empty> : (
            <div className="list">
              {proposals.map((p) => (
                <div key={p.id} className="row" style={{
                  padding: "10px 12px", borderRadius: 10, cursor: "pointer",
                  border: "1px solid " + (active?.id === p.id ? "var(--brand)" : "var(--border-soft)"),
                  background: active?.id === p.id ? "var(--brand-soft)" : "transparent",
                }} onClick={() => setActive(p)}>
                  <div style={{ flex: 1 }}>
                    <b className="mono">{p.id}</b>
                    <div style={{ fontSize: 12.5, color: "var(--text-dim)" }}>{p.customer_id} · v{p.version}</div>
                  </div>
                  <span className={`badge ${p.status === "sent" ? "ok" : p.status === "draft" ? "warn" : "brand"}`}>{p.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          {active ? (
            <>
              <div className="card-title">
                <div><h3 className="mono">{active.id}</h3><p>{active.customer_id} · version {active.version}</p></div>
                <span className="badge brand">{active.status}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "center", margin: "8px 0 16px" }}>
                <Gauge value={0.999} label="generated" tone="var(--brand)" />
              </div>
              <pre style={{ maxHeight: 360 }}>{active.body}</pre>
              <div className="row" style={{ marginTop: 12 }}>
                <a className="btn" href={`/proposals/${active.id}/pdf`} target="_blank">Download PDF</a>
                <button className="btn ghost" onClick={() => setStatus(active.id, "approved")}>Approve</button>
                <button className="btn ghost" onClick={() => setStatus(active.id, "sent")}>Mark sent</button>
              </div>
            </>
          ) : <Skeleton rows={8} />}
        </div>
      </div>
    </>
  );
}