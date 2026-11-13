"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import type { Permission } from "@/lib/rbac/permissions";

const DashboardPermissionsContext = createContext<Permission[]>([]);

export function DashboardPermissionsProvider({
  permissions,
  children,
}: {
  permissions: Permission[];
  children: ReactNode;
}) {
  return (
    <DashboardPermissionsContext.Provider value={permissions}>
      {children}
    </DashboardPermissionsContext.Provider>
  );
}

export function useDashboardPermissions() {
  return useContext(DashboardPermissionsContext);
}

export function useHasPermission(permission: Permission) {
  const permissions = useDashboardPermissions();
  return permissions.includes(permission);
}
