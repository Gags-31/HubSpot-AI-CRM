import "./globals.css";
import Shell from "../components/shell";

export const metadata = {
  title: "HubSpot — Agentic AI CRM",
  description: "Conversational customer management and automated proposal generation",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}