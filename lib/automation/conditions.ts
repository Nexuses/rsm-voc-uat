import { z } from "zod";

const scalar = z.union([z.string(), z.number(), z.boolean(), z.null()]);

export const leafConditionSchema = z.object({
  field: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_.]{0,79}$/),
  op: z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "in", "exists", "contains"]),
  value: z.union([scalar, z.array(scalar).max(50)]).optional(),
});

export type LeafCondition = z.infer<typeof leafConditionSchema>;
export type Condition =
  | LeafCondition
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition };

export const conditionSchema: z.ZodType<Condition> = z.lazy(() =>
  z.union([
    leafConditionSchema,
    z.object({ all: z.array(conditionSchema).min(1).max(20) }),
    z.object({ any: z.array(conditionSchema).min(1).max(20) }),
    z.object({ not: conditionSchema }),
  ])
);

export type Facts = Record<string, unknown>;

export function readFact(facts: Facts, path: string): unknown {
  let current: unknown = facts;
  for (const part of path.split(".")) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function compare(actual: unknown, expected: unknown, op: "gt" | "gte" | "lt" | "lte") {
  if (typeof actual !== "number" || typeof expected !== "number") return false;
  if (op === "gt") return actual > expected;
  if (op === "gte") return actual >= expected;
  if (op === "lt") return actual < expected;
  return actual <= expected;
}

function evaluateLeaf(condition: LeafCondition, facts: Facts): boolean {
  const actual = readFact(facts, condition.field);
  const expected = condition.value;
  switch (condition.op) {
    case "exists":
      return actual !== undefined && actual !== null;
    case "eq":
      return actual === expected;
    case "neq":
      return actual !== expected;
    case "in":
      return Array.isArray(expected) && expected.includes(actual as never);
    case "contains":
      if (Array.isArray(actual)) return actual.includes(expected);
      return typeof actual === "string" && typeof expected === "string"
        ? actual.toLowerCase().includes(expected.toLowerCase())
        : false;
    default:
      return compare(actual, expected, condition.op);
  }
}

/** Pure evaluator: missing facts never match (except under `not`). */
export function evaluateCondition(condition: Condition, facts: Facts): boolean {
  if ("all" in condition) return condition.all.every((c) => evaluateCondition(c, facts));
  if ("any" in condition) return condition.any.some((c) => evaluateCondition(c, facts));
  if ("not" in condition) return !evaluateCondition(condition.not, facts);
  return evaluateLeaf(condition, facts);
}
