import DashboardTestimonials from "@/components/dashboard/DashboardTestimonials";
import { requirePagePermission } from "@/lib/dashboard-page-gate";

export default async function DashboardTestimonialsPage() {
  await requirePagePermission("testimonials.manage");
  return <DashboardTestimonials />;
}
