"use client";

import { FormEvent, useEffect, useState } from "react";
import styles from "./dashboard.module.css";

type ReminderSettings = {
  intervalDays: number;
  maxCount: number;
  ccEmails: string[];
  maxAutoSendsPerRun: number;
  scheduleDays: number[];
};

export default function DashboardReminderSettings() {
  const [intervalDays, setIntervalDays] = useState(3);
  const [maxCount, setMaxCount] = useState(5);
  const [ccEmails, setCcEmails] = useState("");
  const [maxAutoSendsPerRun, setMaxAutoSendsPerRun] = useState(200);
  const [scheduleDays, setScheduleDays] = useState<number[]>([3, 6, 9, 12, 15]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/settings/reminders");
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
          settings?: ReminderSettings;
        };
        if (!response.ok || !data.settings) {
          if (!cancelled) {
            setError(data.error ?? "Could not load reminder settings.");
          }
          return;
        }
        if (cancelled) return;
        setIntervalDays(data.settings.intervalDays);
        setMaxCount(data.settings.maxCount);
        setCcEmails(data.settings.ccEmails.join(", "));
        setMaxAutoSendsPerRun(data.settings.maxAutoSendsPerRun);
        setScheduleDays(data.settings.scheduleDays);
      } catch {
        if (!cancelled) setError("Could not reach the server.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/settings/reminders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intervalDays,
          maxCount,
          ccEmails,
          maxAutoSendsPerRun,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        settings?: ReminderSettings;
      };
      if (!response.ok || !data.settings) {
        setError(data.error ?? "Could not save reminder settings.");
        return;
      }
      setIntervalDays(data.settings.intervalDays);
      setMaxCount(data.settings.maxCount);
      setCcEmails(data.settings.ccEmails.join(", "));
      setMaxAutoSendsPerRun(data.settings.maxAutoSendsPerRun);
      setScheduleDays(data.settings.scheduleDays);
      setMessage("Reminder settings saved.");
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <header className={styles.topbar}>
        <div>
          <span>Settings</span>
          <h1>Survey reminders</h1>
        </div>
      </header>

      <section className={styles.inviteSection} aria-label="Reminder settings">
        <p className={styles.widgetIntro}>
          Automatic reminders go to incomplete invites on a fixed interval from
          the invite (or re-enable) date. Sends run Sunday–Thursday only (Kuwait
          weekend is Friday–Saturday). Opens and clicks never stop reminders —
          only submission, Stop, or exhausting the max count.
        </p>

        {loading ? <p className={styles.inviteCsvHint}>Loading…</p> : null}
        {error ? (
          <p className={styles.inviteError} role="alert">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className={styles.inviteSuccess} role="status">
            {message}
          </p>
        ) : null}

        {!loading ? (
          <form className={styles.inviteForm} onSubmit={handleSubmit}>
            <label className={styles.inviteField}>
              <span>Interval (days)</span>
              <input
                type="number"
                min={1}
                max={30}
                value={intervalDays}
                onChange={(event) => setIntervalDays(Number(event.target.value))}
                required
              />
            </label>
            <label className={styles.inviteField}>
              <span>Max reminders per invite</span>
              <input
                type="number"
                min={1}
                max={20}
                value={maxCount}
                onChange={(event) => setMaxCount(Number(event.target.value))}
                required
              />
            </label>
            <label className={styles.inviteField}>
              <span>Max auto-sends per daily run (stagger)</span>
              <input
                type="number"
                min={1}
                max={500}
                value={maxAutoSendsPerRun}
                onChange={(event) =>
                  setMaxAutoSendsPerRun(Number(event.target.value))
                }
                required
              />
            </label>
            <label className={styles.inviteField}>
              <span>CC on every reminder (comma-separated)</span>
              <input
                type="text"
                value={ccEmails}
                onChange={(event) => setCcEmails(event.target.value)}
                placeholder="voc@example.com"
              />
            </label>
            <p className={styles.inviteCsvHint}>
              Schedule days from invite/re-enable:{" "}
              {scheduleDays.join(", ") || "—"}. Manual “Send reminder” counts
              toward the max. Empty CC falls back to{" "}
              <code>SURVEY_REMINDER_CC_TO</code> or{" "}
              <code>SURVEY_COMPLETION_NOTIFY_TO</code>.
            </p>
            <button
              type="submit"
              className={styles.invitePrimaryButton}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save settings"}
            </button>
          </form>
        ) : null}
      </section>
    </>
  );
}
