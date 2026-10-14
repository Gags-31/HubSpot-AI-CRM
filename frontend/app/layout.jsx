import "./globals.css";

export const metadata = { title: "HubSpot", description: "CRM" };

export default function RootLayout({ children }) {
  return (
    <html lang="en"><body data-theme="dark"><div className="content">{children}</div></body></html>
  );
}
