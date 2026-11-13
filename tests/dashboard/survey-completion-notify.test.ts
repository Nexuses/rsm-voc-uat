import { beforeEach, describe, expect, it, vi } from "vitest";
import { SURVEY_QUESTIONS } from "@/lib/survey/constants";

const mocks = vi.hoisted(() => ({
  surveyInviteFindFirst: vi.fn(),
  surveyInviteUpdate: vi.fn(),
  surveyInviteEventCreate: vi.fn(),
  responseFindUnique: vi.fn(),
  responseUpdate: vi.fn(),
  staffContactFindUnique: vi.fn(),
  testimonialFindUnique: vi.fn(),
  testimonialCreate: vi.fn(),
  testimonialUpdateMany: vi.fn(),
  sendSurveyInviteEmail: vi.fn(),
  sendSurveyInviteEmailToRecipients: vi.fn(),
  isSmtpConfigured: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    surveyInvite: {
      findFirst: mocks.surveyInviteFindFirst,
      update: mocks.surveyInviteUpdate,
    },
    surveyInviteEvent: {
      create: mocks.surveyInviteEventCreate,
    },
    response: {
      findUnique: mocks.responseFindUnique,
      update: mocks.responseUpdate,
    },
    staffContact: {
      findUnique: mocks.staffContactFindUnique,
    },
    testimonial: {
      findUnique: mocks.testimonialFindUnique,
      create: mocks.testimonialCreate,
      updateMany: mocks.testimonialUpdateMany,
    },
  },
}));

vi.mock("@/lib/survey-invite-email", () => ({
  isSmtpConfigured: mocks.isSmtpConfigured,
  sendSurveyInviteEmail: mocks.sendSurveyInviteEmail,
  sendSurveyInviteEmailToRecipients: mocks.sendSurveyInviteEmailToRecipients,
}));

import {
  buildCompletionEmailSubject,
  getTeamNotifyRecipients,
  renderSurveyTeamActionRequiredEmail,
  renderSurveyTeamNotifyEmail,
  sendSurveyCompletionNotifications,
  SURVEY_TEAM_NOTIFY_ATTENTION_SUBJECT,
  SURVEY_TEAM_NOTIFY_SUBJECT,
} from "@/lib/survey-thankyou-email";
import { overallSurveyResult } from "@/lib/survey/metrics";

const sampleAnswers = [
  {
    question_number: 1,
    question_text: SURVEY_QUESTIONS[0].question,
    metric: "csat" as const,
    scale_min: 1,
    scale_max: 5,
    rating: 5,
    reason_text: "Clear communication throughout.",
    reason_method: "typed" as const,
  },
  {
    question_number: 2,
    question_text: SURVEY_QUESTIONS[1].question,
    metric: "ces" as const,
    scale_min: 1,
    scale_max: 7,
    rating: 6,
    reason_text: "Easy to reach the team.",
    reason_method: "typed" as const,
  },
  {
    question_number: 3,
    question_text: SURVEY_QUESTIONS[2].question,
    metric: "nps" as const,
    scale_min: 0,
    scale_max: 10,
    rating: 9,
    reason_text: "Would recommend RSM.",
    reason_method: "typed" as const,
  },
];

const completeResponse = {
  csatScore: 5,
  cesScore: 6,
  npsScore: 9,
  answers: sampleAnswers,
  completedAt: new Date("2026-06-30T10:00:00.000Z"),
  createdAt: new Date("2026-06-30T10:00:00.000Z"),
  conversationId: "conv_abc123",
  language: "en",
  teamNotifySentAt: null,
  client: {
    name: "Sara Al-Sabah",
    company: "Example Co",
    designation: "CFO",
  },
  surveyInvite: {
    email: "client@example.com",
    customerName: "Sara Al-Sabah",
    department: "ASSURANCE",
    partner: "Sriram Gopalakrishnan",
    teamLeader: "Omar Al-Rashid",
    projectId: "PRJ-2401",
  },
};

describe("survey completion notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isSmtpConfigured.mockReturnValue(true);
    mocks.sendSurveyInviteEmail.mockResolvedValue(undefined);
    mocks.sendSurveyInviteEmailToRecipients.mockResolvedValue(undefined);
    mocks.surveyInviteEventCreate.mockResolvedValue({
      id: "event-1",
      type: "thank_you",
      templateId: "thank-you",
      message: null,
      actorUserId: null,
      createdAt: new Date("2026-06-30T10:00:00.000Z"),
    });
    mocks.staffContactFindUnique.mockResolvedValue(null);
    mocks.testimonialFindUnique.mockResolvedValue(null);
    mocks.testimonialCreate.mockImplementation(
      async (args: { data: { kind: string } }) => ({
        id: "testimonial-1",
        token: "test-token",
        kind: args.data.kind,
      })
    );
    mocks.testimonialUpdateMany.mockResolvedValue({ count: 1 });
    process.env.SURVEY_COMPLETION_NOTIFY_TO = "cx-team@example.com";
    delete process.env.SURVEY_INVITE_DEFAULT_TO;
    delete process.env.SURVEY_STAFF_DIRECTORY;
  });

  it("renders the RSM team notification with respondent context and summary", () => {
    const rendered = renderSurveyTeamNotifyEmail({
      completedAt: new Date("2026-06-30T10:00:00.000Z"),
      csatScore: 5,
      cesScore: 6,
      npsScore: 9,
      answers: sampleAnswers,
      context: {
        name: "Sara Al-Sabah",
        company: "Example Co",
        designation: "CFO",
        inviteEmail: "client@example.com",
        department: "ASSURANCE",
        partner: "Sriram Gopalakrishnan",
        teamLeader: "Omar Al-Rashid",
        projectId: "PRJ-2401",
        channel: "voice",
        language: "en",
      },
    });

    expect(rendered.subject).toBe(SURVEY_TEAM_NOTIFY_SUBJECT);
    expect(rendered.html).toContain("Sara Al-Sabah");
    expect(rendered.html).toContain("ASSURANCE");
    expect(rendered.html).toContain("5 / 5");
    expect(rendered.html).not.toContain("{{overall_result}}");
    expect(rendered.text).toContain("Channel: Voice");
    expect(rendered.text).toContain("Would recommend RSM.");
  });

  it("formats respondent details as 'Label: value' and omits team leader", () => {
    const rendered = renderSurveyTeamNotifyEmail({
      completedAt: new Date("2026-06-30T10:00:00.000Z"),
      csatScore: 5,
      cesScore: 6,
      npsScore: 9,
      answers: sampleAnswers,
      context: {
        name: "Sara Al-Sabah",
        company: "Example Co",
        designation: "CFO",
        inviteEmail: "client@example.com",
        department: "ASSURANCE",
        partner: "Sriram Gopalakrishnan",
        teamLeader: "Omar Al-Rashid",
        projectId: "PRJ-2401",
        channel: "typed",
        language: "en",
      },
    });

    expect(rendered.html).toContain("Name:</strong> Sara Al-Sabah");
    expect(rendered.html).toContain("Engagement Partner:</strong> Sriram Gopalakrishnan");
    expect(rendered.text).toContain("Engagement Partner: Sriram Gopalakrishnan");
    expect(rendered.html).not.toContain("Team Leader");
    expect(rendered.text).not.toContain("Team Leader");
  });

  it("splits respondent details into client and RSM team columns without Language", () => {
    const rendered = renderSurveyTeamNotifyEmail({
      completedAt: new Date("2026-06-30T10:00:00.000Z"),
      csatScore: 5,
      cesScore: 6,
      npsScore: 9,
      answers: sampleAnswers,
      context: {
        name: "Sara Al-Sabah",
        company: "Example Co",
        designation: "CFO",
        inviteEmail: "client@example.com",
        department: "ASSURANCE",
        serviceName: "Audit",
        partner: "Sriram Gopalakrishnan",
        partnerEmail: "partner@example.com",
        businessManagerName: "Bader Example",
        businessManagerEmail: "bm@example.com",
        jobManagerName: "Mina Example",
        jobManagerEmail: "jm@example.com",
        teamLeader: "Omar Al-Rashid",
        projectId: "PRJ-2401",
        channel: "typed",
        language: "en",
      },
    });

    expect(rendered.html).not.toContain("Language");
    expect(rendered.text).not.toContain("Language");
    expect(rendered.html.match(/Email:<\/strong>/g)).toHaveLength(1);
    expect(rendered.html).toContain("Client information");
    expect(rendered.html).toContain("RSM in Kuwait team");
    expect(rendered.html.indexOf("Company:</strong>")).toBeLessThan(
      rendered.html.indexOf("Name:</strong>")
    );
    expect(rendered.html.indexOf("Email:</strong>")).toBeLessThan(
      rendered.html.indexOf("RSM in Kuwait team")
    );
    expect(rendered.html).toContain(
      'Engagement Partner:</strong> Sriram Gopalakrishnan<br><span style="font-size:12px;color:#63666A;">partner@example.com</span>'
    );
    expect(rendered.text).toContain(
      "Client information:\nCompany: Example Co\nName: Sara Al-Sabah\nDesignation: CFO\nEmail: client@example.com\nChannel: Typed\nSubmitted: 30 Jun 2026, 1:00\u00a0pm (Kuwait\u00a0time)"
    );
    expect(rendered.html.match(/<td width="50%"/g)).toHaveLength(2);
    expect(rendered.text).toContain(
      "RSM in Kuwait team:\nDepartment: ASSURANCE\nEngagement Partner: Sriram Gopalakrishnan (partner@example.com)\nBusiness Manager: Bader Example (bm@example.com)\nJob Manager: Mina Example (jm@example.com)\nProject ID: PRJ-2401\nService: Audit\n\n"
    );
    expect(rendered.text).toContain("Channel: Typed");
  });

  it("shows completion date and time in Kuwait time", () => {
    const rendered = renderSurveyTeamNotifyEmail({
      completedAt: new Date("2026-10-13T22:30:00.000Z"),
      csatScore: 5,
      cesScore: 6,
      npsScore: 9,
      answers: sampleAnswers,
      context: {
        name: "Sara Al-Sabah",
        company: "Example Co",
        designation: "CFO",
        inviteEmail: "client@example.com",
        department: "ASSURANCE",
        partner: "Sriram Gopalakrishnan",
        teamLeader: "Omar Al-Rashid",
        projectId: "PRJ-2401",
        channel: "voice",
        language: "en",
      },
    });

    expect(rendered.html).toContain("assessment on 14 October 2026");
    expect(rendered.text).toContain("Submitted: 14 Oct 2026, 1:30\u00a0am (Kuwait\u00a0time)");
  });

  it("puts the overall result in the subject and body", () => {
    const rendered = renderSurveyTeamNotifyEmail({
      completedAt: new Date("2026-06-30T10:00:00.000Z"),
      csatScore: 5,
      cesScore: 6,
      npsScore: 9,
      answers: sampleAnswers,
      overallResult: "Positive",
      company: "Al Mazaya Holding Company",
      contactName: "Ahmed Harfoush",
      context: {
        name: "Sara Al-Sabah",
        company: "Example Co",
        designation: "CFO",
        inviteEmail: "client@example.com",
        department: "ASSURANCE",
        partner: "Sriram Gopalakrishnan",
        teamLeader: "Omar Al-Rashid",
        projectId: "PRJ-2401",
        channel: "voice",
        language: "en",
      },
    });

    expect(rendered.subject).toBe(
      "Al Mazaya Holding Company — Ahmed Harfoush — Result: Positive"
    );
    expect(rendered.html).toContain("Overall result:</strong> Positive");
    expect(rendered.text).toContain("Overall result: Positive");
  });

  it("uses the combined score out of 22 for the overall result, ignoring a conflicting AI label", () => {
    // 17/22 = 77% → Neutral (was Negative under the old worst-band rule).
    expect(
      overallSurveyResult({ csatScore: 5, cesScore: 6, npsScore: 6 })
    ).toBe("Neutral");
    expect(overallSurveyResult({ csatScore: 5, cesScore: 6, npsScore: 9 })).toBe(
      "Positive"
    );
    // 18/22 = 82% → Positive.
    expect(overallSurveyResult({ csatScore: 3, cesScore: 6, npsScore: 9 })).toBe(
      "Positive"
    );
    expect(overallSurveyResult({ csatScore: 4, cesScore: 4, npsScore: 8 })).toBe(
      "Neutral"
    );
    // 9/22 = 41% → Negative.
    expect(overallSurveyResult({ csatScore: 2, cesScore: 3, npsScore: 4 })).toBe(
      "Negative"
    );
    expect(overallSurveyResult({ csatScore: null, cesScore: null, npsScore: null })).toBe(
      null
    );
    expect(
      buildCompletionEmailSubject({
        company: "Al Mazaya Holding Company",
        contactName: "Ahmed Harfoush",
        result: overallSurveyResult({ csatScore: 2, cesScore: 3, npsScore: 4 }),
        fallback: SURVEY_TEAM_NOTIFY_SUBJECT,
      })
    ).toBe("Al Mazaya Holding Company — Ahmed Harfoush — Result: Negative");
  });

  it("marks the internal notification when scores need attention", () => {
    const rendered = renderSurveyTeamNotifyEmail({
      completedAt: new Date("2026-06-30T10:00:00.000Z"),
      csatScore: 2,
      cesScore: 3,
      npsScore: 4,
      answers: sampleAnswers,
      context: {
        name: "Sara Al-Sabah",
        company: "Example Co",
        designation: "CFO",
        inviteEmail: "client@example.com",
        department: "ASSURANCE",
        partner: "Sriram Gopalakrishnan",
        teamLeader: "Omar Al-Rashid",
        projectId: "PRJ-2401",
        channel: "voice",
        language: "en",
      },
    });

    expect(rendered.subject).toBe(SURVEY_TEAM_NOTIFY_ATTENTION_SUBJECT);
    expect(rendered.html).toContain("Needs attention — low score on CSAT, CES, NPS.");
    expect(rendered.text).toContain("Needs attention — low score on CSAT, CES, NPS.");
  });

  it("renders a separate action-required email for low scores", () => {
    const rendered = renderSurveyTeamActionRequiredEmail({
      completedAt: new Date("2026-06-30T10:00:00.000Z"),
      csatScore: 2,
      cesScore: 3,
      npsScore: 4,
      answers: sampleAnswers,
      context: {
        name: "Sara Al-Sabah",
        company: "Example Co",
        designation: "CFO",
        inviteEmail: "client@example.com",
        department: "ASSURANCE",
        partner: "Sriram Gopalakrishnan",
        teamLeader: "Omar Al-Rashid",
        projectId: "PRJ-2401",
        channel: "voice",
        language: "en",
      },
    });

    expect(rendered.subject).toBe("Action required — Voice of Clients Survey Response");
    expect(rendered.html).toContain("Action required");
    expect(rendered.html).toContain("ik.imagekit.io/urudrjyfz9/Frame%2011712760s08.png");
    expect(rendered.html).toContain("ik.imagekit.io/urudrjyfz9/footer.png");
    expect(rendered.text).toContain("ACTION REQUIRED");
  });

  it("parses team recipients from SURVEY_COMPLETION_NOTIFY_TO", () => {
    process.env.SURVEY_COMPLETION_NOTIFY_TO =
      "cx-team@example.com, ops@example.com";
    expect(getTeamNotifyRecipients()).toEqual([
      "cx-team@example.com",
      "ops@example.com",
    ]);
  });

  it("sends client thank-you and team notification for a complete response", async () => {
    mocks.responseFindUnique
      .mockResolvedValueOnce({
        csatScore: 5,
        cesScore: 6,
        npsScore: 9,
      })
      .mockResolvedValueOnce({
        csatScore: 5,
        cesScore: 6,
        npsScore: 9,
        answers: sampleAnswers,
        completedAt: completeResponse.completedAt,
        createdAt: completeResponse.createdAt,
      })
      .mockResolvedValueOnce(completeResponse);

    mocks.surveyInviteFindFirst.mockResolvedValue({
      id: "invite-1",
      email: "client@example.com",
      firstName: "Sara",
      lastName: "Al-Sabah",
      company: "Example Co",
      customerName: "Sara Al-Sabah",
    });

    const result = await sendSurveyCompletionNotifications("response-1");

    expect(result.client).toEqual({ sent: true });
    expect(result.team).toEqual({
      sent: true,
      recipients: ["cx-team@example.com"],
      cc: [],
    });
    expect(mocks.sendSurveyInviteEmail).toHaveBeenCalledTimes(1);
    expect(mocks.sendSurveyInviteEmailToRecipients).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["cx-team@example.com"],
        subject: "Example Co — Sara Al-Sabah — Result: Positive",
      })
    );
    expect(mocks.surveyInviteUpdate).toHaveBeenCalledWith({
      where: { id: "invite-1" },
      data: { thankYouSentAt: expect.any(Date) },
    });
    expect(mocks.testimonialCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          responseId: "response-1",
          surveyInviteId: "invite-1",
          kind: "draft_approval",
          source: "survey_thankyou",
        }),
      })
    );
    expect(mocks.sendSurveyInviteEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining("/testimonial/test-token"),
        text: expect.stringContaining("Review your testimonial"),
      })
    );
    expect(mocks.testimonialUpdateMany).toHaveBeenCalledWith({
      where: { id: "testimonial-1", status: "requested", requestedAt: null },
      data: { requestedAt: expect.any(Date) },
    });
    expect(mocks.responseUpdate).toHaveBeenCalledWith({
      where: { id: "response-1" },
      data: { teamNotifySentAt: expect.any(Date) },
    });
  });

  it("leaves the thank-you unchanged when the result is not Positive", async () => {
    // 17/22 = 77% → Neutral under the combined-score rule.
    mocks.responseFindUnique
      .mockResolvedValueOnce({
        csatScore: 5,
        cesScore: 4,
        npsScore: 8,
      })
      .mockResolvedValueOnce({
        csatScore: 5,
        cesScore: 4,
        npsScore: 8,
        answers: sampleAnswers,
        completedAt: completeResponse.completedAt,
        createdAt: completeResponse.createdAt,
      })
      .mockResolvedValueOnce({ ...completeResponse, cesScore: 4 });

    mocks.surveyInviteFindFirst.mockResolvedValue({
      id: "invite-1",
      email: "client@example.com",
      firstName: "Sara",
      lastName: "Al-Sabah",
      company: "Example Co",
      customerName: "Sara Al-Sabah",
    });

    const result = await sendSurveyCompletionNotifications("response-neutral");

    expect(result.client).toEqual({ sent: true });
    expect(mocks.testimonialCreate).not.toHaveBeenCalled();
    expect(mocks.sendSurveyInviteEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.not.stringContaining("Review your testimonial"),
        text: expect.not.stringContaining("Share a testimonial"),
      })
    );
  });

  it("asks for an original testimonial when a Positive survey has no comment", async () => {
    const quietAnswers = sampleAnswers.map((answer) => ({ ...answer, reason_text: "" }));
    mocks.responseFindUnique
      .mockResolvedValueOnce({ csatScore: 4, cesScore: 5, npsScore: 9 })
      .mockResolvedValueOnce({
        csatScore: 4,
        cesScore: 5,
        npsScore: 9,
        answers: quietAnswers,
        completedAt: completeResponse.completedAt,
        createdAt: completeResponse.createdAt,
      })
      .mockResolvedValueOnce({
        ...completeResponse,
        csatScore: 4,
        cesScore: 5,
        npsScore: 9,
        answers: quietAnswers,
      });
    mocks.surveyInviteFindFirst.mockResolvedValue({
      id: "invite-1",
      email: "client@example.com",
      customerName: "Sara Al-Sabah",
    });

    await sendSurveyCompletionNotifications("response-quiet");

    expect(mocks.testimonialCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ kind: "original_request", sourceComments: "" }),
      })
    );
    expect(mocks.sendSurveyInviteEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining("Share a testimonial"),
      })
    );
  });

  it("sends a second action-required email when scores need attention", async () => {
    const lowScoreResponse = {
      ...completeResponse,
      csatScore: 2,
      cesScore: 3,
      npsScore: 4,
      insight: { overallSentiment: "negative" },
    };

    mocks.responseFindUnique
      .mockResolvedValueOnce({
        csatScore: 2,
        cesScore: 3,
        npsScore: 4,
      })
      .mockResolvedValueOnce(lowScoreResponse);

    mocks.surveyInviteFindFirst.mockResolvedValue(null);

    const result = await sendSurveyCompletionNotifications("response-low");

    expect(result.team).toEqual({
      sent: true,
      recipients: ["cx-team@example.com"],
      cc: [],
    });
    expect(mocks.sendSurveyInviteEmailToRecipients).toHaveBeenCalledTimes(2);
    expect(mocks.sendSurveyInviteEmailToRecipients).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        subject: "Example Co — Sara Al-Sabah — Result: Negative",
      })
    );
    expect(mocks.sendSurveyInviteEmailToRecipients).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        subject: "Action required — Example Co — Sara Al-Sabah — Result: Negative",
      })
    );
  });

  it("CCs the partner, business manager, and job manager, not the team leader", async () => {
    const lowScoreResponse = {
      ...completeResponse,
      csatScore: 2,
      cesScore: 3,
      npsScore: 4,
      surveyInvite: {
        ...completeResponse.surveyInvite,
        partnerEmail: "partner@example.com",
        businessManagerName: "Sara Al-Mutairi",
        businessManagerEmail: null,
        jobManagerName: "Omar Al-Rashid",
        jobManagerEmail: "job@example.com",
      },
    };
    mocks.staffContactFindUnique.mockImplementation(async (args: {
      where: { role_nameKey: { nameKey: string } };
    }) => {
      if (args.where.role_nameKey.nameKey === "sara al-mutairi") {
        return { email: "business@example.com" };
      }
      return null;
    });

    mocks.responseFindUnique
      .mockResolvedValueOnce({ csatScore: 2, cesScore: 3, npsScore: 4 })
      .mockResolvedValueOnce(lowScoreResponse);
    mocks.surveyInviteFindFirst.mockResolvedValue(null);

    const result = await sendSurveyCompletionNotifications("response-low");

    expect(result.team).toEqual({
      sent: true,
      recipients: ["cx-team@example.com"],
      cc: ["partner@example.com", "business@example.com", "job@example.com"],
    });
    expect(mocks.sendSurveyInviteEmailToRecipients).toHaveBeenCalledTimes(2);
  });

  it("skips team notification when already sent", async () => {
    mocks.responseFindUnique
      .mockResolvedValueOnce({
        csatScore: 5,
        cesScore: 6,
        npsScore: 9,
      })
      .mockResolvedValueOnce({
        ...completeResponse,
        teamNotifySentAt: new Date("2026-06-30T11:00:00.000Z"),
      });

    mocks.surveyInviteFindFirst.mockResolvedValue(null);

    const result = await sendSurveyCompletionNotifications("response-1");

    expect(result.client).toEqual({ sent: false, reason: "no_pending_invite" });
    expect(result.team).toEqual({ sent: false, reason: "already_sent" });
    expect(mocks.sendSurveyInviteEmail).not.toHaveBeenCalled();
  });

  it("skips notifications when SMTP is not configured", async () => {
    mocks.isSmtpConfigured.mockReturnValue(false);
    mocks.responseFindUnique.mockResolvedValue({
      csatScore: 5,
      cesScore: 6,
      npsScore: 9,
    });

    const result = await sendSurveyCompletionNotifications("response-1");

    expect(result.client).toEqual({ sent: false, reason: "smtp_not_configured" });
    expect(result.team).toEqual({ sent: false, reason: "smtp_not_configured" });
    expect(mocks.sendSurveyInviteEmail).not.toHaveBeenCalled();
  });

  it("skips team notification when no recipients are configured", async () => {
    delete process.env.SURVEY_COMPLETION_NOTIFY_TO;

    mocks.responseFindUnique
      .mockResolvedValueOnce({
        csatScore: 5,
        cesScore: 6,
        npsScore: 9,
      });

    mocks.surveyInviteFindFirst.mockResolvedValue(null);

    const result = await sendSurveyCompletionNotifications("response-1");

    expect(result.team).toEqual({ sent: false, reason: "no_recipients" });
    expect(mocks.sendSurveyInviteEmail).not.toHaveBeenCalled();
  });
});
