import { describe, expect, it } from "vitest";
import {
  buildSurveyOutreachStats,
  dedupeEmails,
  formatRecipientName,
  parseEmailsFromCsv,
  parseRecipientsFromCsv,
  personalizeInviteBody,
} from "@/lib/survey-outreach";
import {
  buildSurveyInviteTrackerRow,
  deriveInviteTrackerStatus,
  deriveNextFollowUpDate,
} from "@/lib/survey-invite-tracking";
import { isAutoFollowupDue } from "@/lib/survey-followup-cadence";
import { renderSurveyInviteTemplate } from "@/lib/survey-invite-templates";

describe("survey invite tracking helpers", () => {
  it("parses recipient metadata from a CSV header row", () => {
    const recipients = parseRecipientsFromCsv(
      "email,department,partner,teamleader,customername,projectid,surveyorder\nclient@example.com,Audit,Ahmed Al-Sabah,Sara Al-Mutairi,Sara Al-Sabah,PRJ-2401,1"
    );

    expect(recipients[0]).toEqual(
      expect.objectContaining({
        email: "client@example.com",
        department: "Audit",
        partner: "Ahmed Al-Sabah",
        teamLeader: "Sara Al-Mutairi",
        customerName: "Sara Al-Sabah",
        projectId: "PRJ-2401",
        surveyOrder: "1",
      })
    );
  });

  it("parses optional company and designation columns from CSV", () => {
    const recipients = parseRecipientsFromCsv(
      [
        "email,customername,company,designation",
        "client@example.com,Sara Al-Sabah,Acme Holdings,CFO",
      ].join("\n")
    );

    expect(recipients[0]).toEqual(
      expect.objectContaining({
        email: "client@example.com",
        customerName: "Sara Al-Sabah",
        company: "Acme Holdings",
        designation: "CFO",
      })
    );

    const aliased = parseRecipientsFromCsv(
      "email,position\nops@company.co,Director"
    );
    expect(aliased[0]).toEqual(
      expect.objectContaining({
        email: "ops@company.co",
        designation: "Director",
      })
    );
  });

  it("reads partner, manager, and service columns from CSV", () => {
    const recipients = parseRecipientsFromCsv(
      [
        "email,service,partner,partneremail,businessmanager,businessmanageremail,jobmanager,jobmanageremail",
        "client@example.com,Audit,Mohamed Shehata,mohamed@example.com,Sara Al-Mutairi,sara@example.com,Omar Al-Rashid,omar@example.com",
      ].join("\n")
    );

    expect(recipients[0]).toEqual(
      expect.objectContaining({
        email: "client@example.com",
        serviceName: "Audit",
        partner: "Mohamed Shehata",
        partnerEmail: "mohamed@example.com",
        businessManagerName: "Sara Al-Mutairi",
        businessManagerEmail: "sara@example.com",
        jobManagerName: "Omar Al-Rashid",
        jobManagerEmail: "omar@example.com",
      })
    );
  });

  it("parses emails from CSV rows without headers", () => {
    const emails = parseEmailsFromCsv(
      "client@example.com\nOther,ops@company.co"
    );

    expect(emails).toEqual(["client@example.com", "ops@company.co"]);
  });

  it("formats recipient names for greetings", () => {
    expect(
      formatRecipientName({
        email: "client@example.com",
        customerName: "Sara Al-Sabah",
      })
    ).toBe("Sara Al-Sabah");
    expect(
      formatRecipientName({
        email: "client@example.com",
        firstName: "Sara",
        lastName: "Al-Sabah",
      })
    ).toBe("Sara Al-Sabah");
    expect(formatRecipientName({ email: "client@example.com" })).toBe(
      "Valued Client"
    );
  });

  it("dedupes recipient emails", () => {
    expect(
      dedupeEmails(["A@Example.com", "a@example.com", "b@example.com"])
    ).toEqual(["a@example.com", "b@example.com"]);
  });

  it("personalizes invite bodies with a tracked survey link and client name", () => {
    const body = personalizeInviteBody(
      "Dear {{client_name}},\nPlease complete the survey:\n{{survey_link}}",
      "https://rsm-voc-platform.vercel.app/survey?invite=abc",
      {
        email: "client@example.com",
        firstName: "Sara",
        lastName: "Al-Sabah",
      }
    );

    expect(body).toContain("invite=abc");
    expect(body).toContain("Dear Sara Al-Sabah");
    expect(body).not.toContain("{{survey_link}}");
  });

  it("renders the branded invite HTML with personalized placeholders", () => {
    const rendered = renderSurveyInviteTemplate("invite", {
      recipient: {
        email: "client@example.com",
        firstName: "Sara",
        lastName: "Al-Sabah",
      },
      surveyLink: "https://rsm-voc-platform.vercel.app/survey?invite=abc",
    });

    expect(rendered.html).toContain("Dear Sara Al-Sabah");
    expect(rendered.html).not.toContain("Dear Mr.");
    expect(rendered.html).toContain("survey?invite=abc");
    expect(rendered.html).toContain("START THE SURVEY");
    expect(rendered.html).toContain("Client_Survesy_Email_dsesign_1782903784076_cyb4.png");
    expect(rendered.html).toContain("Best regards,");
    expect(rendered.html).toContain("RSM in Kuwait");
    expect(rendered.html).toContain("ik.imagekit.io/urudrjyfz9/footer.png");
    expect(rendered.html).not.toContain("emea.dcv.ms");
    expect(rendered.text).toContain("survey?invite=abc");
  });

  it("shows department and service in the invite email when the invite carries them", () => {
    const rendered = renderSurveyInviteTemplate("invite", {
      recipient: {
        email: "client@example.com",
        firstName: "Sara",
        department: "Assurance",
        serviceName: "Audit",
      },
      surveyLink: "https://rsm-voc-platform.vercel.app/survey?invite=abc",
    });

    expect(rendered.html).toContain("This survey is about the following service:");
    expect(rendered.html).toContain("<strong>Department:</strong> Assurance");
    expect(rendered.html).toContain("<strong>Service:</strong> Audit");
    expect(rendered.html).not.toContain("{{department_service}}");
    expect(rendered.text).toContain("Department: Assurance");
    expect(rendered.text).toContain("Service: Audit");
  });

  it("omits the department/service block when the invite has neither", () => {
    const rendered = renderSurveyInviteTemplate("invite", {
      recipient: { email: "client@example.com", firstName: "Sara" },
      surveyLink: "https://rsm-voc-platform.vercel.app/survey?invite=abc",
    });

    expect(rendered.html).not.toContain("This survey is about the following service:");
    expect(rendered.html).not.toContain("{{department_service}}");
    expect(rendered.html).not.toContain("<strong>Department:</strong>");
    expect(rendered.html).not.toContain("<strong>Service:</strong>");
  });

  it("escapes department and service values in the invite email", () => {
    const rendered = renderSurveyInviteTemplate("invite", {
      recipient: {
        email: "client@example.com",
        department: "Tax <script>",
        serviceName: 'Advisory "x"',
      },
      surveyLink: "https://rsm-voc-platform.vercel.app/survey?invite=abc",
    });

    expect(rendered.html).not.toContain("Tax <script>");
    expect(rendered.html).toContain("Tax &lt;script&gt;");
  });

  it("renders the day-5 follow-up with an Outlook-safe theme strip and plain link", () => {
    const rendered = renderSurveyInviteTemplate("followup-day5", {
      recipient: { email: "client@example.com", firstName: "Sara" },
      surveyLink: "https://rsm-voc-platform.vercel.app/survey?invite=abc",
    });

    expect(rendered.html).toContain("background-color:#009CDE");
    expect(rendered.html).toContain("Or copy and paste this link");
    expect(rendered.html).toContain("survey?invite=abc");
    expect(rendered.html).toContain("<table");
    expect(rendered.html).not.toContain("display: flex");
    expect(rendered.html).not.toContain("var(--blue)");
  });

  it("uses a clear Reminder subject for follow-up emails", async () => {
    const { buildFollowupSubject, renderSurveyFollowupEmail } = await import(
      "@/lib/survey-invite-templates"
    );
    expect(buildFollowupSubject("RSM in Kuwait — Share your Voice of Clients feedback")).toBe(
      "RSM in Kuwait — Reminder: Voice of Clients feedback"
    );
    expect(
      buildFollowupSubject("Re: RSM in Kuwait — Share your Voice of Clients feedback")
    ).toBe("RSM in Kuwait — Reminder: Voice of Clients feedback");

    const rendered = renderSurveyFollowupEmail({
      recipient: { email: "client@example.com", firstName: "Sara" },
      surveyLink: "https://example.com/survey?invite=abc",
      originalSubject: "RSM in Kuwait — Share your Voice of Clients feedback",
    });
    expect(rendered.subject).toContain("Reminder");
    expect(rendered.html).toContain("Share Your Feedback");
  });

  it("sends a late cron reminder once instead of bursting missed days", () => {
    const sentAt = new Date("2026-06-01T10:00:00.000Z");
    const late = new Date("2026-06-10T10:00:00.000Z");

    expect(isAutoFollowupDue({ sentAt, followupCount: 0 }, late)).toBe(true);
    expect(isAutoFollowupDue({ sentAt, followupCount: 1 }, late)).toBe(true);
    expect(
      deriveNextFollowUpDate({ sentAt, followupCount: 1 })?.toISOString()
    ).toBe("2026-06-07T10:00:00.000Z");
  });

  it("waits a full interval after the last reminder before the next is due", () => {
    const sentAt = new Date("2026-06-01T10:00:00.000Z");
    const lastReminderSentAt = new Date("2026-06-10T10:00:00.000Z");
    const nextDay = new Date("2026-06-11T10:00:00.000Z");
    // 13 Jun 2026 is Saturday in Kuwait → rolls to Sunday 14 Jun 08:00 UTC
    const afterWeekendBump = new Date("2026-06-14T08:00:00.000Z");

    expect(
      deriveNextFollowUpDate({
        sentAt,
        followupCount: 1,
        lastReminderSentAt,
      })?.toISOString()
    ).toBe("2026-06-14T08:00:00.000Z");

    expect(
      isAutoFollowupDue(
        { sentAt, followupCount: 1, lastReminderSentAt },
        nextDay
      )
    ).toBe(false);
    expect(
      isAutoFollowupDue(
        { sentAt, followupCount: 1, lastReminderSentAt },
        afterWeekendBump
      )
    ).toBe(true);
  });

  it("rolls Kuwait Fri/Sat due dates forward to the next Sunday–Thursday", async () => {
    const { bumpToKuwaitReminderWeekday, isKuwaitReminderWeekday } =
      await import("@/lib/survey-followup-cadence");

    // Friday 30 Oct 2026 08:00 UTC → Sunday 1 Nov 2026 08:00 UTC
    const friday = new Date("2026-10-30T08:00:00.000Z");
    expect(isKuwaitReminderWeekday(friday)).toBe(false);
    expect(bumpToKuwaitReminderWeekday(friday)?.toISOString()).toBe(
      "2026-11-01T08:00:00.000Z"
    );

    const sentAt = new Date("2026-10-20T08:00:00.000Z");
    const lastReminderSentAt = new Date("2026-10-27T08:00:00.000Z");
    expect(
      deriveNextFollowUpDate({
        sentAt,
        followupCount: 1,
        lastReminderSentAt,
      })?.toISOString()
    ).toBe("2026-11-01T08:00:00.000Z");

    // No auto sends on Kuwait Friday even if schedule says due.
    expect(
      isAutoFollowupDue(
        { sentAt, followupCount: 1, lastReminderSentAt },
        friday
      )
    ).toBe(false);
  });

  it("derives invite tracker status and next follow-up dates", () => {
    const sentAt = new Date("2026-06-01T10:00:00.000Z");

    expect(
      deriveInviteTrackerStatus({
        sentAt,
        openedAt: null,
        startedAt: null,
        completedAt: null,
        responseId: null,
        followupCount: 0,
      })
    ).toBe("sent");

    expect(
      deriveNextFollowUpDate({
        sentAt,
        completedAt: null,
        responseId: null,
        followupCount: 0,
      })?.toISOString()
    ).toBe("2026-06-04T10:00:00.000Z");

    expect(
      deriveNextFollowUpDate({
        sentAt,
        followupCount: 1,
      })?.toISOString()
    ).toBe("2026-06-07T10:00:00.000Z");

    expect(
      deriveNextFollowUpDate({
        sentAt,
        followupCount: 5,
      })
    ).toBeNull();
    expect(
      deriveNextFollowUpDate({
        sentAt,
        followupCount: 4,
      })?.toISOString()
    ).toBe("2026-06-16T10:00:00.000Z");

    expect(
      isAutoFollowupDue(
        { sentAt, followupCount: 0 },
        new Date("2026-06-03T10:00:00.000Z")
      )
    ).toBe(false);
    expect(
      isAutoFollowupDue(
        { sentAt, followupCount: 0 },
        new Date("2026-06-04T10:00:00.000Z")
      )
    ).toBe(true);
    expect(
      isAutoFollowupDue(
        { sentAt, followupCount: 1 },
        new Date("2026-06-08T10:00:00.000Z")
      )
    ).toBe(true);

    const row = buildSurveyInviteTrackerRow({
      id: "invite-1",
      email: "client@example.com",
      firstName: "Sara",
      lastName: "Al-Sabah",
      company: "Acme Holdings",
      department: "Audit",
      serviceName: null,
      partner: "Ahmed Al-Sabah",
      partnerEmail: null,
      businessManagerName: null,
      businessManagerEmail: null,
      jobManagerName: null,
      jobManagerEmail: null,
      teamLeader: "Sara Al-Mutairi",
      customerName: "Sara Al-Sabah",
      projectId: "PRJ-2401",
      surveyOrder: "1",
      sentAt,
      openedAt: null,
      startedAt: null,
      completedAt: null,
      responseId: null,
      followupCount: 1,
      followup1SentAt: new Date("2026-06-04T10:00:00.000Z"),
      followup2SentAt: null,
    });

    expect(row.name).toBe("Sara Al-Sabah");
    expect(row.department).toBe("Audit");
    expect(row.projectId).toBe("PRJ-2401");
    expect(row.status).toBe("reminder_sent");
    expect(row.statusLabel).toBe("Reminder sent");
    expect(row.followupCount).toBe(1);
    expect(row.canSendFollowUp).toBe(true);
    expect(row.nextFollowUpAt).toBe("2026-06-07T10:00:00.000Z");
  });

  it("builds outreach stats for a reporting window", () => {
    const stats = buildSurveyOutreachStats(
      [
        {
          sentAt: "2026-06-12T10:00:00.000Z",
          openedAt: "2026-06-12T10:05:00.000Z",
          startedAt: "2026-06-12T10:06:00.000Z",
          completedAt: "2026-06-12T10:20:00.000Z",
          department: null,
          partner: null,
        },
        {
          sentAt: "2026-06-12T11:00:00.000Z",
          openedAt: "2026-06-12T11:01:00.000Z",
          startedAt: null,
          completedAt: null,
          department: null,
          partner: null,
        },
        {
          sentAt: "2025-01-01T10:00:00.000Z",
          openedAt: null,
          startedAt: null,
          completedAt: null,
          department: null,
          partner: null,
        },
      ],
      "all"
    );

    expect(stats.surveysSent).toBe(3);
    expect(stats.responsesReceived).toBe(1);
    expect(stats.responseRate).toBe(33);
    expect(stats.opensTracked).toBe(2);
    expect(stats.startsTracked).toBe(1);
  });
});
