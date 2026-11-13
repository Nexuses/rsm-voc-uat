import { describe, expect, it } from "vitest";
import {
  canAccessSettings,
  canSeeSettingsTab,
  firstSettingsHref,
  SETTINGS_TABS,
} from "@/lib/rbac/settings-tabs";
import { PORTFOLIO_PERMISSIONS } from "@/lib/rbac/permissions";

describe("settings tabs", () => {
  it("opens Account for anyone with a settings gate permission", () => {
    expect(canAccessSettings(["audit.read"])).toBe(true);
    expect(firstSettingsHref(["audit.read"])).toBe(
      "/dashboard/settings/account"
    );
    expect(firstSettingsHref(["users.manage"])).toBe(
      "/dashboard/settings/account"
    );
    expect(firstSettingsHref(["settings.account"])).toBe(
      "/dashboard/settings/account"
    );
    expect(
      SETTINGS_TABS.find((tab) => tab.href === "/dashboard/settings/reminders")
        ?.permission
    ).toBe("users.manage");
  });

  it("lets portfolio change password without directory or admin tabs", () => {
    expect(canAccessSettings(PORTFOLIO_PERMISSIONS)).toBe(true);
    expect(firstSettingsHref(PORTFOLIO_PERMISSIONS)).toBe(
      "/dashboard/settings/account"
    );
    const directory = SETTINGS_TABS.find(
      (tab) => tab.href === "/dashboard/settings/directory"
    )!;
    const account = SETTINGS_TABS.find(
      (tab) => tab.href === "/dashboard/settings/account"
    )!;
    expect(canSeeSettingsTab(account, PORTFOLIO_PERMISSIONS)).toBe(true);
    expect(canSeeSettingsTab(directory, PORTFOLIO_PERMISSIONS)).toBe(false);
    expect(
      canSeeSettingsTab(directory, ["invite.send", "invite.tracker"])
    ).toBe(true);
  });

  it("blocks surveyor-only users from settings", () => {
    expect(canAccessSettings(["invite.send", "invite.tracker"])).toBe(false);
    expect(firstSettingsHref(["invite.send", "invite.tracker"])).toBeNull();
  });
});
