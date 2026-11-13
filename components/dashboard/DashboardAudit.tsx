"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import CompactDataTable from "@/components/dashboard/CompactDataTable";
import { csvCell } from "@/lib/csv";
import {
  readSettingsCache,
  SETTINGS_AUDIT_CACHE_KEY,
  writeSettingsCache,
} from "@/components/dashboard/settings-list-cache";
import styles from "./dashboard.module.css";

type AuditRow = {
  id: string;
  occurredAt: string;
  actorType: string;
  actorUserId: string | null;
  actorEmail: string | null;
  actorLabel: string;
  action: string;
  actionLabel: string;
  resourceType: string | null;
  resourceId: string | null;
  resourceLabel: string;
  detailsLabel: string;
  metadata: unknown;
};

type AuditPayload = {
  filter: string;
  logs: AuditRow[];
};

function readCachedAudit(filter = ""): AuditRow[] | null {
  const cached = readSettingsCache<AuditPayload>(SETTINGS_AUDIT_CACHE_KEY);
  if (!cached || cached.data.filter !== filter) return null;
  return cached.data.logs;
}

export default function DashboardAudit() {
  const [logs, setLogs] = useState<AuditRow[]>(
    () => readCachedAudit("") ?? []
  );
  const [action, setAction] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(() => !readCachedAudit(""));
  const [refreshing, setRefreshing] = useState(false);

  async function load(options?: { filter?: string; force?: boolean }) {
    const filter = options?.filter ?? action;
    const force = options?.force ?? false;
    const cached = readSettingsCache<AuditPayload>(SETTINGS_AUDIT_CACHE_KEY);
    const cacheMatches = cached?.data.filter === filter.trim();
    const hasRows = logs.length > 0 || Boolean(cacheMatches && cached?.data.logs.length);

    if (!force && cacheMatches && cached?.fresh) {
      setLogs(cached.data.logs);
      setLoading(false);
      return;
    }

    if (hasRows) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "200" });
      if (filter.trim()) params.set("action", filter.trim());
      const response = await fetch(`/api/audit?${params.toString()}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(
          response.status === 403
            ? "You do not have audit access."
            : "Failed to load audit log."
        );
      }
      const data = (await response.json()) as { logs: AuditRow[] };
      writeSettingsCache(SETTINGS_AUDIT_CACHE_KEY, {
        filter: filter.trim(),
        logs: data.logs,
      });
      setLogs(data.logs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audit log.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load({ filter: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const csv = useMemo(() => {
    const header = [
      "occurredAt",
      "actor",
      "action",
      "resource",
      "details",
      "actionCode",
    ];
    const rows = logs.map((row) =>
      [
        row.occurredAt,
        row.actorLabel,
        row.actionLabel,
        row.resourceLabel,
        row.detailsLabel,
        row.action,
      ]
        .map((cell) => csvCell(cell))
        .join(",")
    );
    return [header.join(","), ...rows].join("\n");
  }, [logs]);

  const columns = useMemo<ColumnDef<AuditRow, unknown>[]>(
    () => [
      {
        id: "when",
        header: "When",
        accessorFn: (row) => new Date(row.occurredAt).toLocaleString(),
        meta: { width: "18%" },
      },
      {
        id: "actor",
        header: "Who",
        accessorKey: "actorLabel",
        meta: { width: "22%" },
      },
      {
        id: "action",
        header: "What happened",
        accessorKey: "actionLabel",
        meta: { width: "20%" },
      },
      {
        id: "resource",
        header: "Related to",
        accessorKey: "resourceLabel",
        meta: { width: "20%" },
      },
      {
        id: "details",
        header: "Details",
        accessorKey: "detailsLabel",
        meta: { width: "20%" },
      },
    ],
    []
  );

  function downloadCsv() {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `voc-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const busy = loading || refreshing;

  return (
    <section className={styles.inviteSection} aria-label="Audit log">
      <header className={styles.panelHeading}>
        <h2>Audit log</h2>
        <p>
          Logins, survey sends, role changes, and CRM webhook-related activity
          for RSM auditing.
        </p>
      </header>

      <div className={styles.auditToolbar}>
        <label className={styles.inviteField}>
          Filter by action
          <input
            value={action}
            onChange={(event) => setAction(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void load({ force: true });
              }
            }}
            placeholder="e.g. login or invite"
          />
        </label>
        <div className={styles.auditToolbarButtons}>
          {refreshing ? (
            <span className={styles.tableToolbarHint}>Refreshing…</span>
          ) : null}
          <button
            type="button"
            className={styles.inviteSecondaryButton}
            onClick={() => void load({ force: true })}
            disabled={busy}
          >
            Refresh
          </button>
          <button
            type="button"
            className={styles.invitePrimaryButton}
            onClick={downloadCsv}
            disabled={!logs.length || busy}
          >
            Export CSV
          </button>
        </div>
      </div>

      {error ? (
        <p className={styles.inviteAlert} role="alert">
          {error}
        </p>
      ) : null}
      {loading ? <p className={styles.auditStatus}>Loading…</p> : null}

      {!loading && !error ? (
        <div className={styles.auditTableBlock}>
          <CompactDataTable
            ariaLabel="Audit log entries"
            columns={columns}
            data={logs}
            getRowId={(row) => row.id}
            minWidth={900}
            maxHeight={560}
            emptyState="No audit events yet."
          />
        </div>
      ) : null}
    </section>
  );
}
