import {
  handleAuthCallback,
  getUser,
  logout,
  onAuthChange,
  type User as IdentityUser,
} from "@netlify/identity";
import {
  CalendarDays,
  ChevronDown,
  CircleUserRound,
  Copy,
  Award,
  House,
  Languages,
  LayoutGrid,
  ListChecks,
  LockKeyhole,
  LogOut,
  Moon,
  Plus,
  RadioTower,
  RefreshCw,
  Sun,
  Trophy,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import dataset from "../data/worldcup-2026.json";
import { AuthScreen } from "./components/AuthScreen";
import { MatchCard } from "./components/MatchCard";
import { PasswordSetup } from "./components/PasswordSetup";
import { PoolDialog } from "./components/PoolDialog";
import { createPool, getBootstrap, joinPool, savePrediction } from "./lib/api";
import { bracketMatches, bracketMatchLabel, bracketStages } from "./lib/bracket";
import { demoBootstrap } from "./lib/demo";
import {
  calendarMatches,
  hasPenaltyShootout,
  isPickable,
  matchWinnerSide,
  pendingMatches,
  scoreLabel,
  syncHealth as getSyncHealth,
  type SyncHealth,
} from "./lib/game";
import { translate } from "./lib/i18n";
import type {
  BootstrapData,
  Language,
  Match,
  Theme,
  StaticTeam,
  View,
} from "./types";

const demoMode = import.meta.env.VITE_DEMO_MODE === "true";
const staticTeams = new Map(
  (dataset.teams as StaticTeam[]).map((team) => [Number(team.id), team]),
);

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatDay(date: string, language: Language) {
  return new Intl.DateTimeFormat(language === "es" ? "es-MX" : "en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(date));
}

function dayKey(date: string) {
  const value = new Date(date);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function Leaderboard({
  data,
  compact = false,
}: {
  data: BootstrapData;
  compact?: boolean;
}) {
  return (
    <ol className={`leaderboard ${compact ? "compact" : ""}`}>
      {data.leaderboard.map((row, index) => (
        <li className={row.userId === data.currentUser.id ? "is-me" : ""} key={row.userId}>
          <span className="rank">{index + 1}</span>
          <span className="avatar">{initials(row.displayName)}</span>
          <span className="leader-name">
            <strong>{row.displayName}</strong>
            {!compact && <small>{row.exacts} exactos</small>}
          </span>
          <b>{row.points}</b>
          <small>pts</small>
        </li>
      ))}
    </ol>
  );
}

function formatSyncTime(value: string | null, language: Language) {
  if (!value) return language === "es" ? "sin registro" : "not recorded";
  return new Intl.DateTimeFormat(language === "es" ? "es-MX" : "en-US", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function syncHealthMessage(health: SyncHealth, language: Language) {
  if (health.state === "healthy") {
    return language === "es"
      ? "Marcadores conectados y verificados."
      : "Scores connected and verified.";
  }
  if (health.state === "syncing") {
    return language === "es"
      ? "Actualizando marcadores ahora."
      : "Updating scores now.";
  }

  switch (health.reason) {
    case "failed":
      return language === "es"
        ? "La última actualización falló."
        : "The latest score update failed.";
    case "stale":
      return language === "es"
        ? "Los marcadores están atrasados."
        : "Score updates are delayed.";
    case "incomplete":
      return language === "es"
        ? "El proveedor devolvió información incompleta."
        : "The provider returned incomplete data.";
    default:
      return language === "es"
        ? "No hay una actualización válida registrada."
        : "No valid score update is recorded.";
  }
}

function RulesDashboard({
  data,
  language,
}: {
  data: BootstrapData;
  language: Language;
}) {
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const rules = [
    {
      points: 7,
      title: language === "es" ? "Marcador exacto" : "Exact score",
      body:
        language === "es"
          ? "Aciertas ganador/empate y ambos goles."
          : "You hit winner/draw and both goal totals.",
    },
    {
      points: 4,
      title: language === "es" ? "Signo + un gol" : "Result + one goal",
      body:
        language === "es"
          ? "Aciertas el signo y un marcador de equipo."
          : "You hit the result and one team's score.",
    },
    {
      points: 3,
      title: language === "es" ? "Solo signo" : "Result only",
      body:
        language === "es"
          ? "Aciertas local, empate o visita."
          : "You hit home win, draw, or away win.",
    },
    {
      points: 1,
      title: language === "es" ? "Un gol exacto" : "One exact goal",
      body:
        language === "es"
          ? "Aciertas los goles de un equipo, aunque falle el signo."
          : "You hit one team's goals, even with the wrong result.",
    },
  ];
  const sync = data.syncStatus;
  const health = getSyncHealth(sync, data.serverNow, data.matches.length);

  return (
    <section className="command-section">
      <div className="section-heading">
        <div>
          <Award size={19} />
          <h2>{language === "es" ? "Reglas y dashboard" : "Rules and dashboard"}</h2>
        </div>
      </div>

      <div className="command-grid">
        <div className="rules-panel">
          <div className="score-rules-grid">
            {rules.map((rule) => (
              <article className="score-rule" key={rule.points}>
                <strong>{rule.points}</strong>
                <span>{t("points")}</span>
                <h3>{rule.title}</h3>
                <p>{rule.body}</p>
              </article>
            ))}
          </div>

          <div className="rule-notes">
            <article>
              <LockKeyhole size={18} />
              <div>
                <strong>{language === "es" ? "Cierre automático" : "Automatic lock"}</strong>
                <p>
                  {language === "es"
                    ? "Cada pick se bloquea al kickoff. La UI se cierra sola y PostgreSQL también rechaza cambios tardíos."
                    : "Each pick locks at kickoff. The UI closes itself and PostgreSQL also rejects late changes."}
                </p>
              </div>
            </article>
            <article className={`sync-note sync-${health.state}`}>
              <RadioTower size={18} />
              <div>
                <strong>{language === "es" ? "Marcadores en vivo" : "Live scores"}</strong>
                <p>
                  {health.state !== "healthy"
                    ? syncHealthMessage(health, language)
                    : sync
                    ? `${sync.provider} · ${sync.matchesUpdated}/${data.matches.length} ${language === "es" ? "partidos conectados" : "matches connected"} · ${formatSyncTime(sync.finishedAt, language)}`
                    : language === "es"
                      ? "Sin sincronización registrada todavía."
                      : "No sync run recorded yet."}
                </p>
              </div>
            </article>
          </div>
        </div>

        <aside className="standings-panel leaderboard-dashboard">
          <div className="section-heading">
            <div>
              <Trophy size={19} />
              <h2>{t("leaderboard")}</h2>
            </div>
          </div>
          <Leaderboard data={data} />
        </aside>
      </div>
    </section>
  );
}

function EmptyPool({
  language,
  onOpen,
}: {
  language: Language;
  onOpen: () => void;
}) {
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  return (
    <section className="empty-pool">
      <span className="empty-icon">
        <Users size={30} />
      </span>
      <h1>{t("noPool")}</h1>
      <p>{t("noPoolDetail")}</p>
      <button className="primary-button" onClick={onOpen}>
        <Plus size={18} />
        {t("manageGroups")}
      </button>
    </section>
  );
}

type AppContentProps = {
  data: BootstrapData;
  language: Language;
  view: View;
  setView: (view: View) => void;
  refresh: () => Promise<void>;
  save: (matchId: number, homeScore: number, awayScore: number) => Promise<void>;
  openPools: () => void;
};

function Dashboard({
  data,
  language,
  setView,
  save,
}: Pick<AppContentProps, "data" | "language" | "setView" | "save">) {
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const pending = pendingMatches(
    data.matches,
    data.predictions,
    data.currentUser.id,
  );
  const available = data.matches.filter((match) => isPickable(match));
  const completed = Math.max(0, available.length - pending.length);
  const progress = available.length ? (completed / available.length) * 100 : 100;
  const live = data.matches.filter((match) => match.status === "LIVE");
  const upcoming = data.matches
    .filter((match) => new Date(match.kickoffAt).getTime() > Date.now())
    .slice(0, 3);
  const recentResults = data.matches
    .filter((match) => match.status === "FINISHED")
    .sort(
      (left, right) =>
        new Date(right.kickoffAt).getTime() - new Date(left.kickoffAt).getTime(),
    )
    .slice(0, 3);
  const next = pending[0];
  const health = getSyncHealth(
    data.syncStatus,
    data.serverNow,
    data.matches.length,
  );

  return (
    <>
      <section className="welcome-row">
        <div>
          <p className="eyebrow">KINIELA MUNDIAL 2026</p>
          <h1>
            {language === "es"
              ? `Hola, ${data.currentUser.displayName}`
              : `Hi, ${data.currentUser.displayName}`}
          </h1>
        </div>
        <p className={`server-status sync-${health.state}`}>
          <span />
          {syncHealthMessage(health, language)}
        </p>
      </section>

      <section className="progress-band">
        <div className="progress-copy">
          <span className="progress-number">
            {completed}
            <small>/{available.length}</small>
          </span>
          <div>
            <h2>{pending.length ? `${pending.length} ${t("pending")}` : t("allDone")}</h2>
            <p>
              {next
                ? `${t("nextDeadline")}: ${formatDay(next.kickoffAt, language)}`
                : t("allDoneDetail")}
            </p>
          </div>
        </div>
        <div className="progress-track" aria-label={`${Math.round(progress)}%`}>
          <span style={{ width: `${progress}%` }} />
        </div>
        <button className="primary-button" onClick={() => setView("picks")}>
          <ListChecks size={18} />
          {t("continue")}
        </button>
      </section>

      {live.length > 0 && (
        <section className="page-section">
          <div className="section-heading">
            <div>
              <span className="live-dot" />
              <h2>{t("live")}</h2>
            </div>
          </div>
          <div className="match-grid">
            {live.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                language={language}
                currentUserId={data.currentUser.id}
                predictions={data.predictions}
                members={data.members}
                onSave={save}
              />
            ))}
          </div>
        </section>
      )}

      <div className="dashboard-grid">
        <div className="dashboard-main">
          <section className="page-section">
            <div className="section-heading">
              <div>
                <CalendarDays size={19} />
                <h2>{t("upcoming")}</h2>
              </div>
              <button className="text-button" onClick={() => setView("picks")}>
                {language === "es" ? "Ver todos" : "View all"}
              </button>
            </div>
            <div className="match-list">
              {upcoming.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  language={language}
                  currentUserId={data.currentUser.id}
                  predictions={data.predictions}
                  members={data.members}
                  onSave={save}
                />
              ))}
            </div>
          </section>

          {recentResults.length > 0 && (
            <section className="page-section">
              <div className="section-heading">
                <div>
                  <Trophy size={19} />
                  <h2>{t("recentResults")}</h2>
                </div>
                <button className="text-button" onClick={() => setView("picks")}>
                  {language === "es" ? "Ver calendario" : "View calendar"}
                </button>
              </div>
              <div className="match-list">
                {recentResults.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    language={language}
                    currentUserId={data.currentUser.id}
                    predictions={data.predictions}
                    members={data.members}
                    onSave={save}
                  />
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="standings-panel">
          <div className="section-heading">
            <div>
              <Trophy size={19} />
              <h2>{t("leaderboard")}</h2>
            </div>
            <button className="text-button" onClick={() => setView("group")}>
              {language === "es" ? "Detalle" : "Details"}
            </button>
          </div>
          <Leaderboard data={data} compact />
        </aside>
      </div>
    </>
  );
}

function PicksView({
  data,
  language,
  save,
}: Pick<AppContentProps, "data" | "language" | "save">) {
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const pending = pendingMatches(data.matches, data.predictions, data.currentUser.id);
  const matches = calendarMatches(data.matches);
  const days = Array.from(new Set(matches.map((match) => dayKey(match.kickoffAt))));
  const today = dayKey(new Date().toISOString());
  const initialDay = days.includes(today)
    ? today
    : pending[0]
      ? dayKey(pending[0].kickoffAt)
      : days[days.length - 1];
  const [selectedDay, setSelectedDay] = useState(initialDay ?? "");
  const dateStripRef = useRef<HTMLDivElement>(null);
  const focus = pending[0];
  const dayMatches = matches.filter(
    (match) =>
      dayKey(match.kickoffAt) === selectedDay && match.id !== focus?.id,
  );

  useEffect(() => {
    if (!selectedDay || !days.includes(selectedDay)) {
      setSelectedDay(initialDay ?? "");
    }
  }, [days, initialDay, selectedDay]);

  useEffect(() => {
    const active = dateStripRef.current?.querySelector<HTMLButtonElement>(
      "button.active",
    );
    active?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [selectedDay]);

  return (
    <>
      <section className="page-title">
        <p className="eyebrow">PICK CENTER</p>
        <h1>{t("picks")}</h1>
        <p>
          {language === "es"
            ? "Un solo lugar para anotar. Cada pick se cierra automáticamente al comenzar."
            : "One place to pick. Every prediction locks automatically at kickoff."}
        </p>
      </section>

      {focus && (
        <section className="focus-section">
          <div className="section-heading">
            <div>
              <ListChecks size={19} />
              <h2>{t("focus")}</h2>
            </div>
            <span className="counter-pill">
              {pending.length} {t("pending")}
            </span>
          </div>
          <MatchCard
            key={focus.id}
            focus
            match={focus}
            language={language}
            currentUserId={data.currentUser.id}
            predictions={data.predictions}
            members={data.members}
            onSave={save}
          />
        </section>
      )}

      <section className="page-section">
        <div className="date-strip" aria-label="Match dates" ref={dateStripRef}>
          {days.map((day) => {
            const matchesForDay = matches.filter(
              (match) => dayKey(match.kickoffAt) === day,
            );
            const representative = matchesForDay[0];
            const isPast = matchesForDay.every(
              (match) => new Date(match.kickoffAt).getTime() <= Date.now(),
            );
            const count = pending.filter(
              (match) => dayKey(match.kickoffAt) === day,
            ).length;
            return (
              <button
                className={[
                  selectedDay === day ? "active" : "",
                  isPast ? "past" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                key={day}
                onClick={() => setSelectedDay(day)}
              >
                <span>{representative ? formatDay(representative.kickoffAt, language) : day}</span>
                {count > 0 && <b>{count}</b>}
              </button>
            );
          })}
        </div>
        <div className="match-list roomy">
          {dayMatches.length ? (
            dayMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                language={language}
                currentUserId={data.currentUser.id}
                predictions={data.predictions}
                members={data.members}
                onSave={save}
              />
            ))
          ) : (
            <p className="empty-message">{t("noMatches")}</p>
          )}
        </div>
      </section>
    </>
  );
}

function GroupView({
  data,
  language,
}: Pick<AppContentProps, "data" | "language">) {
  const [copied, setCopied] = useState(false);
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const pool = data.pools.find((item) => item.id === data.selectedPoolId);
  if (!pool) return null;

  async function copyCode() {
    await navigator.clipboard.writeText(pool?.code ?? "");
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <>
      <section className="page-title group-title">
        <div>
          <p className="eyebrow">{language === "es" ? "TU QUINIELA" : "YOUR POOL"}</p>
          <h1>{pool.name}</h1>
          <p>
            {pool.memberCount} {t("members").toLowerCase()}
          </p>
        </div>
        <div className="invite-block">
          <span>{t("invite")}</span>
          <strong>{pool.code}</strong>
          <button className="secondary-button" onClick={copyCode}>
            <Copy size={17} />
            {copied ? t("copied") : t("copy")}
          </button>
        </div>
      </section>

      <RulesDashboard data={data} language={language} />

      <div className="group-grid members-only">
        <section className="members-panel">
          <div className="section-heading">
            <div>
              <Users size={19} />
              <h2>{t("members")}</h2>
            </div>
          </div>
          <ul className="member-list">
            {data.members.map((member) => (
              <li key={member.id}>
                <span className="avatar">{initials(member.displayName)}</span>
                <span>
                  <strong>{member.displayName}</strong>
                  <small>{member.role}</small>
                </span>
                {member.id === data.currentUser.id && (
                  <b>{language === "es" ? "Tú" : "You"}</b>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

function BracketView({
  data,
  language,
}: Pick<AppContentProps, "data" | "language">) {
  const stages = bracketStages(language);
  const knockoutMatches = stages.flatMap((stage) =>
    bracketMatches(data.matches, stage),
  );
  const completedMatches = knockoutMatches.filter(
    (match) => match.status === "FINISHED",
  ).length;
  const penaltyDecisions = knockoutMatches.filter(hasPenaltyShootout).length;
  const nextMatch = knockoutMatches
    .filter((match) => match.status === "SCHEDULED")
    .sort(
      (left, right) =>
        new Date(left.kickoffAt).getTime() -
          new Date(right.kickoffAt).getTime() || left.id - right.id,
    )[0];

  const matchDate = (match: Match) =>
    new Intl.DateTimeFormat(language === "es" ? "es-MX" : "en-US", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(match.kickoffAt));

  const teamInfo = (match: Match, side: "home" | "away") => {
    const teamId = side === "home" ? match.homeTeamId : match.awayTeamId;
    const fallback = side === "home" ? match.homeLabel : match.awayLabel;
    const team = teamId ? staticTeams.get(teamId) : undefined;
    return {
      team,
      name:
        team?.name[language] ??
        fallback ??
        (language === "es" ? "Por definir" : "To be decided"),
      code: team?.fifaCode ?? "TBD",
    };
  };

  const statusText = (match: Match) => {
    if (match.status === "FINISHED") return language === "es" ? "Final" : "FT";
    if (match.status === "LIVE") return language === "es" ? "En vivo" : "Live";
    if (match.status === "PAUSED") return language === "es" ? "Pausa" : "Paused";
    return language === "es" ? "Por jugar" : "Upcoming";
  };

  const renderTeam = (match: Match, side: "home" | "away") => {
    const info = teamInfo(match, side);
    const winner = matchWinnerSide(match) === side;
    return (
      <div
        className={[
          "bracket-team",
          winner ? "is-winner" : "",
          info.team ? "" : "is-placeholder",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {info.team ? (
          <img src={info.team.flag} alt="" width="28" height="20" />
        ) : (
          <span className="bracket-flag-placeholder" aria-hidden="true" />
        )}
        <span>
          <strong>{info.name}</strong>
          <small>{winner ? (language === "es" ? "Avanza" : "Advances") : info.code}</small>
        </span>
        <b>{scoreLabel(match, side)}</b>
      </div>
    );
  };

  return (
    <>
      <section className="bracket-hero">
        <div>
          <p className="eyebrow">ROAD TO NEW YORK NEW JERSEY</p>
          <h1>{language === "es" ? "Camino a la final" : "Road to the final"}</h1>
          <p>
            {language === "es"
              ? "Cruces, ganadores y definiciones por penales en un solo mapa."
              : "Matchups, winners, and penalty shootouts in one map."}
          </p>
        </div>
        <div className="bracket-hero-stats" aria-label="Knockout summary">
          <article>
            <Trophy size={18} />
            <span>{completedMatches}</span>
            <small>{language === "es" ? "cerrados" : "finished"}</small>
          </article>
          <article>
            <Award size={18} />
            <span>{penaltyDecisions}</span>
            <small>{language === "es" ? "por penales" : "on pens"}</small>
          </article>
          <article>
            <CalendarDays size={18} />
            <span>{nextMatch ? `#${nextMatch.id}` : "-"}</span>
            <small>
              {nextMatch
                ? matchDate(nextMatch)
                : language === "es"
                  ? "sin pendientes"
                  : "none left"}
            </small>
          </article>
        </div>
      </section>

      <section className="bracket-board" aria-label="Tournament bracket">
        {stages.map((stage) => (
          <div className={`bracket-column stage-${stage.id}`} key={stage.id}>
            <div className="bracket-column-title">
              <h2>{stage.label}</h2>
              <span>{bracketMatches(data.matches, stage).length}</span>
            </div>
            <div className="bracket-matches">
              {bracketMatches(data.matches, stage).map((match) => {
                  const hasShootout = hasPenaltyShootout(match);
                  return (
                    <article
                      className={[
                        "bracket-match",
                        match.status === "FINISHED" ? "is-finished" : "",
                        hasShootout ? "has-shootout" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      key={match.id}
                    >
                      <header className="bracket-match-meta">
                        <span>
                          #{match.id} · {bracketMatchLabel(match, language)}
                        </span>
                        <small>{matchDate(match)}</small>
                        <b>{statusText(match)}</b>
                      </header>
                      {renderTeam(match, "home")}
                      {renderTeam(match, "away")}
                      {hasShootout && (
                        <div className="shootout-ribbon">
                          <span>{language === "es" ? "Penales" : "Pens"}</span>
                          <strong>
                            {match.homePenaltyScore}-{match.awayPenaltyScore}
                          </strong>
                        </div>
                      )}
                    </article>
                  );
                })}
            </div>
          </div>
        ))}
      </section>
    </>
  );
}

function AppContent(props: AppContentProps) {
  const health = getSyncHealth(
    props.data.syncStatus,
    props.data.serverNow,
    props.data.matches.length,
  );
  let content;

  if (!props.data.selectedPoolId) {
    content = <EmptyPool language={props.language} onOpen={props.openPools} />;
  } else if (props.view === "picks") {
    content = <PicksView {...props} />;
  } else if (props.view === "group") {
    content = <GroupView {...props} />;
  } else if (props.view === "bracket") {
    content = <BracketView {...props} />;
  } else {
    content = <Dashboard {...props} />;
  }

  return (
    <>
      {health.state === "error" && health.reason !== "missing" && (
        <section className="sync-alert" role="alert">
          <RadioTower size={20} />
          <div>
            <strong>
              {props.language === "es"
                ? "Actualización de marcadores interrumpida"
                : "Score updates interrupted"}
            </strong>
            <p>{syncHealthMessage(health, props.language)}</p>
          </div>
          <button className="secondary-button" onClick={() => void props.refresh()}>
            <RefreshCw size={16} />
            {props.language === "es" ? "Revisar estado" : "Check status"}
          </button>
        </section>
      )}
      {content}
    </>
  );
}

export default function App() {
  const [language, setLanguage] = useState<Language>(
    () => (localStorage.getItem("kiniela-language") as Language) || "es",
  );
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem("kiniela-theme") as Theme) || "light",
  );
  const [view, setView] = useState<View>("home");
  const [identityUser, setIdentityUser] = useState<IdentityUser | null>(null);
  const [authAction, setAuthAction] = useState<
    { type: "recovery" } | { type: "invite"; token: string } | null
  >(null);
  const [authLoading, setAuthLoading] = useState(!demoMode);
  const [data, setData] = useState<BootstrapData | null>(
    demoMode ? demoBootstrap() : null,
  );
  const [loading, setLoading] = useState(!demoMode);
  const [error, setError] = useState("");
  const [poolDialog, setPoolDialog] = useState(false);
  const [profileMenu, setProfileMenu] = useState(false);
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("kiniela-theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = language;
    localStorage.setItem("kiniela-language", language);
  }, [language]);

  useEffect(() => {
    if (demoMode) return;
    let active = true;
    void (async () => {
      try {
        const result = await handleAuthCallback();
        if (result?.type === "recovery") {
          setAuthAction({ type: "recovery" });
        } else if (result?.type === "invite" && result.token) {
          setAuthAction({ type: "invite", token: result.token });
        }
        const user = await getUser();
        if (active) setIdentityUser(user);
      } finally {
        if (active) setAuthLoading(false);
      }
    })();
    const unsubscribe = onAuthChange((_event, user) => {
      setIdentityUser(user);
      setAuthLoading(false);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const refresh = useCallback(
    async (poolId?: string) => {
      if (demoMode) return;
      setError("");
      try {
        const selected =
          poolId ??
          data?.selectedPoolId ??
          localStorage.getItem("kiniela-pool") ??
          undefined;
        const nextData = await getBootstrap(selected);
        setData(nextData);
        if (nextData.selectedPoolId) {
          localStorage.setItem("kiniela-pool", nextData.selectedPoolId);
        }
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Request failed");
      } finally {
        setLoading(false);
      }
    },
    [data?.selectedPoolId],
  );

  useEffect(() => {
    if (!demoMode && identityUser) void refresh();
  }, [identityUser, refresh]);

  useEffect(() => {
    if (!identityUser || demoMode) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 30_000);
    return () => window.clearInterval(interval);
  }, [identityUser, refresh]);

  const save = useCallback(
    async (matchId: number, homeScore: number, awayScore: number) => {
      if (!data?.selectedPoolId) throw new Error("Select a pool");
      const match = data.matches.find((item) => item.id === matchId);
      if (!match || !isPickable(match)) {
        throw new Error(
          language === "es"
            ? "Este partido ya no acepta picks."
            : "This match no longer accepts picks.",
        );
      }

      if (demoMode) {
        setData((current) => {
          if (!current) return current;
          const rest = current.predictions.filter(
            (prediction) =>
              !(
                prediction.userId === current.currentUser.id &&
                prediction.matchId === matchId
              ),
          );
          return {
            ...current,
            predictions: [
              ...rest,
              {
                userId: current.currentUser.id,
                matchId,
                homeScore,
                awayScore,
                points: null,
                updatedAt: new Date().toISOString(),
              },
            ],
          };
        });
        return;
      }
      const result = await savePrediction({
        poolId: data.selectedPoolId,
        matchId,
        homeScore,
        awayScore,
      });
      setData((current) => {
        if (!current) return current;
        return {
          ...current,
          predictions: [
            ...current.predictions.filter(
              (prediction) =>
                !(
                  prediction.userId === result.prediction.userId &&
                  prediction.matchId === result.prediction.matchId
                ),
            ),
            result.prediction,
          ],
        };
      });
    },
    [data?.matches, data?.selectedPoolId, language],
  );

  async function addPool(mode: "create" | "join", value: string) {
    if (demoMode) {
      setPoolDialog(false);
      return;
    }
    const result = mode === "create" ? await createPool(value) : await joinPool(value);
    await refresh(result.pool.id);
    setPoolDialog(false);
  }

  async function signOut() {
    if (!demoMode) await logout();
    setIdentityUser(null);
    setData(null);
    setProfileMenu(false);
  }

  if (authLoading) {
    return <div className="full-loader">{t("loading")}</div>;
  }

  if (authAction) {
    return (
      <PasswordSetup
        language={language}
        inviteToken={authAction.type === "invite" ? authAction.token : undefined}
        onComplete={() => {
          setAuthAction(null);
          void getUser().then(setIdentityUser);
        }}
      />
    );
  }

  if (!demoMode && !identityUser) {
    return <AuthScreen language={language} />;
  }

  if (loading || !data) {
    return <div className="full-loader">{t("loading")}</div>;
  }

  const currentPool = data.pools.find((pool) => pool.id === data.selectedPoolId);
  const nav: { id: View; label: string; icon: typeof House }[] = [
    { id: "home", label: t("home"), icon: House },
    { id: "picks", label: t("picks"), icon: ListChecks },
    { id: "group", label: t("group"), icon: Users },
    { id: "bracket", label: t("bracket"), icon: LayoutGrid },
  ];

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setView("home")}>
          <span className="brand-mark">26</span>
          <span>
            <strong>Kiniela</strong>
            <small>Mundial 2026</small>
          </span>
        </button>

        <button className="pool-switcher" onClick={() => setPoolDialog(true)}>
          <Users size={17} />
          <span>{currentPool?.name ?? t("manageGroups")}</span>
          <ChevronDown size={16} />
        </button>

        <div className="topbar-actions">
          <button
            className="icon-button"
            title={language === "es" ? "English" : "Español"}
            onClick={() => setLanguage(language === "es" ? "en" : "es")}
          >
            <Languages size={19} />
          </button>
          <button
            className="icon-button"
            title={theme === "light" ? "Dark mode" : "Light mode"}
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          >
            {theme === "light" ? <Moon size={19} /> : <Sun size={19} />}
          </button>
          <div className="profile">
            <button
              className="profile-button"
              onClick={() => setProfileMenu((open) => !open)}
            >
              <span className="avatar">{initials(data.currentUser.displayName)}</span>
              <span>{data.currentUser.displayName}</span>
              <ChevronDown size={15} />
            </button>
            {profileMenu && (
              <div className="profile-menu">
                <span>{data.currentUser.email}</span>
                <button onClick={signOut}>
                  <LogOut size={16} />
                  {t("signOut")}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <aside className="sidebar">
        <nav>
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={view === item.id ? "active" : ""}
                key={item.id}
                onClick={() => setView(item.id)}
                title={item.label}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <button className="sidebar-pool" onClick={() => setPoolDialog(true)}>
          <Plus size={19} />
          <span>{t("manageGroups")}</span>
        </button>
      </aside>

      <main className="app-content">
        {error ? (
          <section className="error-state">
            <CircleUserRound size={34} />
            <h1>{t("errorTitle")}</h1>
            <p>{error}</p>
            <button className="primary-button" onClick={() => void refresh()}>
              <RefreshCw size={17} />
              {t("retry")}
            </button>
          </section>
        ) : (
          <AppContent
            data={data}
            language={language}
            view={view}
            setView={setView}
            refresh={() => refresh()}
            save={save}
            openPools={() => setPoolDialog(true)}
          />
        )}
      </main>

      <nav className="mobile-nav">
        {nav.map((item) => {
          const Icon = item.icon;
          return (
            <button
              className={view === item.id ? "active" : ""}
              key={item.id}
              onClick={() => setView(item.id)}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {poolDialog && (
        <PoolDialog
          language={language}
          onClose={() => setPoolDialog(false)}
          onCreate={(name) => addPool("create", name)}
          onJoin={(code) => addPool("join", code)}
        />
      )}
    </div>
  );
}
