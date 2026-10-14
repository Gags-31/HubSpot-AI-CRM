"use client";
import { useEffect, useState } from "react";
import CommandPalette from "./commandpalette";

export default function Shell({ children }) {
  const theme = useTheme();
  return null;
}

/* re-export as single higher-order wrapper */
import { usePathname } from "next/navigation";
import { useTheme } from "./ui";

export function ShellWrapper({ children }) {
  const pathname = usePathname();
  const [t, toggle] = useTheme();
  const current = pathname === "/" ? "/web/" : pathname;
  const lines = [
    { group: "Workspace", items: [["/web/", "Overview"], ["/web/chat/", "Conversations"]] },
    { group: "Intelligence", items: [["/web/consumers/", "Customers"]] },
    { group: "Commerce", items: [["/web/products/", "Catalog"], ["/web/orders/", "Orders"], ["/web/proposals/", "Proposals"]] },
    { group: "Operations", items: [["/web/platform/", "Platform"]] },
  ];
  return (
    <div className="shell" data-theme={t}>
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-mark">H</div>
          <div className="logo-text">HubSpot<small>AGENTIC AI CRM</small></div>
        </div>
        <nav className="nav">
          {lines.map((s) => (
            <div key={s.group}>
              <div className="nav-label">{s.group}</div>
              {s.items.map(([href, label]) => (
                <a key={href} href={href} className={current === href ? "active" : ""}><i className="dot" /> {label}</a>
              ))}
            </div>
          ))}
          <div className="nav-label">Reference</div>
          <a href="/architecture.html"><i className="dot" /> Architecture</a>
          <a href="/docs"><i className="dot" /> API reference</a>
        </nav>
        <div style={{ marginTop: 24, padding: 14, border: "1px solid var(--border-soft)", borderRadius: 12, background: "var(--surface)" }}>
          <div className="stat-label">Core philosophy</div>
          <p style={{ fontSize: 12.5, color: "var(--text-dim)", margin: "6px 0 0" }}>
            Humans communicate. AI understands, organises, analyses and executes.
          </p>
          <div style={{ marginTop: 10, fontSize: 11, color: "var(--text-faint)" }}>
            press <kbd style={{ background: "var(--surface-2)", padding: "1px 6px", borderRadius: 4, fontFamily: "var(--mono)" }}>⌘K</kbd> for command palette
          </div>
        </div>
      </aside>

      <div className="main">
        <div className="topbar">
          <div><h1>{TITLE(current)}</h1><div className="sub">conversation in, structured intelligence out</div></div>
          <div className="row tight">
            <span className="badge ok"><i className="dot" style={{ background: "var(--ok)" }} /> API online</span>
            <a className="btn ghost tiny" href="/web/chat/">Start conversation</a>
            <button className="btn ghost tiny" onClick={toggle}>{t === "dark" ? "Light" : "Dark"} mode</button>
          </div>
        </div>
        <div className="content fade-up">{children}</div>
        <div className="footer">HubSpot AI CRM · major engineering project · MIT-style demo data · built {new Date().getFullYear()}</div>
      </div>

      <CommandPalette />
    </div>
  );
}

function TITLE(current) {
  const map = {
    "/web/": "Overview", "/web/chat/": "Conversations", "/web/consumers/": "Customer 360",
    "/web/products/": "Catalog", "/web/orders/": "Orders", "/web/proposals/": "Proposals",
    "/web/platform/": "Platform", "/architecture.html": "Architecture", "/docs": "API reference",
  };
  return map[current] ?? "HubSpot";
}