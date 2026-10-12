"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";

const DEALER = "I need 50 units, budget around Rs 2 lakh. Delivery needed before the 20th.";

export default function Chat() {
  const [customerId, setCustomerId] = useState("Consumer_001");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [entities, setEntities] = useState(null);
  const [proposal, setProposal] = useState(null);
  const [agentOut, setAgentOut] = useState(null);
  const [status, setStatus] = useState("idle");

  useEffect(() => { api.customers().then(setCustomers).catch(() => {}); }, []);
  const [customers, setCustomers] = useState([]);

  const transcript = messages.join(" ");

  async function send(text) {
    const t = (text ?? input).trim();
    if (!t) return;
    const next = [...messages, t];
    setMessages(next);
    setInput("");
    setStatus("listening…");
    const r = await api.conversation(customerId, next);
    setEntities(r.entities);
    setStatus(`sentiment: ${r.sentiment} · intent: ${r.entities.intent} · priority: ${r.entities.priority}`);
  }

  async function genProposal() {
    setStatus("generating proposal…");
    const r = await api.generateProposal(customerId, transcript ? [transcript] : [DEALER]);
    setProposal(r);
    setStatus("proposal generated");
  }

  async function ask(question) {
    const r = await api.ask(question || "What did this customer ask for last month?");
    setAgentOut(r);
  }

  async function runAgent(agent) {
    const r = await api.runAgent({
      agent, customer_id: customerId, messages: [transcript || DEALER],
      conversations: 14, avg_purchase: 75000, sentiment: entities?.intent === "Complaint" ? "Negative" : "Positive",
      intent: entities?.intent || "Purchase", days: 6, proposal_pending: true, name: "Consumer",
    });
    setAgentOut(r);
  }

  return (
    <>
      <h1>Conversational CRM</h1>
      <p>Start Conversation → talk → press a button → review AI output → approve/send.</p>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="row">
          <label style={{ fontSize: 13 }}>Consumer</label>
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} style={{ maxWidth: 240 }}>
            {customers.length === 0 && <option>Consumer_001</option>}
            {customers.map((c) => <option key={c.id}>{c.id}</option>)}
          </select>
          <span className="badge">{status}</span>
        </div>
      </div>

      <div className="grid cols-2" style={{ marginTop: 14 }}>
        <div className="card">
          <h3>Conversation</h3>
          <div className="chat">
            {messages.map((m, i) => <div key={i} className="msg consumer">{m}</div>)}
            {messages.length === 0 && <div className="msg ai">AI: Record the conversation and I will extract the requirement.</div>}
          </div>
          <div className="row" style={{ marginTop: 12 }}>
            <input value={input} placeholder="Type or paste a voice transcript…" onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()} />
            <button onClick={() => send()}>Send</button>
            <button className="ghost" onClick={() => send(DEALER)}>Sample message</button>
          </div>
        </div>

        <div className="card">
          <h3>AI extracted requirement</h3>
          {entities ? (
            <table>
              <tbody>
                <tr><th>Quantity</th><td>{entities.quantity ?? "—"}</td></tr>
                <tr><th>Budget</th><td>{entities.budget ?? "—"}</td></tr>
                <tr><th>Delivery</th><td>{entities.delivery ?? "—"}</td></tr>
                <tr><th>Intent</th><td>{entities.intent}</td></tr>
                <tr><th>Priority</th><td>{entities.priority}</td></tr>
              </tbody>
            </table>
          ) : <p>Send a message to populate requirements.</p>}

          <h3 style={{ marginTop: 16 }}>Actions</h3>
          <div className="row">
            <button onClick={genProposal}>Generate Proposal</button>
            <button className="ghost" onClick={() => runAgent("recommendation")}>Recommend Product</button>
            <button className="ghost" onClick={() => runAgent("followup")}>Follow Up</button>
            <button className="ghost" onClick={() => runAgent("intelligence")}>Predict Behaviour</button>
            <button className="ghost" onClick={() => runAgent("next_action")}>Next Best Action</button>
            <button className="ghost" onClick={() => ask()}>Ask AI</button>
            <button className="ghost" onClick={() => setProposal(null)}>Approve / Send</button>
          </div>

          {proposal && (
            <>
              <h3 style={{ marginTop: 16 }}>Proposal</h3>
              <pre>{proposal.text}</pre>
              <div className="row">
                {proposal.missing.filter((m) => !m.present).map((m) => (
                  <span key={m.field} className="badge warn">missing: {m.field} → {m.question}</span>
                ))}
              </div>
            </>
          )}

          {agentOut && <><h3 style={{ marginTop: 16 }}>Agent output</h3><pre>{JSON.stringify(agentOut, null, 2)}</pre></>}
        </div>
      </div>
    </>
  );
}