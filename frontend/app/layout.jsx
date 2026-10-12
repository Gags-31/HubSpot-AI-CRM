import "./globals.css";

export const metadata = {
  title: "HubSpot — Agentic AI CRM",
  description: "Conversational customer management and automated proposal generation",
};

const nav = [
  ["/web/", "Dashboard"],
  ["/web/chat/", "Conversation"],
  ["/web/products/", "Products"],
  ["/web/orders/", "Orders"],
  ["/web/consumers/", "Customer 360"],
  ["/architecture.html", "Architecture"],
  ["/docs", "API Docs"],
];

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header>
          <div className="brand">HubSpot <span>AI CRM</span></div>
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