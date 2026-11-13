"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  invalidateSettingsCache,
  readSettingsCache,
  writeSettingsCache,
} from "@/components/dashboard/settings-list-cache";
import styles from "./dashboard.module.css";

type DirectoryRole =
  | "department"
  | "service"
  | "partner"
  | "business_manager"
  | "job_manager"
  | "team_leader";

const DIRECTORY_CACHE_KEY = "settings:directory";

const SECTIONS: Array<{
  role: DirectoryRole;
  label: string;
  hint: string;
  email: boolean;
}> = [
  {
    role: "department",
    label: "Department",
    hint: "Suggested on Send survey.",
    email: false,
  },
  {
    role: "service",
    label: "Service",
    hint: "Suggested on Send survey.",
    email: false,
  },
  {
    role: "partner",
    label: "Partner",
    hint: "Name and email. Choosing the name on Send survey fills the email when that field is empty.",
    email: true,
  },
  {
    role: "business_manager",
    label: "Business manager",
    hint: "Name and email. Choosing the name on Send survey fills the email when that field is empty.",
    email: true,
  },
  {
    role: "job_manager",
    label: "Job manager",
    hint: "Name and email. Choosing the name on Send survey fills the email when that field is empty.",
    email: true,
  },
  {
    role: "team_leader",
    label: "Team leader",
    hint: "Suggested on Send survey. Team leaders are not copied on the completion email.",
    email: false,
  },
];

type DirectoryEntry = {
  id: string;
  role: DirectoryRole;
  name: string;
  email: string | null;
};

type Draft = {
  name: string;
  email: string;
};

const emptyDraft = (): Draft => ({ name: "", email: "" });

function readCachedEntries() {
  return readSettingsCache<DirectoryEntry[]>(DIRECTORY_CACHE_KEY)?.data ?? null;
}

export default function DashboardDirectory() {
  const [entries, setEntries] = useState<DirectoryEntry[]>(
    () => readCachedEntries() ?? []
  );
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(emptyDraft());
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(() => !readCachedEntries());
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load(options?: { force?: boolean }) {
    const cached = readSettingsCache<DirectoryEntry[]>(DIRECTORY_CACHE_KEY);
    if (!options?.force && cached?.fresh) {
      setEntries(cached.data);
      setLoading(false);
      return;
    }
    setLoading(entries.length === 0 && !cached);
    setError(null);
    try {
      const response = await fetch("/api/settings/directory", {
        cache: "no-store",
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        entries?: DirectoryEntry[];
      };
      if (!response.ok) {
        setError(data.error ?? "Could not load the directory.");
        return;
      }
      const next = data.entries ?? [];
      setEntries(next);
      writeSettingsCache(DIRECTORY_CACHE_KEY, next);
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const cached = readSettingsCache<DirectoryEntry[]>(DIRECTORY_CACHE_KEY);
    if (cached?.fresh) return;
    void load();
  }, []);

  function draftFor(role: string) {
    return drafts[role] ?? emptyDraft();
  }

  async function addEntry(event: FormEvent, role: DirectoryRole, usesEmail: boolean) {
    event.preventDefault();
    const draft = draftFor(role);
    setBusyId(role);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/settings/directory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          name: draft.name,
          email: usesEmail ? draft.email : undefined,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Could not add that entry.");
        return;
      }
      setDrafts((current) => ({ ...current, [role]: emptyDraft() }));
      setMessage("Saved.");
      invalidateSettingsCache(DIRECTORY_CACHE_KEY);
      await load({ force: true });
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setBusyId(null);
    }
  }

  function startEdit(entry: DirectoryEntry) {
    setEditingId(entry.id);
    setEditDraft({ name: entry.name, email: entry.email ?? "" });
    setError(null);
    setMessage(null);
  }

  async function saveEdit(entry: DirectoryEntry, usesEmail: boolean) {
    setBusyId(entry.id);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/settings/directory/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editDraft.name,
          email: usesEmail ? editDraft.email : undefined,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Could not save that entry.");
        return;
      }
      setEditingId(null);
      setMessage("Saved.");
      invalidateSettingsCache(DIRECTORY_CACHE_KEY);
      await load({ force: true });
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function removeEntry(entry: DirectoryEntry) {
    if (!window.confirm(`Remove ${entry.name} from this list?`)) return;
    setBusyId(entry.id);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/settings/directory/${entry.id}`, {
        method: "DELETE",
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Could not remove that entry.");
        return;
      }
      if (editingId === entry.id) setEditingId(null);
      setMessage("Removed. Past invites keep the name already stored on them.");
      invalidateSettingsCache(DIRECTORY_CACHE_KEY);
      await load({ force: true });
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className={styles.inviteSection} aria-label="Survey directory">
      <p className={styles.widgetIntro}>
        These lists fill the suggestions on Send survey. A name typed on a sent
        invite is added here for next time. Removing a name does not change
        invitations that were already sent.
      </p>
      {error ? (
        <p className={styles.inviteAlert} role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className={styles.inviteTemplateNote}>{message}</p> : null}
      {loading ? <p className={styles.auditStatus}>Loading…</p> : null}

      {SECTIONS.map((section) => {
        const rows = entries.filter((entry) => entry.role === section.role);
        const draft = draftFor(section.role);
        const adding = busyId === section.role;
        return (
          <section key={section.role} className={styles.directorySection}>
            <header className={styles.directoryHeading}>
              <h3>{section.label}</h3>
              <p>{section.hint}</p>
            </header>
            <form
              className={styles.directoryAdd}
              onSubmit={(event) => void addEntry(event, section.role, section.email)}
            >
              <label className={styles.inviteField}>
                <span>Name</span>
                <input
                  value={draft.name}
                  onChange={(event) =>
                    setDrafts((current) => ({
                      ...current,
                      [section.role]: { ...draft, name: event.target.value },
                    }))
                  }
                  required
                  disabled={adding}
                />
              </label>
              {section.email ? (
                <label className={styles.inviteField}>
                  <span>Email</span>
                  <input
                    type="email"
                    value={draft.email}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [section.role]: { ...draft, email: event.target.value },
                      }))
                    }
                    disabled={adding}
                  />
                </label>
              ) : null}
              <button
                type="submit"
                className={styles.invitePrimaryButton}
                disabled={adding}
              >
                Add
              </button>
            </form>
            <div className={styles.tableWrap}>
              <table className={styles.compactTable}>
                <thead>
                  <tr>
                    <th>Name</th>
                    {section.email ? <th>Email</th> : null}
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {!loading && !rows.length ? (
                    <tr className={styles.tableEmptyRow}>
                      <td colSpan={section.email ? 3 : 2}>No entries yet.</td>
                    </tr>
                  ) : null}
                  {rows.map((entry) => {
                    const editing = editingId === entry.id;
                    const rowBusy = busyId === entry.id;
                    return (
                      <tr key={entry.id}>
                        <td>
                          {editing ? (
                            <input
                              className={styles.directoryCellInput}
                              value={editDraft.name}
                              onChange={(event) =>
                                setEditDraft((current) => ({
                                  ...current,
                                  name: event.target.value,
                                }))
                              }
                              aria-label={`${section.label} name`}
                              disabled={rowBusy}
                            />
                          ) : (
                            entry.name
                          )}
                        </td>
                        {section.email ? (
                          <td>
                            {editing ? (
                              <input
                                className={styles.directoryCellInput}
                                type="email"
                                value={editDraft.email}
                                onChange={(event) =>
                                  setEditDraft((current) => ({
                                    ...current,
                                    email: event.target.value,
                                  }))
                                }
                                aria-label={`${section.label} email`}
                                disabled={rowBusy}
                              />
                            ) : (
                              entry.email || "—"
                            )}
                          </td>
                        ) : null}
                        <td className={styles.directoryActions}>
                          {editing ? (
                            <>
                              <button
                                type="button"
                                className={styles.invitePrimaryButton}
                                onClick={() => void saveEdit(entry, section.email)}
                                disabled={rowBusy}
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                className={styles.inviteSecondaryButton}
                                onClick={() => setEditingId(null)}
                                disabled={rowBusy}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                className={styles.inviteSecondaryButton}
                                onClick={() => startEdit(entry)}
                                disabled={rowBusy}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className={styles.inviteSecondaryButton}
                                onClick={() => void removeEntry(entry)}
                                disabled={rowBusy}
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </section>
  );
}
