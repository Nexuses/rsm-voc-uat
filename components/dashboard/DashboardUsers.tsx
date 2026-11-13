"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  invalidateSettingsCache,
  readSettingsCache,
  SETTINGS_ROLES_CACHE_KEY,
  SETTINGS_USERS_CACHE_KEY,
  writeSettingsCache,
} from "@/components/dashboard/settings-list-cache";
import styles from "./dashboard.module.css";

type RoleOption = {
  id: string;
  name: string;
  slug: string;
  isSystem: boolean;
};

type UserRow = {
  id: string;
  email: string;
  role: string;
  roleId: string | null;
  roleRef: { id: string; name: string; slug: string } | null;
};

type UsersPayload = {
  users: UserRow[];
  roles: RoleOption[];
};

function readCachedUsers(): UsersPayload | null {
  return readSettingsCache<UsersPayload>(SETTINGS_USERS_CACHE_KEY)?.data ?? null;
}

export default function DashboardUsers() {
  const [users, setUsers] = useState<UserRow[]>(
    () => readCachedUsers()?.users ?? []
  );
  const [roles, setRoles] = useState<RoleOption[]>(
    () => readCachedUsers()?.roles ?? []
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState(
    () => readCachedUsers()?.roles[0]?.id ?? ""
  );
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(() => !readCachedUsers());
  const [refreshing, setRefreshing] = useState(false);

  async function load(options?: { force?: boolean }) {
    const force = options?.force ?? false;
    const cached = readSettingsCache<UsersPayload>(SETTINGS_USERS_CACHE_KEY);
    const hasRows = users.length > 0 || Boolean(cached?.data.users.length);

    if (!force && cached?.fresh) {
      setUsers(cached.data.users);
      setRoles(cached.data.roles);
      if (!roleId && cached.data.roles[0]) setRoleId(cached.data.roles[0].id);
      setLoading(false);
      return;
    }

    if (hasRows) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const response = await fetch("/api/settings/users", {
        cache: "no-store",
      });
      if (!response.ok) {
        setError(
          response.status === 403
            ? "You do not have permission to manage users."
            : "Failed to load users."
        );
        return;
      }
      const data = (await response.json()) as UsersPayload;
      writeSettingsCache(SETTINGS_USERS_CACHE_KEY, data);
      setUsers(data.users);
      setRoles(data.roles);
      if (!roleId && data.roles[0]) setRoleId(data.roles[0].id);
    } catch {
      setError("Failed to load users.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const response = await fetch("/api/settings/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, roleId }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Could not create user.");
      return;
    }
    setEmail("");
    setPassword("");
    setMessage("User created.");
    invalidateSettingsCache(SETTINGS_USERS_CACHE_KEY, SETTINGS_ROLES_CACHE_KEY);
    await load({ force: true });
  }

  async function assignRole(userId: string, nextRoleId: string) {
    setError(null);
    setMessage(null);
    const response = await fetch("/api/settings/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, roleId: nextRoleId }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Could not assign role.");
      return;
    }
    setMessage("Role updated.");
    invalidateSettingsCache(SETTINGS_USERS_CACHE_KEY, SETTINGS_ROLES_CACHE_KEY);
    await load({ force: true });
  }

  const busy = loading || refreshing;

  return (
    <section className={styles.inviteSection} aria-label="Users">
      <p className={styles.widgetIntro}>
        Create dashboard users and assign a role. Passwords are stored hashed.
      </p>

      {error ? (
        <p className={styles.inviteAlert} role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className={styles.inviteTemplateNote}>{message}</p> : null}

      <form className={styles.inviteForm} onSubmit={handleCreate}>
        <div className={styles.inviteFieldGrid}>
          <label className={styles.inviteField}>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className={styles.inviteField}>
            Temporary password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
            />
          </label>
          <label className={styles.inviteField}>
            Role
            <select
              value={roleId}
              onChange={(event) => setRoleId(event.target.value)}
              required
            >
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className={styles.inviteActions}>
          <button type="submit" className={styles.invitePrimaryButton}>
            Create user
          </button>
        </div>
      </form>

      <div className={styles.tableToolbar}>
        {refreshing ? (
          <span className={styles.tableToolbarHint}>Refreshing…</span>
        ) : null}
        <button
          type="button"
          className={styles.inviteSecondaryButton}
          onClick={() => void load({ force: true })}
          disabled={busy}
        >
          Refresh
        </button>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.compactTable} aria-busy={busy}>
          <thead>
            <tr>
              <th>Email</th>
              <th>Current role</th>
              <th>Assign role</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className={styles.tableEmptyRow}>
                <td colSpan={3}>Loading users…</td>
              </tr>
            ) : null}
            {!loading && !users.length ? (
              <tr className={styles.tableEmptyRow}>
                <td colSpan={3}>No users found.</td>
              </tr>
            ) : null}
            {!loading
              ? users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.email}</td>
                    <td>{user.roleRef?.name ?? user.role}</td>
                    <td>
                      <select
                        value={user.roleId ?? ""}
                        onChange={(event) =>
                          void assignRole(user.id, event.target.value)
                        }
                        disabled={busy}
                      >
                        {roles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))
              : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
