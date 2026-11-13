import { redirect } from "next/navigation";

/** Legacy path — audit now lives under Settings. */
export default function LegacyAuditPage() {
  redirect("/dashboard/settings/audit");
}
