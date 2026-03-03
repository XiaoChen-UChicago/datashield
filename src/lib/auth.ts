import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const SALT_ROUNDS = 10;
const AUTH_SECRET = process.env.AUTH_SECRET ?? "datashield-demo-secret";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function createSessionToken(payload: { userId: string; workspaceId: string | null }) {
  return jwt.sign(payload, AUTH_SECRET, { expiresIn: "7d" });
}

export function verifySessionToken(token: string) {
  try {
    return jwt.verify(token, AUTH_SECRET) as { userId: string; workspaceId: string | null };
  } catch (err) {
    return null;
  }
}

export const SESSION_COOKIE = "datashield.session";
