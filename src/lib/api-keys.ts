import crypto from "crypto";
import { prisma } from "./prisma";
import { randomId } from "./utils";

export function generateApiKey() {
  return `dsp_${randomId()}`;
}

export function hashApiKey(apiKey: string) {
  return crypto.createHash("sha256").update(apiKey).digest("hex");
}

export async function createApiKey(options: { workspaceId: string; userId?: string | null; name?: string }) {
  const plain = generateApiKey();
  const keyHash = hashApiKey(plain);
  const record = await prisma.apiKey.create({
    data: {
      workspaceId: options.workspaceId,
      userId: options.userId ?? null,
      name: options.name ?? "Default Key",
      keyHash,
    },
  });
  return { apiKey: plain, record };
}

export async function verifyApiKey(apiKey: string) {
  const keyHash = hashApiKey(apiKey);
  return prisma.apiKey.findUnique({
    where: { keyHash },
    include: { workspace: true },
  });
}
