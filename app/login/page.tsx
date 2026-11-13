"use client";

import { FormEvent, Suspense, useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import RsmLogo from "@/components/RsmLogo";
import PrivacyNotice from "@/components/PrivacyNotice";
import { RSM_BRAND_NAME } from "@/lib/brand";
import styles from "./login.module.css";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className={styles.page}>
          <p className={styles.loading}>Loading sign in...</p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

/** Same-origin relative path only — never follow NextAuth absolute URLs (those use NEXTAUTH_URL). */
function safeCallbackPath(raw: string | null): string {
  if (!raw) return "/dashboard";
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/dashboard";
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<"password" | "otp">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpInfo, setOtpInfo] = useState("");
  const otpInputRef = useRef<HTMLInputElement>(null);

  // Password managers often paste the prior password into the next text field.
  // Keep OTP controlled, remounted, and scrubbed after delayed autofill.
  useEffect(() => {
    if (step !== "otp") return;

    setOtp("");
    const input = otpInputRef.current;
    if (input) {
      input.value = "";
    }

    const scrub = () => {
      setOtp((current) => (/^\d{0,6}$/.test(current) ? current : ""));
      if (otpInputRef.current && !/^\d{0,6}$/.test(otpInputRef.current.value)) {
        otpInputRef.current.value = "";
      }
    };

    const t0 = window.setTimeout(scrub, 0);
    const t1 = window.setTimeout(scrub, 50);
    const t2 = window.setTimeout(scrub, 200);
    const focusTimer = window.setTimeout(() => {
      otpInputRef.current?.focus({ preventScroll: true });
    }, 30);

    return () => {
      window.clearTimeout(t0);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(focusTimer);
    };
  }, [step]);

  async function startMfa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setOtpInfo("");

    const form = new FormData(event.currentTarget);
    const nextEmail = String(form.get("email") ?? "")
      .trim()
      .toLowerCase();
    const nextPassword = String(form.get("password") ?? "");

    try {
      const response = await fetch("/api/auth/mfa/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: nextEmail, password: nextPassword }),
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
        message?: string;
      } | null;

      if (!response.ok) {
        setError(data?.error ?? "Invalid email or password.");
        setSubmitting(false);
        return;
      }

      setEmail(nextEmail);
      setPassword(nextPassword);
      setOtp("");
      setOtpInfo(data?.message ?? "A verification code was sent to your email.");
      setStep("otp");
    } catch {
      setError("Unable to start sign-in. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    const callbackPath = safeCallbackPath(searchParams.get("callbackUrl"));
    const code = otp.trim();

    const result = await signIn("credentials", {
      email,
      password,
      otp: code,
      redirect: false,
      callbackUrl: callbackPath,
    });

    if (!result?.ok) {
      setError("Invalid or expired verification code.");
      setSubmitting(false);
      return;
    }

    router.push(callbackPath);
    router.refresh();
  }

  async function resendOtp() {
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/auth/mfa/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
        message?: string;
      } | null;
      if (!response.ok) {
        setError(data?.error ?? "Unable to resend code.");
        return;
      }
      setOtpInfo(data?.message ?? "A new verification code was sent.");
    } catch {
      setError("Unable to resend code.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      {step === "password" ? (
        <form onSubmit={startMfa} className={styles.card} autoComplete="on">
          <div className={styles.logoWrap}>
            <RsmLogo className={styles.logo} priority />
          </div>
          <h1>CX team sign in</h1>
          <p>Use your {RSM_BRAND_NAME} Voice of Clients credentials.</p>
          <label className={styles.field}>
            Email
            <input
              name="email"
              type="email"
              autoComplete="username"
              required
            />
          </label>
          <label className={styles.field}>
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          {error ? (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          ) : null}
          <button type="submit" disabled={submitting} className={styles.submit}>
            {submitting ? "Sending code..." : "Continue"}
          </button>
        </form>
      ) : (
        <form
          key="otp-step"
          onSubmit={verifyOtp}
          className={styles.card}
          autoComplete="off"
        >
          <div className={styles.logoWrap}>
            <RsmLogo className={styles.logo} priority />
          </div>
          <h1>Enter verification code</h1>
          <p>
            We emailed a 6-digit code to <strong>{email}</strong>.
          </p>
          {otpInfo ? <p className={styles.loading}>{otpInfo}</p> : null}
          {/* Absorb password-manager autofill so it does not land in the OTP field. */}
          <div className={styles.autofillTrap} aria-hidden="true">
            <input
              type="text"
              name="username"
              autoComplete="username"
              tabIndex={-1}
              defaultValue={email}
              readOnly
            />
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              tabIndex={-1}
              defaultValue=""
              readOnly
            />
          </div>
          <label className={styles.field}>
            Verification code
            <input
              key={`otp-input-${email}`}
              ref={otpInputRef}
              name="one-time-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              pattern="\d{6}"
              maxLength={6}
              required
              value={otp}
              onChange={(event) => {
                const next = event.target.value.replace(/\D/g, "").slice(0, 6);
                setOtp(next);
              }}
              data-1p-ignore="true"
              data-lpignore="true"
              data-form-type="other"
            />
          </label>
          {error ? (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          ) : null}
          <button type="submit" disabled={submitting} className={styles.submit}>
            {submitting ? "Verifying..." : "Sign in"}
          </button>
          <button
            type="button"
            className={styles.submit}
            style={{ marginTop: 8, background: "transparent", color: "#009cde" }}
            disabled={submitting}
            onClick={() => void resendOtp()}
          >
            Resend code
          </button>
          <button
            type="button"
            className={styles.submit}
            style={{ marginTop: 8, background: "transparent", color: "#63666a" }}
            disabled={submitting}
            onClick={() => {
              setStep("password");
              setOtp("");
              setError("");
              setOtpInfo("");
            }}
          >
            Back
          </button>
        </form>
      )}

      <PrivacyNotice className={styles.notice} />
    </main>
  );
}
