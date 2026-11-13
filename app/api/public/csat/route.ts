import { NextResponse } from "next/server";
import { getPublicCsat } from "@/lib/public-csat";
import { publicMetricHeaders } from "@/app/api/public/metrics/route";

export async function GET() {
  return NextResponse.json(await getPublicCsat(), {
    headers: publicMetricHeaders,
  });
}

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: publicMetricHeaders,
  });
}
