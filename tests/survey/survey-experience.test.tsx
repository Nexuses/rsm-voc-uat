import type { ReactNode } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { SURVEY_QUESTIONS } from "@/lib/survey/constants";

const conversation = vi.hoisted(() => ({
  status: "disconnected" as
    | "disconnected"
    | "connecting"
    | "connected"
    | "error",
  mode: "listening" as "listening" | "speaking",
  isSpeaking: false,
  isListening: true,
  isMuted: false,
  message: undefined as string | undefined,
  startSession: vi.fn(),
  endSession: vi.fn(),
  setMuted: vi.fn(),
  setVolume: vi.fn(),
  sendUserActivity: vi.fn(),
  getId: vi.fn(() => "conv_123"),
  options: undefined as
    | {
        onConnect?: () => void;
        onError?: () => void;
        onMessage?: (message: {
          role: "agent" | "user";
          message: string;
        }) => void;
      }
    | undefined,
}));

vi.mock("@elevenlabs/react", () => ({
  ConversationProvider: ({ children }: { children: ReactNode }) =>
    children,
  useConversation: (options: typeof conversation.options) => {
    conversation.options = options;
    return {
      status: conversation.status,
      mode: conversation.mode,
      isSpeaking: conversation.isSpeaking,
      isListening: conversation.isListening,
      isMuted: conversation.isMuted,
      message: conversation.message,
      startSession: conversation.startSession,
      endSession: conversation.endSession,
      setMuted: conversation.setMuted,
      setVolume: conversation.setVolume,
      sendUserActivity: conversation.sendUserActivity,
      getId: conversation.getId,
    };
  },
}));

import SurveyExperience from "@/components/survey/SurveyExperience";
import { buildVoiceInviteOpening } from "@/lib/survey/voice-first-message";

const emptyInviteContext = {
  fullName: "",
  company: "",
  designation: "",
};

const emptyVoiceDynamicVariables = {
  has_invite_context: "false",
  invite_full_name: "",
  invite_company: "",
  invite_designation: "",
  invite_opening: buildVoiceInviteOpening("en", emptyInviteContext),
};

function mockMicrophone(result: "allow" | "deny" = "allow") {
  const stop = vi.fn();
  const getUserMedia =
    result === "allow"
      ? vi.fn().mockResolvedValue({
          getTracks: () => [{ stop }],
        })
      : vi.fn().mockRejectedValue(new DOMException("Denied", "NotAllowedError"));

  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia },
  });
  return { getUserMedia, stop };
}

describe("public survey experience", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    conversation.status = "disconnected";
    conversation.mode = "listening";
    conversation.isSpeaking = false;
    conversation.isListening = true;
    conversation.isMuted = false;
    conversation.message = undefined;
    conversation.startSession.mockReset();
    conversation.startSession.mockResolvedValue("conv_123");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      )
    );
    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(
      "c397db2e-8c0b-48fd-a963-cf477c65486b"
    );
  });

  it("offers voice and typed survey modes", () => {
    render(<SurveyExperience />);

    expect(screen.getByText(/about three minutes/i)).toBeVisible();
    expect(screen.getByText(/five short steps/i)).toBeVisible();
    expect(
      screen.getByRole("button", { name: /take voice survey/i })
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: /take typed survey/i })
    ).toBeVisible();
  });

  it("shows the Arabic intro at the top when Arabic is selected", async () => {
    const user = userEvent.setup();
    render(<SurveyExperience />);

    await user.click(screen.getByRole("button", { name: /^العربية$/i }));

    expect(
      screen.getByText(/شكراً لتخصيصكم بضع دقائق لنا/i)
    ).toBeVisible();
    expect(
      screen.queryByText(
        /this short, confidential survey asks about the quality of our service/i
      )
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /الاستبيان الصوتي/i })
    ).toBeVisible();
  });

  it("shows the language switcher at the top of the page", () => {
    render(<SurveyExperience />);

    expect(screen.getByRole("navigation", { name: /language/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /^english$/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /^العربية$/i })).toBeVisible();
  });

  it("keeps the live waveform hidden until the voice session is active", () => {
    render(<SurveyExperience initialMode="voice" initialVoiceLanguage="en" />);

    expect(
      screen.queryByRole("img", { name: /live voice waveform/i })
    ).not.toBeInTheDocument();
  });

  it("shows the identity step and blocks incomplete progress", async () => {
    const user = userEvent.setup();
    render(<SurveyExperience />);

    await user.click(
      screen.getByRole("button", { name: /take typed survey/i })
    );
    expect(screen.getByLabelText(/full name/i)).toBeVisible();
    expect(screen.getByLabelText(/email address/i)).toBeVisible();
    expect(screen.getByLabelText(/business or company name/i)).toBeVisible();
    expect(screen.getByLabelText(/designation/i)).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: /continue/i })
    );

    expect(await screen.findAllByText(/is required/i)).toHaveLength(4);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("submits one UUID-backed typed response and shows thanks", async () => {
    const user = userEvent.setup();
    render(<SurveyExperience />);
    await user.click(
      screen.getByRole("button", { name: /take typed survey/i })
    );

    await user.type(screen.getByLabelText(/full name/i), "Noor Al-Sabah");
    await user.type(screen.getByLabelText(/email address/i), "noor@example.com");
    await user.type(
      screen.getByLabelText(/business or company name/i),
      "Example Co"
    );
    await user.type(
      screen.getByLabelText(/designation/i),
      "Finance Director"
    );
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(screen.getByText(SURVEY_QUESTIONS[0].question)).toBeVisible();
    await user.click(screen.getByLabelText(/— 5 \/ 5$/));
    await user.type(
      screen.getByLabelText(/comment about csat/i),
      "Responsive team"
    );
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(screen.getByText(SURVEY_QUESTIONS[1].question)).toBeVisible();
    await user.click(screen.getByLabelText(/— 6 \/ 7$/));
    await user.type(
      screen.getByLabelText(/comment about ces/i),
      "Straightforward process"
    );
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(screen.getByText(SURVEY_QUESTIONS[2].question)).toBeVisible();
    await user.click(screen.getByLabelText(/— 9 \/ 10$/));
    await user.type(
      screen.getByLabelText(/comment about nps/i),
      "Would recommend"
    );
    await user.click(screen.getByRole("button", { name: /review/i }));
    await user.click(
      screen.getByRole("button", { name: /submit feedback/i })
    );

    expect(fetch).toHaveBeenCalledWith(
      "/api/survey/typed",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          submissionId: "c397db2e-8c0b-48fd-a963-cf477c65486b",
          fullName: "Noor Al-Sabah",
          email: "noor@example.com",
          company: "Example Co",
          designation: "Finance Director",
          csatRating: 5,
          csatComment: "Responsive team",
          cesRating: 6,
          cesComment: "Straightforward process",
          npsRating: 9,
          npsComment: "Would recommend",
          website: "",
          language: "en",
        }),
      })
    );
    expect(
      await screen.findByText(/we appreciate you taking the time/i)
    ).toBeVisible();
  });

  it("requests microphone permission before requesting a signed URL", async () => {
    const order: string[] = [];
    const { getUserMedia } = mockMicrophone();
    getUserMedia.mockImplementation(async () => {
      order.push("microphone");
      return { getTracks: () => [{ stop: vi.fn() }] };
    });
    vi.mocked(fetch).mockImplementation(async () => {
      order.push("signed-url");
      return new Response(
        JSON.stringify({ signedUrl: "wss://example.test/session" }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        }
      );
    });
    const user = userEvent.setup();
    render(<SurveyExperience />);
    await user.click(
      screen.getByRole("button", { name: /take voice survey/i })
    );
    await user.click(
      screen.getByRole("button", { name: /continue in english/i })
    );
    await user.click(
      screen.getByRole("button", { name: /start voice survey/i })
    );

    expect(order).toEqual(["microphone", "signed-url"]);
    expect(conversation.startSession).toHaveBeenCalledWith({
      signedUrl: "wss://example.test/session",
      dynamicVariables: emptyVoiceDynamicVariables,
      overrides: {
        agent: {
          language: "en",
        },
      },
    });
  });

  it("shows voice host picker after choosing voice survey", async () => {
    const user = userEvent.setup();
    render(<SurveyExperience />);
    await user.click(
      screen.getByRole("button", { name: /take voice survey/i })
    );

    expect(
      screen.getByRole("heading", { name: /which language would you prefer/i })
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: /continue in english/i })
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: /continue in arabic/i })
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /start voice survey/i })
    ).not.toBeInTheDocument();
  });

  it("shows Arabic voice picker before the voice session", async () => {
    const user = userEvent.setup();
    render(<SurveyExperience />);
    await user.click(screen.getByRole("button", { name: /^العربية$/i }));
    await user.click(
      screen.getByRole("button", { name: /الاستبيان الصوتي/i })
    );

    expect(
      screen.getByRole("heading", { name: /بأي لغة تفضّلون المشاركة؟/i })
    ).toBeVisible();
    expect(
      screen.getByRole("button", {
        name: /المتابعة بالإنجليزية/i,
      })
    ).toBeVisible();
    expect(
      screen.getByRole("button", {
        name: /المتابعة بالعربية/i,
      })
    ).toBeVisible();
  });

  it("starts an Arabic agent session with the allowlisted Arabic TTS voice", async () => {
    mockMicrophone();
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({ signedUrl: "wss://example.test/session" }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        }
      )
    );
    const user = userEvent.setup();
    render(<SurveyExperience />);
    await user.click(
      screen.getByRole("button", { name: /take voice survey/i })
    );
    await user.click(
      screen.getByRole("button", { name: /continue in arabic/i })
    );
    await user.click(
      screen.getByRole("button", { name: /بدء الاستبيان الصوتي/i })
    );

    expect(fetch).toHaveBeenCalledWith(
      "/api/survey/voice-session",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ language: "ar" }),
      })
    );
    expect(conversation.startSession).toHaveBeenCalledWith({
      signedUrl: "wss://example.test/session",
      dynamicVariables: {
        ...emptyVoiceDynamicVariables,
        has_invite_context: "false",
        invite_opening: buildVoiceInviteOpening("ar", emptyInviteContext),
      },
      overrides: {
        agent: {
          language: "ar",
        },
        tts: {
          voiceId: "v7UCHHCrHj1KBa4E41gb",
        },
      },
    });
  });

  it("returns to mode chooser from the voice host picker", async () => {
    const user = userEvent.setup();
    render(<SurveyExperience />);
    await user.click(
      screen.getByRole("button", { name: /take voice survey/i })
    );
    await user.click(screen.getByRole("button", { name: /^back$/i }));

    expect(
      screen.getByRole("button", { name: /take voice survey/i })
    ).toBeVisible();
    expect(
      screen.queryByRole("button", {
        name: /continue in arabic/i,
      })
    ).not.toBeInTheDocument();
  });

  it("starts English voice survey after choosing English host", async () => {
    mockMicrophone();
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({ signedUrl: "wss://example.test/session" }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        }
      )
    );
    const user = userEvent.setup();
    render(<SurveyExperience />);
    await user.click(
      screen.getByRole("button", { name: /take voice survey/i })
    );
    await user.click(
      screen.getByRole("button", { name: /continue in english/i })
    );
    await user.click(
      screen.getByRole("button", { name: /start voice survey/i })
    );

    expect(fetch).toHaveBeenCalledWith(
      "/api/survey/voice-session",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ language: "en" }),
      })
    );
    expect(conversation.startSession).toHaveBeenCalledWith({
      signedUrl: "wss://example.test/session",
      dynamicVariables: emptyVoiceDynamicVariables,
      overrides: {
        agent: {
          language: "en",
        },
      },
    });
  });

  it("prefills editable typed identity fields from invite context", async () => {
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/api/survey/invite-context")) {
        return new Response(
          JSON.stringify({
            inviteContext: {
              fullName: "Sara Al-Sabah",
              email: "sara@example.com",
              company: "Acme",
              designation: "CFO",
            },
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          }
        );
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });

    const user = userEvent.setup();
    render(<SurveyExperience inviteToken="invite-token-12345678" />);
    await user.click(
      screen.getByRole("button", { name: /take typed survey/i })
    );

    expect(await screen.findByDisplayValue("Sara Al-Sabah")).toBeVisible();
    expect(screen.getByDisplayValue("sara@example.com")).toBeVisible();
    expect(screen.getByDisplayValue("Acme")).toBeVisible();
    expect(screen.getByDisplayValue("CFO")).toBeVisible();

    await user.clear(screen.getByDisplayValue("Sara Al-Sabah"));
    await user.type(
      screen.getByLabelText(/full name/i),
      "Sara Updated"
    );
    expect(screen.getByDisplayValue("Sara Updated")).toBeVisible();
  });

  it("passes invite context to the voice agent as dynamic variables", async () => {
    mockMicrophone();
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/api/survey/invite-context")) {
        return new Response(
          JSON.stringify({
            inviteContext: {
              fullName: "Sara Al-Sabah",
              email: "sara@example.com",
              company: "Acme",
              designation: "CFO",
            },
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          }
        );
      }
      if (url.includes("/api/survey/voice-session")) {
        return new Response(
          JSON.stringify({
            signedUrl: "wss://example.test/session",
            inviteContext: {
              fullName: "Sara Al-Sabah",
              company: "Acme",
              designation: "CFO",
            },
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          }
        );
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });

    const user = userEvent.setup();
    render(<SurveyExperience inviteToken="invite-token-12345678" />);
    await user.click(
      screen.getByRole("button", { name: /take voice survey/i })
    );
    await user.click(
      screen.getByRole("button", { name: /continue in english/i })
    );
    await user.click(
      screen.getByRole("button", { name: /start voice survey/i })
    );

    const inviteContext = {
      fullName: "Sara Al-Sabah",
      company: "Acme",
      designation: "CFO",
    };
    expect(fetch).toHaveBeenCalledWith(
      "/api/survey/invite-context",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ inviteToken: "invite-token-12345678" }),
      })
    );
    expect(conversation.startSession).toHaveBeenCalledWith({
      signedUrl: "wss://example.test/session",
      dynamicVariables: {
        has_invite_context: "true",
        invite_full_name: "Sara Al-Sabah",
        invite_company: "Acme",
        invite_designation: "CFO",
        invite_opening: buildVoiceInviteOpening("en", inviteContext),
      },
      overrides: {
        agent: {
          language: "en",
        },
      },
    });
  });

  it("offers retry and typed fallback after microphone denial", async () => {
    mockMicrophone("deny");
    const user = userEvent.setup();
    render(<SurveyExperience />);
    await user.click(
      screen.getByRole("button", { name: /take voice survey/i })
    );
    await user.click(
      screen.getByRole("button", { name: /continue in english/i })
    );
    await user.click(
      screen.getByRole("button", { name: /start voice survey/i })
    );

    expect(
      await screen.findByText(/needs access to your microphone/i)
    ).toBeVisible();
    expect(screen.getByRole("button", { name: /try again/i })).toBeVisible();
    expect(
      screen.getByRole("button", { name: /use the typed survey instead/i })
    ).toBeVisible();
  });

  it("maps SDK state to visible status and working controls", async () => {
    conversation.status = "connected";
    conversation.mode = "speaking";
    conversation.isSpeaking = true;
    conversation.isListening = false;
    const user = userEvent.setup();
    render(<SurveyExperience initialMode="voice" initialVoiceLanguage="en" />);

    expect(screen.getByText("Speaking")).toBeVisible();
    expect(
      screen.getByRole("img", { name: /live voice orb/i })
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Hold" }));
    expect(conversation.setMuted).toHaveBeenCalledWith(true);
    expect(conversation.setVolume).toHaveBeenCalledWith({ volume: 0 });
    expect(screen.getByText("On hold")).toBeVisible();
    expect(screen.getByRole("button", { name: "Resume" })).toBeVisible();

    fireEvent.click(
      screen.getByRole("button", { name: /end survey/i })
    );
    expect(conversation.endSession).toHaveBeenCalledOnce();
    expect(
      await screen.findByText(/we appreciate you taking the time/i)
    ).toBeVisible();
  });

  it("hides ElevenLabs audio tags from the live agent transcript", () => {
    conversation.status = "connected";
    render(<SurveyExperience initialMode="voice" initialVoiceLanguage="en" />);

    act(() => {
      conversation.options?.onMessage?.({
        role: "agent",
        message: "[happy] Thank you for your feedback today.",
      });
    });

    expect(
      screen.getByText("Thank you for your feedback today.")
    ).toBeVisible();
    expect(screen.queryByText(/\[happy\]/i)).not.toBeInTheDocument();
  });

  it("clears stale startup errors once the voice session connects", async () => {
    mockMicrophone();
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({ signedUrl: "wss://example.test/session" }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        }
      )
    );
    conversation.startSession.mockImplementation(async () => {
      conversation.status = "connected";
      conversation.options?.onConnect?.();
      throw new Error("session start failed");
    });
    const user = userEvent.setup();
    render(<SurveyExperience initialMode="voice" initialVoiceLanguage="en" />);

    await user.click(
      screen.getByRole("button", { name: /start voice survey/i })
    );

    expect(screen.queryByText(/unable to connect/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/unable to start the voice survey/i)
    ).not.toBeInTheDocument();
    expect(screen.getByText("Listening")).toBeVisible();
    expect(screen.getByRole("button", { name: /end survey/i })).toBeVisible();
  });

  it("keeps the connecting state when ElevenLabs emits a transient startup error", async () => {
    mockMicrophone();
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({ signedUrl: "wss://example.test/session" }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        }
      )
    );
    conversation.startSession.mockImplementation(async () => {
      conversation.status = "connecting";
      conversation.options?.onError?.();
      conversation.status = "connected";
      conversation.options?.onConnect?.();
    });
    const user = userEvent.setup();
    render(<SurveyExperience initialMode="voice" initialVoiceLanguage="en" />);

    await user.click(
      screen.getByRole("button", { name: /start voice survey/i })
    );

    expect(screen.queryByText(/unable to connect/i)).not.toBeInTheDocument();
    expect(screen.getByText("Listening")).toBeVisible();
  });

  it("ends an active voice session before switching to typed mode", async () => {
    conversation.status = "connected";
    const user = userEvent.setup();
    render(<SurveyExperience initialMode="voice" initialVoiceLanguage="en" />);

    await user.click(
      screen.getByRole("button", { name: /use the typed survey instead/i })
    );

    expect(conversation.endSession).toHaveBeenCalledOnce();
    expect(screen.getByLabelText(/full name/i)).toBeVisible();
  });

  it("ends the voice session on unmount while connected", () => {
    conversation.status = "connected";
    render(<SurveyExperience initialMode="voice" initialVoiceLanguage="en" />);
    act(() => {
      conversation.options?.onConnect?.();
    });

    cleanup();

    expect(conversation.endSession).toHaveBeenCalledOnce();
  });
});
