"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import CompactDataTable from "@/components/dashboard/CompactDataTable";
import { useHasPermission } from "@/components/dashboard/DashboardPermissions";
import type {
  SurveyInviteTrackerRow,
  SurveyInviteTrackerStatus,
} from "@/lib/survey-invite-tracking";
import { SURVEY_INVITE_ACTIVITY_LABELS } from "@/lib/survey-invite-events";
import { INVITE_RECIPIENT_FIELD_LABELS } from "@/lib/survey-outreach";
import { FilterDisclosure } from "@/components/dashboard/DashboardReportFilters";
import { withinCalendarRange } from "@/lib/dashboard-report-filters";
import { matchesInviteTrackerStatus } from "@/lib/invite-tracker-filters";
import type { InviteTrackerStatusFilter } from "@/lib/invite-tracker-filters";
import { orgLabelsMatch } from "@/lib/survey-org-structure";
import {
  downloadInviteTrackerCsv,
  downloadInviteTrackerExcel,
} from "@/lib/invite-tracker-export";
import styles from "./dashboard.module.css";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatCell(value: string | null) {
  return value?.trim() || "—";
}

const statusClassMap: Record<SurveyInviteTrackerStatus, string> = {
  completed: "inviteStatusCompleted",
  started: "inviteStatusStarted",
  opened: "inviteStatusOpened",
  reminder_sent: "inviteStatusFollowup1",
  sent: "inviteStatusSent",
};

type TrackerFilters = {
  search: string;
  sentFrom: string;
  sentTo: string;
  status: InviteTrackerStatusFilter;
  department: string;
  serviceName: string;
  partner: string;
  businessManagerName: string;
  jobManagerName: string;
  teamLeader: string;
  projectId: string;
  surveyOrder: string;
};

const emptyFilters: TrackerFilters = {
  search: "",
  sentFrom: "",
  sentTo: "",
  status: "",
  department: "",
  serviceName: "",
  partner: "",
  businessManagerName: "",
  jobManagerName: "",
  teamLeader: "",
  projectId: "",
  surveyOrder: "",
};

function uniqueValues(
  invites: SurveyInviteTrackerRow[],
  key: keyof Pick<
    SurveyInviteTrackerRow,
    | "department"
    | "serviceName"
    | "partner"
    | "businessManagerName"
    | "jobManagerName"
    | "teamLeader"
    | "projectId"
    | "surveyOrder"
  >
) {
  return Array.from(
    new Set(
      invites
        .map((invite) => invite[key]?.trim())
        .filter((value): value is string => Boolean(value))
    )
  ).sort((a, b) => a.localeCompare(b));
}

export default function SurveyInviteTracker() {
  const [invites, setInvites] = useState<SurveyInviteTrackerRow[]>([]);
  const [filters, setFilters] = useState<TrackerFilters>(emptyFilters);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reminderActionId, setReminderActionId] = useState<string | null>(null);
  const canDelete = useHasPermission("responses.manage");

  const loadInvites = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/survey/invites");
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        invites?: SurveyInviteTrackerRow[];
      };

      if (!response.ok) {
        setErrorMessage(data.error ?? "Could not load invite tracker.");
        setInvites([]);
        return;
      }

      setInvites(data.invites ?? []);
    } catch {
      setErrorMessage("Could not reach the server. Try again.");
      setInvites([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInvites();
  }, [loadInvites]);

  const filterOptions = useMemo(
    () => ({
      department: uniqueValues(invites, "department"),
      serviceName: uniqueValues(invites, "serviceName"),
      partner: uniqueValues(invites, "partner"),
      businessManagerName: uniqueValues(invites, "businessManagerName"),
      jobManagerName: uniqueValues(invites, "jobManagerName"),
      teamLeader: uniqueValues(invites, "teamLeader"),
      projectId: uniqueValues(invites, "projectId"),
      surveyOrder: uniqueValues(invites, "surveyOrder"),
    }),
    [invites]
  );

  const filteredInvites = useMemo(() => {
    const search = filters.search.trim().toLowerCase();

    return invites.filter((invite) => {
      if (search) {
        const haystack = [
          invite.name,
          invite.email,
          invite.customerName,
          invite.department,
          invite.serviceName,
          invite.partner,
          invite.businessManagerName,
          invite.jobManagerName,
          invite.teamLeader,
          invite.projectId,
          invite.surveyOrder,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(search)) return false;
      }

      if (
        filters.department &&
        !orgLabelsMatch(invite.department, filters.department)
      ) {
        return false;
      }
      if (filters.serviceName && !orgLabelsMatch(invite.serviceName, filters.serviceName)) {
        return false;
      }
      if (filters.partner && !orgLabelsMatch(invite.partner, filters.partner)) {
        return false;
      }
      if (
        filters.businessManagerName &&
        !orgLabelsMatch(invite.businessManagerName, filters.businessManagerName)
      ) {
        return false;
      }
      if (
        filters.jobManagerName &&
        !orgLabelsMatch(invite.jobManagerName, filters.jobManagerName)
      ) {
        return false;
      }
      if (filters.teamLeader && !orgLabelsMatch(invite.teamLeader, filters.teamLeader)) {
        return false;
      }
      if (filters.projectId && invite.projectId !== filters.projectId) return false;
      if (filters.surveyOrder && invite.surveyOrder !== filters.surveyOrder) return false;
      if (!withinCalendarRange(invite.sentAt, filters.sentFrom, filters.sentTo)) {
        return false;
      }
      if (!matchesInviteTrackerStatus(invite.status, filters.status)) return false;

      return true;
    });
  }, [filters, invites]);

  const trackerSummary = useMemo(() => {
    const completed = filteredInvites.filter((invite) => invite.status === "completed").length;
    const active = filteredInvites.filter((invite) =>
      ["started", "opened"].includes(invite.status)
    ).length;
    const awaiting = filteredInvites.filter((invite) =>
      ["sent", "reminder_sent"].includes(invite.status)
    ).length;

    return {
      total: filteredInvites.length,
      completed,
      active,
      awaiting,
    };
  }, [filteredInvites]);

  const handleSendFollowUp = useCallback(
    async (inviteId: string) => {
      setSendingId(inviteId);
      setActionMessage("");

      try {
        const response = await fetch(`/api/survey/invites/${inviteId}/followup`, {
          method: "POST",
        });
        const data = (await response.json().catch(() => ({}))) as { error?: string };

        if (!response.ok) {
          setActionMessage(data.error ?? "Could not send follow-up email.");
          return;
        }

        setActionMessage("Follow-up email sent.");
        await loadInvites();
      } catch {
        setActionMessage("Could not reach the server. Try again.");
      } finally {
        setSendingId(null);
      }
    },
    [loadInvites]
  );

  const handleDeleteInvite = useCallback(
    async (invite: SurveyInviteTrackerRow) => {
      if (
        !window.confirm(
          `Permanently delete the invitation to ${invite.email}? Its activity history is removed and the survey link stops being tracked. Any survey response already received is kept. This cannot be undone.`
        )
      ) {
        return;
      }
      setDeletingId(invite.id);
      setActionMessage("");

      try {
        const response = await fetch(`/api/survey/invites/${invite.id}`, {
          method: "DELETE",
        });
        const data = (await response.json().catch(() => ({}))) as { error?: string };

        if (!response.ok) {
          setActionMessage(data.error ?? "Could not delete invitation.");
          return;
        }

        setSelectedId((current) => (current === invite.id ? null : current));
        setActionMessage("Invitation deleted.");
        await loadInvites();
      } catch {
        setActionMessage("Could not reach the server. Try again.");
      } finally {
        setDeletingId(null);
      }
    },
    [loadInvites]
  );

  const handleStopReminders = useCallback(
    async (invite: SurveyInviteTrackerRow) => {
      const reason = window.prompt(
        "Optional reason for stopping reminders (client request, etc.):",
        ""
      );
      if (reason === null) return;
      setReminderActionId(invite.id);
      setActionMessage("");
      try {
        const response = await fetch(
          `/api/survey/invites/${invite.id}/reminders/stop`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reason: reason.trim() || undefined }),
          }
        );
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        if (!response.ok) {
          setActionMessage(data.error ?? "Could not stop reminders.");
          return;
        }
        setActionMessage("Reminders stopped for this invite.");
        await loadInvites();
      } catch {
        setActionMessage("Could not reach the server. Try again.");
      } finally {
        setReminderActionId(null);
      }
    },
    [loadInvites]
  );

  const handleReenableReminders = useCallback(
    async (invite: SurveyInviteTrackerRow) => {
      if (
        !window.confirm(
          `Re-enable reminders for ${invite.email}? This starts a fresh reminder cycle.`
        )
      ) {
        return;
      }
      setReminderActionId(invite.id);
      setActionMessage("");
      try {
        const response = await fetch(
          `/api/survey/invites/${invite.id}/reminders/reenable`,
          { method: "POST" }
        );
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        if (!response.ok) {
          setActionMessage(data.error ?? "Could not re-enable reminders.");
          return;
        }
        setActionMessage("Reminders re-enabled with a fresh cycle.");
        await loadInvites();
      } catch {
        setActionMessage("Could not reach the server. Try again.");
      } finally {
        setReminderActionId(null);
      }
    },
    [loadInvites]
  );

  const handleStopContactReminders = useCallback(
    async (invite: SurveyInviteTrackerRow) => {
      const reason = window.prompt(
        `Stop reminders for all incomplete invites to ${invite.email}? Optional reason:`,
        ""
      );
      if (reason === null) return;
      setReminderActionId(`contact:${invite.id}`);
      setActionMessage("");
      try {
        const response = await fetch(`/api/survey/reminders/contact/stop`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: invite.email,
            reason: reason.trim() || undefined,
          }),
        });
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        if (!response.ok) {
          setActionMessage(data.error ?? "Could not stop contact reminders.");
          return;
        }
        setActionMessage(`Reminders stopped for contact ${invite.email}.`);
        await loadInvites();
      } catch {
        setActionMessage("Could not reach the server. Try again.");
      } finally {
        setReminderActionId(null);
      }
    },
    [loadInvites]
  );

  const selectedInvite = useMemo(
    () => invites.find((invite) => invite.id === selectedId) ?? null,
    [invites, selectedId]
  );

  const handleSaveNote = useCallback(async () => {
    if (!selectedId || !noteDraft.trim()) return;
    setSavingNote(true);
    setActionMessage("");

    try {
      const response = await fetch(`/api/survey/invites/${selectedId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: noteDraft.trim() }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setActionMessage(data.error ?? "Could not save note.");
        return;
      }

      setNoteDraft("");
      setActionMessage("Note saved.");
      await loadInvites();
    } catch {
      setActionMessage("Could not reach the server. Try again.");
    } finally {
      setSavingNote(false);
    }
  }, [loadInvites, noteDraft, selectedId]);

  const inviteColumns = useMemo<ColumnDef<SurveyInviteTrackerRow, unknown>[]>(
    () => [
      {
        id: "customer",
        header: "Customer",
        meta: { width: "180px", cellClassName: styles.inviteTrackerRecipient },
        cell: ({ row }) => (
          <>
            <strong className={styles.tableCellText}>{row.original.name}</strong>
            <small className={styles.tableCellText}>{row.original.email}</small>
          </>
        ),
      },
      {
        id: "department",
        header: INVITE_RECIPIENT_FIELD_LABELS.department,
        meta: { width: "96px" },
        cell: ({ row }) => formatCell(row.original.department),
      },
      {
        id: "partner",
        header: INVITE_RECIPIENT_FIELD_LABELS.partner,
        meta: { width: "110px" },
        cell: ({ row }) => formatCell(row.original.partner),
      },
      {
        id: "serviceName",
        header: INVITE_RECIPIENT_FIELD_LABELS.serviceName,
        meta: { width: "110px" },
        cell: ({ row }) => formatCell(row.original.serviceName),
      },
      {
        id: "businessManagerName",
        header: INVITE_RECIPIENT_FIELD_LABELS.businessManagerName,
        meta: { width: "120px" },
        cell: ({ row }) => formatCell(row.original.businessManagerName),
      },
      {
        id: "jobManagerName",
        header: INVITE_RECIPIENT_FIELD_LABELS.jobManagerName,
        meta: { width: "120px" },
        cell: ({ row }) => formatCell(row.original.jobManagerName),
      },
      {
        id: "teamLeader",
        header: INVITE_RECIPIENT_FIELD_LABELS.teamLeader,
        meta: { width: "110px" },
        cell: ({ row }) => formatCell(row.original.teamLeader),
      },
      {
        id: "projectId",
        header: INVITE_RECIPIENT_FIELD_LABELS.projectId,
        meta: { width: "96px" },
        cell: ({ row }) => formatCell(row.original.projectId),
      },
      {
        id: "surveyOrder",
        header: "Order",
        meta: { width: "64px" },
        cell: ({ row }) => formatCell(row.original.surveyOrder),
      },
      {
        id: "sent",
        header: "Sent",
        meta: { width: "100px", cellClassName: styles.inviteTrackerDate },
        cell: ({ row }) => formatDate(row.original.sentAt),
      },
      {
        id: "reminderStatus",
        header: "Reminders",
        meta: { width: "100px" },
        cell: ({ row }) => (
          <span className={styles.inviteStatusBadge}>
            {row.original.reminderStatus}
          </span>
        ),
      },
      {
        id: "remindersSent",
        header: "Sent",
        meta: { width: "72px" },
        cell: ({ row }) =>
          `${row.original.followupCount}/${row.original.followupMaxCount}`,
      },
      {
        id: "lastReminder",
        header: "Last reminder",
        meta: { width: "110px", cellClassName: styles.inviteTrackerDate },
        cell: ({ row }) => formatDate(row.original.lastReminderSentAt),
      },
      {
        id: "followUp",
        header: "Next reminder",
        meta: { width: "110px", cellClassName: styles.inviteTrackerDate },
        cell: ({ row }) => formatDate(row.original.nextFollowUpAt),
      },
      {
        id: "status",
        header: "Status",
        meta: { width: "148px" },
        cell: ({ row }) => (
          <span
            className={`${styles.inviteStatusBadge} ${
              styles[statusClassMap[row.original.status]]
            }`}
          >
            {row.original.statusLabel}
          </span>
        ),
      },
      {
        id: "action",
        header: "Action",
        meta: { width: "220px" },
        cell: ({ row }) => (
          <div className={styles.inviteTrackerActions}>
            <button
              type="button"
              className={styles.inviteTableAction}
              disabled={
                !row.original.canSendFollowUp || sendingId === row.original.id
              }
              onClick={() => void handleSendFollowUp(row.original.id)}
            >
              {sendingId === row.original.id ? "Sending…" : "Send reminder"}
            </button>
            {row.original.canStopReminders ? (
              <button
                type="button"
                className={styles.inviteTableAction}
                disabled={reminderActionId === row.original.id}
                onClick={() => void handleStopReminders(row.original)}
              >
                Stop
              </button>
            ) : null}
            {row.original.canReenableReminders ? (
              <button
                type="button"
                className={styles.inviteTableAction}
                disabled={reminderActionId === row.original.id}
                onClick={() => void handleReenableReminders(row.original)}
              >
                Re-enable
              </button>
            ) : null}
          </div>
        ),
      },
      {
        id: "activity",
        header: "Activity",
        meta: { width: "92px" },
        cell: ({ row }) => (
          <button
            type="button"
            className={styles.inviteTableAction}
            aria-expanded={selectedId === row.original.id}
            onClick={() =>
              setSelectedId((current) =>
                current === row.original.id ? null : row.original.id
              )
            }
          >
            {selectedId === row.original.id ? "Hide" : "View"}
          </button>
        ),
      },
      ...(canDelete
        ? [
            {
              id: "delete",
              header: "Delete",
              meta: { width: "84px" },
              cell: ({ row }) => (
                <button
                  type="button"
                  className={`${styles.inviteTableAction} ${styles.inviteTableActionDanger}`}
                  disabled={deletingId === row.original.id}
                  onClick={() => void handleDeleteInvite(row.original)}
                >
                  {deletingId === row.original.id ? "Deleting…" : "Delete"}
                </button>
              ),
            } satisfies ColumnDef<SurveyInviteTrackerRow, unknown>,
          ]
        : []),
    ],
    [
      canDelete,
      deletingId,
      handleDeleteInvite,
      handleReenableReminders,
      handleSendFollowUp,
      handleStopReminders,
      reminderActionId,
      selectedId,
      sendingId,
    ]
  );

  function updateFilter<K extends keyof TrackerFilters>(key: K, value: TrackerFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <>
      <header className={styles.topbar}>
        <div>
          <span>Client outreach</span>
          <h1>Invite tracker</h1>
        </div>
        <div className={styles.topbarActions}>
          <button
            type="button"
            className={styles.inviteSecondaryButton}
            disabled={!filteredInvites.length}
            onClick={() =>
              downloadInviteTrackerCsv(filteredInvites, "voc-invite-tracker.csv")
            }
          >
            Export CSV
          </button>
          <button
            type="button"
            className={styles.inviteSecondaryButton}
            disabled={!filteredInvites.length}
            onClick={() =>
              downloadInviteTrackerExcel(
                filteredInvites,
                "voc-invite-tracker.xls"
              )
            }
          >
            Export Excel
          </button>
          <Link className={styles.invitePageLink} href="/dashboard/invite">
            Send survey
          </Link>
        </div>
      </header>

      <section className={styles.inviteSection} aria-label="Survey invite tracker">
        <p className={styles.widgetIntro}>
          Track every survey invitation, reminder status, and next send date.
          Automatic reminders run every 3 days by default (max 5; configurable
          in Settings → Reminders). Manual sends count toward the max. Stop or
          re-enable per invite (or stop for the whole contact) when a client
          asks not to be chased.
        </p>

        {!loading && !errorMessage && invites.length > 0 ? (
          <div className={styles.inviteTrackerSummary} aria-label="Invite summary">
            <div className={`${styles.inviteTrackerStat} ${styles.inviteTrackerStatTotal}`}>
              <strong>{trackerSummary.total}</strong>
              <span>Shown</span>
            </div>
            <div className={`${styles.inviteTrackerStat} ${styles.inviteTrackerStatCompleted}`}>
              <strong>{trackerSummary.completed}</strong>
              <span>Completed</span>
            </div>
            <div className={`${styles.inviteTrackerStat} ${styles.inviteTrackerStatActive}`}>
              <strong>{trackerSummary.active}</strong>
              <span>In progress</span>
            </div>
            <div className={`${styles.inviteTrackerStat} ${styles.inviteTrackerStatAwaiting}`}>
              <strong>{trackerSummary.awaiting}</strong>
              <span>Awaiting response</span>
            </div>
          </div>
        ) : null}

        {!loading && !errorMessage && invites.length > 0 ? (
          <FilterDisclosure
            activeCount={Object.values(filters).filter((value) => value.trim()).length}
            onClear={() => setFilters(emptyFilters)}
          >
            <div className={styles.filterGroup}>
              <p className={styles.filterGroupLabel}>When</p>
              <div className={styles.filterGroupFields}>
            <label className={styles.inviteTrackerFilter}>
              <span>Sent from</span>
              <input
                type="date"
                value={filters.sentFrom}
                max={filters.sentTo || undefined}
                onChange={(event) => updateFilter("sentFrom", event.target.value)}
              />
            </label>
            <label className={styles.inviteTrackerFilter}>
              <span>Sent to</span>
              <input
                type="date"
                value={filters.sentTo}
                min={filters.sentFrom || undefined}
                onChange={(event) => updateFilter("sentTo", event.target.value)}
              />
            </label>
            <label className={styles.inviteTrackerFilter}>
              <span>Status</span>
              <select
                value={filters.status}
                onChange={(event) =>
                  updateFilter("status", event.target.value as InviteTrackerStatusFilter)
                }
              >
                <option value="">All</option>
                <option value="sent">Invitation sent</option>
                <option value="opened">Opened</option>
                <option value="started">Survey started</option>
                <option value="completed">Completed</option>
                <option value="not_completed">Not completed</option>
              </select>
            </label>
              </div>
            </div>
            <div className={styles.filterGroup}>
              <p className={styles.filterGroupLabel}>Client</p>
              <div className={styles.filterGroupFields}>
            <label className={styles.inviteTrackerFilter}>
              <span>Search</span>
              <input
                type="search"
                value={filters.search}
                onChange={(event) => updateFilter("search", event.target.value)}
                placeholder="Customer, email, project…"
              />
            </label>
            <label className={styles.inviteTrackerFilter}>
              <span>{INVITE_RECIPIENT_FIELD_LABELS.department}</span>
              <select
                value={filters.department}
                onChange={(event) => updateFilter("department", event.target.value)}
              >
                <option value="">All departments</option>
                {filterOptions.department.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.inviteTrackerFilter}>
              <span>{INVITE_RECIPIENT_FIELD_LABELS.serviceName}</span>
              <select
                value={filters.serviceName}
                onChange={(event) => updateFilter("serviceName", event.target.value)}
              >
                <option value="">All</option>
                {filterOptions.serviceName.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
              </div>
            </div>
            <div className={styles.filterGroup}>
              <p className={styles.filterGroupLabel}>RSM team</p>
              <div className={styles.filterGroupFields}>
            <label className={styles.inviteTrackerFilter}>
              <span>{INVITE_RECIPIENT_FIELD_LABELS.partner}</span>
              <select
                value={filters.partner}
                onChange={(event) => updateFilter("partner", event.target.value)}
              >
                <option value="">All partners</option>
                {filterOptions.partner.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.inviteTrackerFilter}>
              <span>{INVITE_RECIPIENT_FIELD_LABELS.businessManagerName}</span>
              <select
                value={filters.businessManagerName}
                onChange={(event) =>
                  updateFilter("businessManagerName", event.target.value)
                }
              >
                <option value="">All</option>
                {filterOptions.businessManagerName.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.inviteTrackerFilter}>
              <span>{INVITE_RECIPIENT_FIELD_LABELS.jobManagerName}</span>
              <select
                value={filters.jobManagerName}
                onChange={(event) => updateFilter("jobManagerName", event.target.value)}
              >
                <option value="">All</option>
                {filterOptions.jobManagerName.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.inviteTrackerFilter}>
              <span>{INVITE_RECIPIENT_FIELD_LABELS.teamLeader}</span>
              <select
                value={filters.teamLeader}
                onChange={(event) => updateFilter("teamLeader", event.target.value)}
              >
                <option value="">All</option>
                {filterOptions.teamLeader.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
              </div>
            </div>
            <div className={styles.filterGroup}>
              <p className={styles.filterGroupLabel}>Engagement</p>
              <div className={styles.filterGroupFields}>
            <label className={styles.inviteTrackerFilter}>
              <span>{INVITE_RECIPIENT_FIELD_LABELS.projectId}</span>
              <select
                value={filters.projectId}
                onChange={(event) => updateFilter("projectId", event.target.value)}
              >
                <option value="">All</option>
                {filterOptions.projectId.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.inviteTrackerFilter}>
              <span>{INVITE_RECIPIENT_FIELD_LABELS.surveyOrder}</span>
              <select
                value={filters.surveyOrder}
                onChange={(event) => updateFilter("surveyOrder", event.target.value)}
              >
                <option value="">All</option>
                {filterOptions.surveyOrder.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
              </div>
            </div>
          </FilterDisclosure>
        ) : null}

        {loading ? (
          <p className={styles.inviteCsvHint}>Loading invite tracker…</p>
        ) : null}

        {errorMessage ? (
          <p className={styles.inviteAlert} role="alert">
            {errorMessage}
          </p>
        ) : null}

        {actionMessage ? (
          <p className={styles.inviteSuccess} role="status">
            {actionMessage}
          </p>
        ) : null}

        {!loading && !errorMessage ? (
          <>
            <CompactDataTable
              ariaLabel="Survey invite tracker"
              columns={inviteColumns}
              data={filteredInvites}
              getRowId={(invite) => invite.id}
              minWidth={1360}
              maxHeight="none"
              emptyState={
                invites.length
                  ? "No invitations match the current filters."
                  : "No survey invitations have been sent yet."
              }
            />
            {selectedInvite ? (
              <section
                className={styles.inviteActivityPanel}
                aria-label={`Activity for ${selectedInvite.name}`}
              >
                <div className={styles.inviteActivityHeader}>
                  <h2>Activity · {selectedInvite.name}</h2>
                  <p>
                    {selectedInvite.email}
                    {` · Reminders ${selectedInvite.followupCount} of ${selectedInvite.followupMaxCount} (${selectedInvite.reminderStatus})`}
                    {selectedInvite.remindersStopReason
                      ? ` · Stopped: ${selectedInvite.remindersStopReason}`
                      : ""}
                  </p>
                  {selectedInvite.canStopReminders ||
                  selectedInvite.canReenableReminders ||
                  selectedInvite.contactRemindersStopped ? (
                    <div className={styles.inviteTrackerActions}>
                      {selectedInvite.canStopReminders ? (
                        <button
                          type="button"
                          className={styles.inviteSecondaryButton}
                          disabled={Boolean(reminderActionId)}
                          onClick={() => void handleStopContactReminders(selectedInvite)}
                        >
                          Stop for contact
                        </button>
                      ) : null}
                      {selectedInvite.contactRemindersStopped ? (
                        <button
                          type="button"
                          className={styles.inviteSecondaryButton}
                          disabled={Boolean(reminderActionId)}
                          onClick={() => {
                            void (async () => {
                              setReminderActionId(`contact:${selectedInvite.id}`);
                              try {
                                const response = await fetch(
                                  `/api/survey/reminders/contact/reenable`,
                                  {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      email: selectedInvite.email,
                                    }),
                                  }
                                );
                                const data = (await response
                                  .json()
                                  .catch(() => ({}))) as { error?: string };
                                if (!response.ok) {
                                  setActionMessage(
                                    data.error ?? "Could not re-enable contact."
                                  );
                                  return;
                                }
                                setActionMessage(
                                  "Contact reminders re-enabled with a fresh cycle."
                                );
                                await loadInvites();
                              } catch {
                                setActionMessage(
                                  "Could not reach the server. Try again."
                                );
                              } finally {
                                setReminderActionId(null);
                              }
                            })();
                          }}
                        >
                          Re-enable contact
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                {selectedInvite.events.length ? (
                  <ol className={styles.inviteActivityList}>
                    {selectedInvite.events.map((event) => (
                      <li key={event.id}>
                        <strong>
                          {SURVEY_INVITE_ACTIVITY_LABELS[event.type] ?? event.type}
                        </strong>
                        <span>{formatDate(event.createdAt)}</span>
                        {event.message ? <p>{event.message}</p> : null}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className={styles.inviteCsvHint}>No activity recorded yet.</p>
                )}
                <form
                  className={styles.inviteNoteForm}
                  onSubmit={(event) => {
                    event.preventDefault();
                    void handleSaveNote();
                  }}
                >
                  <label>
                    <span>Add a follow-up note</span>
                    <textarea
                      value={noteDraft}
                      onChange={(event) => setNoteDraft(event.target.value)}
                      maxLength={2000}
                      rows={3}
                      placeholder="Who you called, what was agreed, next step…"
                    />
                  </label>
                  <button
                    type="submit"
                    className={styles.inviteSecondaryButton}
                    disabled={savingNote || !noteDraft.trim()}
                  >
                    {savingNote ? "Saving…" : "Save note"}
                  </button>
                </form>
              </section>
            ) : null}
          </>
        ) : null}
      </section>
    </>
  );
}
