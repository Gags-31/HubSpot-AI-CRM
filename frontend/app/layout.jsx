import "./globals.css";
import ShellWrapper from "../components/shell";

export const metadata = {
  title: "HubSpot — Agentic AI CRM",
  description: "Conversational customer management and automated proposal generation",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ShellWrapper>{children}</ShellWrapper>
      </body>
    </html>
  );
}