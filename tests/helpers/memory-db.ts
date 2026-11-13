type Row = Record<string, unknown> & { id: string };

function matches(row: Row, where: Record<string, unknown>): boolean {
  return Object.entries(where).every(([key, value]) => {
    if (value && typeof value === "object" && !(value instanceof Date) && !Array.isArray(value)) {
      const nested = row[key];
      if (nested && typeof nested === "object" && !(nested instanceof Date)) {
        // relation filter, e.g. { rule: { active: true } }
        return matches(nested as Row, value as Record<string, unknown>);
      }
      // compound unique input, e.g. { key_version: { key, version } }
      return matches(row, value as Record<string, unknown>);
    }
    return row[key] === value;
  });
}

/**
 * Minimal in-memory stand-in for the Prisma models the backbone uses.
 * Unique keys are enforced so skipDuplicates / race behavior is realistic.
 */
export function createMemoryTable(uniqueKeys: string[][] = []) {
  const rows: Row[] = [];

  function conflict(data: Row) {
    return rows.find((row) =>
      uniqueKeys.some((keys) => keys.every((key) => row[key] === data[key]))
    );
  }

  return {
    rows,
    async createMany({ data, skipDuplicates }: { data: Row[]; skipDuplicates?: boolean }) {
      let count = 0;
      for (const item of data) {
        if (conflict(item)) {
          if (skipDuplicates) continue;
          throw new Error("Unique constraint failed");
        }
        rows.push({ ...item });
        count += 1;
      }
      return { count };
    },
    async create({ data }: { data: Row }) {
      if (conflict(data)) throw new Error("Unique constraint failed");
      const row = { ...data };
      rows.push(row);
      return row;
    },
    async findUnique({ where }: { where: Record<string, unknown> }) {
      return rows.find((row) => matches(row, where)) ?? null;
    },
    async findFirst({ where = {} }: { where?: Record<string, unknown> } = {}) {
      return rows.find((row) => matches(row, where)) ?? null;
    },
    async findMany({ where = {} }: { where?: Record<string, unknown> } = {}) {
      return rows.filter((row) => matches(row, where));
    },
    async count({ where = {} }: { where?: Record<string, unknown> } = {}) {
      return rows.filter((row) => matches(row, where)).length;
    },
    async updateMany({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) {
      const hit = rows.filter((row) => matches(row, where));
      hit.forEach((row) => Object.assign(row, data));
      return { count: hit.length };
    },
    async findUniqueOrThrow({ where }: { where: Record<string, unknown> }) {
      const row = rows.find((candidate) => matches(candidate, where));
      if (!row) throw new Error("Not found");
      return row;
    },
    async update({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) {
      const row = rows.find((candidate) => matches(candidate, where));
      if (!row) throw new Error("Not found");
      Object.assign(row, data);
      return row;
    },
    async upsert({
      where,
      create,
      update,
    }: {
      where: Record<string, unknown>;
      create: Row;
      update: Record<string, unknown>;
    }) {
      const row = rows.find((candidate) => matches(candidate, where));
      if (row) {
        Object.assign(row, update);
        return row;
      }
      const created = { ...create };
      rows.push(created);
      return created;
    },
  };
}
