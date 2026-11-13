"use client";

import { useRef, useState } from "react";
import {
  INVITE_RECIPIENT_FIELD_LABELS,
  SAMPLE_INVITE_CSV,
} from "@/lib/survey-outreach";
import type { InviteFieldSuggestions } from "@/lib/survey-staff-contacts";
import styles from "./dashboard.module.css";

type SurveyInviteDefaults = {
  to: string;
  subject: string;
  surveyUrl: string;
  smtpConfigured: boolean;
  followupScheduleDays: readonly number[];
  csvColumns: readonly string[];
};

type SurveyInviteFormProps = {
  defaults: SurveyInviteDefaults;
  suggestions: InviteFieldSuggestions;
};

const emptySuggestions: InviteFieldSuggestions = {
  departments: [],
  services: [],
  partners: [],
  partnerEmails: [],
  partnerEmailByName: {},
  businessManagers: [],
  businessManagerEmails: [],
  businessManagerEmailByName: {},
  jobManagers: [],
  jobManagerEmails: [],
  jobManagerEmailByName: {},
  teamLeaders: [],
};

type SendResult = {
  sent: number;
  failed: number;
  total: number;
};

type InviteMode = "single" | "csv";

type SingleRecipientForm = {
  email: string;
  department: string;
  serviceName: string;
  partner: string;
  partnerEmail: string;
  businessManagerName: string;
  businessManagerEmail: string;
  jobManagerName: string;
  jobManagerEmail: string;
  teamLeader: string;
  customerName: string;
  company: string;
  designation: string;
  projectId: string;
  surveyOrder: string;
};

const emptySingleRecipient = (email = ""): SingleRecipientForm => ({
  email,
  department: "",
  serviceName: "",
  partner: "",
  partnerEmail: "",
  businessManagerName: "",
  businessManagerEmail: "",
  jobManagerName: "",
  jobManagerEmail: "",
  teamLeader: "",
  customerName: "",
  company: "",
  designation: "",
  projectId: "",
  surveyOrder: "",
});

type SuggestionListKey = {
  [K in keyof InviteFieldSuggestions]: InviteFieldSuggestions[K] extends readonly string[]
    ? K
    : never;
}[keyof InviteFieldSuggestions];

const suggestionLists: Partial<
  Record<keyof SingleRecipientForm, SuggestionListKey>
> = {
  department: "departments",
  serviceName: "services",
  partner: "partners",
  partnerEmail: "partnerEmails",
  businessManagerName: "businessManagers",
  businessManagerEmail: "businessManagerEmails",
  jobManagerName: "jobManagers",
  jobManagerEmail: "jobManagerEmails",
  teamLeader: "teamLeaders",
};

const emailByNameField: Partial<
  Record<
    keyof SingleRecipientForm,
    {
      emailField: "partnerEmail" | "businessManagerEmail" | "jobManagerEmail";
      map:
        | "partnerEmailByName"
        | "businessManagerEmailByName"
        | "jobManagerEmailByName";
    }
  >
> = {
  partner: { emailField: "partnerEmail", map: "partnerEmailByName" },
  businessManagerName: {
    emailField: "businessManagerEmail",
    map: "businessManagerEmailByName",
  },
  jobManagerName: {
    emailField: "jobManagerEmail",
    map: "jobManagerEmailByName",
  },
};

function suggestionNameKey(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function SuggestionInput({
  id,
  name,
  type,
  value,
  options,
  disabled,
  onValueChange,
}: {
  id: string;
  name: string;
  type: "text" | "email";
  value: string;
  options: string[];
  disabled: boolean;
  onValueChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const query = value.trim().toLowerCase();
  const matches = options.filter(
    (option) => !query || option.toLowerCase().includes(query)
  );
  const visible = open && matches.length > 0;
  const highlighted = matches[Math.min(activeIndex, matches.length - 1)];

  function choose(option: string) {
    onValueChange(option);
    setOpen(false);
  }

  return (
    <div className={styles.suggestionField}>
      <input
        id={id}
        type={type}
        name={name}
        role="combobox"
        aria-expanded={visible}
        aria-autocomplete="list"
        aria-controls={visible ? `${id}-list` : undefined}
        aria-activedescendant={
          visible && highlighted ? `${id}-option-${matches.indexOf(highlighted)}` : undefined
        }
        autoComplete="off"
        value={value}
        disabled={disabled}
        onMouseDown={() => {
          setActiveIndex(0);
          setOpen(true);
        }}
        onFocus={() => {
          setActiveIndex(0);
          setOpen(true);
        }}
        onBlur={() => setOpen(false)}
        onChange={(event) => {
          setActiveIndex(0);
          setOpen(true);
          onValueChange(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            if (!visible) {
              setOpen(true);
              setActiveIndex(0);
              return;
            }
            setActiveIndex((index) =>
              Math.min(index + 1, Math.max(matches.length - 1, 0))
            );
            return;
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((index) => Math.max(index - 1, 0));
            return;
          }
          if (event.key === "Escape") {
            setOpen(false);
            return;
          }
          if (event.key === "Enter" && visible && highlighted) {
            event.preventDefault();
            choose(highlighted);
          }
        }}
      />
      {visible ? (
        <ul id={`${id}-list`} className={styles.suggestionList} role="listbox">
          {matches.map((option, index) => (
            <li key={option} role="presentation">
              <button
                id={`${id}-option-${index}`}
                type="button"
                role="option"
                aria-selected={option === highlighted}
                className={
                  option === highlighted
                    ? styles.suggestionOptionActive
                    : styles.suggestionOption
                }
                onMouseDown={(event) => {
                  event.preventDefault();
                  choose(option);
                }}
                onMouseEnter={() =>
                  setActiveIndex(Math.max(matches.indexOf(option), 0))
                }
              >
                {option}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

const emailFields = new Set<keyof SingleRecipientForm>([
  "partnerEmail",
  "businessManagerEmail",
  "jobManagerEmail",
]);

export default function SurveyInviteForm({
  defaults,
  suggestions = emptySuggestions,
}: SurveyInviteFormProps) {
  const [mode, setMode] = useState<InviteMode>("single");
  const [singleRecipient, setSingleRecipient] = useState<SingleRecipientForm>(
    emptySingleRecipient(defaults.to)
  );
  const [subject, setSubject] = useState(defaults.subject);
  const [csvFileName, setCsvFileName] = useState("");
  const [csvText, setCsvText] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [sendResult, setSendResult] = useState<SendResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const csvExample = defaults.csvColumns.join(",");
  const isSending = status === "sending";
  const inputsDisabled = !defaults.smtpConfigured || isSending;

  function updateSingleField<K extends keyof SingleRecipientForm>(
    field: K,
    value: SingleRecipientForm[K]
  ) {
    setSingleRecipient((current) => {
      const next = { ...current, [field]: value };
      const link = emailByNameField[field];
      if (link && !current[link.emailField].trim()) {
        const email = suggestions[link.map][suggestionNameKey(value)];
        if (email) next[link.emailField] = email;
      }
      return next;
    });
    setStatus("idle");
    setErrorMessage("");
    setSendResult(null);
  }

  function switchMode(nextMode: InviteMode) {
    if (nextMode === mode) return;
    setMode(nextMode);
    setStatus("idle");
    setErrorMessage("");
    setSendResult(null);

    if (nextMode === "single") {
      clearCsv();
    } else {
      setSingleRecipient(emptySingleRecipient());
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setErrorMessage("");
    setSendResult(null);

    try {
      const payload: Record<string, string> = { subject };

      if (mode === "csv") {
        if (!csvText.trim()) {
          setStatus("error");
          setErrorMessage("Upload a CSV mailing list before sending.");
          return;
        }
        payload.csv = csvText;
      } else if (singleRecipient.email.trim()) {
        payload.to = singleRecipient.email.trim();
        for (const field of Object.keys(singleRecipient) as Array<
          keyof SingleRecipientForm
        >) {
          if (field === "email") continue;
          const value = singleRecipient[field].trim();
          if (value) payload[field] = value;
        }
      } else {
        setStatus("error");
        setErrorMessage("Enter a recipient email or import a CSV list.");
        return;
      }

      const response = await fetch("/api/survey/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        sent?: number;
        failed?: number;
        total?: number;
      };

      if (!response.ok) {
        setStatus("error");
        setErrorMessage(data.error ?? "Could not send the invitation.");
        return;
      }

      setSendResult({
        sent: data.sent ?? 1,
        failed: data.failed ?? 0,
        total: data.total ?? 1,
      });
      setStatus("sent");
    } catch {
      setStatus("error");
      setErrorMessage("Could not reach the server. Try again.");
    }
  }

  async function handleCsvChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setCsvFileName("");
      setCsvText("");
      return;
    }

    const text = await file.text();
    setMode("csv");
    setSingleRecipient(emptySingleRecipient());
    setCsvFileName(file.name);
    setCsvText(text);
    setStatus("idle");
    setErrorMessage("");
    setSendResult(null);
  }

  function clearCsv() {
    setCsvFileName("");
    setCsvText("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function resetTemplate() {
    setMode("single");
    setSingleRecipient(emptySingleRecipient(defaults.to));
    setSubject(defaults.subject);
    clearCsv();
    setStatus("idle");
    setErrorMessage("");
    setSendResult(null);
  }

  function downloadSampleCsv() {
    const blob = new Blob([SAMPLE_INVITE_CSV], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "survey-invite-sample.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className={styles.inviteSection} aria-label="Send survey invitation">
      <p className={styles.widgetIntro}>
        Email clients a branded Voice of Clients invitation with a unique tracked
        survey link. Opens, survey starts, and completions are measured per
        recipient. Automatic follow-up reminders are sent on days{" "}
        {defaults.followupScheduleDays.join(", ").replace(/, ([^,]*)$/, ", and $1")}{" "}
        unless the client has already completed the survey.
      </p>

      {!defaults.smtpConfigured ? (
        <p className={styles.inviteAlert} role="alert">
          Email sending is not configured. Add <code>SENDGRID_API_KEY</code> and{" "}
          <code>FROM_EMAIL</code> to the server environment before sending.
        </p>
      ) : null}

      <form className={styles.inviteForm} onSubmit={handleSubmit}>
        <div className={styles.inviteModeSwitch} role="tablist" aria-label="Recipient input mode">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "single"}
            className={mode === "single" ? styles.inviteModeActive : styles.inviteModeOption}
            onClick={() => switchMode("single")}
            disabled={inputsDisabled}
          >
            Single recipient
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "csv"}
            className={mode === "csv" ? styles.inviteModeActive : styles.inviteModeOption}
            onClick={() => switchMode("csv")}
            disabled={inputsDisabled}
          >
            CSV upload
          </button>
        </div>

        {mode === "single" ? (
          <div className={styles.inviteModePanel} role="tabpanel">
            <label className={styles.inviteField}>
              <span>Email</span>
              <input
                type="email"
                name="to"
                autoComplete="email"
                value={singleRecipient.email}
                onChange={(event) => updateSingleField("email", event.target.value)}
                placeholder="client@example.com"
                disabled={inputsDisabled}
                required
              />
            </label>

            <div className={styles.inviteFieldGrid}>
              {(
                Object.keys(suggestionLists).concat([
                  "partnerEmail",
                  "businessManagerEmail",
                  "jobManagerEmail",
                  "teamLeader",
                  "customerName",
                  "company",
                  "designation",
                  "projectId",
                  "surveyOrder",
                ]) as Array<keyof SingleRecipientForm>
              )
                .filter((field) => field !== "email")
                .filter((field, index, all) => all.indexOf(field) === index)
                .map((field) => {
                  const listKey = suggestionLists[field];
                  const options = listKey ? suggestions[listKey] : [];
                  const inputId = `invite-${field}`;
                  return (
                    <div key={field} className={styles.inviteField}>
                      <label htmlFor={inputId}>
                        {INVITE_RECIPIENT_FIELD_LABELS[field]}
                      </label>
                      {options.length ? (
                        <SuggestionInput
                          id={inputId}
                          name={field}
                          type={emailFields.has(field) ? "email" : "text"}
                          value={singleRecipient[field]}
                          options={options}
                          disabled={inputsDisabled}
                          onValueChange={(value) =>
                            updateSingleField(field, value)
                          }
                        />
                      ) : (
                        <input
                          id={inputId}
                          type={emailFields.has(field) ? "email" : "text"}
                          name={field}
                          value={singleRecipient[field]}
                          onChange={(event) =>
                            updateSingleField(field, event.target.value)
                          }
                          disabled={inputsDisabled}
                        />
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        ) : (
          <div className={styles.inviteModePanel} role="tabpanel">
            <div className={styles.inviteField}>
              <span>Import CSV mailing list</span>
              <div className={styles.inviteCsvRow}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleCsvChange}
                  disabled={inputsDisabled}
                />
                <button
                  type="button"
                  className={styles.inviteSecondaryButton}
                  onClick={downloadSampleCsv}
                  disabled={inputsDisabled}
                >
                  Download sample CSV
                </button>
                {csvFileName ? (
                  <button
                    type="button"
                    className={styles.inviteSecondaryButton}
                    onClick={clearCsv}
                    disabled={isSending}
                  >
                    Clear CSV
                  </button>
                ) : null}
              </div>
              <p className={styles.inviteCsvHint}>
                {csvFileName
                  ? `Loaded ${csvFileName}. Recipient metadata is imported from the CSV columns.`
                  : "Upload a CSV with a header row to send a bulk campaign."}
              </p>
              <div className={styles.inviteCsvFormat}>
                <p className={styles.inviteCsvFormatTitle}>CSV format</p>
                <p className={styles.inviteCsvFormatText}>
                  Include a header row with these columns (order does not matter):
                </p>
                <code className={styles.inviteCsvFormatCode}>{csvExample}</code>
                <p className={styles.inviteCsvFormatText}>
                  Only <code>email</code> is required. Department, service, partner,
                  and manager names are free text. A new name is added to the
                  suggestion list and becomes a dashboard filter option. Other
                  columns populate the invite tracker.
                </p>
              </div>
            </div>
          </div>
        )}

        <label className={styles.inviteField}>
          <span>Subject</span>
          <input
            type="text"
            name="subject"
            required
            maxLength={200}
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            disabled={inputsDisabled}
          />
        </label>

        <div className={styles.inviteField}>
          <span>Email content</span>
          <p className={styles.inviteTemplateNote}>
            The branded RSM HTML invitation template is sent automatically.
            Follow-up reminders use the same reminder template every 3 days by
            default (max 5; configurable in Settings → Reminders) for clients
            who have not completed the survey.
          </p>
        </div>

        <div className={styles.inviteActions}>
          <button
            type="button"
            className={styles.inviteSecondaryButton}
            onClick={resetTemplate}
            disabled={isSending}
          >
            Reset defaults
          </button>
          <button
            type="submit"
            className={styles.invitePrimaryButton}
            disabled={inputsDisabled}
          >
            {isSending
              ? "Sending…"
              : mode === "csv"
                ? "Send bulk invitations"
                : "Send invitation"}
          </button>
        </div>

        {status === "sent" && sendResult ? (
          <p className={styles.inviteSuccess} role="status">
            Sent {sendResult.sent} of {sendResult.total} invitation
            {sendResult.total === 1 ? "" : "s"}
            {sendResult.failed ? ` (${sendResult.failed} failed)` : ""}.
          </p>
        ) : null}

        {status === "error" ? (
          <p className={styles.inviteAlert} role="alert">
            {errorMessage}
          </p>
        ) : null}
      </form>
    </section>
  );
}
