import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, createSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { slugify } from "@/lib/utils";
import { createApiKey } from "@/lib/api-keys";
import { cookies } from "next/headers";

async function ensureWorkspaceSlug(name: string) {
  const base = slugify(name);
  let attempt = base;
  let counter = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.workspace.findUnique({ where: { slug: attempt } });
    if (!existing) return attempt;
    attempt = `${base}-${counter}`;
    counter += 1;
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    email?: string;
    password?: string;
    name?: string;
    workspaceName?: string;
  } | null;

  if (!body?.email || !body.password) {
    return NextResponse.json({ error: "Email & password required" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
  if (existing) {
    return NextResponse.json({ error: "User already exists" }, { status: 409 });
  }

  const passwordHash = await hashPassword(body.password);

  const workspaceName = body.workspaceName?.trim() || `${body.name ?? "My"} Workspace`;
  const slug = await ensureWorkspaceSlug(workspaceName);

  const user = await prisma.user.create({
    data: {
      email: body.email.toLowerCase(),
      passwordHash,
      name: body.name ?? null,
      role: "OWNER",
    },
  });

  const workspace = await prisma.workspace.create({
    data: {
      name: workspaceName,
      slug,
      memberships: {
        create: {
          userId: user.id,
          role: "OWNER",
        },
      },
    },
  });

  const { apiKey } = await createApiKey({ workspaceId: workspace.id, userId: user.id, name: "Default Key" });

  const token = createSessionToken({ userId: user.id, workspaceId: workspace.id });
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
    workspace,
    apiKey,
  });
}
