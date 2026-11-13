import { z } from "zod";
import { PERMISSIONS } from "@/lib/rbac/permissions";

export const automationActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("create_task"),
    title: z.string().trim().min(3).max(200),
    dueInHours: z.number().int().min(1).max(24 * 60).optional(),
  }),
  z.object({
    type: z.literal("notify"),
    permission: z.enum(PERMISSIONS),
    title: z.string().trim().min(3).max(200),
    body: z.string().trim().max(1000).optional(),
  }),
  z.object({
    // Messages are never sent directly by a rule: they queue for human approval.
    type: z.literal("request_message"),
    templateKey: z.string().regex(/^[a-z0-9][a-z0-9_.-]{1,79}$/),
    channel: z.enum(["email"]).default("email"),
  }),
]);

export const automationActionsSchema = z.array(automationActionSchema).min(1).max(10);

export type AutomationAction = z.infer<typeof automationActionSchema>;
