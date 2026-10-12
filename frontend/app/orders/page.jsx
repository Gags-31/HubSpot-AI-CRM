"use client";
import { useEffect, useState } from "react";
import { api, fmt } from "../../lib/api";
import { Empty, KV, Skeleton, Toasts, useToasts } from "../../components/ui";

const STATUSES = ["confirmed", "packed", "dispatched", "delivered"];

export default function Orders() {
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState("Consumer_DEMO01");
  const [last, setLast] = useState(null);
  const { items, push } = useToasts();

  useEffect(() => {
    setCart(JSON.parse(localStorage.getItem("hubspot_cart") || "[]"));
    api.products().then((d) => setProducts(d.products)).catch(() => {});
    api.customers().then(setCustomers).catch(() => {});
    api.orders().then(setOrders).catch(() => {});
  }, []);

  const detail = (id) => products.find((p) => p.id === id);
  const estimate = cart.reduce((s, c) => s + (detail(c.product_id)?.unit_price ?? 0) * c.quantity, 0);

  async function place() {
    if (!cart.length) return;
    const o = await api.createOrder(customerId, cart);
    setLast(o);
    setCart([]);
    localStorage.removeItem("hubspot_cart");
    const fresh = await api.orders();
    setOrders(fresh);
    push(`Order ${o.id} confirmed`, "ok");
  }

  async function advance(id, current) {
    const next = STATUSES[Math.min(STATUSES.length - 1, STATUSES.indexOf(current) + 1)];
    await fetch(`/orders/${id}/status?status=${next}`, { method: "POST" });
    setOrders(await api.orders());
    push(`${id} → ${next}`, "ok");
  }

  return (
    <>
      <Toasts items={items} />
      <div className="grid g2" style={{ gridTemplateColumns: "1.1fr 1fr" }}>
        <div className="card">
          <div className="card-title">
            <div><h3>Cart</h3><p>Items collected from the catalog</p></div>
            <span className="badge brand">{cart.length} item(s)</span>
          </div>
          {cart.length === 0 && <Empty>Cart is empty — <a href="/web/products/">add products</a>.</Empty>}
          {cart.map((c) => (
            <div className="kv" key={c.product_id}>
              <span>{detail(c.product_id)?.name ?? c.product_id} <span className="badge">×{c.quantity}</span></span>
              <b>₹{fmt((detail(c.product_id)?.unit_price ?? 0) * c.quantity)}</b>
            </div>
          ))}
          <div className="row" style={{ marginTop: 14 }}>
            <div style={{ minWidth: 220 }}>
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                {customers.length === 0 && <option>Consumer_DEMO01</option>}
                {customers.map((c) => <option key={c.id}>{c.id}</option>)}
              </select>
            </div>
            <button className="btn" onClick={place} disabled={!cart.length}>Place order</button>
          </div>
        </div>

        <div className="card">
          <div className="card-title"><div><h3>Order summary</h3><p>GST is computed automatically</p></div></div>
          {last ? (
            <>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <b className="mono">{last.id}</b><span className="badge ok">{last.status}</span>
              </div>
              <div style={{ marginTop: 10 }}>
                <KV label="Subtotal" value={`₹${fmt(last.subtotal)}`} />
                <KV label="GST (18%)" value={`₹${fmt(last.tax)}`} />
                <KV label="Grand total" value={`₹${fmt(last.grand_total)}`} />
              </div>
              <table style={{ marginTop: 10 }}>
                <thead><tr><th>Item</th><th>Qty</th><th>Amount</th></tr></thead>
                <tbody>{last.items.map((i) => (
                  <tr key={i.product_id}><td>{i.name}</td><td>{i.quantity}</td><td>₹{fmt(i.line_total)}</td></tr>
                ))}</tbody>
              </table>
            </>
          ) : cart.length === 0 ? <Skeleton rows={4} /> : (
            <>
              <KV label="Subtotal" value={`₹${fmt(estimate)}`} />
              <KV label="GST (18%)" value={`₹${fmt(estimate * 0.18)}`} />
              <KV label="Estimated total" value={`₹${fmt(estimate * 1.18)}`} />
            </>
          )}
        </div>
      </div>

      <div className="section-title">Order history ({orders.length})</div>
      <div className="card">
        {orders.length === 0 ? <Skeleton rows={3} /> : (
          <table>
            <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th /></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="mono">{o.id}</td>
                  <td>{o.customer_id}</td>
                  <td style={{ color: "var(--text-dim)" }}>{o.items.map((i) => `${i.name} ×${i.quantity}`).join(", ")}</td>
                  <td>₹{fmt(o.grand_total)}</td>
                  <td><span className={`badge ${o.status === "delivered" ? "ok" : "brand"}`}>{o.status}</span></td>
                  <td>
                    {o.status !== "delivered" &&
                      <button className="btn ghost tiny" onClick={() => advance(o.id, o.status)}>advance</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}