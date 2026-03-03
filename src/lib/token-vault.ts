import crypto from "crypto";
import { prisma } from "./prisma";

const RAW_KEY = process.env.TOKEN_VAULT_KEY ?? "datashield-demo-key";
const KEY = crypto.createHash("sha256").update(RAW_KEY).digest();
const IV_LENGTH = 12;

function encrypt(value: string) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]);
}

function decrypt(payload: Buffer) {
  const iv = payload.subarray(0, IV_LENGTH);
  const tag = payload.subarray(IV_LENGTH, IV_LENGTH + 16);
  const data = payload.subarray(IV_LENGTH + 16);
  const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString("utf8");
}

function hash(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function generateToken() {
  return `TOK_${crypto.randomBytes(8).toString("hex")}`.toUpperCase();
}

export async function upsertToken(value: string, workspaceId: string | null) {
  const digest = hash(value);
  const existing = await prisma.tokenRecord.findUnique({ where: { originalHash: digest } });
  if (existing) {
    await prisma.tokenRecord.update({ where: { id: existing.id }, data: { lastUsedAt: new Date() } });
    return existing.token;
  }
  const token = generateToken();
  await prisma.tokenRecord.create({
    data: {
      token,
      originalHash: digest,
      payload: encrypt(value),
      workspaceId: workspaceId ?? null,
    },
  });
  return token;
}

export async function resolveToken(token: string) {
  const record = await prisma.tokenRecord.findUnique({ where: { token } });
  if (!record) return null;
  await prisma.tokenRecord.update({ where: { id: record.id }, data: { lastUsedAt: new Date() } });
  return decrypt(Buffer.from(record.payload));
}
