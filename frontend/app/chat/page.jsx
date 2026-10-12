"use client";
import { useEffect, useRef, useState } from "react";
import { api, wsUrl } from "../../lib/api";

const SAMPLE = "I need 120 control units, budget Rs 9 lakh, delivery before the 15th. This is urgent.";

export default function Chat() {
  const [customerId, setCustomerId] = useState("Consumer_DEMO01");
  const [customers, setCustomers] = useState([]);
  const [input, setInput] = useState("");
  const [log, setLog] = useState([]);
  const [live, setLive] = useState(null);
  const [proposal, setProposal] = useState(null);
  const [missing, setMissing] = useState([]);
  const [connected, setConnected] = useState(false);
  const [answers, setAnswers] = useState({});
  const ws = useRef(null);
  const buffer = useRef([]);

  useEffect(() => { api.customers().then(setCustomers).catch(() => {}); }, []);

  function connect(id) {
    if (ws.current) ws.current.close();
    const socket = new WebSocket(wsUrl(id));
    ws.current = socket;
    socket.onopen = () => setConnected(true);
    socket.onclose = () => setConnected(false);
    socket.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.event === "transcript") { buffer.current.push(msg.text); setLive((p) => ({ ...p, transcript: msg.text, role: msg.role })); }
      if (msg.event === "analysis") setLive((p) => ({ ...p, analysis: msg }));
      if (msg.event === "proposal") { setProposal(msg); setMissing(msg.missing.filter((m) => !m.present)); }
      if (msg.event === "closed") setLog((l) => [...l, { text: "Conversation closed", role: "ai" }]);
    };
  }

  function send(text) {
    const t = (text ?? input).trim();
    if (!t || !ws.current) return;
    ws.current.send(JSON.stringify({ type: "message", role: "consumer", text: t }));
    setLog((l) => [...l, { text: t, role: "consumer" }]);
    setInput("");
  }

  const analyseAll = () => ws.current?.send(JSON.stringify({ type: "analyse" }));
  const propose = () => ws.current?.send(JSON.stringify({ type: "propose" }));
  const closeConv = () => ws.current?.send(JSON.stringify({ type: "close" }));

  async function fill(field) {
    const value = answers[field];
    if (!value) return;
    const r = await api.answerMissing(customerId, field, value);
    setProposal({ ...proposal, body: r.body, completeness: r.completeness, version: r.version });
    setMissing(r.missing.filter((m) => !m.present));
  }

  return (
    <>
      <h1>Live Conversation (WebSocket)</h1>
      <p>Every turn is recorded, transcribed and understood in real time by the AI agents.</p>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="row">
          <select value={customerId} onChange={(e) => { setCustomerId(e.target.value); connect(e.target.value); }}
            style={{ maxWidth: 240 }}>
            {customers.length === 0 && <option>Consumer_DEMO01</option>}
            {customers.map((c) => <option key={c.id}>{c.id}</option>)}
          </select>
          <button onClick={() => connect(customerId)}>Connect</button>
          <span className={`badge ${connected ? "ok" : "warn"}`}>{connected ? "connected" : "offline"}</span>
          <button className="ghost" onClick={analyseAll}>Full analysis</button>
          <button className="ghost" onClick={propose}>Generate proposal</button>
          <button className="ghost" onClick={closeConv}>End conversation</button>
        </div>
      </div>

      <div className="grid cols-2" style={{ marginTop: 14 }}>
        <div className="card">
          <h3>Transcript</h3>
          <div className="chat">
            {log.map((m, i) => <div key={i} className={`msg ${m.role === "consumer" ? "consumer" : "ai"}`}>{m.text}</div>)}
            {live?.analysis && <div className="msg dealer">AI: {live.analysis.sentiment} · {live.analysis.intent?.label} · {live.analysis.topics.join(", ") || "no topics"}</div>}
            {log.length === 0 && !live && <div className="msg ai">Connect and start talking.</div>}
          </div>
          <div className="row" style={{ marginTop: 12 }}>
            <input value={input} placeholder="Say something…" onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()} />
            <button onClick={() => send()} disabled={!connected}>Send</button>
            <button className="ghost" onClick={() => send(SAMPLE)}>Sample</button>
          </div>
        </div>

        <div className="card">
          <h3>Extracted requirement</h3>
          {live?.analysis ? (
            <table><tbody>
              <tr><th>Quantity</th><td>{live.analysis.entities.quantity ?? "—"}</td></tr>
              <tr><th>Budget</th><td>{live.analysis.entities.budget ?? "—"}</td></tr>
              <tr><th>Delivery</th><td>{live.analysis.entities.delivery ?? "—"}</td></tr>
              <tr><th>Intent</th><td>{live.analysis.entities.intent}</td></tr>
              <tr><th>Priority</th><td>{live.analysis.entities.priority}</td></tr>
            </tbody></table>
          ) : <p>Live entity extraction appears here as you talk.</p>}

          {proposal && (
            <>
              <h3 style={{ marginTop: 16 }}>Proposal v{proposal.proposal_id?.slice(-4) || "1"}</h3>
              <pre>{proposal.body}</pre>
              <div className="row">
                {missing.map((m) => (
                  <span key={m.field} className="row" style={{ gap: 4 }}>
                    <input placeholder={m.field} value={answers[m.field] || ""} style={{ width: 130 }}
                      onChange={(e) => setAnswers((a) => ({ ...a, [m.field]: e.target.value }))} />
                    <button className="ghost" onClick={() => fill(m.field)}>answer</button>
                  </span>
                ))}
              </div>
              <div className="row" style={{ marginTop: 10 }}>
                <a className="badge ok" href={`/proposals/${proposal.proposal_id}/pdf`} target="_blank">Download PDF</a>
                <span className="badge">{proposal.engine}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}