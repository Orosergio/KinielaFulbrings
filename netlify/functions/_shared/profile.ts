import type { User } from "@netlify/identity";
import { db } from "./db";

export async function upsertProfile(user: User) {
  const sql = db();
  const displayName =
    user.name?.trim() ||
    String(user.userMetadata?.full_name ?? "").trim() ||
    user.email?.split("@")[0] ||
    "Jugador";

  await sql`
    INSERT INTO profiles (id, email, display_name, avatar_url)
    VALUES (${user.id}, ${user.email ?? ""}, ${displayName}, ${user.pictureUrl ?? null})
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      display_name = EXCLUDED.display_name,
      avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
      updated_at = now()
  `;
}
