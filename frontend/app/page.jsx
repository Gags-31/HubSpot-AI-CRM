import { api } from "../lib/api";

export default function Dashboard() {
  return (
    <main style={{ padding: 24, color: "var(--text)" }}>
      <h2>Overview</h2>
      <p>Live conversations, proposals, orders and analytics are available.</p>
      <p><a href="/chat/" className="btn">Start a conversation</a></p>
    </main>
  );
}
