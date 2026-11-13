import { randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import {
  EVENT_CATALOG,
  type DomainEventPayload,
  type DomainEventType,
} from "@/lib/events/catalog";
import { getFlagMode } from "@/lib/flags";

type Tx = Prisma.TransactionClient | PrismaClient;

export type EmitEventInput<T extends DomainEventType> = {
  type: T;
  idempotencyKey: string;
  aggregateId: string;
  payload: DomainEventPayload<T>;
  correlationId?: string;
};

export function jobKeyFor(jobType: string, domainEventId: string) {
  return `${jobType}:${domainEventId}`;
}

export const AUTOMATION_JOB_TYPE = "automation.evaluate";

async function writeEvent<T extends DomainEventType>(
  tx: Tx,
  input: EmitEventInput<T>,
  extraJobs: string[]
) {
  const definition = EVENT_CATALOG[input.type];
  const jobs = [...definition.jobs, ...extraJobs];
  const payload = definition.payload.parse(input.payload) as Prisma.InputJsonValue;
  const correlationId = input.correlationId ?? randomUUID();

  await tx.domainEvent.createMany({
    data: [
      {
        id: randomUUID(),
        type: input.type,
        idempotencyKey: input.idempotencyKey,
        aggregateType: definition.aggregateType,
        aggregateId: input.aggregateId,
        payload,
        correlationId,
        dispatchedAt: jobs.length ? new Date() : null,
      },
    ],
    skipDuplicates: true,
  });
  const event = await tx.domainEvent.findUniqueOrThrow({
    where: { idempotencyKey: input.idempotencyKey },
  });

  if (jobs.length) {
    await tx.job.createMany({
      data: jobs.map((jobType) => ({
        id: randomUUID(),
        type: jobType,
        jobKey: jobKeyFor(jobType, event.id),
        payload: { domainEventId: event.id },
        correlationId: event.correlationId,
      })),
      skipDuplicates: true,
    });
  }
  return event;
}

/**
 * Records an event and enqueues its jobs atomically. Re-emitting the same
 * idempotencyKey returns the original event and enqueues nothing new.
 * Pass `tx` to commit with the caller's own transaction.
 */
export async function emitEvent<T extends DomainEventType>(
  input: EmitEventInput<T>,
  tx?: Prisma.TransactionClient
) {
  if ((await getFlagMode("events.outbox")) === "off") return null;
  const extraJobs =
    (await getFlagMode("automation.rules")) === "off" ? [] : [AUTOMATION_JOB_TYPE];
  if (tx) return writeEvent(tx, input, extraJobs);
  return db.$transaction((client) => writeEvent(client, input, extraJobs));
}

/** For side paths (ingest) that must never fail because of the outbox. */
export async function emitEventSafely<T extends DomainEventType>(
  input: EmitEventInput<T>
) {
  try {
    return await emitEvent(input);
  } catch (error) {
    console.error("domain event emit failed", {
      type: input.type,
      idempotencyKey: input.idempotencyKey,
      error,
    });
    return null;
  }
}
