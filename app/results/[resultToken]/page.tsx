import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { writeAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { isResultLinkActive } from "@/lib/result-link";
import { SURVEY_QUESTIONS } from "@/lib/survey/constants";
import styles from "./results.module.css";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

type AnswerRow = {
  question_number?: number;
  reason_text?: string | null;
};

export default async function SurveyResultPage({
  params,
}: {
  params: Promise<{ resultToken: string }>;
}) {
  const { resultToken } = await params;
  if (!resultToken?.trim()) notFound();

  const invite = await db.surveyInvite.findUnique({
    where: { resultToken },
    include: {
      response: {
        select: {
          csatScore: true,
          cesScore: true,
          npsScore: true,
          answers: true,
          completedAt: true,
          language: true,
        },
      },
    },
  });

  if (!invite || !isResultLinkActive(invite)) notFound();

  await writeAuditLog({
    actorType: "system",
    action: "survey_invite.result_viewed",
    resourceType: "SurveyInvite",
    resourceId: invite.id,
    source: "ui",
  });

  const answers = Array.isArray(invite.response?.answers)
    ? (invite.response.answers as AnswerRow[])
    : [];

  const comment = (n: number) => {
    const row = answers.find((item) => item.question_number === n);
    return row?.reason_text?.trim() || null;
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>RSM in Kuwait · Voice of Clients</p>
        <h1>Survey result</h1>
        <p className={styles.meta}>
          {invite.triggerStage ? (
            <span>Stage: {invite.triggerStage === "mid" ? "Mid (50%)" : "Post (100%)"}</span>
          ) : null}
          {invite.externalEngagementId ? (
            <span>Engagement: {invite.externalEngagementId}</span>
          ) : null}
          {invite.projectId ? <span>Project: {invite.projectId}</span> : null}
        </p>
      </header>

      {!invite.response || !invite.completedAt ? (
        <section className={styles.card}>
          <h2>Awaiting response</h2>
          <p>
            This survey has been sent to the recipient. Scores and comments will
            appear here when the survey is completed.
          </p>
        </section>
      ) : (
        <section className={styles.scores}>
          <article className={styles.card}>
            <h2>CSAT</h2>
            <p className={styles.score}>
              {invite.response.csatScore ?? "—"}
              <small>/ 5</small>
            </p>
            <p className={styles.question}>{SURVEY_QUESTIONS[0]?.question}</p>
            {comment(1) ? <p className={styles.comment}>{comment(1)}</p> : null}
          </article>
          <article className={styles.card}>
            <h2>CES</h2>
            <p className={styles.score}>
              {invite.response.cesScore ?? "—"}
              <small>/ 7</small>
            </p>
            <p className={styles.question}>{SURVEY_QUESTIONS[1]?.question}</p>
            {comment(2) ? <p className={styles.comment}>{comment(2)}</p> : null}
          </article>
          <article className={styles.card}>
            <h2>NPS</h2>
            <p className={styles.score}>
              {invite.response.npsScore ?? "—"}
              <small>/ 10</small>
            </p>
            <p className={styles.question}>{SURVEY_QUESTIONS[2]?.question}</p>
            {comment(3) ? <p className={styles.comment}>{comment(3)}</p> : null}
          </article>
        </section>
      )}

      <p className={styles.footer}>
        Private result link — not part of the public metrics API. Do not share
        outside authorized RSM CRM / CX channels.
      </p>
    </main>
  );
}
