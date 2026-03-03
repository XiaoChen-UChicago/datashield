import { NextRequest, NextResponse } from "next/server";
import { resolveToken } from "@/lib/token-vault";

const ADMIN_KEY = process.env.TOKEN_VAULT_ADMIN_KEY ?? "demo-admin-key";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const headers = request.headers;
  const provided = headers.get("x-vault-key");
  if (!provided || provided !== ADMIN_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { token } = await context.params;
  const value = await resolveToken(token);
  if (!value) {
    return NextResponse.json({ error: "Token not found" }, { status: 404 });
  }
  return NextResponse.json({ token, value });
}
