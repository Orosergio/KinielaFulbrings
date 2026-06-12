import { Check, Clock3, LockKeyhole, Minus, Plus, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import dataset from "../../data/worldcup-2026.json";
import { isLocked, ownPrediction } from "../lib/game";
import { translate } from "../lib/i18n";
import type {
  Language,
  Match,
  Member,
  Prediction,
  StaticStadium,
  StaticTeam,
} from "../types";

const teams = new Map(
  (dataset.teams as StaticTeam[]).map((team) => [Number(team.id), team]),
);
const stadiums = new Map(
  (dataset.stadiums as StaticStadium[]).map((stadium) => [
    Number(stadium.id),
    stadium,
  ]),
);

type Props = {
  match: Match;
  language: Language;
  currentUserId: string;
  predictions: Prediction[];
  members: Member[];
  onSave: (matchId: number, homeScore: number, awayScore: number) => Promise<void>;
  focus?: boolean;
};

function TeamSide({
  team,
  fallback,
  language,
}: {
  team?: StaticTeam;
  fallback?: string | null;
  language: Language;
}) {
  return (
    <div className="team-side">
      {team ? (
        <img src={team.flag} alt="" width="38" height="26" />
      ) : (
        <span className="flag-placeholder" aria-hidden="true" />
      )}
      <strong>{team?.name[language] ?? fallback ?? "TBD"}</strong>
      <small>{team?.fifaCode ?? "—"}</small>
    </div>
  );
}

function ScoreControl({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
}) {
  return (
    <div className="score-control">
      <button
        type="button"
        className="score-step"
        onClick={() => onChange(Math.max(0, value - 1))}
        title={`- ${label}`}
      >
        <Minus size={17} />
      </button>
      <input
        aria-label={label}
        inputMode="numeric"
        min={0}
        max={30}
        type="number"
        value={value}
        onChange={(event) =>
          onChange(Math.min(30, Math.max(0, Number(event.target.value))))
        }
      />
      <button
        type="button"
        className="score-step"
        onClick={() => onChange(Math.min(30, value + 1))}
        title={`+ ${label}`}
      >
        <Plus size={17} />
      </button>
    </div>
  );
}

export function MatchCard({
  match,
  language,
  currentUserId,
  predictions,
  members,
  onSave,
  focus = false,
}: Props) {
  const prediction = ownPrediction(predictions, match.id, currentUserId);
  const [homeScore, setHomeScore] = useState(prediction?.homeScore ?? 0);
  const [awayScore, setAwayScore] = useState(prediction?.awayScore ?? 0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const locked = isLocked(match, now);
  const home = match.homeTeamId ? teams.get(match.homeTeamId) : undefined;
  const away = match.awayTeamId ? teams.get(match.awayTeamId) : undefined;
  const stadium = match.stadiumId ? stadiums.get(match.stadiumId) : undefined;
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);

  useEffect(() => {
    setHomeScore(prediction?.homeScore ?? 0);
    setAwayScore(prediction?.awayScore ?? 0);
  }, [prediction?.awayScore, prediction?.homeScore]);

  useEffect(() => {
    setNow(Date.now());
    if (match.status !== "SCHEDULED") return;

    const kickoffAt = new Date(match.kickoffAt).getTime();
    const delay = kickoffAt - Date.now();
    if (delay <= 0) return;

    const timeout = window.setTimeout(
      () => setNow(Date.now()),
      Math.min(delay + 250, 2_147_483_647),
    );
    return () => window.clearTimeout(timeout);
  }, [match.kickoffAt, match.status]);

  const kickoff = useMemo(
    () =>
      new Intl.DateTimeFormat(language === "es" ? "es-MX" : "en-US", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(match.kickoffAt)),
    [language, match.kickoffAt],
  );

  const groupPredictions = predictions.filter(
    (item) => item.matchId === match.id && item.userId !== currentUserId,
  );
  const statusLabel =
    match.status === "LIVE"
      ? `${t("live")}${match.minute ? ` · ${match.minute}'` : ""}`
      : match.status === "FINISHED"
        ? t("finished")
        : match.status === "PAUSED"
          ? t("paused")
          : match.status === "POSTPONED"
            ? t("postponed")
            : match.status === "CANCELLED"
              ? t("cancelled")
              : locked
                ? t("locked")
                : prediction
                  ? t("saved")
                  : t("pending");

  async function save() {
    if (isLocked(match, Date.now())) {
      setSaved(false);
      setError(
        language === "es"
          ? "El partido ya comenzó. La predicción quedó bloqueada."
          : "The match has started. This prediction is locked.",
      );
      setNow(Date.now());
      return;
    }

    setSaving(true);
    setSaved(false);
    setError("");
    try {
      await onSave(match.id, homeScore, awayScore);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Request failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className={`match-card ${focus ? "focus-card" : ""}`}>
      <header className="match-meta">
        <span>
          #{match.id} ·{" "}
          {match.stage === "group"
            ? `${t("groupStage")} ${match.groupName ?? ""}`
            : t("knockout")}
        </span>
        <span className={`status status-${match.status.toLowerCase()}`}>
          {match.status === "LIVE" && <span className="live-dot" />}
          {statusLabel}
        </span>
      </header>

      <div className="match-time">
        <Clock3 size={15} />
        <span>{kickoff}</span>
        {stadium && <span>· {stadium.city}</span>}
      </div>

      <div className="match-teams">
        <TeamSide team={home} fallback={match.homeLabel} language={language} />
        {locked && match.homeScore !== null && match.awayScore !== null ? (
          <div className="actual-score" aria-label="Score">
            {match.homeScore}
            <span>:</span>
            {match.awayScore}
          </div>
        ) : (
          <span className="versus">VS</span>
        )}
        <TeamSide team={away} fallback={match.awayLabel} language={language} />
      </div>

      {!locked && home && away ? (
        <div className="pick-editor">
          <ScoreControl
            value={homeScore}
            onChange={setHomeScore}
            label={home.name[language]}
          />
          <span className="score-divider">:</span>
          <ScoreControl
            value={awayScore}
            onChange={setAwayScore}
            label={away.name[language]}
          />
          <button className="primary-button save-pick" onClick={save} disabled={saving}>
            {saved ? <Check size={18} /> : <Save size={18} />}
            {saving ? "…" : saved ? t("saved") : t("save")}
          </button>
        </div>
      ) : prediction ? (
        <div className="sealed-pick">
          <LockKeyhole size={17} />
          <span>
            {language === "es" ? "Tu pick" : "Your pick"}:{" "}
            <strong>
              {prediction.homeScore} : {prediction.awayScore}
            </strong>
          </span>
          {prediction.points !== null && (
            <b>
              +{prediction.points} {t("points")}
            </b>
          )}
        </div>
      ) : (
        <div className="sealed-pick muted">
          <LockKeyhole size={17} />
          <span>
            {language === "es"
              ? "El cierre pasó sin un pick guardado."
              : "The deadline passed without a saved pick."}
          </span>
        </div>
      )}

      {error && <p className="inline-error">{error}</p>}

      <div className="group-picks">
        <span className="group-picks-label">
          {language === "es" ? "Picks del grupo" : "Pool picks"}
        </span>
        {groupPredictions.length ? (
          groupPredictions.map((item) => (
            <span className="member-pick" key={item.userId}>
              {members.find((member) => member.id === item.userId)?.displayName ??
                "Jugador"}{" "}
              <b>
                {item.homeScore}-{item.awayScore}
              </b>
            </span>
          ))
        ) : (
          <span className="muted-text">{t("reveal")}</span>
        )}
      </div>
    </article>
  );
}
