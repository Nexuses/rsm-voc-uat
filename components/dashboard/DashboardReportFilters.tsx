"use client";

import { useState, type ReactNode } from "react";
import type { DashboardWindow } from "@/lib/dashboard-analytics";
import {
  emptyDashboardOrgFilters,
  type DashboardOrgFilters,
  type InviteFilterOptions,
} from "@/lib/dashboard-report-filters";
import styles from "./dashboard.module.css";

type DashboardReportFiltersProps = {
  window: DashboardWindow;
  onWindowChange: (window: DashboardWindow) => void;
  org: DashboardOrgFilters;
  onOrgChange: (org: DashboardOrgFilters) => void;
  options: InviteFilterOptions;
};

export function FilterDisclosure({
  activeCount,
  onClear,
  children,
}: {
  activeCount: number;
  onClear: () => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section
      className={styles.filterBar}
      data-open={open ? "true" : "false"}
      aria-label="Filters"
    >
      <div className={styles.filterBarHeader}>
        <button
          type="button"
          className={styles.filterToggle}
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          <span className={styles.filterToggleIcon} aria-hidden="true" />
          <span>Filters</span>
          {activeCount > 0 ? (
            <span className={styles.filterBadge}>
              {activeCount === 1 ? "1 active" : `${activeCount} active`}
            </span>
          ) : (
            <span className={styles.filterHint}>{open ? "Hide" : "Show filters"}</span>
          )}
        </button>
        {open && activeCount > 0 ? (
          <button type="button" className={styles.filterClear} onClick={onClear}>
            Clear
          </button>
        ) : null}
      </div>
      {open ? children : null}
    </section>
  );
}

const emptyOptions: InviteFilterOptions = {
  departments: [],
  partners: [],
  services: [],
  businessManagers: [],
  jobManagers: [],
  companies: [],
  respondents: [],
};

export default function DashboardReportFilters({
  window,
  onWindowChange,
  org,
  onOrgChange,
  options = emptyOptions,
}: DashboardReportFiltersProps) {
  const activeCount =
    (window !== "all" ? 1 : 0) +
    Object.values(org).filter((value) => value.trim().length > 0).length;

  function select(
    label: string,
    value: string,
    choices: string[],
    onChange: (value: string) => void
  ) {
    return (
      <label className={styles.periodFilter} key={label}>
        <span>{label}</span>
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          <option value="">All</option>
          {value && !choices.some((choice) => choice === value) ? (
            <option value={value}>{value}</option>
          ) : null}
          {choices.map((choice) => (
            <option key={choice} value={choice}>
              {choice}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <FilterDisclosure
      activeCount={activeCount}
      onClear={() => {
        onWindowChange("all");
        onOrgChange(emptyDashboardOrgFilters);
      }}
    >
      <div className={styles.filterGroup}>
        <p className={styles.filterGroupLabel}>Period</p>
        <div className={styles.filterGroupFields}>
          <label className={styles.periodFilter}>
            <span>From</span>
            <input
              type="date"
              value={org.dateFrom}
              max={org.dateTo || undefined}
              onChange={(event) => onOrgChange({ ...org, dateFrom: event.target.value })}
            />
          </label>
          <label className={styles.periodFilter}>
            <span>To</span>
            <input
              type="date"
              value={org.dateTo}
              min={org.dateFrom || undefined}
              onChange={(event) => onOrgChange({ ...org, dateTo: event.target.value })}
            />
          </label>
          <label className={styles.periodFilter}>
            <span>Reporting period</span>
            <select
              value={window}
              onChange={(event) =>
                onWindowChange(event.target.value as DashboardWindow)
              }
            >
              <option value="all">All time</option>
              <option value="90d">Last 90 days</option>
              <option value="year">This year</option>
            </select>
          </label>
        </div>
      </div>

      <div className={styles.filterGroup}>
        <p className={styles.filterGroupLabel}>Client</p>
        <div className={styles.filterGroupFields}>
          {select("Company", org.company, options.companies, (company) =>
            onOrgChange({ ...org, company })
          )}
          {select("Respondent", org.respondent, options.respondents, (respondent) =>
            onOrgChange({ ...org, respondent })
          )}
          {select("Department", org.department, options.departments, (department) =>
            onOrgChange({ ...org, department })
          )}
          {select("Service", org.service, options.services, (service) =>
            onOrgChange({ ...org, service })
          )}
        </div>
      </div>

      <div className={styles.filterGroup}>
        <p className={styles.filterGroupLabel}>RSM team</p>
        <div className={styles.filterGroupFields}>
          {select("Partner", org.partner, options.partners, (partner) =>
            onOrgChange({ ...org, partner })
          )}
          {select(
            "Business manager",
            org.businessManager,
            options.businessManagers,
            (businessManager) => onOrgChange({ ...org, businessManager })
          )}
          {select("Job manager", org.jobManager, options.jobManagers, (jobManager) =>
            onOrgChange({ ...org, jobManager })
          )}
        </div>
      </div>
    </FilterDisclosure>
  );
}
