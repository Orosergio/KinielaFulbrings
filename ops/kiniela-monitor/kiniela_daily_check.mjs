#!/usr/bin/env node
import { appendFile, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";

const DEFAULT_BASE_URL = "https://kiniela-mundial-2026.netlify.app";
const EXPECTED_MATCH_COUNT = Number(process.env.KINIELA_EXPECTED_MATCH_COUNT ?? "104");
const MAX_SYNC_AGE_SECONDS = Number(
  process.env.KINIELA_MAX_SYNC_AGE_SECONDS ?? "600",
);
const TIMEOUT_MS = Number(process.env.KINIELA_MONITOR_TIMEOUT_MS ?? "20000");

const monitorDir =
  process.env.KINIELA_MONITOR_DIR ??
  path.join(os.homedir(), ".openclaw", "kiniela-monitor");
const alertsFile =
  process.env.OPENCLAW_ALERTS_FILE ??
  path.join(os.homedir(), ".openclaw", "alerts.jsonl");

const baseUrl = new URL(process.env.KINIELA_BASE_URL ?? DEFAULT_BASE_URL);
const startedAt = new Date();

const routeExpectations = [
  { path: "/", status: 200, label: "frontend" },
  { path: "/api/bootstrap", status: 401, label: "bootstrap auth guard" },
  { path: "/api/predictions", status: 405, label: "predictions method guard" },
  { path: "/api/pools", status: 405, label: "pools method guard" },
];

function endpoint(relativePath) {
  return new URL(relativePath, baseUrl).toString();
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "user-agent": "kiniela-daily-check/1.0",
        ...(options.headers ?? {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function readJson(relativePath) {
  const url = endpoint(relativePath);
  const response = await fetchWithTimeout(url);
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (error) {
    return {
      ok: false,
      status: response.status,
      error: `Invalid JSON from ${relativePath}: ${
        error instanceof Error ? error.message : String(error)
      }`,
      bodyPreview: text.slice(0, 240),
    };
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}

async function checkRoute({ path: routePath, status, label }) {
  try {
    const response = await fetchWithTimeout(endpoint(routePath));
    return {
      name: label,
      ok: response.status === status,
      expected: status,
      actual: response.status,
      path: routePath,
    };
  } catch (error) {
    return {
      name: label,
      ok: false,
      expected: status,
      actual: "FETCH_ERROR",
      path: routePath,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function numberValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function buildHealthChecks(health) {
  if (!health.ok) {
    return [
      {
        name: "health endpoint",
        ok: false,
        expected: 200,
        actual: health.status,
        detail: health.error ?? "Health endpoint did not return OK",
      },
    ];
  }

  const data = health.data ?? {};
  return [
    {
      name: "health flag",
      ok: data.healthy === true,
      expected: true,
      actual: data.healthy,
    },
    {
      name: "match count",
      ok: numberValue(data.matchCount) === EXPECTED_MATCH_COUNT,
      expected: EXPECTED_MATCH_COUNT,
      actual: data.matchCount,
    },
    {
      name: "latest successful sync freshness",
      ok: numberValue(data.syncAgeSeconds) <= MAX_SYNC_AGE_SECONDS,
      expected: `<=${MAX_SYNC_AGE_SECONDS}`,
      actual: data.syncAgeSeconds,
    },
    {
      name: "provider saw all matches",
      ok: numberValue(data.matchesSeen) >= EXPECTED_MATCH_COUNT,
      expected: `>=${EXPECTED_MATCH_COUNT}`,
      actual: data.matchesSeen,
    },
    {
      name: "provider updated all matches",
      ok: numberValue(data.matchesUpdated) >= EXPECTED_MATCH_COUNT,
      expected: `>=${EXPECTED_MATCH_COUNT}`,
      actual: data.matchesUpdated,
    },
    {
      name: "prediction point mismatches",
      ok: numberValue(data.pointMismatches) === 0,
      expected: 0,
      actual: data.pointMismatches,
    },
    {
      name: "unfinished matches with points",
      ok: numberValue(data.unfinishedWithPoints) === 0,
      expected: 0,
      actual: data.unfinishedWithPoints,
    },
    {
      name: "finished matches without scores",
      ok: numberValue(data.finishedWithoutScores) === 0,
      expected: 0,
      actual: data.finishedWithoutScores,
    },
    {
      name: "past scheduled matches",
      ok: numberValue(data.pastScheduled) === 0,
      expected: 0,
      actual: data.pastScheduled,
    },
    {
      name: "future active matches",
      ok: numberValue(data.futureActive) === 0,
      expected: 0,
      actual: data.futureActive,
    },
  ];
}

function failureSummary(checks) {
  return checks
    .filter((check) => !check.ok)
    .map((check) => {
      const actual =
        check.actual === undefined ? "missing" : JSON.stringify(check.actual);
      return `${check.name}: expected ${check.expected}, got ${actual}`;
    });
}

function alertKey(summary) {
  const hash = createHash("sha256").update(summary.join("\n")).digest("hex");
  return `kiniela-prod-health-${hash.slice(0, 12)}`;
}

async function main() {
  await mkdir(monitorDir, { recursive: true });

  const health = await readJson("/api/health");
  const [routeChecks] = await Promise.all([
    Promise.all(routeExpectations.map(checkRoute)),
  ]);
  const checks = [...buildHealthChecks(health), ...routeChecks];
  const failures = failureSummary(checks);
  const ok = failures.length === 0;

  const run = {
    ok,
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    baseUrl: baseUrl.toString(),
    health: health.data ?? null,
    healthStatus: health.status,
    checks,
    failures,
    agentTask: ok
      ? null
      : "Investigate Kiniela production, fix the repo, deploy to Netlify, and verify /api/health returns healthy:true with zero scoring anomalies.",
  };

  await writeFile(
    path.join(monitorDir, "latest.json"),
    `${JSON.stringify(run, null, 2)}\n`,
  );
  await appendFile(path.join(monitorDir, "runs.jsonl"), `${JSON.stringify(run)}\n`);

  if (!ok) {
    await mkdir(path.dirname(alertsFile), { recursive: true });
    const alert = {
      key: alertKey(failures),
      ts: Date.now(),
      at: new Date().toISOString(),
      source: "kiniela-daily-check",
      severity: "error",
      project: "Kiniela Mundial 2026",
      summary: failures.join("; "),
      latest: path.join(monitorDir, "latest.json"),
      baseUrl: baseUrl.toString(),
      agentTask: run.agentTask,
    };
    await appendFile(alertsFile, `${JSON.stringify(alert)}\n`);
  }

  if (ok) {
    console.log(
      `Kiniela OK: ${baseUrl} (${health.data?.matchCount ?? "?"} matches, sync age ${
        health.data?.syncAgeSeconds ?? "?"
      }s)`,
    );
    return;
  }

  console.error(`Kiniela monitor failed: ${failures.join("; ")}`);
  process.exitCode = 2;
}

main().catch(async (error) => {
  const message = error instanceof Error ? error.message : String(error);
  await mkdir(monitorDir, { recursive: true });
  const run = {
    ok: false,
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    baseUrl: baseUrl.toString(),
    fatal: message,
  };
  await writeFile(
    path.join(monitorDir, "latest.json"),
    `${JSON.stringify(run, null, 2)}\n`,
  );
  await appendFile(path.join(monitorDir, "runs.jsonl"), `${JSON.stringify(run)}\n`);
  console.error(`Kiniela monitor fatal error: ${message}`);
  process.exit(2);
});
