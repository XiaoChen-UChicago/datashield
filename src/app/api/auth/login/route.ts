import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: string; password?: string } | null;
  if (!body?.email || !body.password) {
    return NextResponse.json({ error: "Email & password required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: body.email.toLowerCase() },
    include: {
      memberships: {
        include: { workspace: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const valid = await verifyPassword(body.password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const targetMembership = user.memberships[0];
  const workspaceId = targetMembership?.workspaceId ?? null;
  const token = createSessionToken({ userId: user.id, workspaceId });

  const cookieStore = await cookies();
  cookieStore.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    workspace: targetMembership?.workspace ?? null,
  });
}
