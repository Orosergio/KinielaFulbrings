import type { Config } from "@netlify/functions";
import { syncMatchData } from "./_shared/sync-football";

export default async () => {
  const result = await syncMatchData();
  console.log("Match sync:", result);
};

export const config: Config = {
  schedule: "*/2 * * * *",
};
