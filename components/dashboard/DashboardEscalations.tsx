"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import CompactDataTable from "@/components/dashboard/CompactDataTable";
import { useHasPermission } from "@/components/dashboard/DashboardPermissions";
import type { CaseDetail, CaseListRow } from "@/lib/cases/queries";
import {
  BOARD_CASE_STATUSES,
  CASE_STATUS_LABELS,
  canTransition,
  isCaseStatus,
  type CaseStatus,
} from "@/lib/cases/state";
import styles from "./dashboard.module.css";

type ViewMode = "kanban" | "table";

const BOARD_COLUMNS = BOARD_CASE_STATUSES;

function formatWhen(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kuwait",
  }).format(new Date(value));
}

function formatScore(value: number | null) {
  if (value == null || Number.isNaN(value)) return "—";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function statusLabel(status: string) {
  return isCaseStatus(status) ? CASE_STATUS_LABELS[status] : status;
}

function EscalationCardContent({
  row,
  dragging,
}: {
  row: CaseListRow;
  dragging?: boolean;
}) {
  return (
    <article
      className={styles.escalationCard}
      data-severity={row.severity}
      data-dragging={dragging ? "true" : undefined}
      data-breached={row.slaBreached ? "true" : undefined}
    >
      <header className={styles.escalationCardHead}>
        <span className={styles.escalationCaseNumber}>#{row.number}</span>
        <span className={styles.escalationSeverity} data-severity={row.severity}>
          {row.severity}
        </span>
      </header>
      <p className={styles.escalationClient}>
        {row.clientName || row.company || "Unknown client"}
      </p>
      {row.company && row.clientName ? (
        <p className={styles.escalationMeta}>{row.company}</p>
      ) : null}
      <div className={styles.escalationOrg}>
        {row.department ? <span>Dept: {row.department}</span> : null}
        {row.partner ? <span>Partner: {row.partner}</span> : null}
      </div>
      <div className={styles.escalationScores}>
        <span className={styles.ratingBadge} data-metric="csat">
          CSAT {formatScore(row.csatScore)}
        </span>
        <span className={styles.ratingBadge} data-metric="ces">
          CES {formatScore(row.cesScore)}
        </span>
        <span className={styles.ratingBadge} data-metric="nps">
          NPS {formatScore(row.npsScore)}
        </span>
      </div>
      {row.triggerMetrics.length ? (
        <p className={styles.escalationTriggers}>
          Low: {row.triggerMetrics.join(", ")}
        </p>
      ) : null}
      {row.taskTitle ? (
        <p className={styles.escalationTask}>{row.taskTitle}</p>
      ) : null}
      <footer className={styles.escalationCardFoot}>
        {row.slaBreached ? (
          <span className={styles.escalationSla} data-breached="true">
            SLA breached
          </span>
        ) : row.slaDueAt ? (
          <span className={styles.escalationSla}>Due {formatWhen(row.slaDueAt)}</span>
        ) : (
          <span className={styles.escalationSla}>Opened {formatWhen(row.createdAt)}</span>
        )}
        {row.ownerEmail ? (
          <span className={styles.escalationOwner}>{row.ownerEmail}</span>
        ) : null}
      </footer>
    </article>
  );
}

function SortableEscalationCard({
  row,
  onOpen,
  canDrag,
}: {
  row: CaseListRow;
  onOpen: (id: string) => void;
  canDrag: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: row.id,
      data: { status: row.status },
      disabled: !canDrag,
    });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={styles.escalationCardWrap}>
      <button
        type="button"
        className={styles.escalationCardButton}
        onClick={() => {
          if (!isDragging) onOpen(row.id);
        }}
        {...attributes}
        {...(canDrag ? listeners : {})}
      >
        <EscalationCardContent row={row} />
      </button>
    </div>
  );
}

function KanbanColumn({
  status,
  rows,
  highlight,
  onOpen,
  canDrag,
}: {
  status: CaseStatus;
  rows: CaseListRow[];
  highlight: "valid" | "invalid" | null;
  onOpen: (id: string) => void;
  canDrag: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `column:${status}` });

  return (
    <section
      ref={setNodeRef}
      className={styles.escalationColumn}
      data-highlight={highlight ?? undefined}
      data-over={isOver ? "true" : undefined}
    >
      <header className={styles.escalationColumnHead}>
        <h3>{CASE_STATUS_LABELS[status]}</h3>
        <span>{rows.length}</span>
      </header>
      <SortableContext items={rows.map((row) => row.id)} strategy={verticalListSortingStrategy}>
        <div className={styles.escalationColumnBody}>
          {rows.map((row) => (
            <SortableEscalationCard
              key={row.id}
              row={row}
              onOpen={onOpen}
              canDrag={canDrag}
            />
          ))}
          {!rows.length ? (
            <p className={styles.escalationEmptyColumn}>No cards</p>
          ) : null}
        </div>
      </SortableContext>
    </section>
  );
}

export default function DashboardEscalations() {
  const canManage = useHasPermission("cases.manage");
  const [view, setView] = useState<ViewMode>("kanban");
  const [cases, setCases] = useState<CaseListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overStatus, setOverStatus] = useState<CaseStatus | null>(null);
  const [detail, setDetail] = useState<CaseDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [transitionBusy, setTransitionBusy] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/cases?view=board&limit=200", {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as
        | { cases?: CaseListRow[]; error?: string }
        | null;
      if (!response.ok) {
        setError(payload?.error ?? "Could not load escalations");
        setCases([]);
        return;
      }
      setCases(payload?.cases ?? []);
    } catch {
      setError("Could not load escalations");
      setCases([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const byStatus = useMemo(() => {
    const map = new Map<CaseStatus, CaseListRow[]>();
    for (const status of BOARD_COLUMNS) map.set(status, []);
    for (const row of cases) {
      if (!isCaseStatus(row.status)) continue;
      const bucket = map.get(row.status);
      if (bucket) bucket.push(row);
    }
    return map;
  }, [cases]);

  const activeRow = activeId ? cases.find((row) => row.id === activeId) ?? null : null;

  const openDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/cases/${id}`, { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as
        | (CaseDetail & { error?: string })
        | { error?: string }
        | null;
      if (!response.ok || !payload || !("id" in payload)) {
        setError(
          payload && "error" in payload && payload.error
            ? payload.error
            : "Could not open escalation"
        );
        return;
      }
      setDetail(payload);
    } catch {
      setError("Could not open escalation");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const applyLocalTransition = useCallback((id: string, toStatus: CaseStatus) => {
    setCases((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        return {
          ...row,
          status: toStatus,
          allowedTransitions: row.allowedTransitions.includes(toStatus)
            ? // optimistic: leave transitions until server detail returns on reopen
              (BOARD_COLUMNS.includes(toStatus)
                ? // Approximate next allowed set from state machine via canTransition peers
                  BOARD_COLUMNS.filter((candidate) => canTransition(toStatus, candidate))
                : row.allowedTransitions)
            : BOARD_COLUMNS.filter((candidate) => canTransition(toStatus, candidate)),
        };
      })
    );
  }, []);

  const transition = useCallback(
    async (id: string, fromStatus: string, toStatus: CaseStatus) => {
      if (!canManage) {
        setNotice("You can view escalations but need cases.manage to move them.");
        return;
      }
      if (!canTransition(fromStatus, toStatus)) {
        setNotice(`Cannot move from ${statusLabel(fromStatus)} to ${statusLabel(toStatus)}.`);
        return;
      }

      const previous = cases.find((row) => row.id === id);
      applyLocalTransition(id, toStatus);
      setNotice(null);
      setTransitionBusy(true);

      try {
        const response = await fetch(`/api/cases/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "transition", toStatus }),
        });
        const payload = (await response.json().catch(() => null)) as
          | (CaseDetail & { error?: string })
          | { error?: string }
          | null;
        if (!response.ok || !payload || !("id" in payload)) {
          if (previous) {
            setCases((prev) => prev.map((row) => (row.id === id ? previous : row)));
          }
          setNotice(payload && "error" in payload && payload.error ? payload.error : "Move failed");
          return;
        }
        setCases((prev) =>
          prev.map((row) =>
            row.id === id
              ? {
                  ...row,
                  status: payload.status,
                  allowedTransitions: payload.allowedTransitions,
                  slaDueAt: payload.slaDueAt,
                }
              : row
          )
        );
        if (detail?.id === id) setDetail(payload);
      } catch {
        if (previous) {
          setCases((prev) => prev.map((row) => (row.id === id ? previous : row)));
        }
        setNotice("Move failed");
      } finally {
        setTransitionBusy(false);
      }
    },
    [applyLocalTransition, canManage, cases, detail?.id]
  );

  const resolveDropStatus = useCallback(
    (overId: string | number | undefined): CaseStatus | null => {
      if (overId == null) return null;
      const value = String(overId);
      if (value.startsWith("column:")) {
        const status = value.slice("column:".length);
        return isCaseStatus(status) ? status : null;
      }
      const overCase = cases.find((row) => row.id === value);
      return overCase && isCaseStatus(overCase.status) ? overCase.status : null;
    },
    [cases]
  );

  const onDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
    setNotice(null);
  }, []);

  const onDragOver = useCallback(
    (event: DragOverEvent) => {
      setOverStatus(resolveDropStatus(event.over?.id));
    },
    [resolveDropStatus]
  );

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const id = String(event.active.id);
      const from = cases.find((row) => row.id === id)?.status;
      const to = resolveDropStatus(event.over?.id);
      setActiveId(null);
      setOverStatus(null);
      if (!from || !to || from === to) return;
      void transition(id, from, to);
    },
    [cases, resolveDropStatus, transition]
  );

  const onDragCancel = useCallback(() => {
    setActiveId(null);
    setOverStatus(null);
  }, []);

  const columns = useMemo<ColumnDef<CaseListRow, unknown>[]>(
    () => [
      {
        id: "number",
        header: "#",
        accessorFn: (row) => row.number,
        cell: ({ row }) => `#${row.original.number}`,
      },
      {
        id: "client",
        header: "Client",
        accessorFn: (row) => row.clientName ?? row.company ?? "",
        cell: ({ row }) => row.original.clientName || row.original.company || "—",
      },
      {
        id: "department",
        header: "Department",
        accessorFn: (row) => row.department ?? "",
        cell: ({ row }) => row.original.department || "—",
      },
      {
        id: "partner",
        header: "Partner",
        accessorFn: (row) => row.partner ?? "",
        cell: ({ row }) => row.original.partner || "—",
      },
      {
        id: "scores",
        header: "Scores",
        cell: ({ row }) =>
          `CSAT ${formatScore(row.original.csatScore)} · CES ${formatScore(row.original.cesScore)} · NPS ${formatScore(row.original.npsScore)}`,
      },
      {
        id: "status",
        header: "Status",
        accessorFn: (row) => row.status,
        cell: ({ row }) => statusLabel(row.original.status),
      },
      {
        id: "severity",
        header: "Severity",
        accessorFn: (row) => row.severity,
      },
      {
        id: "task",
        header: "Task",
        accessorFn: (row) => row.taskTitle ?? "",
        cell: ({ row }) => row.original.taskTitle || "—",
      },
      {
        id: "open",
        header: "",
        cell: ({ row }) => (
          <button
            type="button"
            className={styles.inviteSecondaryButton}
            onClick={() => void openDetail(row.original.id)}
          >
            Open
          </button>
        ),
      },
    ],
    [openDetail]
  );

  return (
    <section className={styles.responseSection}>
      <div className={styles.escalationHeader}>
        <div>
          <h1 className={styles.sectionTitle}>Escalations</h1>
          <p className={styles.escalationLead}>
            Low-score survey follow-ups for the CX team. Drag cards between stages
            without refreshing the page.
          </p>
        </div>
        <div className={styles.escalationToolbar}>
          <div className={styles.testimonialTabs} role="tablist" aria-label="View mode">
            <button
              type="button"
              role="tab"
              className={styles.testimonialTab}
              data-active={view === "kanban"}
              aria-selected={view === "kanban"}
              onClick={() => setView("kanban")}
            >
              Kanban
            </button>
            <button
              type="button"
              role="tab"
              className={styles.testimonialTab}
              data-active={view === "table"}
              aria-selected={view === "table"}
              onClick={() => setView("table")}
            >
              Table
            </button>
          </div>
          <button
            type="button"
            className={styles.inviteSecondaryButton}
            onClick={() => void load()}
            disabled={loading}
          >
            Refresh
          </button>
        </div>
      </div>

      {notice ? <p className={styles.escalationNotice}>{notice}</p> : null}
      {error ? <p className={styles.escalationError}>{error}</p> : null}
      {loading ? <p className={styles.escalationMuted}>Loading escalations…</p> : null}

      {!loading && view === "kanban" ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
          onDragCancel={onDragCancel}
        >
          <div className={styles.escalationBoard}>
            {BOARD_COLUMNS.map((status) => {
              let highlight: "valid" | "invalid" | null = null;
              if (activeRow && overStatus === status && status !== activeRow.status) {
                highlight = canTransition(activeRow.status, status) ? "valid" : "invalid";
              }
              return (
                <KanbanColumn
                  key={status}
                  status={status}
                  rows={byStatus.get(status) ?? []}
                  highlight={highlight}
                  onOpen={(id) => void openDetail(id)}
                  canDrag={canManage}
                />
              );
            })}
          </div>
          <DragOverlay>
            {activeRow ? <EscalationCardContent row={activeRow} dragging /> : null}
          </DragOverlay>
        </DndContext>
      ) : null}

      {!loading && view === "table" ? (
        <CompactDataTable
          ariaLabel="Escalations table"
          columns={columns}
          data={cases}
          getRowId={(row) => row.id}
          emptyState="No open escalations."
          minWidth={1100}
          maxHeight="none"
        />
      ) : null}

      {(detail || detailLoading) && (
        <div
          className={styles.escalationDrawerScrim}
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) setDetail(null);
          }}
        >
          <aside className={styles.escalationDrawer} aria-label="Escalation detail">
            <header className={styles.escalationDrawerHead}>
              <h2>
                {detail ? `Case #${detail.number}` : "Loading…"}
              </h2>
              <button
                type="button"
                className={styles.inviteSecondaryButton}
                onClick={() => setDetail(null)}
              >
                Close
              </button>
            </header>
            {detailLoading && !detail ? (
              <p className={styles.escalationMuted}>Loading detail…</p>
            ) : null}
            {detail ? (
              <div className={styles.escalationDrawerBody}>
                <p className={styles.escalationClient}>
                  {detail.response?.clientName || detail.response?.company || detail.title}
                </p>
                <p className={styles.escalationMeta}>
                  {[detail.response?.department, detail.response?.partner]
                    .filter(Boolean)
                    .join(" · ") || "No department / partner on invite"}
                </p>
                <div className={styles.escalationScores}>
                  <span className={styles.ratingBadge} data-metric="csat">
                    CSAT {formatScore(detail.response?.csatScore ?? null)}
                  </span>
                  <span className={styles.ratingBadge} data-metric="ces">
                    CES {formatScore(detail.response?.cesScore ?? null)}
                  </span>
                  <span className={styles.ratingBadge} data-metric="nps">
                    NPS {formatScore(detail.response?.npsScore ?? null)}
                  </span>
                </div>
                <p>
                  <strong>Status:</strong> {statusLabel(detail.status)} ·{" "}
                  <strong>Severity:</strong> {detail.severity}
                </p>
                {detail.tasks.length ? (
                  <ul className={styles.escalationTaskList}>
                    {detail.tasks.map((task) => (
                      <li key={task.id}>
                        {task.title}{" "}
                        <span data-status={task.status}>({task.status})</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {canManage && detail.allowedTransitions.length ? (
                  <div className={styles.escalationTransitions}>
                    <p>Move to</p>
                    <div className={styles.escalationTransitionButtons}>
                      {detail.allowedTransitions.map((toStatus) => (
                        <button
                          key={toStatus}
                          type="button"
                          className={styles.invitePrimaryButton}
                          disabled={transitionBusy}
                          onClick={() =>
                            void transition(detail.id, detail.status, toStatus)
                          }
                        >
                          {CASE_STATUS_LABELS[toStatus]}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className={styles.escalationActivity}>
                  <h3>Activity</h3>
                  <ul>
                    {detail.activities.map((activity) => (
                      <li key={activity.id}>
                        <span>{formatWhen(activity.createdAt)}</span>{" "}
                        {activity.type}
                        {activity.fromStatus && activity.toStatus
                          ? `: ${statusLabel(activity.fromStatus)} → ${statusLabel(activity.toStatus)}`
                          : null}
                        {activity.message ? ` — ${activity.message}` : null}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      )}
    </section>
  );
}
