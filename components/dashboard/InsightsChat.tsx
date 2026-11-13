"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import ChatCharts from "@/components/dashboard/ChatCharts";
import { parseChatModelOutput, type ChatChart } from "@/lib/chat-charts";
import type { DashboardWindow } from "./types";
import styles from "./dashboard.module.css";

type ChatSource = {
  responseId: string;
  company: string | null;
  clientName: string | null;
  label: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  charts?: ChatChart[];
  sources?: ChatSource[];
};

const starterPrompts = [
  "Summarize CSAT, CES, and NPS for this reporting period.",
  "How has NPS trended month over month?",
  "What themes are showing up most often?",
  "Which responses have risk signals?",
];

function createId() {
  return crypto.randomUUID();
}

export default function InsightsChat() {
  const [window, setWindow] = useState<DashboardWindow>("all");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [chatError, setChatError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (messages.length) {
      scrollToBottom();
    }
  }, [messages, asking, scrollToBottom]);

  async function submitQuestion(
    event: FormEvent<HTMLFormElement>,
    promptOverride?: string
  ) {
    event.preventDefault();
    const trimmed = (promptOverride ?? question).trim();
    if (!trimmed || asking) return;

    const userMessage: ChatMessage = {
      id: createId(),
      role: "user",
      content: trimmed,
    };

    setMessages((current) => [...current, userMessage]);
    setQuestion("");
    setChatError("");
    setAsking(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: trimmed, window }),
      });
      const data = (await response.json()) as {
        answer?: string;
        charts?: ChatChart[];
        sources?: ChatSource[];
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "Chat request failed");

      const parsed =
        typeof data.answer === "string" && data.answer.trim().startsWith("{")
          ? parseChatModelOutput(data.answer)
          : {
              answer: data.answer ?? "No answer was returned.",
              charts: Array.isArray(data.charts) ? data.charts : [],
            };

      const assistantMessage: ChatMessage = {
        id: createId(),
        role: "assistant",
        content: parsed.answer,
        charts: parsed.charts,
        sources: Array.isArray(data.sources) ? data.sources : [],
      };

      setMessages((current) => [...current, assistantMessage]);
    } catch (error) {
      setChatError(
        error instanceof Error
          ? error.message
          : "Unable to answer right now. Please try again."
      );
    } finally {
      setAsking(false);
    }
  }

  function clearConversation() {
    setMessages([]);
    setChatError("");
    setQuestion("");
  }

  return (
    <div className={styles.insightsPage}>
      <section className={styles.chatMain} aria-label="AI analyst conversation">
        <header className={styles.chatMainHeader}>
          <div>
            <span>AI analyst</span>
            <h1>Insights</h1>
            <p>
              Ask about CSAT, CES, NPS, trends, themes, and risk signals.
              Data-heavy answers include charts when helpful.
            </p>
          </div>
          <div className={styles.chatHeaderActions}>
            {messages.length ? (
              <button
                type="button"
                className={styles.chatClearButton}
                onClick={clearConversation}
              >
                Clear chat
              </button>
            ) : null}
            <label className={styles.periodFilter}>
              <span>Reporting period</span>
              <select
                value={window}
                onChange={(event) =>
                  setWindow(event.target.value as DashboardWindow)
                }
              >
                <option value="all">All time</option>
                <option value="90d">Last 90 days</option>
                <option value="year">This year</option>
              </select>
            </label>
          </div>
        </header>

        <div className={styles.chatMessages} role="log" aria-live="polite">
          {!messages.length ? (
            <div className={styles.chatEmpty}>
              <h2>What would you like to explore?</h2>
              <p>Start with a suggested question or type your own below.</p>
              <div
                className={styles.chatStarterGrid}
                aria-label="Suggested questions"
              >
                {starterPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className={styles.chatStarterCard}
                    disabled={asking}
                    onClick={() => {
                      setQuestion(prompt);
                      void submitQuestion(
                        { preventDefault() {} } as FormEvent<HTMLFormElement>,
                        prompt
                      );
                    }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className={styles.chatThread}>
              {messages.map((message) => (
                <article
                  key={message.id}
                  className={styles.chatBubble}
                  data-role={message.role}
                >
                  <header>
                    {message.role === "user" ? "You" : "CX analyst"}
                  </header>
                  <p>{message.content}</p>
                  {message.role === "assistant" && message.charts?.length ? (
                    <ChatCharts charts={message.charts} />
                  ) : null}
                  {message.sources?.length ? (
                    <div
                      className={styles.chatBubbleSources}
                      aria-label="Referenced companies"
                    >
                      <span>Referenced companies</span>
                      <ul>
                        {message.sources.map((source) => (
                          <li key={source.responseId}>{source.label}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </article>
              ))}
              {asking ? (
                <article
                  className={`${styles.chatBubble} ${styles.chatBubblePending}`}
                  data-role="assistant"
                >
                  <header>CX analyst</header>
                  <p className={styles.chatThinking}>Thinking...</p>
                </article>
              ) : null}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <form className={styles.chatComposer} onSubmit={submitQuestion}>
          {chatError ? (
            <p className={styles.chatComposerError} role="alert">
              {chatError}
            </p>
          ) : null}
          <div className={styles.chatComposerRow}>
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask about trends, themes, or specific responses..."
              rows={1}
              maxLength={2_000}
              aria-label="Question"
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <button type="submit" disabled={asking || !question.trim()}>
              {asking ? "..." : "Send"}
            </button>
          </div>
          <p className={styles.chatComposerHint}>
            Enter to send · Shift+Enter for a new line
          </p>
        </form>
      </section>
    </div>
  );
}
