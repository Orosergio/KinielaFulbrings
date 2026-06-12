import type { Config } from "@netlify/functions";
import { syncMatchData } from "./_shared/sync-football";

export default async (request: Request) => {
  const payload = (await request.json().catch(() => null)) as {
    next_run?: string;
  } | null;
  const configuredSecret = Netlify.env.get("SYNC_SECRET");
  const suppliedSecret = request.headers.get("x-kiniela-sync-secret");
  const scheduled = Boolean(payload?.next_run);
  const authorizedManual =
    Boolean(configuredSecret) && suppliedSecret === configuredSecret;

  if (!scheduled && !authorizedManual) {
    return new Response("Not found", { status: 404 });
  }

  const result = await syncMatchData();
  console.log("Match sync:", result);
  return Response.json(result);
};

export const config: Config = {
  schedule: "*/2 * * * *",
};
