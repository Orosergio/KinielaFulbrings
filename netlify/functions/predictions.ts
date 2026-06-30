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
  advancingSide: z.enum(["home", "away"]).nullable().optional(),
});

function resolvedAdvancingSide({
  stage,
  homeScore,
  awayScore,
  advancingSide,
}: {
  stage: string;
  homeScore: number;
  awayScore: number;
  advancingSide?: "home" | "away" | null;
}) {
  if (stage === "group") return null;
  if (homeScore > awayScore) return "home";
  if (awayScore > homeScore) return "away";
  return advancingSide ?? null;
}

export default async (request: Request) => {
  try {
    if (request.method !== "PUT") {
      return json(
        { error: "Method not allowed.", code: "METHOD_NOT_ALLOWED" },
        405,
      );
    }

    const user = await requireUser();
    const payload = bodySchema.parse(await request.json());
    await requirePoolMember(payload.poolId, user.id);

    const sql = db();
    const [match] = await sql`
      SELECT
        id,
        stage,
        home_team_id AS "homeTeamId",
        away_team_id AS "awayTeamId",
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

    if (!match.homeTeamId || !match.awayTeamId) {
      throw new HttpError(
        409,
        "Este partido todavía no tiene equipos definidos.",
        "MATCH_TEAMS_PENDING",
      );
    }

    const advancingSide = resolvedAdvancingSide({
      stage: match.stage as string,
      homeScore: payload.homeScore,
      awayScore: payload.awayScore,
      advancingSide: payload.advancingSide,
    });
    if (match.stage !== "group" && advancingSide === null) {
      throw new HttpError(
        400,
        "Elige quién avanza para guardar un empate en eliminatoria.",
        "ADVANCING_SIDE_REQUIRED",
      );
    }

    const [prediction] = await sql`
      INSERT INTO predictions (
        pool_id, user_id, match_id, home_score, away_score, advancing_side
      ) VALUES (
        ${payload.poolId}::uuid,
        ${user.id},
        ${payload.matchId},
        ${payload.homeScore},
        ${payload.awayScore},
        ${advancingSide}
      )
      ON CONFLICT (pool_id, user_id, match_id) DO UPDATE SET
        home_score = EXCLUDED.home_score,
        away_score = EXCLUDED.away_score,
        advancing_side = EXCLUDED.advancing_side
      RETURNING
        user_id AS "userId",
        match_id AS "matchId",
        home_score AS "homeScore",
        away_score AS "awayScore",
        advancing_side AS "advancingSide",
        score_points AS "scorePoints",
        advancement_points AS "advancementPoints",
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
};
