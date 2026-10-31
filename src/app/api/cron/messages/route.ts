import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron";
import { processDueNotifications } from "@/lib/messaging";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function run(request: Request) {
  if (!isCronAuthorized(request)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  try {
    const result = await processDueNotifications(50);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Message queue cron failed", error);
    return NextResponse.json({ error: "Queue processing failed." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
