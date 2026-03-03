import { NextRequest, NextResponse } from "next/server";
import { prismaStrategy, runDetection, normalizeStrategy } from "@/lib/detector";
import { prisma } from "@/lib/prisma";
import { verifyApiKey } from "@/lib/api-keys";
import { getCurrentUser } from "@/lib/session";

const MAX_LENGTH = 8000;

async function resolveContext(request: NextRequest) {
  const apiKey = request.headers.get("x-datashield-key") ?? request.headers.get("authorization")?.replace("Bearer ", "");
  if (apiKey) {
    const keyRecord = await verifyApiKey(apiKey.trim());
    if (keyRecord) {
      return { workspaceId: keyRecord.workspaceId, userId: keyRecord.userId ?? null, auth: "api-key" as const };
    }
  }
  const session = await getCurrentUser();
  if (session?.workspaceId) {
    return { workspaceId: session.workspaceId, userId: session.user.id, auth: "session" as const };
  }
  return null;
}

export async function POST(request: NextRequest) {
  const context = await resolveContext(request);
  if (!context?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    text?: string;
    strategy?: string;
    language?: string;
  } | null;

  if (!body || typeof body.text !== "string" || !body.text.trim()) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  if (body.text.length > MAX_LENGTH) {
    return NextResponse.json({ error: `输入长度超出限制 (${MAX_LENGTH} 字符)` }, { status: 413 });
  }

  const strategy = normalizeStrategy(body.strategy);
  const started = performance.now();
  const { processedText, detections } = await runDetection({ text: body.text, strategy, workspaceId: context.workspaceId });
  const elapsed = Math.round(performance.now() - started);

  const event = await prisma.detectionEvent.create({
    data: {
      workspaceId: context.workspaceId,
      userId: context.userId,
      strategy: prismaStrategy(strategy),
      inputLength: body.text.length,
      detectionCount: detections.length,
      elapsedMs: elapsed,
      report: detections as unknown as Prisma.JsonArray,
    },
  });

  return NextResponse.json({
    eventId: event.id,
    processedText,
    detections,
    detectionCount: detections.length,
    elapsedMs: elapsed,
    strategy,
  });
}
