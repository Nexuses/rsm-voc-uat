import { afterEach, describe, expect, it, vi } from "vitest";
import { sendSurveyInviteEmailToRecipients } from "@/lib/survey-invite-email";

describe("sendSurveyInviteEmailToRecipients", () => {
  const original = {
    from: process.env.FROM_EMAIL,
    apiKey: process.env.SENDGRID_API_KEY,
    retryDelay: process.env.MAIL_SEND_RETRY_DELAY_MS,
  };

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env.FROM_EMAIL = original.from;
    process.env.SENDGRID_API_KEY = original.apiKey;
    if (original.retryDelay === undefined) {
      delete process.env.MAIL_SEND_RETRY_DELAY_MS;
    } else {
      process.env.MAIL_SEND_RETRY_DELAY_MS = original.retryDelay;
    }
  });

  it("sends one SendGrid message to multiple validated recipients", async () => {
    process.env.FROM_EMAIL = "survey@example.com";
    process.env.SENDGRID_API_KEY = "sg-test-key";

    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);

    await sendSurveyInviteEmailToRecipients({
      to: ["one@example.com", "two@example.com"],
      subject: "Test subject",
      text: "Hello",
      html: "<p>Hello</p>",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0] as [
      string,
      { headers: Record<string, string>; body: string },
    ];
    expect(url).toBe("https://api.sendgrid.com/v3/mail/send");
    expect(options.headers.Authorization).toBe("Bearer sg-test-key");
    const body = JSON.parse(options.body);
    expect(body).toEqual({
      personalizations: [
        {
          to: [{ email: "one@example.com" }, { email: "two@example.com" }],
        },
      ],
      from: {
        email: "survey@example.com",
        name: "RSM in Kuwait",
      },
      subject: "Test subject",
      content: [
        { type: "text/plain", value: "Hello" },
        { type: "text/html", value: "<p>Hello</p>" },
      ],
      tracking_settings: {
        click_tracking: { enable: false, enable_text: false },
        open_tracking: { enable: false },
        subscription_tracking: { enable: false },
        ganalytics: { enable: false },
      },
      mail_settings: {
        sandbox_mode: { enable: false },
      },
    });
    expect(body.reply_to).toBeUndefined();
  });

  it("retries retryable SendGrid failures then succeeds", async () => {
    process.env.FROM_EMAIL = "survey@example.com";
    process.env.SENDGRID_API_KEY = "sg-test-key";
    process.env.MAIL_SEND_RETRY_DELAY_MS = "0";

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("unavailable", { status: 503 }))
      .mockResolvedValueOnce(new Response(null, { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);

    await sendSurveyInviteEmailToRecipients({
      to: ["one@example.com"],
      subject: "Test subject",
      text: "Hello",
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry client errors", async () => {
    process.env.FROM_EMAIL = "survey@example.com";
    process.env.SENDGRID_API_KEY = "sg-test-key";
    process.env.MAIL_SEND_RETRY_DELAY_MS = "0";

    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("bad", { status: 400 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      sendSurveyInviteEmailToRecipients({
        to: ["one@example.com"],
        subject: "Test subject",
        text: "Hello",
      })
    ).rejects.toThrow(/400/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("adds cc recipients, skipping blanks and addresses already in to", async () => {
    process.env.FROM_EMAIL = "survey@example.com";
    process.env.SENDGRID_API_KEY = "sg-test-key";

    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);

    await sendSurveyInviteEmailToRecipients({
      to: ["cx-team@example.com"],
      cc: ["partner@example.com", "CX-Team@example.com", " ", "partner@example.com"],
      subject: "Completion",
      text: "Hello",
    });

    const body = JSON.parse(
      (fetchMock.mock.calls[0] as [string, { body: string }])[1].body,
    );
    expect(body.personalizations).toEqual([
      {
        to: [{ email: "cx-team@example.com" }],
        cc: [{ email: "partner@example.com" }],
      },
    ]);
  });

  it("includes reply_to when replyTo is provided", async () => {
    process.env.FROM_EMAIL = "survey@example.com";
    process.env.SENDGRID_API_KEY = "sg-test-key";

    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);

    await sendSurveyInviteEmailToRecipients({
      to: ["client@example.com"],
      subject: "Invite",
      text: "Hello",
      replyTo: "cx-team@example.com",
    });

    const body = JSON.parse(
      (fetchMock.mock.calls[0] as [string, { body: string }])[1].body,
    );
    expect(body.reply_to).toEqual({
      email: "cx-team@example.com",
      name: "RSM in Kuwait",
    });
  });
});
