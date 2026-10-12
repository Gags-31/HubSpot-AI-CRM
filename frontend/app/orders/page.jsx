"use client";
import { useEffect, useState } from "react";
import { api, fmt } from "../../lib/api";

export default function Orders() {
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [customerId, setCustomerId] = useState("Consumer_001");
  const [last, setLast] = useState(null);
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    setCart(JSON.parse(localStorage.getItem("hubspot_cart") || "[]"));
    api.products().then(setProducts);
    api.customers().then(setCustomers);
    refresh();
  }, []);

  function refresh() { api.orders().then(setOrders).catch(() => {}); }

  async function place() {
    if (!cart.length) return;
    const o = await api.createOrder(customerId, cart);
    setLast(o);
    setCart([]); localStorage.removeItem("hubspot_cart");
    refresh();
  }

  const detail = (id) => products.find((p) => p.id === id);

  return (
    <>
      <h1>Orders</h1>
      <p>Anything you order is written into the consumer's digital workspace and Customer 360° view.</p>

      <div className="card" style={{ marginTop: 12 }}>
        <h3>Cart</h3>
        <div className="row">
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} style={{ maxWidth: 220 }}>
            {customers.length === 0 && <option>Consumer_001</option>}
            {customers.map((c) => <option key={c.id}>{c.id}</option>)}
          </select>
          <button onClick={place} disabled={!cart.length}>Place order</button>
          <a className="badge" href="/web/products/">Add products</a>
        </div>
        {cart.length === 0 && <p>Cart is empty — add items from the <a href="/web/products/">products page</a>.</p>}
        {cart.map((c) => <p key={c.product_id}>{detail(c.product_id)?.name ?? c.product_id} × {c.quantity}</p>)}
      </div>

      {last && (
        <div className="card" style={{ marginTop: 12 }}>
          <h3>Order {last.id} confirmed</h3>
          <table>
            <tbody>
              {last.items.map((i) => <tr key={i.product_id}><td>{i.name}</td><td>×{i.quantity}</td><td>₹{fmt(i.line_total)}</td></tr>)}
              <tr><th>Subtotal</th><td></td><td>₹{fmt(last.subtotal)}</td></tr>
              <tr><th>GST (18%)</th><td></td><td>₹{fmt(last.tax)}</td></tr>
              <tr><th>Grand total</th><td></td><td>₹{fmt(last.grand_total)}</td></tr>
            </tbody>
          </table>
        </div>
      )}

      <h2>Order history</h2>
      <div className="card">
        {orders.length === 0 && <p>No orders yet.</p>}
        {orders.map((o) => (
          <div key={o.id} style={{ borderBottom: "1px solid #1e293b", padding: "8px 0" }}>
            <b>{o.id}</b> · {o.customer_id} · <span className="badge ok">{o.status}</span> · ₹{fmt(o.grand_total)}
            <p style={{ margin: "4px 0 0" }}>{o.items.map((i) => `${i.name} ×${i.quantity}`).join(", ")}</p>
          </div>
        ))}
      </div>
    </>
  );
}