// API helper — the site is served by the same FastAPI origin, so use relative paths.
const API = "/api";
async function req(path, options) {
  const res = await fetch(`${API}${path}`, { headers: { "Content-Type": "application/json" }, ...options });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

export const api = {
  health: () => req("/health"),
  customers: () => req("/customers/"),
  createCustomer: (name, contact) =>
    req(`/customers/?name=${encodeURIComponent(name)}${contact ? `&contact=${encodeURIComponent(contact)}` : ""}`, { method: "POST" }),
  conversation: (customerId, messages) =>
    req(`/conversations/?customer_id=${encodeURIComponent(customerId)}`, { method: "POST", body: JSON.stringify(messages) }),
  endConversation: (customerId) => req(`/conversations/end?customer_id=${encodeURIComponent(customerId)}`, { method: "POST" }),
  generateProposal: (customerId, messages, background = false) =>
    req(`/proposals/generate?customer_id=${encodeURIComponent(customerId)}${background ? "&background=true" : ""}`,
      { method: "POST", body: JSON.stringify(messages) }),
  answerMissing: (customerId, field, value) =>
    req(`/proposals/ask-missing?customer_id=${encodeURIComponent(customerId)}&field=${encodeURIComponent(field)}&value=${encodeURIComponent(value)}`,
      { method: "POST" }),
  proposals: (customerId) => req(`/proposals/${customerId ? `?customer_id=${encodeURIComponent(customerId)}` : ""}`),
  setProposalStatus: (id, status) => req(`/proposals/${id}/status?status=${status}`, { method: "POST" }),
  ask: (query, customerId) =>
    req(`/assistant/ask?query=${encodeURIComponent(query)}${customerId ? `&customer_id=${encodeURIComponent(customerId)}` : ""}`, { method: "POST" }),
  analytics: (customerId) => req(`/analytics/customer/${encodeURIComponent(customerId)}`),
  portfolio: () => req("/analytics/portfolio"),
  workspace: (customerId) => req(`/workspace/${encodeURIComponent(customerId)}`),
  products: (category) => req(`/products/${category ? `?category=${encodeURIComponent(category)}` : ""}`),
  recommend: (quantity, category) => req(`/products/recommend/fit?quantity=${quantity}${category ? `&category=${encodeURIComponent(category)}` : ""}`),
  budgetFit: (budget) => req(`/products/search/budget?budget=${encodeURIComponent(budget)}`),
  orders: (customerId) => req(`/orders/${customerId ? `?customer_id=${encodeURIComponent(customerId)}` : ""}`),
  createOrder: (customerId, items) => req(`/orders/?customer_id=${encodeURIComponent(customerId)}`, { method: "POST", body: JSON.stringify(items) }),
  runAgent: (agent, payload) => req(`/ops/agents/${agent}`, { method: "POST", body: JSON.stringify(payload) }),
  agents: () => req("/ops/agents"),
  mlModel: () => req("/ops/ml/model"),
  trainModel: () => req("/ops/ml/train", { method: "POST" }),
  metrics: () => req("/ops/metrics"),
  jobs: () => req("/ops/jobs"),
  login: (username, password) => req(`/security/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`, { method: "POST" }),
  audit: (limit = 25) => req(`/security/audit?limit=${limit}`),
  spark: () => req("/ops/stream/spark"),
  kafka: (topic, event) => req(`/ops/stream/kafka?topic=${encodeURIComponent(topic)}&event=${encodeURIComponent(event)}`, { method: "POST" }),
};

export function wsUrl(customerId) {
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${window.location.host}/api/ws/conversation/${customerId}`;
}

export const fmt = (n) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n ?? 0);