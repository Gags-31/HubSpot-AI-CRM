const nav = [
  ["/web/", "Dashboard"],
  ["/web/chat/", "Live Chat"],
  ["/web/products/", "Products"],
  ["/web/orders/", "Orders"],
  ["/web/proposals/", "Proposals"],
  ["/web/consumers/", "Customer 360"],
  ["/web/platform/", "Platform"],
  ["/architecture.html", "Architecture"],
  ["/docs", "API Docs"],
];

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header>
          <div className="brand">HubSpot <span>Agentic AI CRM</span></div>
          <nav>
            {nav.map(([href, label]) => (
              <a key={href} href={href}>{label}</a>
            ))}
          </nav>
        </header>
        <main>{children}</main>
        <footer>Talk to the customer. Let AI handle the CRM.</footer>
      </body>
    </html>
  );
}