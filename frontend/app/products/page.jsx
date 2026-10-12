"use client";
import { useEffect, useState } from "react";
import { api, fmt } from "../../lib/api";

export default function Products() {
  const [products, setProducts] = useState([]);
  const [budget, setBudget] = useState("Rs 2 lakh");
  const [fits, setFits] = useState([]);
  const [rec, setRec] = useState(null);
  const [cart, setCart] = useState([]);
  const [err, setErr] = useState(null);

  useEffect(() => {
    api.products().then((d) => setProducts(d.products)).catch((e) => setErr(String(e)));
    try { setCart(JSON.parse(localStorage.getItem("hubspot_cart") || "[]")); } catch {}
  }, []);

  function add(p) {
    const next = [...cart.filter((x) => x.product_id !== p.id), { product_id: p.id, quantity: 1 }];
    setCart(next);
    localStorage.setItem("hubspot_cart", JSON.stringify(next));
  }

  return (
    <>
      <h1>Products &amp; Catalog</h1>
      <p>Everything you can order. The recommendation and budget-fit engines read the requirement extracted from your conversation.</p>
      {err && <pre>{err}</pre>}

      <div className="card" style={{ marginTop: 12 }}>
        <div className="row">
          <input value={budget} onChange={(e) => setBudget(e.target.value)} style={{ maxWidth: 220 }} />
          <button onClick={() => api.budgetFit(budget).then(setFits)}>Find products within budget</button>
          <button className="ghost" onClick={() => api.recommend(50).then(setRec)}>Recommend for 50 units</button>
          <a className="badge" href="/web/orders/">Cart: {cart.length}</a>
        </div>
      </div>

      {fits.length > 0 && (
        <div className="card" style={{ marginTop: 12 }}>
          <h3>Within {budget}</h3>
          {fits.map((p) => <p key={p.id}>{p.name} — ₹{fmt(p.unit_price)} / unit · stock {p.stock}</p>)}
        </div>
      )}
      {rec && (
        <div className="card" style={{ marginTop: 12 }}>
          <h3>Recommendation engine</h3>
          <p>Primary suggestion: <b>{rec.primary_suggestion.name}</b> × {rec.quantity} = ₹{fmt(rec.estimated_total)}</p>
          {rec.upsell && <p>Upsell: <b>{rec.upsell.name}</b></p>}
          <p>Stock check: <span className={`badge ${rec.stock_check === "in_stock" ? "ok" : "warn"}`}>{rec.stock_check}</span></p>
        </div>
      )}

      <div className="grid cols-3" style={{ marginTop: 14 }}>
        {products.map((p) => (
          <div className="card" key={p.id}>
            <h3>{p.name}</h3>
            <p className="badge">{p.category}</p>
            <p>₹{fmt(p.unit_price)} per unit · stock {p.stock}</p>
            <p>{p.description}</p>
            <button onClick={() => add(p)}>Add to cart</button>
          </div>
        ))}
      </div>
    </>
  );
}