import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { createApiKey } from "@/lib/api-keys";

export async function GET() {
  const session = await getCurrentUser();
  if (!session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const keys = await prisma.apiKey.findMany({
    where: { workspaceId: session.workspaceId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      createdAt: true,
      lastUsedAt: true,
    },
  });

  return NextResponse.json({ keys });
}

export async function POST(request: NextRequest) {
  const session = await getCurrentUser();
  if (!session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { name?: string } | null;
  const name = body?.name?.trim() && body.name.length > 0 ? body.name : "API Key";

  const { apiKey, record } = await createApiKey({
    workspaceId: session.workspaceId,
    userId: session.user.id,
    name,
  });

  return NextResponse.json({
    apiKey,
    key: {
      id: record.id,
      name: record.name,
      createdAt: record.createdAt,
      lastUsedAt: record.lastUsedAt,
    },
  });
}
