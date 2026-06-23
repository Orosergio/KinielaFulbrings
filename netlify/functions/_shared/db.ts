import { neon } from "@neondatabase/serverless";
import postgres from "postgres";
import { HttpError } from "./http";

export type SqlClient = {
  (
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<Record<string, unknown>[]>;
  query: (query: string) => Promise<unknown>;
};

let cachedPostgresUrl: string | null = null;
let cachedPostgresClient: SqlClient | null = null;

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

function databaseDriver() {
  return (Netlify.env.get("DATABASE_DRIVER") ?? "neon-http").toLowerCase();
}

function postgresSsl(url: string) {
  const configured = (
    Netlify.env.get("DATABASE_SSL") ??
    new URL(url).searchParams.get("sslmode") ??
    "require"
  ).toLowerCase();
  return ["0", "false", "disable", "disabled", "off"].includes(configured)
    ? false
    : "require";
}

function postgresMaxConnections() {
  const configured = Number(Netlify.env.get("DATABASE_MAX_CONNECTIONS") ?? "1");
  return Number.isInteger(configured) && configured > 0 ? configured : 1;
}

function standardPostgres(url: string) {
  if (cachedPostgresClient && cachedPostgresUrl === url) {
    return cachedPostgresClient;
  }

  const client = postgres(url, {
    max: postgresMaxConnections(),
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: postgresSsl(url),
  });

  cachedPostgresUrl = url;
  cachedPostgresClient = Object.assign(client, {
    query: (query: string) => client.unsafe(query),
  }) as SqlClient;
  return cachedPostgresClient;
}

export function db(): SqlClient {
  const url = databaseUrl();
  if (["postgres", "pg", "standard-postgres"].includes(databaseDriver())) {
    return standardPostgres(url);
  }

  return neon(url) as SqlClient;
}
