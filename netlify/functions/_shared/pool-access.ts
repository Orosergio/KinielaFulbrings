import { db } from "./db";
import { HttpError } from "./http";

export async function requirePoolMember(poolId: string, userId: string) {
  const sql = db();
  const [membership] = await sql`
    SELECT role
    FROM pool_members
    WHERE pool_id = ${poolId}::uuid AND user_id = ${userId}
  `;

  if (!membership) {
    throw new HttpError(403, "No perteneces a este grupo.", "NOT_A_POOL_MEMBER");
  }

  return membership as { role: "owner" | "admin" | "member" };
}
