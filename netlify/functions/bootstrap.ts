import type { Config } from "@netlify/functions";
import { z } from "zod";
import { requireUser } from "./_shared/auth";
import { db } from "./_shared/db";
import { handleError, HttpError, json } from "./_shared/http";
import { upsertProfile } from "./_shared/profile";

const poolIdSchema = z.string().uuid();

export default async (request: Request) => {
  try {
    const user = await requireUser();
    await upsertProfile(user);
    const email = user.email;
    if (!email) {
      throw new HttpError(401, "Inicia sesión para continuar.", "UNAUTHORIZED");
    }

    const sql = db();
    const pools = await sql`
      SELECT
        p.id,
        p.name,
        p.code,
        pm.role,
        p.owner_user_id AS "ownerUserId",
        COUNT(all_members.user_id)::int AS "memberCount"
      FROM pool_members pm
      JOIN pools p ON p.id = pm.pool_id
      LEFT JOIN pool_members all_members ON all_members.pool_id = p.id
      WHERE pm.user_id = ${user.id}
      GROUP BY p.id, pm.role
      ORDER BY p.created_at
    `;

    const requestedPool = new URL(request.url).searchParams.get("pool");
    let selectedPoolId = requestedPool ?? (pools[0]?.id as string | undefined);

    if (selectedPoolId) {
      const parsed = poolIdSchema.safeParse(selectedPoolId);
      if (!parsed.success || !pools.some((pool) => pool.id === selectedPoolId)) {
        throw new HttpError(403, "No perteneces a este grupo.", "NOT_A_POOL_MEMBER");
      }
      selectedPoolId = parsed.data;
    }

    const matches = await sql`
      SELECT
        m.id,
        m.provider_match_id AS "providerMatchId",
        m.stage,
        m.group_name AS "groupName",
        m.matchday,
        m.kickoff_at AS "kickoffAt",
        m.home_team_id AS "homeTeamId",
        m.away_team_id AS "awayTeamId",
        m.home_label AS "homeLabel",
        m.away_label AS "awayLabel",
        m.stadium_id AS "stadiumId",
        m.status,
        m.minute,
        m.home_score AS "homeScore",
        m.away_score AS "awayScore",
        m.home_penalty_score AS "homePenaltyScore",
        m.away_penalty_score AS "awayPenaltyScore",
        m.winner_side AS "winnerSide",
        m.updated_at AS "updatedAt"
      FROM matches m
      ORDER BY m.kickoff_at, m.id
    `;

    const [syncStatus] = await sql`
      SELECT
        provider,
        status,
        matches_seen::int AS "matchesSeen",
        matches_updated::int AS "matchesUpdated",
        detail,
        started_at AS "startedAt",
        finished_at AS "finishedAt"
      FROM sync_runs
      ORDER BY (status = 'SUCCESS') DESC, started_at DESC
      LIMIT 1
    `;

    let members: unknown[] = [];
    let predictions: unknown[] = [];
    let leaderboard: unknown[] = [];

    if (selectedPoolId) {
      members = await sql`
        SELECT
          pr.id,
          pr.display_name AS "displayName",
          pr.avatar_url AS "avatarUrl",
          pm.role,
          pm.joined_at AS "joinedAt"
        FROM pool_members pm
        JOIN profiles pr ON pr.id = pm.user_id
        WHERE pm.pool_id = ${selectedPoolId}::uuid
        ORDER BY pm.joined_at
      `;

      predictions = await sql`
        SELECT
          p.user_id AS "userId",
          p.match_id AS "matchId",
          p.home_score AS "homeScore",
          p.away_score AS "awayScore",
          p.advancing_side AS "advancingSide",
          p.score_points AS "scorePoints",
          p.advancement_points AS "advancementPoints",
          p.points,
          p.updated_at AS "updatedAt"
        FROM predictions p
        WHERE p.pool_id = ${selectedPoolId}::uuid
        ORDER BY p.match_id, p.user_id
      `;

      leaderboard = await sql`
        SELECT
          pr.id AS "userId",
          pr.display_name AS "displayName",
          pr.avatar_url AS "avatarUrl",
          COALESCE(SUM(p.points), 0)::int AS points,
          COUNT(p.match_id)::int AS "pickCount",
          COUNT(p.match_id) FILTER (WHERE p.score_points = 7)::int AS exacts
        FROM pool_members pm
        JOIN profiles pr ON pr.id = pm.user_id
        LEFT JOIN predictions p
          ON p.pool_id = pm.pool_id AND p.user_id = pm.user_id
        WHERE pm.pool_id = ${selectedPoolId}::uuid
        GROUP BY pr.id
        ORDER BY points DESC, exacts DESC, pr.display_name
      `;
    }

    return json({
      serverNow: new Date().toISOString(),
      currentUser: {
        id: user.id,
        email,
        displayName: user.name ?? email.split("@")[0],
        avatarUrl: user.pictureUrl,
        roles: user.roles ?? [],
      },
      selectedPoolId,
      pools,
      members,
      matches,
      predictions,
      leaderboard,
      syncStatus: syncStatus ?? null,
    });
  } catch (error) {
    return handleError(error);
  }
};

export const config: Config = {
  path: "/api/bootstrap",
  method: "GET",
};
