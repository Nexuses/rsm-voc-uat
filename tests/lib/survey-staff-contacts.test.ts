import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    staffContact: {
      findUnique: mocks.findUnique,
      create: mocks.create,
      update: mocks.update,
    },
  },
}));

import { upsertStaffContact, upsertStaffContactsFromRecipient } from "@/lib/survey-staff-contacts";

describe("staff contact master", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findUnique.mockResolvedValue(null);
    mocks.create.mockResolvedValue({ id: "staff-1" });
    mocks.update.mockResolvedValue({ id: "staff-1" });
  });

  it("inserts a new name and does not treat spacing or case as a new person", async () => {
    await upsertStaffContact({
      role: "partner",
      name: "  Mohamed   Shehata ",
      email: "mohamed@example.com",
    });
    mocks.findUnique.mockResolvedValue({
      id: "staff-1",
      email: "mohamed@example.com",
      name: "Mohamed Shehata",
    });
    await upsertStaffContact({
      role: "partner",
      name: "mohamed shehata",
      email: "other@example.com",
    });

    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(mocks.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        role: "partner",
        name: "Mohamed Shehata",
        nameKey: "mohamed shehata",
        email: "mohamed@example.com",
      }),
    });
    expect(mocks.findUnique).toHaveBeenLastCalledWith({
      where: { role_nameKey: { role: "partner", nameKey: "mohamed shehata" } },
    });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("fills an empty master email and does not replace one that is already set", async () => {
    mocks.findUnique.mockResolvedValueOnce({ id: "staff-1", email: null });
    await upsertStaffContact({
      role: "business_manager",
      name: "Sara Al-Mutairi",
      email: "sara@example.com",
    });
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "staff-1" },
      data: { email: "sara@example.com" },
    });

    mocks.findUnique.mockResolvedValueOnce({
      id: "staff-1",
      email: "sara@example.com",
    });
    await upsertStaffContact({
      role: "business_manager",
      name: "Sara Al-Mutairi",
      email: "new@example.com",
    });
    expect(mocks.update).toHaveBeenCalledTimes(1);
  });

  it("adds every new directory value from an invite", async () => {
    await upsertStaffContactsFromRecipient({
      email: "client@example.com",
      department: "New Department",
      serviceName: "New Service",
      partner: "New Partner",
      partnerEmail: "partner@example.com",
      businessManagerName: "New Manager",
      businessManagerEmail: "manager@example.com",
      jobManagerName: "New Job Manager",
      jobManagerEmail: "job@example.com",
      teamLeader: "New Leader",
    });

    const roles = mocks.create.mock.calls.map(
      (call) => call[0].data.role as string
    );
    expect(roles.sort()).toEqual([
      "business_manager",
      "department",
      "job_manager",
      "partner",
      "service",
      "team_leader",
    ]);
    expect(mocks.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        role: "partner",
        name: "New Partner",
        email: "partner@example.com",
      }),
    });
    expect(mocks.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        role: "department",
        name: "New Department",
        email: null,
      }),
    });
  });
});
