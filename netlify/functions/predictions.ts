import type { Config } from "@netlify/functions";
import { z } from "zod";
import { requireUser } from "./_shared/auth";
import { db } from "./_shared/db";
import { handleError, HttpError, json } from "./_shared/http";
import { requirePoolMember } from "./_shared/pool-access";

const bodySchema = z.object({
  poolId: z.string().uuid(),
  matchId: z.number().int().positive(),
  homeScore: z.number().int().min(0).max(30),
  awayScore: z.number().int().min(0).max(30),
});

export default async (request: Request) => {
  try {
    const user = await requireUser();
    const payload = bodySchema.parse(await request.json());
    await requirePoolMember(payload.poolId, user.id);

    const sql = db();
    const [match] = await sql`
      SELECT
        id,
        (now() >= kickoff_at OR status <> 'SCHEDULED') AS locked
      FROM matches
      WHERE id = ${payload.matchId}
    `;

    if (!match) {
      throw new HttpError(404, "El partido no existe.", "MATCH_NOT_FOUND");
    }

    if (match.locked) {
      throw new HttpError(
        409,
        "El partido ya comenzó. La predicción quedó bloqueada.",
        "PREDICTION_LOCKED",
      );
    }

    const [prediction] = await sql`
      INSERT INTO predictions (
        pool_id, user_id, match_id, home_score, away_score
      ) VALUES (
        ${payload.poolId}::uuid,
        ${user.id},
        ${payload.matchId},
        ${payload.homeScore},
        ${payload.awayScore}
      )
      ON CONFLICT (pool_id, user_id, match_id) DO UPDATE SET
        home_score = EXCLUDED.home_score,
        away_score = EXCLUDED.away_score
      RETURNING
        user_id AS "userId",
        match_id AS "matchId",
        home_score AS "homeScore",
        away_score AS "awayScore",
        points,
        updated_at AS "updatedAt"
    `;

    return json({ prediction });
  } catch (error) {
    return handleError(error);
  }
};

export const config: Config = {
  path: "/api/predictions",
  method: "PUT",
};
