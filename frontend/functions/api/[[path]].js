// Cloudflare Pages Function — serves the HubSpot AI CRM API (/api/*) from seeded demo data.
// Edge runtime (no Python). Mirrors the FastAPI contract so the frontend works unchanged.
const VERSION = "3.0.0";
const PROJECT = "HubSpot";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
  });

const now = () => new Date().toISOString();

// ---------- seed data ----------
const PRODUCTS = [
  { id: "PRD-A100", name: "Product A - Industrial Sensor Kit", category: "Sensors", unit_price: 1500, currency: "INR", stock: 500, description: "Temperature + vibration sensor kit with 2-year warranty." },
  { id: "PRD-B220", name: "Product B - Control Unit", category: "Controllers", unit_price: 8200, currency: "INR", stock: 120, description: "Programmable control unit for automation lines." },
  { id: "PRD-C330", name: "Product C - Power Supply Module", category: "Power", unit_price: 4300, currency: "INR", stock: 260, description: "Redundant 48V power supply module." },
  { id: "PRD-SVC1", name: "Service - Installation & Commissioning", category: "Services", unit_price: 12000, currency: "INR", stock: 999, description: "On-site installation, calibration and commissioning." },
  { id: "PRD-SUP1", name: "Support - Annual Maintenance Contract", category: "Support", unit_price: 18000, currency: "INR", stock: 999, description: "24x7 support with 4-hour response SLA." },
  { id: "PRD-D140", name: "Product D - Network Gateway", category: "Networking", unit_price: 6400, currency: "INR", stock: 180, description: "Industrial gateway with remote telemetry." },
  { id: "PRD-E250", name: "Product E - Safety Relay Panel", category: "Safety", unit_price: 5100, currency: "INR", stock: 210, description: "Fail-safe relay panel for line shutdown." },
];

const CATEGORIES = ["Controllers", "Networking", "Power", "Safety", "Sensors", "Services", "Support"];

const CUSTOMERS = [
  { id: "Consumer_DEMO01", name: "Client DEMO01", contact: "consumer_demo01@example.com", created_at: "2026-10-15T10:00:00.000000+00:00" },
  { id: "Consumer_DEMO02", name: "Client DEMO02", contact: "consumer_demo02@example.com", created_at: "2026-10-15T10:01:00.000000+00:00" },
  { id: "Consumer_DEMO03", name: "Client DEMO03", contact: "consumer_demo03@example.com", created_at: "2026-10-15T10:02:00.000000+00:00" },
  { id: "Consumer_DEMO04", name: "Client DEMO04", contact: "consumer_demo04@example.com", created_at: "2026-10-15T10:03:00.000000+00:00" },
];

const CONVERSATIONS = [
  { id: "CONV-DEMO01", customer_id: "Consumer_DEMO01", summary: "Hello, I need 50 industrial sensor kits. My budget is around Rs 2 lakh and delivery is needed before the 20th.", sentiment: "Neutral", intent: "Purchase", started_at: "2026-10-15T10:05:00.000000+00:00", ended_at: null },
  { id: "CONV-DEMO02", customer_id: "Consumer_DEMO02", summary: "We had a delivery delayed last month and it caused a production stop. Very poor service.", sentiment: "Negative", intent: "Complaint", started_at: "2026-10-15T10:06:00.000000+00:00", ended_at: null },
  { id: "CONV-DEMO03", customer_id: "Consumer_DEMO03", summary: "What is the price of the control unit and the annual maintenance contract?", sentiment: "Neutral", intent: "Purchase", started_at: "2026-10-15T10:07:00.000000+00:00", ended_at: null },
  { id: "CONV-DEMO04", customer_id: "Consumer_DEMO04", summary: "I need 200 network gateways delivered before Friday. Budget Rs 8 lakh.", sentiment: "Positive", intent: "Purchase", started_at: "2026-10-15T10:08:00.000000+00:00", ended_at: null },
];

const ORDERS = [
  { id: "ORD-DEMO01", customer_id: "Consumer_DEMO01", items: [{ product_id: "PRD-A100", name: "Product A - Industrial Sensor Kit", quantity: 50, unit_price: 1500, line_total: 75000 }], subtotal: 75000, tax: 13500, grand_total: 88500, currency: "INR", status: "confirmed", created_at: "2026-10-15T10:10:00.000000+00:00" },
  { id: "ORD-DEMO03", customer_id: "Consumer_DEMO03", items: [{ product_id: "PRD-B220", name: "Product B - Control Unit", quantity: 12, unit_price: 8200, line_total: 98400 }, { product_id: "PRD-SUP1", name: "Support - Annual Maintenance Contract", quantity: 1, unit_price: 18000, line_total: 18000 }], subtotal: 116400, tax: 20952, grand_total: 137352, currency: "INR", status: "confirmed", created_at: "2026-10-15T10:11:00.000000+00:00" },
  { id: "ORD-DEMO04", customer_id: "Consumer_DEMO04", items: [{ product_id: "PRD-D140", name: "Product D - Network Gateway", quantity: 200, unit_price: 6400, line_total: 1280000 }], subtotal: 1280000, tax: 230400, grand_total: 1510400, currency: "INR", status: "confirmed", created_at: "2026-10-15T10:12:00.000000+00:00" },
];

const PROPOSALS = [
  { id: "PROP-DEMO01", customer_id: "Consumer_DEMO01", conversation_id: "CONV-DEMO01", version: 1, terms: { product: "Product A - Industrial Sensor Kit", quantity: "50 kits", price: "Rs 2 lakh", discount: null, delivery: "Before the 20th", payment: "30% advance, 70% on delivery", warranty: "2 years", support: null, special_conditions: null }, body: "CUSTOMER PROPOSAL  ·  Consumer_DEMO01  ·  v1\n\n1. SCOPE OF SUPPLY\n   Product/Service: Product A - Industrial Sensor Kit\n   Quantity       : 50 kits\n\n2. COMMERCIALS\n   Price          : Rs 2 lakh\n   Discount       : None\n\n3. DELIVERY & INSTALLATION\n   Delivery       : Before the 20th\n\n4. PAYMENT, WARRANTY & SUPPORT\n   Payment        : 30% advance, 70% on delivery\n   Warranty       : 2 years", status: "draft", created_at: "2026-10-15T10:15:00.000000+00:00", completeness: { complete: false, score: 0.83, present: ["product", "quantity", "price", "delivery", "payment", "warranty"], missing: [], questions: [] }, missing: [], engine: "template" },
  { id: "PROP-DEMO03", customer_id: "Consumer_DEMO03", conversation_id: "CONV-DEMO03", version: 1, terms: { product: "Product B - Control Unit", quantity: "12 units", price: "Rs 98,400", discount: null, delivery: "Standard delivery", payment: "100% advance", warranty: "1 year", support: null, special_conditions: null }, body: "CUSTOMER PROPOSAL  ·  Consumer_DEMO03  ·  v1", status: "sent", created_at: "2026-10-15T10:16:00.000000+00:00", completeness: { complete: true, score: 1.0, present: ["product", "quantity", "price", "delivery", "payment", "warranty"], missing: [], questions: [] }, missing: [], engine: "template" },
];

const AGENTS = [
  { name: "consumer", description: "Creates consumer records, workspaces and profiles" },
  { name: "conversation", description: "Records, transcribes, summarises and analyses conversations" },
  { name: "nlp", description: "NER, intent, sentiment, requirement extraction and summarisation" },
  { name: "proposal", description: "Generates proposals from conversation terms and detects missing information" },
  { name: "recommendation", description: "Product recommendations and budget-fit suggestions" },
  { name: "followup", description: "Detects pending actions and drafts follow-up messages" },
  { name: "intelligence", description: "360° view, churn/purchase prediction and CLV" },
  { name: "next_action", description: "Ranks the best dealer action for a customer" },
  { name: "assistant", description: "RAG assistant over CRM data" },
  { name: "voice", description: "Speech-to-text transcription (open-source Whisper)" },
  { name: "ml", description: "Trains and serves the churn/purchase models" },
];

// in-memory mutable state (per isolate)
const state = {
  customers: CUSTOMERS.map(c => ({ ...c })),
  conversations: CONVERSATIONS.map(c => ({ ...c })),
  orders: ORDERS.map(o => ({ ...o, items: o.items.map(i => ({ ...i })) })),
  proposals: PROPOSALS.map(p => ({ ...p, terms: { ...p.terms } })),
  audit: [
    { id: 1, ts: "2026-10-15T10:00:00.000000+00:00", user: "anonymous", action: "GET /api/health", resource: "http" },
    { id: 2, ts: "2026-10-15T10:01:00.000000+00:00", user: "anonymous", action: "GET /api/customers/", resource: "http" },
  ],
  jobs: [{ id: "job_a1b2c3d4", kind: "proposal", status: "done", created: 1729000000.0, duration_s: 0.42, args: { customer_id: "Consumer_DEMO01", messages: "Hello, I need 50 industrial sensor kits..." } }],
  counters: { http_requests_total: 0, customers_created: 0, messages_received: 12, conversations_analyzed: 4, conversations_closed: 0, proposals_generated: 2, proposals_exported: 0, orders_created: 3 },
  latency: {},
  nextId: 100,
};

function track(path) {
  state.counters.http_requests_total++;
  const t0 = Date.now();
  return () => {
    const ms = Date.now() - t0;
    const l = state.latency[path] || { count: 0, total: 0, max: 0, samples: [] };
    l.count++;
    l.total += ms;
    l.avg_ms = +(l.total / l.count).toFixed(2);
    if (ms > l.max) l.max = ms;
    l.p95_ms = Math.max(l.avg_ms, ms);
    state.latency[path] = l;
  };
}

function profileFor(c) {
  const convs = state.conversations.filter(x => x.customer_id === c.id);
  const orders = state.orders.filter(x => x.customer_id === c.id);
  const spend = orders.reduce((s, o) => s + o.grand_total, 0);
  const products = [...new Set(orders.flatMap(o => o.items.map(i => i.name)))];
  const mem = memoryOf(c.id);
  return {
    customer_id: c.id,
    total_conversations: convs.length,
    total_orders: orders.length,
    total_spend: spend,
    products_of_interest: products,
    current_requirement: mem.last_requirement || null,
    sentiment: mem.last_sentiment || "Neutral",
    intents: convs.map(x => x.intent).filter(Boolean),
    last_active: convs.length ? convs[0].started_at : null,
  };
}

function memoryOf(id) {
  // derive from seed
  const base = {
    Consumer_DEMO01: { days_since_contact: 9, last_sentiment: "Neutral", last_intent: "Purchase", last_conversation_id: "CONV-DEMO01", last_order_value: 88500, last_requirement: { quantity: "50 kits", quantity_value: 50, budget: "Rs 2 lakh", budget_value: 200000, delivery: "Before the 20th", date: "20th", location: null, intent: "Purchase", priority: "High", agreement: true, question: false, complaint: false, topics: ["delivery", "payment", "warranty"] } },
    Consumer_DEMO02: { days_since_contact: 9, last_sentiment: "Negative", last_intent: "Complaint", last_conversation_id: "CONV-DEMO02", last_order_value: null, last_requirement: { quantity: null, quantity_value: null, budget: null, budget_value: null, delivery: null, date: null, location: null, intent: "Complaint", priority: "Normal", agreement: false, question: false, complaint: true, topics: ["delivery"] } },
    Consumer_DEMO03: { days_since_contact: 9, last_sentiment: "Neutral", last_intent: "Purchase", last_conversation_id: "CONV-DEMO03", last_order_value: 137352, last_requirement: { quantity: "12 control units", quantity_value: 12, budget: "Rs 98,400", budget_value: 98400, delivery: null, date: null, location: null, intent: "Purchase", priority: "Normal", agreement: false, question: true, complaint: false, topics: ["quantity"] } },
    Consumer_DEMO04: { days_since_contact: 9, last_sentiment: "Positive", last_intent: "Purchase", last_conversation_id: "CONV-DEMO04", last_order_value: 1510400, last_requirement: { quantity: "200 units", quantity_value: 200, budget: "Rs 8 lakh", budget_value: 800000, delivery: "Before Friday", date: "Friday", location: null, intent: "Purchase", priority: "High", agreement: true, question: false, complaint: false, topics: ["delivery", "quantity"] } },
  };
  return base[id] || { days_since_contact: 0 };
}

function predictionFor(id) {
  const p = profileFor(state.customers.find(c => c.id === id) || { id });
  const row = { conversations: p.total_conversations, orders: p.total_orders, spend: p.total_spend, negative: p.sentiment === "Negative" ? 1 : 0, high_priority: p.current_requirement?.priority === "High" ? 1 : 0 };
  const purchase = Math.min(0.98, 0.25 + 0.04 * row.conversations + 0.25 * row.orders + Math.min(0.2, row.spend / 500000) - 0.2 * row.negative + 0.05 * row.high_priority);
  const churn = Math.max(0.02, 0.6 - 0.03 * row.conversations - 0.25 * row.orders + 0.25 * row.negative);
  const clv = Math.round(row.spend * (1 + 0.15 * row.conversations));
  const engagement = row.conversations >= 8 ? "High" : row.conversations >= 3 ? "Medium" : "Low";
  return {
    customer_id: id,
    purchase_probability: +purchase.toFixed(3),
    churn_risk: +churn.toFixed(3),
    clv_estimate: clv,
    engagement,
    proposal_acceptance: +Math.min(0.99, purchase * 0.95 + 0.05).toFixed(3),
    lead_conversion_probability: +Math.min(0.99, purchase + 0.02).toFixed(3),
    engine: "heuristic",
    recommendation: row.orders ? "Offer an upgrade / AMC renewal while engagement is high." : `Follow up regarding delivery (${p.current_requirement?.delivery || "timing"}) and payment terms.`,
  };
}

function workspaceFor(id) {
  const convs = state.conversations.filter(c => c.customer_id === id);
  const orders = state.orders.filter(o => o.customer_id === id);
  const props = state.proposals.filter(p => p.customer_id === id);
  const sections = {
    Profile: [{ name: (state.customers.find(c => c.id === id) || {}).name, source: "seed" }],
    Conversations: convs.map(c => ({ conversation_id: c.id, summary: c.summary })),
    Requirements: convs.map(c => ({ requirement_id: "REQ-" + c.id.slice(5), ...(memoryOf(id).last_requirement || {}) })),
    Products: orders.map(o => ({ order_id: o.id, items: o.items.map(i => i.name) })),
    Proposals: props.map(p => ({ proposal_id: p.id, version: p.version })),
    Documents: props.map(p => ({ proposal_id: p.id, type: "pdf" })),
    Followups: [],
    Interaction_History: convs.map(c => ({ conversation_id: c.id, ts: c.started_at })),
  };
  return {
    customer_id: id,
    sections,
    totals: { conversations: convs.length, proposals: props.length, orders: orders.length, order_value: orders.reduce((s, o) => s + o.grand_total, 0) },
    memory: memoryOf(id),
  };
}

function topProducts() {
  return [...new Set(state.orders.flatMap(o => o.items.map(i => i.product_id)))].map(id => PRODUCTS.find(p => p.id === id)?.category).filter(Boolean);
}

// ---------- router ----------
export async function onRequest(context) {
  const { request, params } = context;
  const path = "/" + (params.path || []).filter(Boolean).join("/");
  const url = new URL(request.url);
  const method = request.method;

  // CORS preflight
  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-methods": "GET,POST,OPTIONS", "access-control-allow-headers": "content-type" } });
  }

  const done = track(path);

  try {
    // health
    if (path === "/health" || path === "/") {
      if (path === "/") return json({ service: PROJECT, docs: "/api/docs", health: "/api/health" });
      return json({ healthy: true, project: PROJECT, version: VERSION, llm_configured: false, database: "edge", agents: AGENTS.length });
    }

    // docs (swagger-like simple page)
    if (path === "/docs" || path === "/openapi.json") {
      if (path === "/openapi.json") return json({ openapi: "3.0.0", info: { title: PROJECT, version: VERSION }, paths: {} });
      return new Response(`<html><head><title>API Docs</title><style>body{font-family:system-ui;background:#0b1020;color:#e8eefc;padding:24px}h1{color:#a78bfa}a{color:#22d3ee}code{background:#1e293b;padding:2px 6px;border-radius:4px}</style></head><body><h1>HubSpot AI CRM API</h1><p>Base: <code>/api</code></p><p>Health: <code>/api/health</code></p><p>Customers: <code>/api/customers/</code></p><p>Products: <code>/api/products/</code></p><p>Orders: <code>/api/orders/</code></p><p>Analytics: <code>/api/analytics/portfolio</code></p><p>Agents: <code>/api/ops/agents</code></p></body></html>`, { headers: { "content-type": "text/html" } });
    }

    // customers
    if (path === "/customers" || path === "/customers/") {
      if (method === "POST") {
        const name = url.searchParams.get("name") || "New Customer";
        const contact = url.searchParams.get("contact");
        const cid = "Consumer_" + Math.random().toString(36).slice(2, 8).toUpperCase();
        const c = { id: cid, name, contact, created_at: now() };
        state.customers.unshift(c);
        state.counters.customers_created++;
        return json(c);
      }
      return json([...state.customers].sort((a, b) => b.created_at.localeCompare(a.created_at)));
    }
    let m = path.match(/^\/customers\/(.+)$/);
    if (m) {
      const c = state.customers.find(x => x.id === m[1]);
      if (!c) return json({ error: "not found" });
      return json(profileFor(c));
    }

    // products
    if (path === "/products" || path === "/products/") {
      const cat = url.searchParams.get("category");
      let list = PRODUCTS;
      if (cat) list = list.filter(p => p.category.toLowerCase() === cat.toLowerCase());
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
      return json({ products: list, categories: CATEGORIES });
    }
    if (path === "/products/recommend/fit") {
      const q = parseInt(url.searchParams.get("quantity") || "1", 10);
      const cat = url.searchParams.get("category");
      let pool = cat ? PRODUCTS.filter(p => p.category.toLowerCase() === cat.toLowerCase()) : PRODUCTS;
      if (!pool.length) pool = PRODUCTS;
      const ranked = [...pool].sort((a, b) => a.unit_price - b.unit_price || b.stock - a.stock);
      const primary = ranked[0];
      const upsell = ranked.find((p, i) => i > 0 && p.category !== primary.category) || null;
      const alt = ranked.slice(1, 4);
      return json({ primary_suggestion: primary, upsell, alternatives: alt, quantity: q, estimated_total: primary.unit_price * q + (upsell ? upsell.unit_price : 0), stock_check: primary.stock >= q ? "in_stock" : "backorder", currency: "INR", generated_at: now() });
    }
    if (path === "/products/search/budget") {
      const budget = url.searchParams.get("budget") || "";
      const digits = budget.replace(/[^\d,]/g, "").replace(/,/g, "");
      let val = digits ? parseFloat(digits) : 0;
      const low = budget.toLowerCase();
      if (low.includes("lakh")) val *= 100000;
      else if (low.includes("crore") || low.includes("cr")) val *= 10000000;
      else if (low.includes("k") || low.includes("thousand")) val *= 1000;
      const fits = val ? PRODUCTS.filter(p => p.unit_price <= val).sort((a, b) => a.unit_price - b.unit_price) : [];
      return json({ budget, fits });
    }
    m = path.match(/^\/products\/(.+)$/);
    if (m) {
      const p = PRODUCTS.find(x => x.id.toLowerCase() === m[1].toLowerCase());
      return json(p || { error: "not found" });
    }

    // orders
    if (path === "/orders" || path === "/orders/") {
      if (method === "POST") {
        const cid = url.searchParams.get("customer_id");
        let body = []; try { body = await request.json(); } catch {}
        const lines = []; let subtotal = 0;
        for (const it of (body || [])) {
          const prod = PRODUCTS.find(p => p.id === it.product_id);
          if (!prod) continue;
          const qty = parseInt(it.quantity || 1, 10);
          const amt = prod.unit_price * qty;
          subtotal += amt;
          lines.push({ product_id: prod.id, name: prod.name, quantity: qty, unit_price: prod.unit_price, line_total: amt });
        }
        const tax = Math.round(subtotal * 0.18 * 100) / 100;
        const order = { id: "ORD-" + Math.random().toString(36).slice(2, 10).toUpperCase(), customer_id: cid, items: lines, subtotal, tax, grand_total: subtotal + tax, currency: "INR", status: "confirmed", created_at: now() };
        state.orders.unshift(order);
        state.counters.orders_created++;
        const cust = state.customers.find(c => c.id === cid);
        if (cust) { /* memory tracked loosely */ }
        return json(order);
      }
      const cid = url.searchParams.get("customer_id");
      let list = state.orders;
      if (cid) list = list.filter(o => o.customer_id === cid);
      return json([...list].sort((a, b) => b.created_at.localeCompare(a.created_at)));
    }
    m = path.match(/^\/orders\/([^/]+)\/status$/);
    if (m) {
      const status = url.searchParams.get("status");
      const o = state.orders.find(x => x.id === m[1]);
      if (o) o.status = status;
      return json({ order_id: m[1], status });
    }

    // conversations
    if (path === "/conversations" || path === "/conversations/") {
      if (method === "POST") {
        const cid = url.searchParams.get("customer_id");
        let msgs = []; try { msgs = await request.json(); } catch {}
        if (!Array.isArray(msgs)) msgs = [];
        const joined = msgs.join(" ");
        const conv = state.conversations.find(c => c.customer_id === cid && !c.ended_at);
        const cid_conv = conv ? conv.id : "CONV-" + Math.random().toString(36).slice(2, 10).toUpperCase();
        if (!conv) state.conversations.push({ id: cid_conv, customer_id: cid, summary: joined.slice(0, 90), sentiment: "Neutral", intent: "Purchase", started_at: now(), ended_at: null });
        state.counters.messages_received += msgs.length;
        state.counters.conversations_analyzed++;
        return json({
          conversation_id: cid_conv,
          analysis: { requirement_id: "REQ-" + Math.random().toString(36).slice(2, 8).toUpperCase(), summary: joined.slice(0, 90), entities: { quantity: null, budget: null, delivery: null, intent: "Purchase", priority: "Normal", topics: [] }, sentiment: "Neutral", sentiment_score: 0.5, intent: { label: "Purchase", confidence: 0.6, scores: { Purchase: 1 } }, topics: [], agreements: [], keywords: [] },
          workspace: { Profile: [], Conversations: [], Requirements: [], Products: [], Proposals: [], Documents: [], Followups: [], Interaction_History: [] },
        });
      }
      const cid = url.searchParams.get("customer_id");
      let list = state.conversations;
      if (cid) list = list.filter(c => c.customer_id === cid);
      return json([...list].sort((a, b) => b.started_at.localeCompare(a.started_at)).map(c => ({ id: c.id, customer_id: c.customer_id, summary: c.summary, sentiment: c.sentiment, intent: c.intent, started_at: c.started_at, ended_at: c.ended_at })));
    }
    if (path === "/conversations/end") {
      const cid = url.searchParams.get("customer_id");
      const conv = state.conversations.find(c => c.customer_id === cid && !c.ended_at);
      if (!conv) return json({ ended: false, reason: "no open conversation" });
      conv.ended_at = now();
      state.counters.conversations_closed++;
      return json({ ended: true, conversation_id: conv.id });
    }

    // proposals
    if (path === "/proposals" || path === "/proposals/") {
      if (method === "GET") {
        const cid = url.searchParams.get("customer_id");
        let list = state.proposals;
        if (cid) list = list.filter(p => p.customer_id === cid);
        return json([...list].sort((a, b) => b.created_at.localeCompare(a.created_at)));
      }
    }
    if (path === "/proposals/generate") {
      const cid = url.searchParams.get("customer_id");
      const background = url.searchParams.get("background") === "true";
      let msgs = []; try { msgs = await request.json(); } catch {}
      if (!Array.isArray(msgs)) msgs = [];
      const prop = { id: "PROP-" + Math.random().toString(36).slice(2, 10).toUpperCase(), customer_id: cid, conversation_id: url.searchParams.get("conversation_id"), version: 1, terms: { product: "Product A - Industrial Sensor Kit", quantity: "50 kits", price: "Rs 2 lakh", discount: null, delivery: "Before the 20th", payment: "30% advance, 70% on delivery", warranty: "2 years", support: null, special_conditions: null }, body: "CUSTOMER PROPOSAL  ·  " + cid + "  ·  v1\n\n1. SCOPE OF SUPPLY\n   Product/Service: Product A - Industrial Sensor Kit\n   Quantity       : 50 kits\n\n2. COMMERCIALS\n   Price          : Rs 2 lakh\n\n3. DELIVERY & INSTALLATION\n   Delivery       : Before the 20th\n\n4. PAYMENT, WARRANTY & SUPPORT\n   Payment        : 30% advance, 70% on delivery\n   Warranty       : 2 years", completeness: { complete: false, score: 0.83, present: ["product", "quantity", "price", "delivery", "payment", "warranty"], missing: [], questions: [] }, missing: [], engine: "template", status: "draft", created_at: now() };
      if (background) {
        state.jobs.unshift({ id: "job_" + Math.random().toString(36).slice(2, 10), kind: "proposal", status: "queued", created: Date.now() / 1000, args: { customer_id: cid, messages: (msgs.join(" ")).slice(0, 80), conversation_id: url.searchParams.get("conversation_id") } });
        return json({ job: state.jobs[0] });
      }
      state.proposals.unshift(prop);
      state.counters.proposals_generated++;
      return json(prop);
    }
    if (path === "/proposals/ask-missing") {
      const cid = url.searchParams.get("customer_id");
      const field = url.searchParams.get("field");
      const value = url.searchParams.get("value");
      const prop = state.proposals.find(p => p.customer_id === cid);
      if (!prop) return json({ error: "no proposal for customer" });
      prop.terms[field] = value;
      prop.version++;
      prop.body = prop.body.replace(/To be confirmed/g, value);
      prop.completeness = { complete: true, score: 1.0, present: ["product", "quantity", "price", "delivery", "payment", "warranty"], missing: [], questions: [] };
      prop.missing = [];
      return json(prop);
    }
    m = path.match(/^\/proposals\/([^/]+)\/status$/);
    if (m) {
      const status = url.searchParams.get("status");
      const p = state.proposals.find(x => x.id === m[1]);
      if (p) p.status = status;
      return json({ proposal_id: m[1], status });
    }
    m = path.match(/^\/proposals\/([^/]+)\/pdf$/);
    if (m) {
      const p = state.proposals.find(x => x.id === m[1]) || state.proposals[0];
      const body = (p?.body || "HubSpot AI CRM Proposal").slice(0, 2000);
      // minimal PDF
      const lines = body.split("\n").slice(0, 50);
      const content = ["BT", "/F1 10 Tf", "40 780 Td", "14 TL", ...lines.map(l => `(${l.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)")} Tj T*`), "ET"];
      const stream = content.join("\n");
      const objs = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
        `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
        "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>",
      ];
      let out = "%PDF-1.4\n";
      const offs = [];
      objs.forEach((o, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
      const xref = out.length;
      out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
      offs.forEach(o => { out += `${String(o).padStart(10, "0")} 00000 n \n`; });
      out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
      return new Response(out, { headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="${m[1]}.pdf"` } });
    }
    m = path.match(/^\/proposals\/([^/]+)$/);
    if (m) {
      const p = state.proposals.find(x => x.id === m[1]);
      return json(p || { error: "not found" });
    }

    // assistant
    if (path === "/assistant/ask") {
      const query = url.searchParams.get("query") || "";
      const cid = url.searchParams.get("customer_id");
      const convs = state.conversations.filter(c => !cid || c.customer_id === cid);
      const ql = query.toLowerCase();
      const hits = convs.filter(c => c.summary.toLowerCase().includes(ql.split(" ")[0] || ""));
      if (!hits.length) return json({ answer: "No relevant records found in the CRM for that question.", engine: "rag", grounded: false, sources: [] });
      const c = hits[0];
      return json({ answer: `From conversation for ${c.customer_id}: ${c.summary}`, engine: "rag-retrieval", grounded: true, sources: [{ id: `${c.customer_id}:${c.id}`, customer_id: c.customer_id, source: "conversation", text: c.summary, score: 0.81 }], context_chars: c.summary.length });
    }

    // analytics
    if (path === "/analytics/portfolio") {
      const customers = state.customers.map(c => profileFor(c));
      const orders = state.orders;
      return json({
        customers: customers.length,
        conversations: customers.reduce((s, c) => s + c.total_conversations, 0),
        orders: orders.length,
        revenue: Math.round(orders.reduce((s, o) => s + o.grand_total, 0) * 100) / 100,
        negative_sentiment: customers.filter(c => c.sentiment === "Negative").map(c => c.customer_id),
        high_value: [...customers].sort((a, b) => b.total_spend - a.total_spend).slice(0, 5),
        top_products: CATEGORIES,
      });
    }
    m = path.match(/^\/analytics\/customer\/(.+)$/);
    if (m) {
      const id = m[1];
      const c = state.customers.find(x => x.id === id);
      const prof = c ? profileFor(c) : { customer_id: id, total_conversations: 0, total_orders: 0, total_spend: 0, products_of_interest: [], current_requirement: null, sentiment: "Neutral", intents: [], last_active: null };
      const pred = predictionFor(id);
      const mem = memoryOf(id);
      const openProp = state.proposals.find(p => p.customer_id === id) || null;
      return json({
        profile: prof,
        memory: mem,
        prediction: pred,
        next_actions: nextActions(mem, pred, prof),
        open_proposal: openProp ? { id: openProp.id, completeness: openProp.completeness } : null,
      });
    }

    // workspace
    m = path.match(/^\/workspace\/([^/]+)\/([^/]+)$/);
    if (m && method === "POST") {
      return json({ id: "WS-" + Math.random().toString(36).slice(2, 8).toUpperCase(), customer_id: m[1], section: m[2] });
    }
    m = path.match(/^\/workspace\/(.+)$/);
    if (m) return json(workspaceFor(m[1]));

    // security
    if (path === "/security/login") {
      const u = url.searchParams.get("username");
      const p = url.searchParams.get("password");
      const users = { dealer: ["dealer@123", "dealer"], analyst: ["analyst@123", "analyst"], admin: ["admin@123", "admin"] };
      if (users[u] && users[u][0] === p) return json({ token: "demo.jwt.token." + u, expires_in: 3600, role: users[u][1] });
      return json({ authorized: false, reason: "invalid credentials" });
    }
    if (path === "/security/audit") {
      const limit = parseInt(url.searchParams.get("limit") || "25", 10);
      return json(state.audit.slice(0, limit));
    }

    // ops
    if (path === "/ops/agents") {
      return json({ orchestrator: "crm_manager", agents: AGENTS });
    }
    m = path.match(/^\/ops\/agents\/(.+)$/);
    if (m) {
      const name = m[1];
      let body = {}; try { body = await request.json(); } catch {}
      const agent = AGENTS.find(a => a.name === name);
      if (!agent) return json({ agent: "crm_manager", error: `unknown agent '${name}'`, available: AGENTS.map(a => a.name) });
      // run agent — return a plausible result
      const cid = body.customer_id;
      if (name === "ml") {
        if (body.train) return json({ agent: "ml", action: "training submitted", job: state.jobs[0], routed_by: "crm_manager" });
        return json({ agent: "ml", model: { loaded: true, features: ["conversations", "orders", "spend", "negative", "high_priority"], path: "models.json", metrics: { mean_cv_accuracy: 0.75, cv_accuracy: [0.5, 0.75, 1.0, 0.75] } }, routed_by: "crm_manager" });
      }
      if (name === "consumer") {
        const c = { id: "Consumer_" + Math.random().toString(36).slice(2, 8).toUpperCase(), name: body.name || "New Consumer", contact: body.contact || null, created_at: now() };
        state.customers.unshift(c);
        state.counters.customers_created++;
        return json({ agent: "consumer", action: "consumer created", customer: c, workspace_sections: ["Profile", "Conversations", "Requirements", "Products", "Proposals", "Documents", "Followups", "Interaction_History"], routed_by: "crm_manager" });
      }
      if (name === "intelligence" && cid) {
        const c = state.customers.find(x => x.id === cid);
        return json({ agent: "intelligence", profile: c ? profileFor(c) : null, prediction: predictionFor(cid), model: { loaded: true, features: ["conversations", "orders", "spend", "negative", "high_priority"], metrics: { mean_cv_accuracy: 0.75 } }, routed_by: "crm_manager" });
      }
      if (name === "next_action" && cid) {
        const mem = memoryOf(cid);
        const pred = predictionFor(cid);
        const prop = state.proposals.find(p => p.customer_id === cid);
        return json({ agent: "next_action", top_action: { action: "Call Customer", score: 2.6, priority: "high" }, ranked: nextActions(mem, pred, profileFor(state.customers.find(c => c.id === cid) || { id: cid })), signals: { sentiment: mem.last_sentiment, intent: mem.last_intent, churn_risk: pred.churn_risk }, routed_by: "crm_manager" });
      }
      if (name === "assistant") {
        const q = body.query || "";
        const hits = state.conversations.filter(c => c.summary.toLowerCase().includes((q.split(" ")[0] || "").toLowerCase()));
        const c = hits[0];
        if (!c) return json({ agent: "assistant", answer: "No relevant records found in the CRM for that question.", engine: "rag", grounded: false, sources: [], routed_by: "crm_manager" });
        return json({ agent: "assistant", answer: `From conversation for ${c.customer_id}: ${c.summary}`, engine: "rag-retrieval", grounded: true, sources: [{ id: `${c.customer_id}:${c.id}`, customer_id: c.customer_id, source: "conversation", text: c.summary, score: 0.81 }], context_chars: c.summary.length, routed_by: "crm_manager" });
      }
      if (name === "recommendation" && cid) {
        const rec = recommendFit(50);
        return json({ agent: "recommendation", requirement: memoryOf(cid).last_requirement, recommendation: rec, budget_fits: rec.alternatives, routed_by: "crm_manager" });
      }
      return json({ agent: name, routed_by: "crm_manager", status: "ok" });
    }
    if (path === "/ops/ml/model") {
      return json({ loaded: true, features: ["conversations", "orders", "spend", "negative", "high_priority"], path: "models.json", metrics: { mean_cv_accuracy: 0.75, cv_accuracy: [0.5, 0.75, 1.0, 0.75] } });
    }
    if (path === "/ops/ml/train") {
      return json({ trained: false, reason: "training disabled in this deployment - heuristic engine active", rows: 4 });
    }
    if (path === "/ops/metrics") {
      return json({ latency: state.latency, counters: { ...state.counters, "audit.http_requests_total": state.counters.http_requests_total } });
    }
    if (path === "/ops/jobs") {
      return json(state.jobs);
    }
    m = path.match(/^\/ops\/jobs\/(.+)$/);
    if (m) return json(state.jobs.find(j => j.id === m[1]) || { error: "not found" });
    if (path === "/ops/stream/spark") {
      return json({ engine: "spark", status: "feature_generation_complete" });
    }
    if (path === "/ops/stream/kafka") {
      return json({ topic: url.searchParams.get("topic"), published: url.searchParams.get("event") });
    }
    if (path === "/ops/llm") {
      return json({ configured: false, model: "gpt-4o-mini" });
    }
    if (path === "/ops/seed") {
      return json({ products_seeded: 7, users: 3, customers_created: 4, orders_created: 3, model: { trained: true, engine: "logistic_regression", mean_cv_accuracy: 0.75 } });
    }

    return json({ error: "not found", path }, 404);
  } finally {
    done();
  }
}

function recommendFit(qty) {
  const ranked = [...PRODUCTS].sort((a, b) => a.unit_price - b.unit_price || b.stock - a.stock);
  const primary = ranked[0];
  const upsell = ranked.find((p, i) => i > 0 && p.category !== primary.category) || null;
  return { primary_suggestion: primary, upsell, alternatives: ranked.slice(1, 4), quantity: qty, estimated_total: primary.unit_price * qty + (upsell ? upsell.unit_price : 0), stock_check: primary.stock >= qty ? "in_stock" : "backorder", currency: "INR", generated_at: now() };
}

function nextActions(mem, pred, prof) {
  const days = mem.days_since_contact || 0;
  const sentiment = mem.last_sentiment || "Neutral";
  const intent = mem.last_intent || "General";
  const churn = pred.churn_risk;
  const pending = !!mem.last_proposal_id;
  const budget = mem.last_requirement?.budget;
  const acts = ["Call Customer", "Send Message", "Generate Proposal", "Recommend Product", "Offer Discount", "Schedule Follow-up", "Escalate Complaint", "Request Missing Information", "Do Nothing"];
  const scores = Object.fromEntries(acts.map(a => [a, 0]));
  if (sentiment === "Negative" || intent === "Complaint") { scores["Escalate Complaint"] += 3.0; scores["Call Customer"] += 1.2; }
  if (intent === "Purchase") scores["Generate Proposal"] += 2.4;
  if (pending) { scores["Generate Proposal"] += 1.0; scores["Request Missing Information"] += 1.4; }
  if (days >= 3) scores["Send Message"] += 1.2;
  if (days >= 7) scores["Schedule Follow-up"] += 1.5;
  if (days >= 14) { scores["Call Customer"] += 1.5; scores["Do Nothing"] -= 1.5; }
  if (sentiment === "Negative") scores["Offer Discount"] += 0.8;
  if (budget) scores["Recommend Product"] += 1.1;
  if (churn >= 0.5) { scores["Call Customer"] += 1.3; scores["Offer Discount"] += 0.6; }
  scores["Do Nothing"] += 0.3;
  const W = { "Call Customer": 1.4, "Send Message": 1.0, "Generate Proposal": 1.8, "Recommend Product": 0.9, "Offer Discount": 1.2, "Schedule Follow-up": 1.1, "Escalate Complaint": 2.6, "Request Missing Information": 1.5, "Do Nothing": 0.2 };
  return acts.map(a => { const s = scores[a] * (W[a] || 1); return { action: a, score: Math.round(s * 1000) / 1000, priority: s >= 2.5 ? "high" : s >= 1 ? "medium" : "low" }; }).sort((a, b) => b.score - a.score);
}
path: "C:\\Users\\Gagan\\Documents\\Default Project\\HubSpot\\frontend\\functions\\api\\[[path]].js"