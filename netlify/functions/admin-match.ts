import type { Config, Context } from "@netlify/functions";
import { z } from "zod";
import { requirePlatformAdmin } from "./_shared/auth";
import { requireUser } from "./_shared/auth";
import { db } from "./_shared/db";
import { handleError, HttpError, json } from "./_shared/http";
import type { MatchWinnerSide } from "../../src/types";

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
  homePenaltyScore: z.number().int().min(0).max(30).nullable().optional(),
  awayPenaltyScore: z.number().int().min(0).max(30).nullable().optional(),
  winnerSide: z.enum(["home", "away"]).nullable().optional(),
  minute: z.number().int().min(0).max(180).nullable().optional(),
});

function deriveWinnerSide({
  homeScore,
  awayScore,
  homePenaltyScore,
  awayPenaltyScore,
  winnerSide,
}: {
  homeScore: number | null;
  awayScore: number | null;
  homePenaltyScore: number | null;
  awayPenaltyScore: number | null;
  winnerSide: MatchWinnerSide | null;
}) {
  if (homeScore === null || awayScore === null) return null;
  if (homeScore > awayScore) return "home";
  if (awayScore > homeScore) return "away";
  if (homePenaltyScore !== null && awayPenaltyScore !== null) {
    return homePenaltyScore > awayPenaltyScore ? "home" : "away";
  }
  return winnerSide;
}

export default async (request: Request, context: Context) => {
  try {
    const user = await requireUser();
    requirePlatformAdmin(user);
    const matchId = Number(context.params.id);
    if (!Number.isInteger(matchId)) {
      throw new HttpError(400, "Partido inválido.", "INVALID_MATCH");
    }
    const payload = bodySchema.parse(await request.json());
    const activeStatus =
      payload.status === "LIVE" ||
      payload.status === "PAUSED" ||
      payload.status === "FINISHED";
    const hasBothScores =
      payload.homeScore !== null && payload.awayScore !== null;
    const hasAnyScore =
      payload.homeScore !== null || payload.awayScore !== null;
    if ((activeStatus && !hasBothScores) || (!activeStatus && hasAnyScore)) {
      throw new HttpError(
        400,
        "El estado y el marcador del partido no son consistentes.",
        "INVALID_MATCH_STATE",
      );
    }

    const homePenaltyScore = activeStatus ? (payload.homePenaltyScore ?? null) : null;
    const awayPenaltyScore = activeStatus ? (payload.awayPenaltyScore ?? null) : null;
    const hasAnyPenalty =
      homePenaltyScore !== null || awayPenaltyScore !== null;
    const hasBothPenalties =
      homePenaltyScore !== null && awayPenaltyScore !== null;
    if (
      hasAnyPenalty &&
      (!hasBothPenalties ||
        payload.status !== "FINISHED" ||
        payload.homeScore !== payload.awayScore ||
        homePenaltyScore === awayPenaltyScore)
    ) {
      throw new HttpError(
        400,
        "Los penales solo aplican a empates finalizados y deben tener ganador.",
        "INVALID_PENALTY_STATE",
      );
    }

    const requestedWinnerSide = activeStatus ? (payload.winnerSide ?? null) : null;
    const winnerSide =
      payload.status === "FINISHED"
        ? deriveWinnerSide({
            homeScore: payload.homeScore,
            awayScore: payload.awayScore,
            homePenaltyScore,
            awayPenaltyScore,
            winnerSide: requestedWinnerSide,
          })
        : null;
    if (
      requestedWinnerSide !== null &&
      winnerSide !== null &&
      requestedWinnerSide !== winnerSide
    ) {
      throw new HttpError(
        400,
        "El ganador no coincide con el marcador o los penales.",
        "INVALID_WINNER_SIDE",
      );
    }
    if (requestedWinnerSide !== null && payload.status !== "FINISHED") {
      throw new HttpError(
        400,
        "El ganador solo puede guardarse cuando el partido finalizo.",
        "INVALID_WINNER_SIDE",
      );
    }

    const sql = db();
    const [match] = await sql`
      UPDATE matches
      SET
        status = ${payload.status},
        home_score = ${payload.homeScore},
        away_score = ${payload.awayScore},
        home_penalty_score = ${homePenaltyScore},
        away_penalty_score = ${awayPenaltyScore},
        winner_side = ${winnerSide},
        minute = ${payload.minute ?? null},
        updated_at = now()
      WHERE id = ${matchId}
      RETURNING id, status, home_score AS "homeScore",
                away_score AS "awayScore",
                home_penalty_score AS "homePenaltyScore",
                away_penalty_score AS "awayPenaltyScore",
                winner_side AS "winnerSide",
                minute
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
