"use client";
import { useEffect, useState } from "react";
import { api, fmt } from "../../lib/api";

export default function Platform() {
  const [agents, setAgents] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [model, setModel] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [audit, setAudit] = useState([]);
  const [llm, setLlm] = useState(null);
  const [msg, setMsg] = useState("");

  async function refresh() {
    const [a, m, ml, j, au] = await Promise.all([api.agents(), api.metrics(), api.mlModel(), api.jobs(), api.audit(15)]);
    setAgents(a); setMetrics(m); setModel(ml); setJobs(j); setAudit(au);
    setLlm(await fetch("/ops/llm").then((r) => r.json()));
  }

  useEffect(() => { refresh().catch(() => {}); }, []);

  return (
    <>
      <h1>Platform</h1>
      <p>Agents, telemetry, ML model, background jobs, streaming and audit trail.</p>

      <h2>Agents ({agents?.agents?.length ?? 0})</h2>
      <div className="grid cols-2">
        {(agents?.agents ?? []).map((a) => (
          <div className="card" key={a.name}><h3>{a.name}</h3><p>{a.description}</p></div>
        ))}
      </div>

      <h2>Telemetry</h2>
      <div className="card">
        <p>LLM configured: {llm?.configured ? llm.model : "no (rule-based fallback active)"}</p>
        <table><tbody>
          {Object.entries(metrics?.counters ?? {}).slice(0, 14).map(([k, v]) => (
            <tr key={k}><th>{k}</th><td>{v}</td></tr>
          ))}
        </tbody></table>
        <h3 style={{ marginTop: 12 }}>Slowest endpoints</h3>
        <table><tbody>
          {Object.entries(metrics?.latency ?? {}).slice(0, 8).map(([path, s]) => (
            <tr key={path}><th>{path}</th><td>{s.count} req · avg {s.avg_ms}ms · p95 {s.p95_ms}ms</td></tr>
          ))}
        </tbody></table>
      </div>

      <h2>ML model</h2>
      <div className="card">
        <p>Loaded: {model?.loaded ? "yes" : "no (heuristic scoring in use)"}</p>
        <p>Features: {(model?.features ?? []).join(", ")}</p>
        {model?.metrics?.mean_cv_accuracy != null && <p>Mean CV accuracy: {model.metrics.mean_cv_accuracy}</p>}
        <button onClick={async () => { const r = await api.trainModel(); setMsg(JSON.stringify(r).slice(0, 240)); refresh(); }}>Train model</button>
        {msg && <pre>{msg}</pre>}
      </div>

      <h2>Background jobs</h2>
      <div className="card">
        {jobs.length === 0 && <p>No jobs yet — generate a proposal in the background from the Proposals page.</p>}
        {jobs.map((j) => (
          <p key={j.id}><b>{j.kind}</b> · {j.status} · {j.duration_s ? `${j.duration_s}s` : ""} <span className="badge">{j.id}</span></p>
        ))}
      </div>

      <h2>Streaming engines</h2>
      <div className="card">
        <div className="row">
          <button className="ghost" onClick={async () => setMsg(JSON.stringify(await api.spark()))}>Run Spark feature job</button>
          <button className="ghost" onClick={async () => setMsg(JSON.stringify(await api.kafka("hubspot.conversations", "demo event")))}>Publish Kafka event</button>
        </div>
        {msg && <pre>{msg}</pre>}
      </div>

      <h2>Security audit trail</h2>
      <div className="card">
        <table><tbody>
          {audit.map((a, i) => <tr key={i}><td>{a.ts}</td><td>{a.user}</td><td>{a.action}</td><td>{a.resource}</td></tr>)}
        </tbody></table>
      </div>

      <h2>Data model</h2>
      <div className="card">
        <p>SQLite tables: customers, conversations, messages, requirements, proposals, products,
          orders, order_items, memory, workspace_entries, vectors, users, audit, metrics — {fmt(14)} tables.</p>
      </div>
    </>
  );
}