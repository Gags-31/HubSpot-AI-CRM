"use client";
import { useEffect, useState } from "react";
import { api, fmt } from "../../lib/api";
import { Toasts, useToasts, Empty } from "../../components/ui";

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filter, setFilter] = useState("");
  const [budget, setBudget] = useState("Rs 2 lakh");
  const [fits, setFits] = useState(null);
  const [rec, setRec] = useState(null);
  const [cart, setCart] = useState([]);
  const { items, push } = useToasts();

  useEffect(() => {
    api.products().then((d) => { setProducts(d.products); setCategories(d.categories); })
      .catch((e) => push(e.message, "warn"));
    try { setCart(JSON.parse(localStorage.getItem("hubspot_cart") || "[]")); } catch {}
  }, []);

  function add(p) {
    const next = [...cart.filter((x) => x.product_id !== p.id), { product_id: p.id, quantity: 1 }];
    setCart(next);
    localStorage.setItem("hubspot_cart", JSON.stringify(next));
    push(`${p.name} added to cart`, "ok");
  }

  const visible = filter ? products.filter((p) => p.category === filter) : products;
  const detail = (id) => products.find((p) => p.id === id);

  return (
    <>
      <Toasts items={items} />
      <div className="card">
        <div className="card-title">
          <div><h3>Recommendation &amp; budget engines</h3><p>Driven by the requirement extracted from conversation</p></div>
          <span className="badge brand">cart {cart.length}</span>
        </div>
        <div className="row">
          <input value={budget} onChange={(e) => setBudget(e.target.value)} style={{ maxWidth: 180 }} />
          <button className="btn" onClick={async () => setFits((await api.budgetFit(budget)).fits)}>Find within budget</button>
          <button className="btn ghost" onClick={async () => setRec(await api.recommend(50))}>Recommend for 50 units</button>
          <span className="spacer" />
          <div className="pill-row">
            <button className={`pill ${!filter ? "active" : ""}`} onClick={() => setFilter("")}>All</button>
            {categories.map((c) => (
              <button key={c} className={`pill ${filter === c ? "active" : ""}`} onClick={() => setFilter(c)}>{c}</button>
            ))}
          </div>
        </div>

        {rec && (
          <div className="grid g3" style={{ marginTop: 16 }}>
            <div className="card tight">
              <div className="stat-label">Primary suggestion</div>
              <div style={{ fontWeight: 600, marginTop: 4 }}>{rec.primary_suggestion.name}</div>
              <div className="stat-delta">₹{fmt(rec.estimated_total)} for {rec.quantity} units</div>
            </div>
            <div className="card tight">
              <div className="stat-label">Upsell</div>
              <div style={{ fontWeight: 600, marginTop: 4 }}>{rec.upsell?.name ?? "—"}</div>
              <div className="stat-delta">attach to every kit</div>
            </div>
            <div className="card tight">
              <div className="stat-label">Stock</div>
              <div style={{ fontWeight: 600, marginTop: 4 }}>{rec.primary_suggestion.stock} units</div>
              <span className={`badge ${rec.stock_check === "in_stock" ? "ok" : "warn"}`}>{rec.stock_check}</span>
            </div>
          </div>
        )}
      </div>

      {fits && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-title"><div><h3>Fits inside {budget}</h3><p>Budget-fit engine</p></div>
            <button className="btn ghost tiny" onClick={() => setFits(null)}>clear</button></div>
          {fits.length === 0 ? <Empty>Nothing in the catalog fits that budget.</Empty> : (
            <table>
              <thead><tr><th>Product</th><th>Category</th><th>Unit price</th><th>Stock</th><th /></tr></thead>
              <tbody>
                {fits.map((p) => (
                  <tr key={p.id}>
                    <td><b>{p.name}</b><div style={{ color: "var(--text-faint)", fontSize: 12 }}>{p.description}</div></td>
                    <td><span className="badge">{p.category}</span></td>
                    <td>₹{fmt(p.unit_price)}</td>
                    <td>{p.stock}</td>
                    <td><button className="btn tiny" onClick={() => add(p)}>Add</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div className="section-title">Catalog ({visible.length})</div>
      <div className="grid g3">
        {visible.map((p) => (
          <div className="card" key={p.id}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="badge brand">{p.category}</span>
              <span className="mono" style={{ color: "var(--text-faint)" }}>{p.id}</span>
            </div>
            <h3 style={{ margin: "10px 0 4px" }}>{p.name}</h3>
            <p style={{ color: "var(--text-dim)", minHeight: 40 }}>{p.description}</p>
            <div className="row" style={{ justifyContent: "space-between", marginTop: 8 }}>
              <span className="stat" style={{ fontSize: 20 }}>₹{fmt(p.unit_price)}</span>
              <button className="btn tiny" onClick={() => add(p)}>Add to cart</button>
            </div>
            <div className="stat-delta">stock {p.stock} · {p.currency}</div>
          </div>
        ))}
      </div>

      {cart.length > 0 && (
        <div className="card" style={{ marginTop: 20, position: "sticky", bottom: 16 }}>
          <div className="row">
            <b>Cart · {cart.length} item(s)</b>
            <span className="spacer" />
            <a className="btn" href="/orders/">Review &amp; place order</a>
            <button className="btn ghost tiny" onClick={() => { setCart([]); localStorage.removeItem("hubspot_cart"); }}>clear</button>
          </div>
          <div className="stat-delta">{cart.map((c) => `${detail(c.product_id)?.name ?? c.product_id} ×${c.quantity}`).join(" · ")}</div>
        </div>
      )}
    </>
  );
}