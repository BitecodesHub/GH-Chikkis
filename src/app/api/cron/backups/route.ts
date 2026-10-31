import { NextResponse } from "next/server";
import { BackupError, runScheduledBackup } from "@/lib/backups";
import { isCronAuthorized } from "@/lib/cron";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function run(request: Request) {
  if (!isCronAuthorized(request)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  try {
    const result = await runScheduledBackup();
    return NextResponse.json(
      {
        skipped: result.skipped,
        status: result.run?.status ?? null,
        fileName: result.run?.location ?? null,
        documentCount: result.run?.documentCount ?? null,
        startedAt: result.run?.startedAt ?? null,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Backup cron failed", error);
    return NextResponse.json(
      { error: error instanceof BackupError ? error.message : "Backup failed." },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
