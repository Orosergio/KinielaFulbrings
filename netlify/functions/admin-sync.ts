import type { Config } from "@netlify/functions";
import { requirePlatformAdmin, requireUser } from "./_shared/auth";
import { handleError, json } from "./_shared/http";
import { syncMatchData } from "./_shared/sync-football";

export default async () => {
  try {
    const user = await requireUser();
    requirePlatformAdmin(user);
    return json(await syncMatchData());
  } catch (error) {
    return handleError(error);
  }
};

export const config: Config = {
  path: "/api/admin/sync",
  method: "POST",
};
