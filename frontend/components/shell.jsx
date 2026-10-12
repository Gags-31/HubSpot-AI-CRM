"use client";
import { usePathname } from "next/navigation";
import { useTheme } from "./ui";

const NAV = [
  { group: "Workspace", items: [["/web/", "Overview"], ["/web/chat/", "Conversations"]] },
  { group: "Intelligence", items: [["/web/consumers/", "Customers"]] },
  { group: "Commerce", items: [["/web/products/", "Catalog"], ["/web/orders/", "Orders"], ["/web/proposals/", "Proposals"]] },
  { group: "Operations", items: [["/web/platform/", "Platform"]] },
];

const REFERENCE = [["/architecture.html", "Architecture"], ["/docs", "API reference"]];

const TITLES = Object.fromEntries(NAV.flatMap((s) => s.items).concat(REFERENCE));

export default function Shell({ children }) {
  const pathname = usePathname();
  const [theme, toggle] = useTheme();
  const current = pathname === "/" ? "/web/" : pathname;
  const title = TITLES[current] ?? "HubSpot";

  return (
    <div className="shell" data-theme={theme}>
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-mark">H</div>
          <div className="logo-text">
            HubSpot
            <small>AGENTIC AI CRM</small>
          </div>
        </div>

        <nav className="nav">
          {NAV.map((s) => (
            <div key={s.group}>
              <div className="nav-label">{s.group}</div>
              {s.items.map(([href, label]) => (
                <a key={href} href={href} className={current === href ? "active" : ""}>
                  <i className="dot" /> {label}
                </a>
              ))}
            </div>
          ))}
          <div className="nav-label">Reference</div>
          {REFERENCE.map(([href, label]) => (
            <a key={href} href={href}><i className="dot" /> {label}</a>
          ))}
        </nav>

        <div style={{ marginTop: 24, padding: 14, border: "1px solid var(--border-soft)", borderRadius: 12, background: "var(--surface)" }}>
          <div className="stat-label">Core philosophy</div>
          <p style={{ fontSize: 12.5, color: "var(--text-dim)", margin: "6px 0 0" }}>
            Humans communicate. AI understands, organises, analyses and executes.
          </p>
        </div>
      </aside>

      <div className="main">
        <div className="topbar">
          <div>
            <h1>{title}</h1>
            <div className="sub">Conversation in → structured intelligence out</div>
          </div>
          <div className="row tight">
            <span className="badge ok">API online</span>
            <a className="btn ghost tiny" href="/web/chat/">Start conversation</a>
            <button className="btn ghost tiny" onClick={toggle}>{theme === "dark" ? "Light" : "Dark"} mode</button>
          </div>
        </div>
        <div className="content">{children}</div>
        <div className="footer">HubSpot AI CRM · major engineering project · demo data seeded by the system</div>
      </div>
    </div>
  );
}