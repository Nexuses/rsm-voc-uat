"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  invalidateSettingsCache,
  readSettingsCache,
  SETTINGS_ROLES_CACHE_KEY,
  SETTINGS_USERS_CACHE_KEY,
  writeSettingsCache,
} from "@/components/dashboard/settings-list-cache";
import {
  PERMISSION_LABELS,
  PERMISSIONS,
  type Permission,
} from "@/lib/rbac/permissions";
import styles from "./dashboard.module.css";

type RoleRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isSystem: boolean;
  userCount: number;
  permissions: string[];
};

type RolesPayload = { roles: RoleRow[] };

function readCachedRoles(): RoleRow[] | null {
  return readSettingsCache<RolesPayload>(SETTINGS_ROLES_CACHE_KEY)?.data.roles ?? null;
}

export default function DashboardRoles() {
  const [roles, setRoles] = useState<RoleRow[]>(() => readCachedRoles() ?? []);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<Permission[]>([
    "dashboard.overview",
    "dashboard.reports",
  ]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(() => !readCachedRoles());
  const [refreshing, setRefreshing] = useState(false);

  async function load(options?: { force?: boolean }) {
    const force = options?.force ?? false;
    const cached = readSettingsCache<RolesPayload>(SETTINGS_ROLES_CACHE_KEY);
    const hasRows = roles.length > 0 || Boolean(cached?.data.roles.length);

    if (!force && cached?.fresh) {
      setRoles(cached.data.roles);
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
      const response = await fetch("/api/settings/roles", {
        cache: "no-store",
      });
      if (!response.ok) {
        setError(
          response.status === 403
            ? "You do not have permission to manage roles."
            : "Failed to load roles."
        );
        return;
      }
      const data = (await response.json()) as RolesPayload;
      writeSettingsCache(SETTINGS_ROLES_CACHE_KEY, data);
      setRoles(data.roles);
    } catch {
      setError("Failed to load roles.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function togglePermission(permission: Permission) {
    setSelected((current) =>
      current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission]
    );
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    const response = await fetch("/api/settings/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        slug,
        description: description || undefined,
        permissions: selected,
      }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Could not create role.");
      return;
    }
    setName("");
    setSlug("");
    setDescription("");
    setMessage("Role created.");
    invalidateSettingsCache(SETTINGS_ROLES_CACHE_KEY, SETTINGS_USERS_CACHE_KEY);
    await load({ force: true });
  }

  async function handleDelete(roleId: string) {
    setMessage(null);
    setError(null);
    const response = await fetch(
      `/api/settings/roles?roleId=${encodeURIComponent(roleId)}`,
      { method: "DELETE" }
    );
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Could not delete role.");
      return;
    }
    setMessage("Role deleted.");
    invalidateSettingsCache(SETTINGS_ROLES_CACHE_KEY, SETTINGS_USERS_CACHE_KEY);
    await load({ force: true });
  }

  const busy = loading || refreshing;

  return (
    <section className={styles.inviteSection} aria-label="Roles">
      <p className={styles.widgetIntro}>
        Create custom roles with a permission matrix. System roles (admin, cx)
        cannot be deleted.
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
            Role name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </label>
          <label className={styles.inviteField}>
            Slug
            <input
              value={slug}
              onChange={(event) =>
                setSlug(event.target.value.toLowerCase().replace(/\s+/g, "-"))
              }
              pattern="[a-z0-9_-]+"
              required
            />
          </label>
        </div>
        <label className={styles.inviteField}>
          Description
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <fieldset className={styles.permissionFieldset}>
          <legend>Permissions</legend>
          <div className={styles.permissionGrid}>
            {PERMISSIONS.map((permission) => (
              <label key={permission} className={styles.permissionOption}>
                <input
                  type="checkbox"
                  checked={selected.includes(permission)}
                  onChange={() => togglePermission(permission)}
                />
                <span>{PERMISSION_LABELS[permission]}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className={styles.inviteActions}>
          <button type="submit" className={styles.invitePrimaryButton}>
            Create role
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
              <th>Name</th>
              <th>Slug</th>
              <th>Users</th>
              <th>Permissions</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className={styles.tableEmptyRow}>
                <td colSpan={5}>Loading roles…</td>
              </tr>
            ) : null}
            {!loading && !roles.length ? (
              <tr className={styles.tableEmptyRow}>
                <td colSpan={5}>No roles found.</td>
              </tr>
            ) : null}
            {!loading
              ? roles.map((role) => (
                  <tr key={role.id}>
                    <td>
                      {role.name}
                      {role.isSystem ? " (system)" : ""}
                    </td>
                    <td>{role.slug}</td>
                    <td>{role.userCount}</td>
                    <td>{role.permissions.length}</td>
                    <td>
                      {!role.isSystem ? (
                        <button
                          type="button"
                          className={styles.inviteSecondaryButton}
                          onClick={() => void handleDelete(role.id)}
                          disabled={busy}
                        >
                          Delete
                        </button>
                      ) : null}
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
