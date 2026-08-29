import { createHash, randomBytes } from "node:crypto";
import { db, tokens } from "@spec-forge/db";
import { and, eq, isNull } from "drizzle-orm";
import { NotFoundError } from "../errors.js";

function hashToken(plaintext: string) {
  return createHash("sha256").update(plaintext).digest("hex");
}

export async function generateToken(label: string) {
  const plaintext = `sf_${randomBytes(32).toString("hex")}`;
  const [row] = await db
    .insert(tokens)
    .values({ label, tokenHash: hashToken(plaintext) })
    .returning();
  return { ...row, token: plaintext };
}

export async function verifyToken(plaintext: string) {
  const hash = hashToken(plaintext);
  const row = await db.query.tokens.findFirst({
    where: and(eq(tokens.tokenHash, hash), isNull(tokens.revokedAt)),
  });
  if (!row) return null;
  await db.update(tokens).set({ lastUsedAt: new Date() }).where(eq(tokens.id, row.id));
  return row;
}

export async function listTokens() {
  const rows = await db.query.tokens.findMany({ orderBy: (t, { desc }) => [desc(t.createdAt)] });
  return rows.map(({ tokenHash: _tokenHash, ...rest }) => rest);
}

export async function revokeToken(id: string) {
  const [row] = await db.update(tokens).set({ revokedAt: new Date() }).where(eq(tokens.id, id)).returning();
  if (!row) throw new NotFoundError("Token", id);
  return row;
}
