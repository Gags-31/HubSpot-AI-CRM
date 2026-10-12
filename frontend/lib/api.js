// API helper — the site is served by the same FastAPI origin, so use relative paths.
async function req(path, options) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
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
  generateProposal: (customerId, messages) =>
    req(`/proposals/generate?customer_id=${encodeURIComponent(customerId)}`, { method: "POST", body: JSON.stringify(messages) }),
  ask: (query) => req(`/assistant/ask?query=${encodeURIComponent(query)}`, { method: "POST" }),
  analytics: (customerId) => req(`/analytics/customer/${encodeURIComponent(customerId)}`),
  workspace: (customerId) => req(`/workspace/${encodeURIComponent(customerId)}`),
  products: (category) => req(`/products/${category ? `?category=${encodeURIComponent(category)}` : ""}`),
  recommend: (quantity, category) => req(`/products/recommend/fit?quantity=${quantity}${category ? `&category=${encodeURIComponent(category)}` : ""}`),
  budgetFit: (budget) => req(`/products/search/budget?budget=${encodeURIComponent(budget)}`),
  orders: (customerId) => req(`/orders/${customerId ? `?customer_id=${encodeURIComponent(customerId)}` : ""}`),
  createOrder: (customerId, items) =>
    req(`/orders/?customer_id=${encodeURIComponent(customerId)}`, { method: "POST", body: JSON.stringify(items) }),
  runAgent: (payload) => req("/agents/run", { method: "POST", body: JSON.stringify(payload) }),
};

export const fmt = (n) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);