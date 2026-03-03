import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const session = await getCurrentUser();
  if (!session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const events = await prisma.detectionEvent.findMany({
    where: { workspaceId: session.workspaceId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ events });
}
