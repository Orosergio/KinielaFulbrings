import type { Config } from "@netlify/functions";

export default async () => new Response("Not found", { status: 404 });

export const config: Config = {
  path: "/api/sync-matches",
};
