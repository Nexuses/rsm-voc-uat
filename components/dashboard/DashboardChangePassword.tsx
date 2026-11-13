"use client";

import { FormEvent, useState } from "react";
import styles from "./dashboard.module.css";

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M3 3l18 18"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
        <path
          d="M10.6 10.7a2.5 2.5 0 0 0 3.5 3.5"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
        <path
          d="M9.9 5.2A10.5 10.5 0 0 1 12 5c5.2 0 8.8 4.1 10 7-0.4 1-1.1 2.2-2.1 3.3M6.1 6.2C4.4 7.5 3.3 9.1 2.7 10.2c.9 2.2 4.1 7 9.3 7 1.3 0 2.5-.2 3.6-.6"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2.7 12C3.9 9.1 7.5 5 12 5s8.1 4.1 9.3 7c-1.2 2.9-4.8 7-9.3 7s-8.1-4.1-9.3-7Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="12"
        r="2.75"
        stroke="currentColor"
        strokeWidth="1.75"
      />
    </svg>
  );
}

export default function DashboardChangePassword() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/settings/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(body.error ?? "Could not update password.");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setMessage("Password updated. Use the new password next time you sign in.");
    } catch {
      setError("Could not update password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className={styles.inviteSection} aria-label="Account password">
      <p className={styles.widgetIntro}>
        Change your own dashboard password. Use this if you signed in with a
        temporary password.
      </p>

      {error ? (
        <p className={styles.inviteAlert} role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className={styles.inviteSuccess} role="status" aria-live="polite">
          {message}
        </p>
      ) : null}

      <form className={styles.inviteForm} onSubmit={handleSubmit}>
        <div className={styles.inviteFieldGrid}>
          <label className={styles.inviteField}>
            Current password
            <span className={styles.passwordInputWrap}>
              <input
                type={showCurrentPassword ? "text" : "password"}
                name="currentPassword"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
              />
              <button
                type="button"
                className={styles.passwordVisibilityToggle}
                onClick={() => setShowCurrentPassword((value) => !value)}
                aria-label={
                  showCurrentPassword
                    ? "Hide current password"
                    : "Show current password"
                }
                aria-pressed={showCurrentPassword}
              >
                <EyeIcon open={showCurrentPassword} />
              </button>
            </span>
          </label>
          <label className={styles.inviteField}>
            New password
            <span className={styles.passwordInputWrap}>
              <input
                type={showNewPassword ? "text" : "password"}
                name="newPassword"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                minLength={8}
                required
              />
              <button
                type="button"
                className={styles.passwordVisibilityToggle}
                onClick={() => setShowNewPassword((value) => !value)}
                aria-label={
                  showNewPassword ? "Hide new password" : "Show new password"
                }
                aria-pressed={showNewPassword}
              >
                <EyeIcon open={showNewPassword} />
              </button>
            </span>
          </label>
          <label className={styles.inviteField}>
            Confirm new password
            <span className={styles.passwordInputWrap}>
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={8}
                required
              />
              <button
                type="button"
                className={styles.passwordVisibilityToggle}
                onClick={() => setShowConfirmPassword((value) => !value)}
                aria-label={
                  showConfirmPassword
                    ? "Hide confirm password"
                    : "Show confirm password"
                }
                aria-pressed={showConfirmPassword}
              >
                <EyeIcon open={showConfirmPassword} />
              </button>
            </span>
          </label>
        </div>
        <div className={styles.inviteActions}>
          <button
            type="submit"
            className={styles.invitePrimaryButton}
            disabled={submitting}
          >
            {submitting ? "Updating…" : "Update password"}
          </button>
        </div>
      </form>
    </section>
  );
}
