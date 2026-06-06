import { neon } from "@neondatabase/serverless";
import { HttpError } from "./http";

function databaseUrl() {
  const value = Netlify.env.get("DATABASE_URL");
  if (!value) {
    throw new HttpError(
      503,
      "La base de datos todavía no está conectada.",
      "DATABASE_NOT_CONFIGURED",
    );
  }
  return value;
}

export function db() {
  return neon(databaseUrl());
}
