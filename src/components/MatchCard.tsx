import { Check, Clock3, LockKeyhole, Minus, Plus, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import dataset from "../../data/worldcup-2026.json";
import {
  effectiveMatchStatus,
  hasPenaltyShootout,
  isKnockoutStage,
  isLocked,
  matchWinnerSide,
  ownPrediction,
  predictedAdvancingSide,
} from "../lib/game";
import { translate } from "../lib/i18n";
import type {
  Language,
  Match,
  MatchWinnerSide,
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
  onSave: (
    matchId: number,
    homeScore: number,
    awayScore: number,
    advancingSide: MatchWinnerSide | null,
  ) => Promise<void>;
  focus?: boolean;
};

function TeamSide({
  team,
  fallback,
  language,
  winner,
}: {
  team?: StaticTeam;
  fallback?: string | null;
  language: Language;
  winner?: boolean;
}) {
  return (
    <div className={`team-side ${winner ? "winner" : ""}`}>
      {team ? (
        <img src={team.flag} alt="" width="38" height="26" />
      ) : (
        <span className="flag-placeholder" aria-hidden="true" />
      )}
      <strong>{team?.name[language] ?? fallback ?? "TBD"}</strong>
      <small>
        {winner
          ? language === "es"
            ? "Avanza"
            : "Advances"
          : team?.fifaCode ?? "-"}
      </small>
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

function sideTeam(
  side: MatchWinnerSide,
  home?: StaticTeam,
  away?: StaticTeam,
) {
  return side === "home" ? home : away;
}

function sideName({
  side,
  language,
  home,
  away,
  match,
}: {
  side: MatchWinnerSide;
  language: Language;
  home?: StaticTeam;
  away?: StaticTeam;
  match: Match;
}) {
  const team = sideTeam(side, home, away);
  const fallback = side === "home" ? match.homeLabel : match.awayLabel;
  return team?.name[language] ?? fallback ?? "TBD";
}

function sideCode({
  side,
  home,
  away,
}: {
  side: MatchWinnerSide;
  home?: StaticTeam;
  away?: StaticTeam;
}) {
  return sideTeam(side, home, away)?.fifaCode ?? side.toUpperCase();
}

function pointsBreakdown(prediction: Prediction, language: Language) {
  const pieces: string[] = [];
  if (prediction.scorePoints !== null) {
    pieces.push(
      `${language === "es" ? "marcador" : "score"} +${prediction.scorePoints}`,
    );
  }
  if (prediction.advancementPoints !== null) {
    pieces.push(
      `${language === "es" ? "clasificado" : "advancer"} +${prediction.advancementPoints}`,
    );
  }
  return pieces.join(" · ");
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
  const initialAdvancingSide =
    prediction?.advancingSide ??
    predictedAdvancingSide(prediction?.homeScore ?? 0, prediction?.awayScore ?? 0);
  const [homeScore, setHomeScore] = useState(prediction?.homeScore ?? 0);
  const [awayScore, setAwayScore] = useState(prediction?.awayScore ?? 0);
  const [advancingSide, setAdvancingSide] =
    useState<MatchWinnerSide | null>(initialAdvancingSide);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const effectiveStatus = effectiveMatchStatus(match, now);
  const locked = isLocked(match, now);
  const knockout = isKnockoutStage(match.stage);
  const home = match.homeTeamId ? teams.get(match.homeTeamId) : undefined;
  const away = match.awayTeamId ? teams.get(match.awayTeamId) : undefined;
  const stadium = match.stadiumId ? stadiums.get(match.stadiumId) : undefined;
  const winnerSide = matchWinnerSide(match);
  const hasShootout = hasPenaltyShootout(match);
  const inferredAdvancingSide = predictedAdvancingSide(homeScore, awayScore);
  const pickAdvancingSide = knockout
    ? inferredAdvancingSide ?? advancingSide
    : null;
  const needsAdvancementChoice =
    knockout && homeScore === awayScore && home !== undefined && away !== undefined;
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);

  useEffect(() => {
    const nextHomeScore = prediction?.homeScore ?? 0;
    const nextAwayScore = prediction?.awayScore ?? 0;
    setHomeScore(nextHomeScore);
    setAwayScore(nextAwayScore);
    setAdvancingSide(
      prediction?.advancingSide ??
        predictedAdvancingSide(nextHomeScore, nextAwayScore),
    );
  }, [
    match.id,
    prediction?.advancingSide,
    prediction?.awayScore,
    prediction?.homeScore,
  ]);

  useEffect(() => {
    if (!knockout) {
      setAdvancingSide(null);
    } else if (inferredAdvancingSide) {
      setAdvancingSide(inferredAdvancingSide);
    }
  }, [inferredAdvancingSide, knockout]);

  useEffect(() => {
    setSaved(false);
    setError("");
  }, [match.id]);

  useEffect(() => {
    setNow(Date.now());
    if (effectiveMatchStatus(match, Date.now()) !== "SCHEDULED") return;

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
    effectiveStatus === "LIVE"
      ? `${t("live")}${match.minute ? ` · ${match.minute}'` : ""}`
      : effectiveStatus === "FINISHED"
        ? t("finished")
        : effectiveStatus === "PAUSED"
          ? t("paused")
          : effectiveStatus === "POSTPONED"
            ? t("postponed")
            : effectiveStatus === "CANCELLED"
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

    if (knockout && pickAdvancingSide === null) {
      setSaved(false);
      setError(
        language === "es"
          ? "Elige quién avanza para guardar un empate en eliminatoria."
          : "Choose who advances to save a tied knockout pick.",
      );
      return;
    }

    setSaving(true);
    setSaved(false);
    setError("");
    try {
      await onSave(match.id, homeScore, awayScore, pickAdvancingSide);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Request failed");
    } finally {
      setSaving(false);
    }
  }

  const ownAdvancingLabel =
    prediction?.advancingSide && knockout
      ? `${language === "es" ? "Avanza" : "Advances"} ${sideName({
          side: prediction.advancingSide,
          language,
          home,
          away,
          match,
        })}`
      : null;

  return (
    <article className={`match-card ${focus ? "focus-card" : ""}`}>
      <header className="match-meta">
        <span>
          #{match.id} ·{" "}
          {match.stage === "group"
            ? `${t("groupStage")} ${match.groupName ?? ""}`
            : t("knockout")}
        </span>
        <span className={`status status-${effectiveStatus.toLowerCase()}`}>
          {effectiveStatus === "LIVE" && <span className="live-dot" />}
          {statusLabel}
        </span>
      </header>

      <div className="match-time">
        <Clock3 size={15} />
        <span>{kickoff}</span>
        {stadium && <span>· {stadium.city}</span>}
      </div>

      <div className="match-teams">
        <TeamSide
          team={home}
          fallback={match.homeLabel}
          language={language}
          winner={winnerSide === "home"}
        />
        {locked && match.homeScore !== null && match.awayScore !== null ? (
          <div className="actual-score" aria-label="Score">
            <div>
              {match.homeScore}
              <span>:</span>
              {match.awayScore}
            </div>
            {hasShootout && (
              <small>
                {language === "es" ? "Penales" : "Pens"}{" "}
                {match.homePenaltyScore}-{match.awayPenaltyScore}
              </small>
            )}
          </div>
        ) : (
          <span className="versus">VS</span>
        )}
        <TeamSide
          team={away}
          fallback={match.awayLabel}
          language={language}
          winner={winnerSide === "away"}
        />
      </div>

      {!locked && home && away ? (
        <div className="pick-editor">
          <div className="score-pick-row">
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
            <button
              className="primary-button save-pick"
              onClick={save}
              disabled={saving}
            >
              {saved ? <Check size={18} /> : <Save size={18} />}
              {saving ? "..." : saved ? t("saved") : t("save")}
            </button>
          </div>

          {knockout && (
            <div
              className={`advancement-pick ${needsAdvancementChoice ? "needs-choice" : ""}`}
            >
              <span>{language === "es" ? "Avanza" : "Advances"}</span>
              {needsAdvancementChoice ? (
                <div className="advancement-options">
                  {(["home", "away"] as const).map((side) => {
                    const team = sideTeam(side, home, away);
                    const active = pickAdvancingSide === side;
                    return (
                      <button
                        type="button"
                        className={active ? "active" : ""}
                        key={side}
                        onClick={() => setAdvancingSide(side)}
                      >
                        {team && <img src={team.flag} alt="" width="20" height="14" />}
                        <b>{sideName({ side, language, home, away, match })}</b>
                      </button>
                    );
                  })}
                </div>
              ) : pickAdvancingSide ? (
                <strong>
                  {sideName({
                    side: pickAdvancingSide,
                    language,
                    home,
                    away,
                    match,
                  })}
                </strong>
              ) : null}
            </div>
          )}
        </div>
      ) : prediction ? (
        <div className="sealed-pick">
          <LockKeyhole size={17} />
          <span className="sealed-pick-main">
            <span>
              {language === "es" ? "Tu pick" : "Your pick"}:{" "}
              <strong>
                {prediction.homeScore} : {prediction.awayScore}
              </strong>
            </span>
            {ownAdvancingLabel && <small>{ownAdvancingLabel}</small>}
          </span>
          {prediction.points !== null && (
            <span className="sealed-points">
              <b>
                +{prediction.points} {t("points")}
              </b>
              {pointsBreakdown(prediction, language) && (
                <small>{pointsBreakdown(prediction, language)}</small>
              )}
            </span>
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
              {knockout && item.advancingSide && (
                <small className="member-pick-advances">
                  {language === "es" ? "Av." : "Adv."}{" "}
                  {sideCode({ side: item.advancingSide, home, away })}
                </small>
              )}
              {item.points !== null && (
                <small
                  className="member-pick-points"
                  title={pointsBreakdown(item, language)}
                >
                  +{item.points} {t("points")}
                </small>
              )}
            </span>
          ))
        ) : (
          <span className="muted-text">{t("reveal")}</span>
        )}
      </div>
    </article>
  );
}
