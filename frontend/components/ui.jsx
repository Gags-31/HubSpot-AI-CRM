"use client";
import { useEffect, useState } from "react";

export function useTheme() {
  const [theme, setTheme] = useState("dark");
  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem("hubspot_theme") : null;
    if (saved) setTheme(saved);
  }, []);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("hubspot_theme", theme);
  }, [theme]);
  return [theme, () => setTheme((t) => (t === "dark" ? "light" : "dark"))];
}

export function Toasts({ items }) {
  return (
    <div className="toasts">
      {items.map((t) => (
        <div key={t.id} className={`toast ${t.kind || ""}`}>{t.text}</div>
      ))}
    </div>
  );
}

export function useToasts() {
  const [items, setItems] = useState([]);
  const push = (text, kind = "") => {
    const id = Date.now() + Math.random();
    setItems((i) => [...i, { id, text, kind }]);
    setTimeout(() => setItems((i) => i.filter((x) => x.id !== id)), 3600);
  };
  return { items, push };
}

export function Skeleton({ rows = 3 }) {
  return (
    <div className="list">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skel" style={{ width: `${90 - i * 12}%` }} />
      ))}
    </div>
  );
}

export function Empty({ children = "Nothing here yet." }) {
  return <div className="empty">{children}</div>;
}

export function KV({ label, value }) {
  return <div className="kv"><span className="stat-label">{label}</span><b>{value}</b></div>;
}