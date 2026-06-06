import type { Config, Context } from "@netlify/functions";
import { z } from "zod";
import { requirePlatformAdmin } from "./_shared/auth";
import { requireUser } from "./_shared/auth";
import { db } from "./_shared/db";
import { handleError, HttpError, json } from "./_shared/http";

const bodySchema = z.object({
  status: z.enum([
    "SCHEDULED",
    "LIVE",
    "PAUSED",
    "FINISHED",
    "POSTPONED",
    "CANCELLED",
  ]),
  homeScore: z.number().int().min(0).max(30).nullable(),
  awayScore: z.number().int().min(0).max(30).nullable(),
  minute: z.number().int().min(0).max(180).nullable().optional(),
});

export default async (request: Request, context: Context) => {
  try {
    const user = await requireUser();
    requirePlatformAdmin(user);
    const matchId = Number(context.params.id);
    if (!Number.isInteger(matchId)) {
      throw new HttpError(400, "Partido inválido.", "INVALID_MATCH");
    }
    const payload = bodySchema.parse(await request.json());
    const sql = db();
    const [match] = await sql`
      UPDATE matches
      SET
        status = ${payload.status},
        home_score = ${payload.homeScore},
        away_score = ${payload.awayScore},
        minute = ${payload.minute ?? null},
        updated_at = now()
      WHERE id = ${matchId}
      RETURNING id, status, home_score AS "homeScore", away_score AS "awayScore", minute
    `;
    if (!match) {
      throw new HttpError(404, "Partido no encontrado.", "MATCH_NOT_FOUND");
    }
    return json({ match });
  } catch (error) {
    return handleError(error);
  }
};

export const config: Config = {
  path: "/api/admin/matches/:id",
  method: "PATCH",
};
