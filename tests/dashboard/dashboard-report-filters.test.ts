import { describe, expect, it } from "vitest";
import {
  collectInviteFilterOptions,
  emptyDashboardOrgFilters,
  filterDashboardInsights,
  filterInviteRecordsForReporting,
} from "@/lib/dashboard-report-filters";
import { matchesInviteTrackerStatus } from "@/lib/invite-tracker-filters";
import type { SurveyInviteRecord } from "@/lib/survey-outreach";

const baseItem = {
  submittedAt: "2026-06-12T10:05:00.000Z",
  department: "ASSURANCE",
  partner: "Sriram Gopalakrishnan",
};

const taxItem = {
  submittedAt: "2026-06-12T11:05:00.000Z",
  department: "TAX",
  partner: "Tuhin Chaturvedi",
};

const untrackedItem = {
  submittedAt: "2026-06-12T12:05:00.000Z",
  department: null,
  partner: null,
};

describe("dashboard report filters", () => {
  it("returns all items when org filters are empty", () => {
    const items = [baseItem, taxItem, untrackedItem];
    expect(filterDashboardInsights(items, "all", emptyDashboardOrgFilters))
      .toHaveLength(3);
  });

  it("filters responses by department case-insensitively", () => {
    const items = [
      baseItem,
      { ...taxItem, department: "tax" },
      untrackedItem,
    ];
    const filtered = filterDashboardInsights(items, "all", {
      ...emptyDashboardOrgFilters,
      department: "TAX",
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.partner).toBe("Tuhin Chaturvedi");
  });

  it("filters responses by partner independently", () => {
    const items = [baseItem, taxItem, untrackedItem];
    const filtered = filterDashboardInsights(items, "all", {
      ...emptyDashboardOrgFilters,
      partner: "Sriram Gopalakrishnan",
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.department).toBe("ASSURANCE");
  });

  it("excludes untracked responses when an org filter is active", () => {
    const items = [baseItem, untrackedItem];
    expect(
      filterDashboardInsights(items, "all", {
        ...emptyDashboardOrgFilters,
        department: "ASSURANCE",
      })
    ).toHaveLength(1);
  });

  it("filters invite records by department and reporting window", () => {
    const invites: SurveyInviteRecord[] = [
      {
        sentAt: "2026-06-12T10:00:00.000Z",
        openedAt: null,
        startedAt: null,
        completedAt: "2026-06-12T10:05:00.000Z",
        department: "ASSURANCE",
        partner: "Sriram Gopalakrishnan",
      },
      {
        sentAt: "2025-01-01T10:00:00.000Z",
        openedAt: null,
        startedAt: null,
        completedAt: null,
        department: "TAX",
        partner: "Tuhin Chaturvedi",
      },
    ];

    const filtered = filterInviteRecordsForReporting(invites, "all", {
      ...emptyDashboardOrgFilters,
      department: "ASSURANCE",
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.department).toBe("ASSURANCE");
  });

  it("builds filter options from stored invite text and matches service", () => {
    const invites: SurveyInviteRecord[] = [
      {
        sentAt: "2026-06-12T10:00:00.000Z",
        openedAt: null,
        startedAt: null,
        completedAt: null,
        department: "Assurance",
        partner: "Mohamed Shehata",
        serviceName: "Audit",
        businessManagerName: "Sara Al-Mutairi",
        jobManagerName: null,
      },
      {
        sentAt: "2026-06-13T10:00:00.000Z",
        openedAt: null,
        startedAt: null,
        completedAt: null,
        department: "assurance",
        partner: " mohamed shehata ",
        serviceName: "Tax",
        businessManagerName: null,
        jobManagerName: "Omar Al-Rashid",
      },
    ];

    expect(collectInviteFilterOptions(invites)).toEqual({
      departments: ["Assurance"],
      partners: ["Mohamed Shehata"],
      services: ["Audit", "Tax"],
      businessManagers: ["Sara Al-Mutairi"],
      jobManagers: ["Omar Al-Rashid"],
      companies: [],
      respondents: [],
    });

    const filtered = filterInviteRecordsForReporting(invites, "all", {
      ...emptyDashboardOrgFilters,
      service: "audit",
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.serviceName).toBe("Audit");
  });

  it("filters invites by sent date, company, and respondent", () => {
    const invites: SurveyInviteRecord[] = [
      {
        sentAt: "2026-09-01T08:00:00.000Z",
        openedAt: null,
        startedAt: null,
        completedAt: null,
        department: "ASSURANCE",
        partner: null,
        company: "Mazaya Real Estate",
        customerName: "Ahmed Harfoush",
      },
      {
        sentAt: "2026-10-07T08:00:00.000Z",
        openedAt: null,
        startedAt: null,
        completedAt: null,
        department: "TAX",
        partner: null,
        company: "Example Co",
        customerName: "Sara Al-Sabah",
      },
    ];

    const byDate = filterInviteRecordsForReporting(invites, "all", {
      ...emptyDashboardOrgFilters,
      dateFrom: "2026-10-01",
      dateTo: "2026-10-07",
    });
    expect(byDate).toHaveLength(1);
    expect(byDate[0]?.company).toBe("Example Co");

    const byCompany = filterInviteRecordsForReporting(invites, "all", {
      ...emptyDashboardOrgFilters,
      company: "mazaya real estate",
    });
    expect(byCompany).toHaveLength(1);
    expect(byCompany[0]?.customerName).toBe("Ahmed Harfoush");

    const byRespondent = filterDashboardInsights(
      [
        {
          submittedAt: "2026-10-07T09:00:00.000Z",
          client: { company: "Example Co", name: "Sara Al-Sabah" },
        },
        {
          submittedAt: "2026-10-07T10:00:00.000Z",
          client: { company: "Example Co", name: "Other Person" },
        },
      ],
      "all",
      { ...emptyDashboardOrgFilters, respondent: "sara al-sabah" }
    );
    expect(byRespondent).toHaveLength(1);
  });

  it("treats every status except completed as not completed", () => {
    expect(matchesInviteTrackerStatus("sent", "not_completed")).toBe(true);
    expect(matchesInviteTrackerStatus("opened", "not_completed")).toBe(true);
    expect(matchesInviteTrackerStatus("started", "not_completed")).toBe(true);
    expect(matchesInviteTrackerStatus("reminder_sent", "not_completed")).toBe(true);
    expect(matchesInviteTrackerStatus("completed", "not_completed")).toBe(false);
    expect(matchesInviteTrackerStatus("reminder_sent", "sent")).toBe(true);
  });
});
