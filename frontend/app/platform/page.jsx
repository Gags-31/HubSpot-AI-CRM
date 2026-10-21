"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Bars, Gauge } from "../../components/charts";
import { KV, Skeleton, Toasts, useToasts } from "../../components/ui";

export default function Platform() {
  const [agents, setAgents] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [model, setModel] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [audit, setAudit] = useState([]);
  const [llm, setLlm] = useState(null);
  const [train, setTrain] = useState(null);
  const { items, push } = useToasts();

  async function refresh() {
    const [a, m, ml, j, au, l] = await Promise.all([
      api.agents(), api.metrics(), api.mlModel(), api.jobs(), api.audit(15),
      fetch("/ops/llm").then((r) => r.json()),
    ]);
    setAgents(a); setMetrics(m); setModel(ml); setJobs(j); setAudit(au); setLlm(l);
  }

  useEffect(() => { refresh().catch(() => {}); }, []);

  const latency = Object.entries(metrics?.latency ?? {}).sort((a, b) => b[1].avg_ms - a[1].avg_ms).slice(0, 6);

  return (
    <>
      <Toasts items={items} />
      <div className="grid g3">
        <div className="card tight">
          <div className="stat-label">Agents online</div>
          <div className="stat accent">{agents?.agents?.length ?? "—"}</div>
          <div className="stat-delta">orchestrated by {agents?.orchestrator}</div>
        </div>
        <div className="card tight">
          <div className="stat-label">Model</div>
          <div className="stat" style={{ fontSize: 20, color: model?.loaded ? "var(--ok)" : "var(--warn)" }}>
            {model?.loaded ? "trained" : "heuristic"}
          </div>
          <div className="stat-delta">
            {model?.metrics?.mean_cv_accuracy != null ? `CV accuracy ${model.metrics.mean_cv_accuracy}` : "train on the platform tab"}
          </div>
        </div>
        <div className="card tight">
          <div className="stat-label">LLM</div>
          <div className="stat" style={{ fontSize: 20 }}>{llm?.configured ? llm.model : "fallback"}</div>
          <div className="stat-delta">rule-based engine when no key is set</div>
        </div>
      </div>

      <div className="section-title">Agent mesh</div>
      <div className="grid g3">
        {(agents?.agents ?? []).map((a) => (
          <div className="card tight" key={a.name}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <b>{a.name}</b><span className="badge ok">ready</span>
            </div>
            <p style={{ margin: "6px 0 0", fontSize: 12.5 }}>{a.description}</p>
          </div>
        ))}
      </div>

      <div className="section-title">Telemetry</div>
      <div className="grid g2">
        <div className="card">
          <div className="card-title"><div><h3>Endpoint latency</h3><p>Average response time per path</p></div></div>
          {latency.length ? <Bars data={latency.map(([path, s]) => ({ label: path.slice(0, 10), value: Math.round(s.avg_ms) }))} format={(v) => `${v}ms`} /> : <Skeleton rows={3} />}
          <table style={{ marginTop: 30 }}>
            <thead><tr><th>Endpoint</th><th>Calls</th><th>avg</th><th>p95</th></tr></thead>
            <tbody>
              {latency.map(([path, s]) => (
                <tr key={path}><td className="mono">{path}</td><td>{s.count}</td><td>{s.avg_ms}ms</td><td>{s.p95_ms}ms</td></tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="card-title"><div><h3>Domain counters</h3><p>Business events processed</p></div></div>
          <div style={{ display: "grid", placeItems: "center" }}>
            <Gauge value={Math.min(1, (metrics?.counters?.messages_received ?? 0) / 50)} label="messages (50 = full)"
              tone="var(--brand)" />
          </div>
          <div style={{ marginTop: 18 }}>
            {Object.entries(metrics?.counters ?? {}).filter(([k]) => !k.startsWith("audit")).slice(0, 8).map(([k, v]) => (
              <KV key={k} label={k.replace(/_/g, " ")} value={v} />
            ))}
          </div>
        </div>
      </div>

      <div className="section-title">Model &amp; jobs</div>
      <div className="grid g2">
        <div className="card">
          <div className="card-title"><div><h3>Churn / purchase model</h3><p>Features: {(model?.features ?? []).join(", ")}</p></div></div>
          {train ? <pre style={{ maxHeight: 200 }}>{JSON.stringify(train, null, 2)}</pre> : <Skeleton rows={4} />}
          <div className="badge brand" style={{ marginTop: 12 }}>Model status: heuristic / trained on demand</div>
        </div>

        <div className="card">
          <div className="card-title"><div><h3>Background jobs</h3><p>Transcription, proposal and training work</p></div></div>
          {jobs.length === 0 ? <p style={{ color: "var(--text-dim)" }}>No jobs yet — generate a proposal in the background from the Proposals tab.</p> : (
            <table>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id}>
                    <td><b>{j.kind}</b><div className="mono" style={{ color: "var(--text-faint)" }}>{j.id}</div></td>
                    <td><span className={`badge ${j.status === "done" ? "ok" : j.status === "failed" ? "danger" : "warn"}`}>{j.status}</span></td>
                    <td>{j.duration_s ? `${j.duration_s}s` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="row" style={{ marginTop: 14 }}>
            <button className="btn ghost tiny" onClick={async () => { await api.spark(); push("Spark feature job executed", "ok"); }}>Run Spark job</button>
            <button className="btn ghost tiny" onClick={async () => { await api.kafka("hubspot.conversations", "demo"); push("Kafka event published", "ok"); }}>Publish event</button>
          </div>
        </div>
      </div>

      <div className="section-title">Security audit trail</div>
      <div className="card">
        <table>
          <tbody>
            {audit.map((a, i) => (
              <tr key={i}><td className="mono">{String(a.ts).slice(11, 19)}</td><td>{a.user}</td><td><span className="badge">{a.action}</span></td><td className="mono">{a.resource}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}