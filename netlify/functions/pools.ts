import type { Config } from "@netlify/functions";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { requireUser } from "./_shared/auth";
import { db } from "./_shared/db";
import { handleError, HttpError, json } from "./_shared/http";
import { upsertProfile } from "./_shared/profile";

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    name: z.string().trim().min(2).max(80),
  }),
  z.object({
    action: z.literal("join"),
    code: z.string().trim().min(5).max(10),
  }),
]);

function inviteCode() {
  return randomBytes(5)
    .toString("base64url")
    .toUpperCase()
    .replace(/[-_]/g, "X")
    .slice(0, 8);
}

export default async (request: Request) => {
  try {
    if (request.method !== "POST") {
      return json(
        { error: "Method not allowed.", code: "METHOD_NOT_ALLOWED" },
        405,
      );
    }

    const user = await requireUser();
    await upsertProfile(user);
    const payload = bodySchema.parse(await request.json());
    const sql = db();

    if (payload.action === "create") {
      for (let attempt = 0; attempt < 4; attempt += 1) {
        try {
          const [pool] = await sql`
            INSERT INTO pools (name, code, owner_user_id)
            VALUES (${payload.name}, ${inviteCode()}, ${user.id})
            RETURNING id, name, code, owner_user_id AS "ownerUserId"
          `;
          return json({ pool }, 201);
        } catch (error) {
          const databaseError = error as { code?: string };
          if (databaseError.code !== "23505" || attempt === 3) throw error;
        }
      }
    }

    if (payload.action !== "join") {
      throw new HttpError(500, "No se pudo crear el grupo.", "POOL_CREATE_FAILED");
    }

    const normalizedCode = payload.code.toUpperCase();
    const [pool] = await sql`
      SELECT id, name, code, owner_user_id AS "ownerUserId"
      FROM pools
      WHERE code = ${normalizedCode}
    `;
    if (!pool) {
      throw new HttpError(404, "No existe un grupo con ese código.", "POOL_NOT_FOUND");
    }

    await sql`
      INSERT INTO pool_members (pool_id, user_id)
      VALUES (${pool.id}::uuid, ${user.id})
      ON CONFLICT (pool_id, user_id) DO NOTHING
    `;
    return json({ pool });
  } catch (error) {
    return handleError(error);
  }
};

export const config: Config = {
  path: "/api/pools",
};
