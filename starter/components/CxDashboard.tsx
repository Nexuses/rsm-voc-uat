"use client";
// components/CxDashboard.tsx — CX team insights dashboard shell (auth-gated page).
// Lists per-response AI insights, supports filtering, and includes the RAG chatbot.
import { useEffect, useState } from "react";

type Insight = {
  responseId: string;
  client: { name?: string; company?: string; tier?: string } | null;
  avgRating: number | null;
  sentiment: string;
  summary: string;
  keyDrivers: string[];
  riskSignals: string[];
  suggestedReply: { en: string; ar: string };
  nextSteps: string[];
};

export default function CxDashboard() {
  const [items, setItems] = useState<Insight[]>([]);
  const [filter, setFilter] = useState<string>("");
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState<string>("");
  const [loadingChat, setLoadingChat] = useState(false);

  useEffect(() => {
    const url = filter ? `/api/insights?sentiment=${filter}` : "/api/insights";
    fetch(url).then((r) => r.json()).then(setItems).catch(() => setItems([]));
  }, [filter]);

  async function ask() {
    if (!q.trim()) return;
    setLoadingChat(true);
    setAnswer("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      setAnswer(data.answer ?? "");
    } finally {
      setLoadingChat(false);
    }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 24, padding: 24 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Voice of Client — Insights</h1>
        <div style={{ margin: "12px 0", display: "flex", gap: 8 }}>
          {["", "negative", "neutral", "positive"].map((f) => (
            <button
              key={f || "all"}
              onClick={() => setFilter(f)}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                background: filter === f ? "#111" : "#fff",
                color: filter === f ? "#fff" : "#111",
                fontSize: 13,
              }}
            >
              {f || "all"}
            </button>
          ))}
        </div>

        {items.map((i) => (
          <div key={i.responseId} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>
                {i.client?.name ?? "Unknown"} {i.client?.company ? `· ${i.client.company}` : ""}
                {i.client?.tier ? ` · ${i.client.tier}` : ""}
              </strong>
              <span>{i.avgRating ?? "–"}/5 · {i.sentiment}</span>
            </div>
            <p style={{ fontSize: 14, color: "#374151" }}>{i.summary}</p>
            {Array.isArray(i.riskSignals) && i.riskSignals.length > 0 && (
              <p style={{ fontSize: 13, color: "#b91c1c" }}>⚠ {i.riskSignals.join(", ")}</p>
            )}
            <details style={{ fontSize: 13, marginTop: 6 }}>
              <summary>Suggested reply & next steps</summary>
              <p><strong>EN:</strong> {i.suggestedReply?.en}</p>
              <p><strong>AR:</strong> {i.suggestedReply?.ar}</p>
              <ul>{(i.nextSteps || []).map((s, k) => <li key={k}>{s}</li>)}</ul>
            </details>
          </div>
        ))}
      </div>

      <div style={{ position: "sticky", top: 24, alignSelf: "start" }}>
        <h2 style={{ fontSize: 16, fontWeight: 700 }}>Ask the feedback</h2>
        <textarea
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="e.g. Which key client gave negative feedback, and what should we do?"
          style={{ width: "100%", minHeight: 80, padding: 10, borderRadius: 8, border: "1px solid #e5e7eb" }}
        />
        <button onClick={ask} disabled={loadingChat} style={{ marginTop: 8, padding: "8px 14px", borderRadius: 8, background: "#4f46e5", color: "#fff", border: 0 }}>
          {loadingChat ? "Thinking…" : "Ask"}
        </button>
        {answer && (
          <div style={{ marginTop: 12, fontSize: 14, whiteSpace: "pre-wrap", border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
            {answer}
          </div>
        )}
      </div>
    </div>
  );
}
