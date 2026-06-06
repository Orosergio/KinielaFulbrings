import type { Config } from "@netlify/functions";
import { syncFootballData } from "./_shared/sync-football";

export default async () => {
  const result = await syncFootballData();
  console.log("Match sync:", result);
};

export const config: Config = {
  schedule: "*/2 * * * *",
};
