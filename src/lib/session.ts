import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { SESSION_COOKIE, verifySessionToken } from "./auth";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = verifySessionToken(token);
  if (!payload) return null;
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: {
      memberships: {
        where: payload.workspaceId ? { workspaceId: payload.workspaceId } : undefined,
        include: { workspace: true },
      },
    },
  });
  if (!user) return null;
  return {
    user,
    workspace: payload.workspaceId ? user.memberships.find((m) => m.workspaceId === payload.workspaceId)?.workspace ?? null : null,
    workspaceId: payload.workspaceId,
  };
}
