"use client";
import { useEffect, useRef, useState } from "react";
import { api, wsUrl } from "../../lib/api";
import { Gauge } from "../../components/charts";
import { Skeleton, Toasts, useToasts } from "../../components/ui";

const SAMPLES = [
  "I need 120 control units, budget Rs 9 lakh, delivery before the 15th. This is urgent.",
  "The last delivery was delayed and it stopped our line. Very poor service.",
  "What is the price of 40 sensor kits with a 3 year warranty?",
];

export default function Chat() {
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState("Consumer_DEMO01");
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState([]);
  const [entities, setEntities] = useState(null);
  const [proposal, setProposal] = useState(null);
  const [connected, setConnected] = useState(false);
  const [answers, setAnswers] = useState({});
  const [phase, setPhase] = useState("idle");
  const ws = useRef(null);
  const bottom = useRef(null);
  const { items, push } = useToasts();

  useEffect(() => { api.customers().then(setCustomers).catch(() => {}); }, []);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [turns]);

  function connect(id) {
    if (ws.current) ws.current.close();
    const socket = new WebSocket(wsUrl(id));
    ws.current = socket;
    socket.onopen = () => { setConnected(true); push(`Live channel open for ${id}`, "ok"); };
    socket.onclose = () => setConnected(false);
    socket.onerror = () => push("WebSocket error", "warn");
    socket.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.event === "transcript") setPhase("understanding…");
      if (m.event === "analysis") { setEntities(m.entities); setPhase("idle"); }
      if (m.event === "proposal") { setProposal(m); push(`Proposal ${m.proposal_id} ready`, "ok"); }
    };
  }

  function send(text) {
    const t = (text ?? input).trim();
    if (!t) return;
    if (!ws.current || ws.current.readyState !== 1) return push("Connect to the live channel first", "warn");
    ws.current.send(JSON.stringify({ type: "message", role: "consumer", text: t }));
    setTurns((v) => [...v, { text: t, role: "consumer" }]);
    setInput("");
  }

  async function fill(field) {
    const value = answers[field];
    if (!value) return;
    const r = await api.answerMissing(customerId, field, value);
    setProposal((p) => ({ ...p, body: r.body, completeness: r.completeness, missing: r.missing }));
    push(`${field} captured — proposal re-rendered`, "ok");
  }

  const missing = (proposal?.missing ?? []).filter((m) => !m.present);
  const completeness = proposal?.completeness?.score ?? 0;

  return (
    <>
      <Toasts items={items} />
      <div className="card">
        <div className="row">
          <div style={{ minWidth: 230 }}>
            <select value={customerId} onChange={(e) => { setCustomerId(e.target.value); connect(e.target.value); }}>
              {customers.length === 0 && <option>Consumer_DEMO01</option>}
              {customers.map((c) => <option key={c.id}>{c.id}</option>)}
            </select>
          </div>
          <button className="btn" onClick={() => connect(customerId)}>Connect live channel</button>
          <span className={`badge ${connected ? "ok" : "warn"}`}>{connected ? "streaming" : "not connected"}</span>
          <span className="spacer" />
          {phase !== "idle" && <span className="badge brand">{phase}</span>}
          <button className="btn ghost tiny" onClick={() => ws.current?.send(JSON.stringify({ type: "propose" }))}>Generate proposal</button>
          <button className="btn ghost tiny" onClick={() => ws.current?.send(JSON.stringify({ type: "close" }))}>End conversation</button>
        </div>
      </div>

      <div className="grid g2" style={{ marginTop: 16, gridTemplateColumns: "1.25fr 1fr" }}>
        <div className="card">
          <div className="card-title">
            <div><h3>Conversation</h3><p>Each turn is recorded, transcribed and analysed in real time</p></div>
          </div>
          <div className="chat">
            {turns.map((t, i) => (
              <div key={i} className={`msg ${t.role === "consumer" ? "consumer" : "dealer"}`}>
                <span className="who">{t.role}</span>{t.text}
              </div>
            ))}
            {entities && (
              <div className="msg ai">
                AI understood → {entities.intent} · {entities.priority} priority
                {entities.quantity ? ` · ${entities.quantity}` : ""}
                {entities.budget ? ` · ${entities.budget}` : ""}
                {entities.topics?.length ? ` · topics: ${entities.topics.join(", ")}` : ""}
              </div>
            )}
            {turns.length === 0 && <div className="empty">Connect and start talking — the AI does the rest.</div>}
            <div ref={bottom} />
          </div>
          <div className="composer">
            <input value={input} placeholder="Type the customer's message…" onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()} />
            <button className="btn" onClick={() => send()} disabled={!connected}>Send</button>
          </div>
          <div className="row tight" style={{ marginTop: 10 }}>
            {SAMPLES.map((s, i) => (
              <button key={i} className="pill" onClick={() => send(s)}>{s.slice(0, 38)}…</button>
            ))}
          </div>
        </div>

        <div className="list">
          <div className="card">
            <div className="card-title"><div><h3>Extracted requirement</h3><p>Written into the consumer workspace automatically</p></div></div>
            {entities ? (
              <>
                <div className="kv"><span className="stat-label">Quantity</span><b>{entities.quantity ?? "—"}</b></div>
                <div className="kv"><span className="stat-label">Budget</span><b>{entities.budget ?? "—"}</b></div>
                <div className="kv"><span className="stat-label">Delivery</span><b>{entities.delivery ?? "—"}</b></div>
                <div className="kv"><span className="stat-label">Intent</span><b>{entities.intent}</b></div>
                <div className="kv"><span className="stat-label">Priority</span><b className={entities.priority === "High" ? "warn" : ""}>{entities.priority}</b></div>
              </>
            ) : <Skeleton rows={5} />}
          </div>

          <div className="card">
            <div className="card-title">
              <div><h3>Proposal</h3><p>Auto-generated with completeness check</p></div>
              {proposal && <span className={`badge ${completeness === 1 ? "ok" : "warn"}`}>{Math.round(completeness * 100)}% complete</span>}
            </div>
            {proposal ? (
              <>
                <div style={{ marginBottom: 12 }}><Gauge value={completeness} label="completeness"
                  tone={completeness === 1 ? "var(--ok)" : "var(--warn)"} /></div>
                <pre style={{ maxHeight: 240 }}>{proposal.body}</pre>
                {missing.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div className="stat-label" style={{ marginBottom: 8 }}>AI is asking the dealer</div>
                    <div className="list">
                      {missing.map((m) => (
                        <div key={m.field} className="row" style={{ gap: 8 }}>
                          <input placeholder={m.question ?? m.field} style={{ flex: 1 }}
                            value={answers[m.field] ?? ""}
                            onChange={(e) => setAnswers((a) => ({ ...a, [m.field]: e.target.value }))} />
                          <button className="btn tiny" onClick={() => fill(m.field)}>Answer</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="row" style={{ marginTop: 12 }}>
                  <a className="btn ghost tiny" href={`/proposals/${proposal.proposal_id}/pdf`} target="_blank">Download PDF</a>
                  <span className="badge">{proposal.engine}</span>
                </div>
              </>
            ) : (
              <>
                <p style={{ color: "var(--text-dim)" }}>
                  Ask the Proposal agent to build a proposal from this conversation — it fills in terms,
                  flags what is missing and exports a PDF.
                </p>
                <button className="btn" onClick={() => ws.current?.send(JSON.stringify({ type: "propose" }))} disabled={!connected}>
                  Generate proposal now
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}