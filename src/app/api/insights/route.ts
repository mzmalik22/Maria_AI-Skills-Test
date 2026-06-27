import { NextResponse } from "next/server";
import insights from "@/data/insights.json";

export const revalidate = 3600;

export function GET() {
  return NextResponse.json(insights, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400"
    }
  });
}
