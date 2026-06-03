const API_BASE = "https://worldcup26.ir/get";
const STORAGE_KEYS = {
  theme: "kiniela2026.theme",
  lang: "kiniela2026.lang",
  players: "kiniela2026.players",
  pools: "kiniela2026.pools",
  predictions: "kiniela2026.predictions",
  selectedPool: "kiniela2026.selectedPool",
  selectedPlayer: "kiniela2026.selectedPlayer",
  focusMatch: "kiniela2026.focusMatch",
};

const STAGE_ORDER = ["group", "r32", "r16", "qf", "sf", "third", "final"];
const TEAM_METRICS = ["attack", "midfield", "defense", "tempo", "experience"];
const VIEWS = ["dashboard", "jornada", "focus", "command", "matches", "predictions", "groups", "bracket", "teams"];
const PRIMARY_VIEWS = ["dashboard", "jornada", "focus", "command"];
const SECONDARY_VIEWS = ["matches", "predictions", "groups", "bracket", "teams"];

const I18N = {
  es: {
    appName: "Kiniela Mundial 2026",
    subtitle: "Predicciones, marcador en vivo, grupos y bracket",
    dashboard: "Panel",
    jornada: "Jornada",
    focus: "Pick Focus",
    command: "Centro",
    matches: "Partidos",
    predictions: "Predicciones",
    groups: "Grupos",
    bracket: "Bracket",
    teams: "Equipos",
    refresh: "Actualizar",
    liveOnline: "API en vivo",
    liveOffline: "Fallback local",
    liveLoading: "Actualizando",
    light: "Claro",
    dark: "Oscuro",
    language: "EN",
    loading: "Cargando calendario...",
    nextKickoff: "Proximo partido",
    savedPicks: "Picks guardados",
    lockedMatches: "Partidos cerrados",
    matchesCount: "Partidos cargados",
    selectedPlayer: "Jugador",
    leaderboard: "Tabla de posiciones",
    noPoints: "Sin puntos todavia",
    spotlight: "Partido destacado",
    localVenueTime: "Hora local estadio",
    yourLocalTime: "Tu hora",
    venue: "Sede",
    match: "Partido",
    stage: "Fase",
    allStages: "Todas las fases",
    allGroups: "Todos los grupos",
    searchTeam: "Buscar equipo o sede",
    needsPick: "Sin pick",
    pick: "Pick",
    saved: "Guardado",
    locked: "Cerrado",
    open: "Abierto",
    pts: "pts",
    provisional: "provisional",
    exact: "Exacto",
    result: "Signo",
    oneGoal: "Un gol",
    model: "Modelo Kiniela",
    home: "Local",
    draw: "Empate",
    away: "Visita",
    ratio: "ratio",
    players: "Figuras",
    noModel: "Modelo pendiente hasta que se definan los equipos.",
    addPlayer: "Agregar jugador",
    playerName: "Nombre del jugador",
    export: "Exportar",
    import: "Importar",
    importReplace: "Esto reemplaza jugadores y predicciones locales. Continuar?",
    importError: "El archivo no parece ser una exportacion valida.",
    predictionBoard: "Planilla de picks",
    complete: "Completos",
    missing: "Pendientes",
    score: "Marcador",
    points: "Puntos",
    status: "Estado",
    final: "Final",
    third: "Tercer puesto",
    round32: "Ronda de 32",
    round16: "Octavos",
    quarter: "Cuartos",
    semi: "Semifinales",
    groupStage: "Fase de grupos",
    notStarted: "No iniciado",
    live: "En vivo",
    finished: "Finalizado",
    standings: "Tabla",
    played: "PJ",
    wins: "G",
    draws: "E",
    losses: "P",
    goalDiff: "DG",
    goalsFor: "GF",
    teamSearch: "Buscar equipo",
    scouting: "Scouting",
    rating: "Rating",
    dataFresh: "Ultima sync",
    never: "Nunca",
    sourceNote: "Datos base: FIFA + worldcup26.ir",
    emptyMatches: "No hay partidos con esos filtros.",
    activeGroup: "Grupo activo",
    addGroup: "Crear grupo",
    groupName: "Nombre del grupo",
    friendsGroup: "Amigos",
    familyGroup: "Familia",
    groupHelp: "Cada grupo tiene sus jugadores, tabla y exportacion local.",
    completion: "Progreso",
    allPicksDone: "Todas las predicciones estan listas.",
    missingPicks: "Faltan predicciones",
    completePicks: "Completar pendientes",
    reviewMissing: "Ver pendientes",
    jornadaTitle: "Por jornada",
    jornadaHint: "Elige un dia y anota los partidos de esa fecha en una sola lista.",
    focusTitle: "Un partido a la vez",
    focusHint: "Pensado para celular: anota, guarda y avanza sin perderte.",
    commandTitle: "Centro de mando",
    commandHint: "Marcadores, proximos partidos y tabla del grupo siempre visibles.",
    day: "Dia",
    days: "Dias",
    today: "Hoy",
    openMatches: "abiertos",
    closedMatches: "cerrados",
    matchOf: "Partido",
    saveAndNext: "Guardar y seguir",
    skip: "Saltar",
    previous: "Anterior",
    next: "Siguiente",
    jumpTo: "Saltar a",
    modelSays: "El modelo dice",
    noSelectedPlayer: "Agrega o elige un jugador para empezar.",
    closeStatus: "Cierra",
    closedAtKickoff: "Cierra al inicio del partido",
    closesSoon: "cierra pronto",
    bracketAuto: "El bracket se actualiza con la API cuando se definan ganadores; antes muestra los cruces oficiales.",
    refreshMeaning: "Actualizar trae marcadores y tablas. Tus picks guardados no se borran.",
    liveAndUpcoming: "En vivo y proximos",
    yourKiniela: "Tu quiniela",
    inviteFriends: "Invitar amigos",
    localOnlyWarning: "Modo estatico: para compartir, exporta/importa o conecta un backend.",
  },
  en: {
    appName: "World Cup 2026 Kiniela",
    subtitle: "Predictions, live scores, groups, and bracket",
    dashboard: "Dashboard",
    jornada: "Matchday",
    focus: "Pick Focus",
    command: "Command",
    matches: "Matches",
    predictions: "Predictions",
    groups: "Groups",
    bracket: "Bracket",
    teams: "Teams",
    refresh: "Refresh",
    liveOnline: "Live API",
    liveOffline: "Local fallback",
    liveLoading: "Refreshing",
    light: "Light",
    dark: "Dark",
    language: "ES",
    loading: "Loading schedule...",
    nextKickoff: "Next kickoff",
    savedPicks: "Saved picks",
    lockedMatches: "Locked matches",
    matchesCount: "Loaded matches",
    selectedPlayer: "Player",
    leaderboard: "Leaderboard",
    noPoints: "No points yet",
    spotlight: "Featured match",
    localVenueTime: "Venue local time",
    yourLocalTime: "Your time",
    venue: "Venue",
    match: "Match",
    stage: "Stage",
    allStages: "All stages",
    allGroups: "All groups",
    searchTeam: "Search team or venue",
    needsPick: "Needs pick",
    pick: "Pick",
    saved: "Saved",
    locked: "Locked",
    open: "Open",
    pts: "pts",
    provisional: "provisional",
    exact: "Exact",
    result: "Result",
    oneGoal: "One goal",
    model: "Kiniela model",
    home: "Home",
    draw: "Draw",
    away: "Away",
    ratio: "ratio",
    players: "Key players",
    noModel: "Model pending until teams are defined.",
    addPlayer: "Add player",
    playerName: "Player name",
    export: "Export",
    import: "Import",
    importReplace: "This replaces local players and predictions. Continue?",
    importError: "This does not look like a valid export.",
    predictionBoard: "Prediction sheet",
    complete: "Complete",
    missing: "Missing",
    score: "Score",
    points: "Points",
    status: "Status",
    final: "Final",
    third: "Third place",
    round32: "Round of 32",
    round16: "Round of 16",
    quarter: "Quarterfinals",
    semi: "Semifinals",
    groupStage: "Group stage",
    notStarted: "Not started",
    live: "Live",
    finished: "Finished",
    standings: "Standings",
    played: "P",
    wins: "W",
    draws: "D",
    losses: "L",
    goalDiff: "GD",
    goalsFor: "GF",
    teamSearch: "Search team",
    scouting: "Scouting",
    rating: "Rating",
    dataFresh: "Last sync",
    never: "Never",
    sourceNote: "Base data: FIFA + worldcup26.ir",
    emptyMatches: "No matches match those filters.",
    activeGroup: "Active group",
    addGroup: "Create group",
    groupName: "Group name",
    friendsGroup: "Friends",
    familyGroup: "Family",
    groupHelp: "Each group has its own players, leaderboard, and local export.",
    completion: "Progress",
    allPicksDone: "All predictions are ready.",
    missingPicks: "Missing predictions",
    completePicks: "Complete missing picks",
    reviewMissing: "Review missing",
    jornadaTitle: "By matchday",
    jornadaHint: "Choose a day and enter that date's matches in one list.",
    focusTitle: "One match at a time",
    focusHint: "Built for mobile: enter, save, and move on without getting lost.",
    commandTitle: "Command center",
    commandHint: "Live scores, upcoming matches, and your group table stay visible.",
    day: "Day",
    days: "Days",
    today: "Today",
    openMatches: "open",
    closedMatches: "closed",
    matchOf: "Match",
    saveAndNext: "Save and next",
    skip: "Skip",
    previous: "Previous",
    next: "Next",
    jumpTo: "Jump to",
    modelSays: "Model says",
    noSelectedPlayer: "Add or choose a player to start.",
    closeStatus: "Closes",
    closedAtKickoff: "Closes at kickoff",
    closesSoon: "closes soon",
    bracketAuto: "The bracket updates from the API as winners are defined; before that it shows the official crossings.",
    refreshMeaning: "Refresh pulls scores and tables. Your saved picks are not deleted.",
    liveAndUpcoming: "Live and upcoming",
    yourKiniela: "Your kiniela",
    inviteFriends: "Invite friends",
    localOnlyWarning: "Static mode: share by export/import or connect a backend.",
  },
};

const STAGE_LABELS = {
  group: { es: "Fase de grupos", en: "Group stage" },
  r32: { es: "Ronda de 32", en: "Round of 32" },
  r16: { es: "Octavos", en: "Round of 16" },
  qf: { es: "Cuartos", en: "Quarterfinals" },
  sf: { es: "Semifinales", en: "Semifinals" },
  third: { es: "Tercer puesto", en: "Third place" },
  final: { es: "Final", en: "Final" },
};

const METRIC_LABELS = {
  attack: { es: "Ataque", en: "Attack" },
  midfield: { es: "Medio", en: "Midfield" },
  defense: { es: "Defensa", en: "Defense" },
  tempo: { es: "Ritmo", en: "Tempo" },
  experience: { es: "Oficio", en: "Experience" },
};

const DEFAULT_PLAYERS = ["BRYAN", "LAIB", "RICHI", "KIKE", "CHIPA"].map((name, index) => ({
  id: `p${index + 1}`,
  name,
}));

const loadedPlayers = loadPlayers();

const state = {
  data: null,
  view: getInitialView(),
  lang: localStorage.getItem(STORAGE_KEYS.lang) || "es",
  theme: localStorage.getItem(STORAGE_KEYS.theme) || "light",
  apiStatus: "offline",
  lastSync: null,
  players: loadedPlayers,
  pools: loadPools(loadedPlayers),
  selectedPoolId: localStorage.getItem(STORAGE_KEYS.selectedPool) || null,
  selectedPlayerId: localStorage.getItem(STORAGE_KEYS.selectedPlayer) || null,
  focusMatchId: Number(localStorage.getItem(STORAGE_KEYS.focusMatch)) || null,
  predictions: loadPredictions(),
  filters: {
    stage: "all",
    group: "all",
    search: "",
    needsPick: false,
  },
  jornadaDayKey: null,
  teamSearch: "",
};

ensurePoolSelection();

document.addEventListener("DOMContentLoaded", init);
window.addEventListener("hashchange", () => {
  const view = getInitialView();
  if (view !== state.view) {
    state.view = view;
    render();
  }
});

function init() {
  document.documentElement.dataset.theme = state.theme;
  document.documentElement.lang = state.lang;
  bindGlobalEvents();
  renderLoading();
  loadLocalData()
    .then(() => {
      render();
      refreshLiveData(true);
      window.setInterval(() => refreshLiveData(true), 120000);
    })
    .catch((error) => {
      document.getElementById("app").innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
    });
}

async function loadLocalData() {
  const response = await fetch("./data/worldcup-2026.json");
  if (!response.ok) {
    throw new Error("Could not load local World Cup data.");
  }
  state.data = await response.json();
  hydrateIndexes();
}

function hydrateIndexes() {
  state.teamsById = new Map(state.data.teams.map((team) => [team.id, team]));
  state.stadiumsById = new Map(state.data.stadiums.map((stadium) => [stadium.id, stadium]));
  state.matchesById = new Map(state.data.matches.map((match) => [String(match.id), match]));
}

function renderLoading() {
  document.getElementById("appHeader").innerHTML = "";
  document.getElementById("app").innerHTML = `<div class="empty-state">${t("loading")}</div>`;
}

function render() {
  document.documentElement.dataset.theme = state.theme;
  document.documentElement.lang = state.lang;
  renderHeader();
  renderView();
}

function renderHeader() {
  const header = document.getElementById("appHeader");
  const progress = getPlayerProgress();
  const statusClass =
    state.apiStatus === "online" ? "online" : state.apiStatus === "loading" ? "" : "offline";
  const statusText =
    state.apiStatus === "online"
      ? t("liveOnline")
      : state.apiStatus === "loading"
        ? t("liveLoading")
        : t("liveOffline");
  header.innerHTML = `
    <div class="topbar">
      <div class="brand">
        <div class="brand-mark" aria-hidden="true">26</div>
        <div>
          <h1>${t("appName")}</h1>
          <p>${t("subtitle")} · ${t("sourceNote")}</p>
        </div>
      </div>
      <div class="header-actions">
        <span class="status-pill progress-pill">${progress.complete}/${progress.total} ${t("complete")}</span>
        <span class="status-pill"><span class="status-dot ${statusClass}"></span>${statusText}</span>
        <button class="btn subtle" type="button" data-action="refresh">${t("refresh")}</button>
        <button class="btn" type="button" data-action="toggle-theme">${state.theme === "dark" ? t("light") : t("dark")}</button>
        <button class="btn" type="button" data-action="toggle-lang">${t("language")}</button>
      </div>
    </div>
    <nav class="nav-row" aria-label="Primary">
      ${PRIMARY_VIEWS.map(
        (view) =>
          `<button class="nav-btn primary-nav ${state.view === view ? "active" : ""}" type="button" data-view="${view}">${t(view)}</button>`,
      ).join("")}
      <span class="nav-separator" aria-hidden="true"></span>
      ${SECONDARY_VIEWS.map(
        (view) =>
          `<button class="nav-btn ${state.view === view ? "active" : ""}" type="button" data-view="${view}">${t(view)}</button>`,
      ).join("")}
    </nav>
  `;
}

function renderView() {
  const app = document.getElementById("app");
  if (!state.data) {
    renderLoading();
    return;
  }

  if (state.view === "jornada") app.innerHTML = renderJornadaView();
  else if (state.view === "focus") app.innerHTML = renderFocusView();
  else if (state.view === "command") app.innerHTML = renderCommandView();
  else if (state.view === "matches") app.innerHTML = renderMatchesView();
  else if (state.view === "predictions") app.innerHTML = renderPredictionsView();
  else if (state.view === "groups") app.innerHTML = renderGroupsView();
  else if (state.view === "bracket") app.innerHTML = renderBracketView();
  else if (state.view === "teams") app.innerHTML = renderTeamsView();
  else app.innerHTML = renderDashboardView();
}

function renderDashboardView() {
  const spotlight = getSpotlightMatch();
  const leaderboard = calculateLeaderboard();
  const progress = getPlayerProgress();
  const lockedCount = state.data.matches.filter(isPredictionLocked).length;
  const next = getNextMatch();
  const nextText = next ? formatDate(next.kickoffUtc) : "-";
  const lastSync = state.lastSync ? formatTime(state.lastSync.toISOString()) : t("never");

  return `
    <section class="view-header">
      <div>
        <h2>${t("dashboard")}</h2>
        <p>${t("refreshMeaning")} ${t("dataFresh")}: ${lastSync}</p>
      </div>
      ${renderContextControls()}
    </section>
    ${renderProgressPanel(progress)}
    <section class="dashboard-grid">
      <div>
        ${renderSpotlight(spotlight)}
        <div class="quick-stats">
          ${renderSummaryCard(state.data.matches.length, t("matchesCount"))}
          ${renderSummaryCard(progress.complete, t("savedPicks"))}
          ${renderSummaryCard(lockedCount, t("lockedMatches"))}
          ${renderSummaryCard(nextText, t("nextKickoff"))}
        </div>
      </div>
      <aside class="panel">
        <h3>${t("leaderboard")}</h3>
        <div class="leaderboard">
          ${
            leaderboard.length
              ? leaderboard.map((row, index) => renderLeaderRow(row, index)).join("")
              : `<div class="empty-state">${t("noPoints")}</div>`
          }
        </div>
      </aside>
    </section>
    <section class="panel" style="margin-top:16px">
      <div class="section-head">
        <h3>${t("liveAndUpcoming")}</h3>
        <button class="btn subtle" type="button" data-view="jornada">${t("completePicks")}</button>
      </div>
      <div class="match-grid">
        ${getUpcomingMatches(4).map((match) => renderMatchCard(match, { compactScout: true })).join("")}
      </div>
    </section>
  `;
}

function renderSpotlight(match) {
  if (!match) return `<div class="panel empty-state">${t("emptyMatches")}</div>`;
  const home = getTeam(match.homeTeamId);
  const away = getTeam(match.awayTeamId);
  const stadium = getStadium(match.stadiumId);
  return `
    <article class="panel spotlight">
      <div class="spotlight-top">
        <div>
          <div class="mini-label">${t("spotlight")} · #${match.id}</div>
          <strong>${stageLabel(match.type)}${match.group && match.type === "group" ? ` ${match.group}` : ""}</strong>
        </div>
        <div class="meta-text">${formatDate(match.kickoffUtc)}</div>
      </div>
      <div class="spotlight-match">
        ${renderTeamFace(home, match.homeLabel)}
        <div class="score-box">
          <div class="score-line">${renderScoreLine(match)}</div>
          <div class="mini-label">${statusLabel(match)}</div>
        </div>
        ${renderTeamFace(away, match.awayLabel, "away")}
      </div>
      <div class="match-meta">
        <span class="meta-text">${stadium ? `${escapeHtml(stadium.fifaName)} · ${escapeHtml(stadium.city)}` : ""}</span>
        <span class="source-chip">${t("localVenueTime")}: ${formatVenueLocal(match.localDate)}</span>
      </div>
      ${renderScouting(match, true)}
    </article>
  `;
}

function renderSummaryCard(value, label) {
  return `
    <article class="summary-card">
      <div class="value">${escapeHtml(String(value))}</div>
      <div class="label">${escapeHtml(label)}</div>
    </article>
  `;
}

function renderProgressPanel(progress = getPlayerProgress()) {
  const pct = progress.total ? Math.round((progress.complete / progress.total) * 100) : 0;
  const done = progress.missing === 0;
  return `
    <section class="progress-panel" data-progress-panel>
      <div>
        <div class="mini-label">${t("completion")} · ${escapeHtml(getSelectedPlayer()?.name || "-")}</div>
        <strong>${progress.complete} / ${progress.total}</strong>
        <p>${done ? t("allPicksDone") : `${t("missingPicks")}: ${progress.missing}`}</p>
      </div>
      <div class="progress-track" aria-label="${t("completion")}">
        <span style="width:${pct}%"></span>
      </div>
      <div class="progress-actions">
        <button class="btn primary" type="button" data-view="focus">${done ? t("saved") : t("completePicks")}</button>
        <button class="btn subtle" type="button" data-view="predictions">${t("reviewMissing")}</button>
      </div>
    </section>
  `;
}

function renderContextControls() {
  return `
    <div class="context-controls">
      ${renderPoolPicker()}
      ${renderPlayerPicker()}
    </div>
  `;
}

function renderPoolPicker() {
  return `
    <div class="context-block">
      <label class="mini-label" for="selectedPool">${t("activeGroup")}</label>
      <select id="selectedPool" data-action="select-pool">
        ${state.pools
          .map((pool) => `<option value="${escapeAttr(pool.id)}" ${pool.id === state.selectedPoolId ? "selected" : ""}>${escapeHtml(pool.name)}</option>`)
          .join("")}
      </select>
    </div>
  `;
}

function renderLeaderRow(row, index) {
  return `
    <div class="leader-row">
      <div class="rank-badge">${index + 1}</div>
      <div>
        <div class="leader-name">${escapeHtml(row.name)}</div>
        <div class="meta-text">${row.complete}/${state.data.matches.length} ${t("complete")}</div>
      </div>
      <div class="leader-points">${row.points} ${t("pts")}</div>
    </div>
  `;
}

function renderJornadaView() {
  const days = getMatchDays();
  const selectedKey = getSelectedDayKey(days);
  const selectedDay = days.find((day) => day.key === selectedKey) || days[0];
  const matches = selectedDay?.matches || [];
  const progress = getPlayerProgress();
  return `
    <section class="view-header">
      <div>
        <h2>${t("jornadaTitle")}</h2>
        <p>${t("jornadaHint")}</p>
      </div>
      ${renderContextControls()}
    </section>
    ${renderProgressPanel(progress)}
    <section class="jornada-layout">
      <aside class="day-rail">
        ${days
          .map(
            (day) => `
              <button class="day-button ${day.key === selectedKey ? "active" : ""}" type="button" data-day-key="${escapeAttr(day.key)}">
                <span>${escapeHtml(day.label)}</span>
                <small>${day.matches.length} ${t("match")} · ${day.open} ${t("openMatches")}</small>
              </button>
            `,
          )
          .join("")}
      </aside>
      <div class="panel jornada-panel">
        <div class="section-head">
          <div>
            <div class="mini-label">${t("day")}</div>
            <h3>${escapeHtml(selectedDay?.label || "")}</h3>
          </div>
          <span class="source-chip">${matches.filter((match) => isPredictionComplete(getPrediction(state.selectedPlayerId, match.id))).length} ${t("complete")}</span>
        </div>
        <div class="jornada-list">
          ${matches.map((match) => renderJornadaRow(match)).join("")}
        </div>
        ${renderProbabilities(matches[0])}
      </div>
    </section>
  `;
}

function renderJornadaRow(match) {
  const home = getTeam(match.homeTeamId);
  const away = getTeam(match.awayTeamId);
  const stadium = getStadium(match.stadiumId);
  const locked = isPredictionLocked(match);
  return `
    <article class="jornada-row" data-match-card="${match.id}">
      <div class="jornada-time">
        <strong>${formatClock(match.kickoffUtc)}</strong>
        <span>${t("yourLocalTime")}</span>
      </div>
      <div class="jornada-team">
        ${renderFlag(home, "small")}
        <span>${home ? teamName(home) : localizeLabel(match.homeLabel)}</span>
        <small>${home ? escapeHtml(home.fifaCode) : "TBD"}</small>
      </div>
      ${renderStepperPrediction(match)}
      <div class="jornada-team away">
        <span>${away ? teamName(away) : localizeLabel(match.awayLabel)}</span>
        <small>${away ? escapeHtml(away.fifaCode) : "TBD"}</small>
        ${renderFlag(away, "small")}
      </div>
      <div class="jornada-status">
        <span class="source-chip ${locked && !isFinished(match) ? "warn" : ""}">${locked ? t("locked") : deadlineText(match)}</span>
        <small>${stadium ? escapeHtml(stadium.fifaName) : ""}</small>
      </div>
    </article>
  `;
}

function renderFocusView() {
  const match = getFocusMatch();
  if (!match) return `<div class="empty-state">${t("emptyMatches")}</div>`;
  const progress = getPlayerProgress();
  const currentIndex = state.data.matches.findIndex((item) => item.id === match.id) + 1;
  return `
    <section class="view-header">
      <div>
        <h2>${t("focusTitle")}</h2>
        <p>${t("focusHint")}</p>
      </div>
      ${renderContextControls()}
    </section>
    <section class="focus-layout">
      <aside class="focus-notes">
        ${renderProgressPanel(progress)}
        <div class="note-card">${t("closedAtKickoff")}.</div>
        <div class="note-card">${t("refreshMeaning")}</div>
      </aside>
      <article class="focus-card">
        <div class="focus-progress">
          <span>${t("matchOf")} ${currentIndex} / ${state.data.matches.length}</span>
          <span>Grupo ${escapeHtml(match.group)}</span>
        </div>
        <div class="progress-track"><span style="width:${Math.round((currentIndex / state.data.matches.length) * 100)}%"></span></div>
        <div class="focus-deadline">${deadlineText(match)}</div>
        <div class="spotlight-match focus-match">
          ${renderTeamFace(getTeam(match.homeTeamId), match.homeLabel)}
          <div class="score-box">
            <div class="score-line">${renderScoreLine(match)}</div>
            <div class="mini-label">${formatDate(match.kickoffUtc)}</div>
          </div>
          ${renderTeamFace(getTeam(match.awayTeamId), match.awayLabel, "away")}
        </div>
        ${renderFocusStepper(match)}
        ${renderModelSuggestion(match)}
        <div class="focus-actions">
          <button class="btn" type="button" data-action="focus-prev">${t("previous")}</button>
          <button class="btn subtle" type="button" data-action="focus-skip">${t("skip")}</button>
          <button class="btn primary" type="button" data-action="focus-next">${t("saveAndNext")}</button>
        </div>
      </article>
      <aside class="jump-panel">
        <div class="mini-label">${t("jumpTo")}</div>
        <div class="jump-grid">
          ${state.data.matches
            .map((item) => {
              const complete = isPredictionComplete(getPrediction(state.selectedPlayerId, item.id));
              const current = item.id === match.id;
              return `<button class="jump-btn ${complete ? "done" : ""} ${current ? "current" : ""}" type="button" data-focus-match="${item.id}">${item.id}</button>`;
            })
            .join("")}
        </div>
      </aside>
    </section>
  `;
}

function renderFocusStepper(match) {
  return `<div class="focus-stepper">${renderStepperPrediction(match, true)}</div>`;
}

function renderStepperPrediction(match, large = false) {
  const prediction = getPrediction(state.selectedPlayerId, match.id);
  const locked = isPredictionLocked(match);
  const homeValue = prediction?.home ?? "";
  const awayValue = prediction?.away ?? "";
  return `
    <div class="stepper-prediction ${large ? "large" : ""}">
      <button class="score-step" type="button" data-score-step="-1" data-step-match="${match.id}" data-side="home" ${locked ? "disabled" : ""}>-</button>
      <input class="score-input" type="number" min="0" max="30" inputmode="numeric" value="${homeValue}" data-predict-match="${match.id}" data-side="home" ${locked ? "disabled" : ""} />
      <button class="score-step" type="button" data-score-step="1" data-step-match="${match.id}" data-side="home" ${locked ? "disabled" : ""}>+</button>
      <span>:</span>
      <button class="score-step" type="button" data-score-step="-1" data-step-match="${match.id}" data-side="away" ${locked ? "disabled" : ""}>-</button>
      <input class="score-input" type="number" min="0" max="30" inputmode="numeric" value="${awayValue}" data-predict-match="${match.id}" data-side="away" ${locked ? "disabled" : ""} />
      <button class="score-step" type="button" data-score-step="1" data-step-match="${match.id}" data-side="away" ${locked ? "disabled" : ""}>+</button>
    </div>
  `;
}

function renderModelSuggestion(match) {
  const suggestion = modelSuggestedScore(match);
  if (!suggestion) return "";
  return `<div class="model-suggestion">${t("modelSays")} ${suggestion.home}-${suggestion.away}</div>`;
}

function renderCommandView() {
  const leaderboard = calculateLeaderboard();
  const progress = getPlayerProgress();
  return `
    <section class="view-header">
      <div>
        <h2>${t("commandTitle")}</h2>
        <p>${t("commandHint")}</p>
      </div>
      ${renderContextControls()}
    </section>
    <section class="command-layout">
      <div class="panel">
        <div class="section-head">
          <h3>${t("liveAndUpcoming")}</h3>
          <button class="btn subtle" type="button" data-view="jornada">${t("completePicks")}</button>
        </div>
        <div class="command-match-list">
          ${getCommandMatches().map((match) => renderCommandMatch(match)).join("")}
        </div>
        ${renderProgressPanel(progress)}
      </div>
      <aside class="panel">
        <div class="section-head">
          <h3>${t("leaderboard")}</h3>
          <span class="source-chip">${escapeHtml(getActivePool()?.name || "")}</span>
        </div>
        <div class="leaderboard">
          ${leaderboard.map((row, index) => renderLeaderRow(row, index)).join("")}
        </div>
        <div class="group-manager">
          <p class="meta-text">${t("groupHelp")} ${t("localOnlyWarning")}</p>
          <div class="control-row">
            <input id="newPlayerName" type="text" placeholder="${t("playerName")}" />
            <button class="btn primary" type="button" data-action="add-player">${t("addPlayer")}</button>
          </div>
          <div class="control-row">
            <input id="newGroupName" type="text" placeholder="${t("groupName")}" />
            <button class="btn" type="button" data-action="add-pool">${t("addGroup")}</button>
          </div>
          <div class="control-row">
            <button class="btn" type="button" data-action="export-state">${t("export")}</button>
            <label class="btn" for="importFile">${t("import")}</label>
            <input id="importFile" class="hidden-file" type="file" accept="application/json" />
          </div>
        </div>
      </aside>
    </section>
  `;
}

function renderCommandMatch(match) {
  const home = getTeam(match.homeTeamId);
  const away = getTeam(match.awayTeamId);
  const prediction = getPrediction(state.selectedPlayerId, match.id);
  return `
    <article class="command-match">
      <div>
        <span class="source-chip ${isLive(match) ? "danger" : ""}">${isLive(match) ? t("live") : formatClock(match.kickoffUtc)}</span>
      </div>
      <div class="command-team">${renderFlag(home, "small")}<strong>${home ? teamName(home) : localizeLabel(match.homeLabel)}</strong></div>
      <div class="command-score">${renderScoreLine(match)}</div>
      <div class="command-team away"><strong>${away ? teamName(away) : localizeLabel(match.awayLabel)}</strong>${renderFlag(away, "small")}</div>
      <div class="meta-text">${isPredictionComplete(prediction) ? `${t("pick")}: ${prediction.home}-${prediction.away}` : t("needsPick")}</div>
    </article>
  `;
}

function renderMatchesView() {
  return `
    <section class="view-header">
      <div>
        <h2>${t("matches")}</h2>
        <p>${t("sourceNote")}</p>
      </div>
      ${renderContextControls()}
    </section>
    ${renderMatchFilters()}
    <div data-list="matches">${renderMatchList()}</div>
  `;
}

function renderMatchFilters() {
  const groups = [...new Set(state.data.matches.filter((m) => m.type === "group").map((m) => m.group))].sort();
  return `
    <div class="control-row">
      <input type="search" data-filter="search" value="${escapeAttr(state.filters.search)}" placeholder="${t("searchTeam")}" />
      <select data-filter="stage">
        <option value="all">${t("allStages")}</option>
        ${STAGE_ORDER.map(
          (stage) =>
            `<option value="${stage}" ${state.filters.stage === stage ? "selected" : ""}>${stageLabel(stage)}</option>`,
        ).join("")}
      </select>
      <select data-filter="group">
        <option value="all">${t("allGroups")}</option>
        ${groups
          .map((group) => `<option value="${group}" ${state.filters.group === group ? "selected" : ""}>Grupo ${group}</option>`)
          .join("")}
      </select>
      <button class="chip-btn ${state.filters.needsPick ? "active" : ""}" type="button" data-action="toggle-needs-pick">${t("needsPick")}</button>
    </div>
  `;
}

function renderMatchList() {
  const matches = getFilteredMatches();
  if (!matches.length) return `<div class="empty-state">${t("emptyMatches")}</div>`;
  return `<section class="match-grid">${matches.map((match) => renderMatchCard(match)).join("")}</section>`;
}

function renderMatchCard(match, options = {}) {
  const home = getTeam(match.homeTeamId);
  const away = getTeam(match.awayTeamId);
  const stadium = getStadium(match.stadiumId);
  const locked = isPredictionLocked(match);
  return `
    <article class="match-card ${locked ? "locked" : ""}" data-match-card="${match.id}">
      <div class="match-head">
        <span class="stage-pill">#${match.id} · ${stageLabel(match.type)}${match.type === "group" ? ` ${match.group}` : ""}</span>
        <span>${statusLabel(match)}</span>
      </div>
      <div class="match-teams">
        ${renderMatchTeam(home, match.homeLabel, "home")}
        <div class="score-box">
          <div class="score-line">${renderScoreLine(match)}</div>
          <div class="mini-label">${formatDate(match.kickoffUtc)}</div>
        </div>
        ${renderMatchTeam(away, match.awayLabel, "away")}
      </div>
      <div class="match-meta">
        <span class="meta-text">${stadium ? `${escapeHtml(stadium.fifaName)} · ${escapeHtml(stadium.city)}` : ""}</span>
        <span class="source-chip ${locked && !isFinished(match) ? "warn" : ""}">${locked ? t("locked") : t("open")}</span>
      </div>
      ${renderPredictionControls(match)}
      ${options.compactScout ? renderProbabilities(match) : renderScouting(match)}
    </article>
  `;
}

function renderMatchTeam(team, fallback, side) {
  const copy = team
    ? `<div class="team-name">${teamName(team)}</div><div class="team-code">${escapeHtml(team.fifaCode)}</div>`
    : `<div class="team-name">${localizeLabel(fallback || "-")}</div><div class="team-code">TBD</div>`;
  return `
    <div class="match-team ${side === "away" ? "away" : ""}">
      ${renderFlag(team, "small")}
      <div class="team-copy">${copy}</div>
    </div>
  `;
}

function renderTeamFace(team, fallback, side = "home") {
  return `
    <div class="team-face ${side}">
      ${renderFlag(team, "large")}
      <div>
        <div class="team-name">${team ? teamName(team) : localizeLabel(fallback || "-")}</div>
        <div class="team-code">${team ? escapeHtml(team.fifaCode) : "TBD"}</div>
      </div>
    </div>
  `;
}

function renderPredictionControls(match) {
  const playerId = state.selectedPlayerId;
  const prediction = getPrediction(playerId, match.id);
  const locked = isPredictionLocked(match);
  const pointsText = predictionPointsText(match, prediction);
  return `
    <div class="prediction-row">
      <div class="mini-label">${t("pick")} · ${escapeHtml(getSelectedPlayer()?.name || "-")}</div>
      <input class="score-input" type="number" min="0" max="30" inputmode="numeric" value="${prediction?.home ?? ""}"
        data-predict-match="${match.id}" data-side="home" ${locked ? "disabled" : ""} aria-label="${t("home")} ${t("score")}" />
      <span class="mini-label">-</span>
      <input class="score-input" type="number" min="0" max="30" inputmode="numeric" value="${prediction?.away ?? ""}"
        data-predict-match="${match.id}" data-side="away" ${locked ? "disabled" : ""} aria-label="${t("away")} ${t("score")}" />
      <span class="points-chip" data-prediction-points="${match.id}">${pointsText}</span>
    </div>
  `;
}

function renderScouting(match, compact = false) {
  const home = getTeam(match.homeTeamId);
  const away = getTeam(match.awayTeamId);
  if (!home || !away) return `<div class="scout-panel"><div class="meta-text">${t("noModel")}</div></div>`;
  return `
    <div class="scout-panel">
      ${renderProbabilities(match)}
      ${compact ? "" : renderMetricComparison(home, away)}
      <div class="player-chips">
        ${[...home.scouting.players, ...away.scouting.players]
          .map(
            ([name, traitEn, traitEs]) =>
              `<span class="player-chip">${escapeHtml(name)} · ${escapeHtml(state.lang === "es" ? traitEs : traitEn)}</span>`,
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderProbabilities(match) {
  const model = matchModel(match);
  if (!model) return "";
  return `
    <div>
      <div class="mini-label">${t("model")}</div>
      <div class="prob-row">
        ${renderProbability(t("home"), model.home)}
        ${renderProbability(t("draw"), model.draw)}
        ${renderProbability(t("away"), model.away)}
      </div>
    </div>
  `;
}

function renderProbability(label, value) {
  const ratio = value > 0 ? (1 / value).toFixed(2) : "-";
  return `
    <div class="prob">
      <span class="mini-label">${escapeHtml(label)}</span>
      <strong>${Math.round(value * 100)}%</strong>
      <span class="meta-text">${t("ratio")} ${ratio}x</span>
    </div>
  `;
}

function renderMetricComparison(home, away) {
  return `
    <div class="meter-grid">
      ${TEAM_METRICS.map((metric) => {
        const homeValue = home.scouting[metric];
        const awayValue = away.scouting[metric];
        const label = METRIC_LABELS[metric][state.lang];
        return `
          <div class="meter-row">
            <span>${escapeHtml(label)}</span>
            <div class="meter"><span style="width:${homeValue}%"></span></div>
            <strong>${homeValue}</strong>
          </div>
          <div class="meter-row">
            <span>${escapeHtml(away.fifaCode)}</span>
            <div class="meter away"><span style="width:${awayValue}%"></span></div>
            <strong>${awayValue}</strong>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderPredictionsView() {
  const player = getSelectedPlayer();
  const rows = state.data.matches.map((match) => renderPredictionRow(match));
  const complete = state.data.matches.filter((match) => isPredictionComplete(getPrediction(player?.id, match.id))).length;
  const missing = state.data.matches.length - complete;
  return `
    <section class="view-header">
      <div>
        <h2>${t("predictionBoard")}</h2>
        <p>${t("complete")}: ${complete} · ${t("missing")}: ${missing}</p>
      </div>
      ${renderContextControls()}
    </section>
    <div class="control-row">
      <input id="newPlayerName" type="text" placeholder="${t("playerName")}" />
      <button class="btn primary" type="button" data-action="add-player">${t("addPlayer")}</button>
      <input id="newGroupName" type="text" placeholder="${t("groupName")}" />
      <button class="btn" type="button" data-action="add-pool">${t("addGroup")}</button>
      <button class="btn" type="button" data-action="export-state">${t("export")}</button>
      <label class="btn" for="importFile">${t("import")}</label>
      <input id="importFile" class="hidden-file" type="file" accept="application/json" />
    </div>
    <div class="prediction-table-wrap">
      <table class="prediction-table">
        <thead>
          <tr>
            <th>${t("match")}</th>
            <th>${t("stage")}</th>
            <th>${t("yourLocalTime")}</th>
            <th>${t("pick")}</th>
            <th>${t("score")}</th>
            <th>${t("points")}</th>
          </tr>
        </thead>
        <tbody>${rows.join("")}</tbody>
      </table>
    </div>
  `;
}

function renderPredictionRow(match) {
  const home = getTeam(match.homeTeamId);
  const away = getTeam(match.awayTeamId);
  const prediction = getPrediction(state.selectedPlayerId, match.id);
  const locked = isPredictionLocked(match);
  return `
    <tr data-prediction-row="${match.id}">
      <td><strong>#${match.id}</strong> ${home ? teamName(home) : localizeLabel(match.homeLabel)} - ${away ? teamName(away) : localizeLabel(match.awayLabel)}</td>
      <td>${stageLabel(match.type)}${match.type === "group" ? ` ${match.group}` : ""}</td>
      <td>${formatDate(match.kickoffUtc)}</td>
      <td>
        <span class="inline-score">
          <input class="score-input" type="number" min="0" max="30" inputmode="numeric" value="${prediction?.home ?? ""}" data-predict-match="${match.id}" data-side="home" ${locked ? "disabled" : ""} />
          <span>-</span>
          <input class="score-input" type="number" min="0" max="30" inputmode="numeric" value="${prediction?.away ?? ""}" data-predict-match="${match.id}" data-side="away" ${locked ? "disabled" : ""} />
        </span>
      </td>
      <td>${renderScoreLine(match)}</td>
      <td><span class="points-chip" data-prediction-points="${match.id}">${predictionPointsText(match, prediction)}</span></td>
    </tr>
  `;
}

function renderGroupsView() {
  return `
    <section class="view-header">
      <div>
        <h2>${t("groups")}</h2>
        <p>${t("standings")} · ${t("sourceNote")}</p>
      </div>
    </section>
    <section class="tables-grid">
      ${state.data.groups.map((group) => renderGroupCard(group)).join("")}
    </section>
  `;
}

function renderGroupCard(group) {
  const rows = [...group.teams].sort(sortStandings);
  return `
    <article class="group-card">
      <div class="panel" style="box-shadow:none;border:0;border-bottom:1px solid var(--line);border-radius:0">
        <h3>Grupo ${escapeHtml(group.name)}</h3>
      </div>
      <table class="standings">
        <thead>
          <tr>
            <th>${t("teams")}</th>
            <th>${t("played")}</th>
            <th>${t("goalDiff")}</th>
            <th>${t("points")}</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map((row) => {
              const team = getTeam(row.teamId);
              return `
                <tr>
                  <td>
                    <div class="standings-team">
                      ${renderFlag(team, "small")}
                      <span>${team ? teamName(team) : row.teamId}</span>
                    </div>
                  </td>
                  <td>${row.played}</td>
                  <td>${row.gd}</td>
                  <td><strong>${row.points}</strong></td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    </article>
  `;
}

function renderBracketView() {
  const byStage = Object.fromEntries(STAGE_ORDER.map((stage) => [stage, []]));
  state.data.matches
    .filter((match) => match.type !== "group")
    .forEach((match) => byStage[match.type]?.push(match));
  const stages = ["r32", "r16", "qf", "sf", "third", "final"];
  return `
    <section class="view-header">
      <div>
        <h2>${t("bracket")}</h2>
        <p>${t("bracketAuto")}</p>
      </div>
    </section>
    <section class="bracket-board">
      ${stages
        .map(
          (stage) => `
          <div class="bracket-column">
            <h3>${stageLabel(stage)}</h3>
            ${(byStage[stage] || []).map((match) => renderBracketCard(match)).join("")}
          </div>
        `,
        )
        .join("")}
    </section>
  `;
}

function renderBracketCard(match) {
  const home = getTeam(match.homeTeamId);
  const away = getTeam(match.awayTeamId);
  return `
    <article class="bracket-card">
      <div class="match-head">
        <span>#${match.id}</span>
        <span>${formatDate(match.kickoffUtc)}</span>
      </div>
      ${renderBracketTeam(home, match.homeLabel, match.homeScore)}
      ${renderBracketTeam(away, match.awayLabel, match.awayScore)}
      <div class="meta-text">${escapeHtml(getStadium(match.stadiumId)?.fifaName || "")}</div>
    </article>
  `;
}

function renderBracketTeam(team, label, score) {
  return `
    <div class="bracket-team">
      ${renderFlag(team, "small")}
      <span>${team ? teamName(team) : localizeLabel(label || "-")}</span>
      <strong>${Number(score) || ""}</strong>
    </div>
  `;
}

function renderTeamsView() {
  return `
    <section class="view-header">
      <div>
        <h2>${t("teams")}</h2>
        <p>${t("scouting")} · ${t("model")}</p>
      </div>
    </section>
    <div class="control-row">
      <input type="search" data-filter="team-search" value="${escapeAttr(state.teamSearch)}" placeholder="${t("teamSearch")}" />
    </div>
    <div data-list="teams">${renderTeamList()}</div>
  `;
}

function renderTeamList() {
  const query = normalizeText(state.teamSearch);
  const teams = state.data.teams.filter((team) => {
    if (!query) return true;
    return normalizeText(`${team.name.en} ${team.name.es} ${team.fifaCode} ${team.group}`).includes(query);
  });
  return `<section class="team-grid">${teams.map((team) => renderTeamCard(team)).join("")}</section>`;
}

function renderTeamCard(team) {
  const profile = team.scouting;
  const style = state.lang === "es" ? profile.style_es : profile.style_en;
  return `
    <article class="team-card">
      <div class="team-card-head">
        ${renderFlag(team)}
        <div>
          <div class="team-name">${teamName(team)}</div>
          <div class="team-code">Grupo ${escapeHtml(team.group)} · ${escapeHtml(team.fifaCode)}</div>
        </div>
        <div class="rating-ring" title="${t("rating")}">${profile.rating}</div>
      </div>
      <div class="profile-style">${escapeHtml(style)}</div>
      ${renderTeamMeters(team)}
      <div class="player-chips">
        ${profile.players
          .map(
            ([name, traitEn, traitEs]) =>
              `<span class="player-chip">${escapeHtml(name)} · ${escapeHtml(state.lang === "es" ? traitEs : traitEn)}</span>`,
          )
          .join("")}
      </div>
    </article>
  `;
}

function renderTeamMeters(team) {
  return `
    <div class="meter-grid">
      ${TEAM_METRICS.map((metric) => {
        const value = team.scouting[metric];
        return `
          <div class="meter-row">
            <span>${escapeHtml(METRIC_LABELS[metric][state.lang])}</span>
            <div class="meter"><span style="width:${value}%"></span></div>
            <strong>${value}</strong>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderPlayerPicker() {
  const players = getPoolPlayers();
  return `
    <div class="context-block">
      <label class="mini-label" for="selectedPlayer">${t("selectedPlayer")}</label>
      <select id="selectedPlayer" class="select-player" data-action="select-player">
        ${
          players.length
            ? players
                .map((player) => `<option value="${escapeAttr(player.id)}" ${player.id === state.selectedPlayerId ? "selected" : ""}>${escapeHtml(player.name)}</option>`)
                .join("")
            : `<option value="">${t("noSelectedPlayer")}</option>`
        }
      </select>
    </div>
  `;
}

function bindGlobalEvents() {
  document.body.addEventListener("click", (event) => {
    const dayButton = event.target.closest("[data-day-key]");
    if (dayButton) {
      state.jornadaDayKey = dayButton.dataset.dayKey;
      renderView();
      return;
    }

    const focusButton = event.target.closest("[data-focus-match]");
    if (focusButton) {
      setFocusMatch(Number(focusButton.dataset.focusMatch));
      renderView();
      return;
    }

    const stepButton = event.target.closest("[data-score-step]");
    if (stepButton) {
      applyScoreStep(stepButton);
      return;
    }

    const viewButton = event.target.closest("[data-view]");
    if (viewButton) {
      state.view = viewButton.dataset.view;
      window.location.hash = state.view;
      render();
      return;
    }

    const action = event.target.closest("[data-action]")?.dataset.action;
    if (!action) return;

    if (action === "toggle-theme") {
      state.theme = state.theme === "dark" ? "light" : "dark";
      localStorage.setItem(STORAGE_KEYS.theme, state.theme);
      render();
    } else if (action === "toggle-lang") {
      state.lang = state.lang === "es" ? "en" : "es";
      localStorage.setItem(STORAGE_KEYS.lang, state.lang);
      render();
    } else if (action === "refresh") {
      refreshLiveData(false);
    } else if (action === "toggle-needs-pick") {
      state.filters.needsPick = !state.filters.needsPick;
      renderView();
    } else if (action === "add-player") {
      addPlayer();
    } else if (action === "add-pool") {
      addPool();
    } else if (action === "focus-next") {
      moveFocus(1, true);
    } else if (action === "focus-prev") {
      moveFocus(-1, false);
    } else if (action === "focus-skip") {
      moveFocus(1, false);
    } else if (action === "export-state") {
      exportState();
    }
  });

  document.body.addEventListener("change", (event) => {
    const target = event.target;
    if (target.dataset.action === "select-player") {
      state.selectedPlayerId = target.value;
      localStorage.setItem(STORAGE_KEYS.selectedPlayer, state.selectedPlayerId);
      render();
      return;
    }
    if (target.dataset.action === "select-pool") {
      state.selectedPoolId = target.value;
      localStorage.setItem(STORAGE_KEYS.selectedPool, state.selectedPoolId);
      ensurePoolSelection();
      render();
      return;
    }
    if (target.id === "importFile" && target.files?.[0]) {
      importState(target.files[0]);
      return;
    }
    if (target.dataset.filter === "stage") {
      state.filters.stage = target.value;
      renderView();
      return;
    }
    if (target.dataset.filter === "group") {
      state.filters.group = target.value;
      renderView();
    }
  });

  document.body.addEventListener("input", (event) => {
    const target = event.target;
    if (target.dataset.predictMatch) {
      savePredictionInput(target);
      renderHeader();
      updateProgressPanels();
      return;
    }
    if (target.dataset.filter === "search") {
      state.filters.search = target.value;
      updateMatchListOnly();
      return;
    }
    if (target.dataset.filter === "team-search") {
      state.teamSearch = target.value;
      updateTeamListOnly();
    }
  });
}

async function refreshLiveData(silent) {
  if (!state.data) return;
  state.apiStatus = "loading";
  if (!silent) renderHeader();
  try {
    const [gamesPayload, groupsPayload] = await Promise.all([
      fetchJson(`${API_BASE}/games`),
      fetchJson(`${API_BASE}/groups`),
    ]);
    mergeLiveGames(gamesPayload.games || []);
    mergeLiveGroups(groupsPayload.groups || []);
    state.apiStatus = "online";
    state.lastSync = new Date();
  } catch (error) {
    state.apiStatus = "offline";
  }
  hydrateIndexes();
  render();
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function mergeLiveGames(apiGames) {
  const byId = new Map(state.data.matches.map((match) => [String(match.id), match]));
  for (const raw of apiGames) {
    const existing = byId.get(String(raw.id));
    if (!existing) continue;
    existing.homeScore = Number(raw.home_score) || 0;
    existing.awayScore = Number(raw.away_score) || 0;
    existing.status = raw.finished === "TRUE" ? "finished" : raw.time_elapsed || "notstarted";
    if (raw.home_team_id && raw.home_team_id !== "0") existing.homeTeamId = raw.home_team_id;
    if (raw.away_team_id && raw.away_team_id !== "0") existing.awayTeamId = raw.away_team_id;
  }
}

function mergeLiveGroups(apiGroups) {
  if (!apiGroups.length) return;
  state.data.groups = apiGroups
    .map((group) => ({
      name: group.name,
      teams: group.teams.map((row) => ({
        teamId: row.team_id,
        played: Number(row.mp) || 0,
        wins: Number(row.w) || 0,
        draws: Number(row.d) || 0,
        losses: Number(row.l) || 0,
        points: Number(row.pts) || 0,
        gf: Number(row.gf) || 0,
        ga: Number(row.ga) || 0,
        gd: Number(row.gd) || 0,
      })),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function getFilteredMatches() {
  const query = normalizeText(state.filters.search);
  return state.data.matches.filter((match) => {
    if (state.filters.stage !== "all" && match.type !== state.filters.stage) return false;
    if (state.filters.group !== "all" && match.group !== state.filters.group) return false;
    if (state.filters.needsPick && isPredictionComplete(getPrediction(state.selectedPlayerId, match.id))) return false;
    if (!query) return true;
    const home = getTeam(match.homeTeamId);
    const away = getTeam(match.awayTeamId);
    const stadium = getStadium(match.stadiumId);
    const haystack = normalizeText(
      [
        match.id,
        home?.name.en,
        home?.name.es,
        home?.fifaCode,
        away?.name.en,
        away?.name.es,
        away?.fifaCode,
        match.homeLabel,
        match.awayLabel,
        stadium?.name,
        stadium?.fifaName,
        stadium?.city,
      ].join(" "),
    );
    return haystack.includes(query);
  });
}

function addPlayer() {
  const input = document.getElementById("newPlayerName");
  const name = input?.value.trim();
  if (!name) return;
  const player = {
    id: `p${Date.now().toString(36)}`,
    name,
  };
  const pool = getActivePool();
  state.players.push(player);
  if (pool) pool.playerIds.push(player.id);
  state.selectedPlayerId = player.id;
  persistPlayers();
  persistPools();
  localStorage.setItem(STORAGE_KEYS.selectedPlayer, state.selectedPlayerId);
  render();
}

function addPool() {
  const input = document.getElementById("newGroupName");
  const name = input?.value.trim();
  if (!name) return;
  const pool = {
    id: `g${Date.now().toString(36)}`,
    name,
    playerIds: [],
  };
  state.pools.push(pool);
  state.selectedPoolId = pool.id;
  state.selectedPlayerId = null;
  persistPools();
  localStorage.setItem(STORAGE_KEYS.selectedPool, state.selectedPoolId);
  localStorage.setItem(STORAGE_KEYS.selectedPlayer, "");
  render();
}

function savePredictionInput(input) {
  const matchId = input.dataset.predictMatch;
  const side = input.dataset.side;
  const playerId = state.selectedPlayerId;
  if (!playerId) return;
  const playerPredictions = state.predictions[playerId] || {};
  const existing = playerPredictions[matchId] || {};
  const value = input.value === "" ? "" : Math.max(0, Number(input.value));
  const next = { ...existing, [side]: value, updatedAt: new Date().toISOString() };
  if (next.home === "" && next.away === "") {
    delete playerPredictions[matchId];
  } else {
    playerPredictions[matchId] = next;
  }
  state.predictions[playerId] = playerPredictions;
  persistPredictions();
  updatePointsLabels(matchId);
}

function updatePointsLabels(matchId) {
  const match = state.matchesById.get(String(matchId));
  const prediction = getPrediction(state.selectedPlayerId, matchId);
  document.querySelectorAll(`[data-prediction-points="${matchId}"]`).forEach((node) => {
    node.textContent = predictionPointsText(match, prediction);
  });
}

function updateProgressPanels() {
  document.querySelectorAll("[data-progress-panel]").forEach((node) => {
    node.outerHTML = renderProgressPanel();
  });
}

function updateMatchListOnly() {
  const node = document.querySelector('[data-list="matches"]');
  if (node) node.innerHTML = renderMatchList();
}

function updateTeamListOnly() {
  const node = document.querySelector('[data-list="teams"]');
  if (node) node.innerHTML = renderTeamList();
}

function exportState() {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    players: state.players,
    pools: state.pools,
    selectedPoolId: state.selectedPoolId,
    predictions: state.predictions,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "kiniela-2026.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function importState(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const payload = JSON.parse(String(reader.result));
      if (!Array.isArray(payload.players) || typeof payload.predictions !== "object") {
        throw new Error("Invalid payload");
      }
      if (!window.confirm(t("importReplace"))) return;
      state.players = payload.players;
      state.pools = Array.isArray(payload.pools) ? payload.pools : loadPools(state.players);
      state.predictions = payload.predictions;
      state.selectedPoolId = payload.selectedPoolId || state.pools[0]?.id || null;
      ensurePoolSelection();
      persistPlayers();
      persistPools();
      persistPredictions();
      localStorage.setItem(STORAGE_KEYS.selectedPool, state.selectedPoolId || "");
      localStorage.setItem(STORAGE_KEYS.selectedPlayer, state.selectedPlayerId || "");
      render();
    } catch {
      window.alert(t("importError"));
    }
  };
  reader.readAsText(file);
}

function calculateLeaderboard() {
  return getPoolPlayers()
    .map((player) => {
      let points = 0;
      let complete = 0;
      for (const match of state.data.matches) {
        const prediction = getPrediction(player.id, match.id);
        if (isPredictionComplete(prediction)) complete += 1;
        if (isFinished(match)) points += scorePrediction(match, prediction);
      }
      return { id: player.id, name: player.name, points, complete };
    })
    .sort((a, b) => b.points - a.points || b.complete - a.complete || a.name.localeCompare(b.name));
}

function scorePrediction(match, prediction) {
  if (!isPredictionComplete(prediction) || !match) return 0;
  const predictedHome = Number(prediction.home);
  const predictedAway = Number(prediction.away);
  const actualHome = Number(match.homeScore);
  const actualAway = Number(match.awayScore);
  const exact = predictedHome === actualHome && predictedAway === actualAway;
  if (exact) return state.data.meta.scoreRules.exact;
  const predictedResult = resultOf(predictedHome, predictedAway);
  const actualResult = resultOf(actualHome, actualAway);
  const oneGoal = predictedHome === actualHome || predictedAway === actualAway;
  if (predictedResult === actualResult && oneGoal) return state.data.meta.scoreRules.resultAndOneGoal;
  if (predictedResult === actualResult) return state.data.meta.scoreRules.result;
  if (oneGoal) return state.data.meta.scoreRules.oneGoal;
  return 0;
}

function predictionPointsText(match, prediction) {
  if (!isPredictionComplete(prediction)) return t("missing");
  if (isFinished(match)) return `${scorePrediction(match, prediction)} ${t("pts")}`;
  if (isLive(match)) return `${scorePrediction(match, prediction)} ${t("provisional")}`;
  return t("saved");
}

function resultOf(home, away) {
  if (home > away) return "H";
  if (away > home) return "A";
  return "D";
}

function matchModel(match) {
  const home = getTeam(match.homeTeamId);
  const away = getTeam(match.awayTeamId);
  if (!home || !away) return null;
  const stadium = getStadium(match.stadiumId);
  const hostBoostHome = hostBoost(home, stadium);
  const hostBoostAway = hostBoost(away, stadium);
  const homeRating = home.scouting.rating + hostBoostHome;
  const awayRating = away.scouting.rating + hostBoostAway;
  const diff = homeRating - awayRating;
  const draw = clamp(0.28 - Math.abs(diff) * 0.004, 0.14, 0.3);
  const homeShare = 1 / (1 + Math.exp(-diff / 9));
  const homeWin = (1 - draw) * homeShare;
  const awayWin = 1 - draw - homeWin;
  return { home: homeWin, draw, away: awayWin };
}

function hostBoost(team, stadium) {
  if (!stadium || !team) return 0;
  const teamCountry = {
    MEX: "Mexico",
    USA: "United States",
    CAN: "Canada",
  }[team.fifaCode];
  return teamCountry && stadium.country.en === teamCountry ? 3 : 0;
}

function countSavedPredictions() {
  const poolIds = new Set(getPoolPlayers().map((player) => player.id));
  return Object.entries(state.predictions).reduce((sum, [playerId, playerPredictions]) => {
    if (!poolIds.has(playerId)) return sum;
    return sum + Object.values(playerPredictions).filter(isPredictionComplete).length;
  }, 0);
}

function getSpotlightMatch() {
  return state.data.matches.find(isLive) || getNextMatch() || state.data.matches[0];
}

function getUpcomingMatches(limit) {
  const now = Date.now();
  return state.data.matches
    .filter((match) => new Date(match.kickoffUtc).getTime() >= now && !isFinished(match))
    .slice(0, limit);
}

function getNextMatch() {
  return getUpcomingMatches(1)[0] || null;
}

function getCommandMatches() {
  const live = state.data.matches.filter(isLive);
  return [...live, ...getUpcomingMatches(5)].slice(0, 5);
}

function getMatchDays() {
  const grouped = new Map();
  for (const match of state.data.matches) {
    const key = localDayKey(match.kickoffUtc);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(match);
  }
  return [...grouped.entries()].map(([key, matches]) => ({
    key,
    label: formatDayLabel(matches[0].kickoffUtc),
    matches,
    open: matches.filter((match) => !isPredictionLocked(match)).length,
  }));
}

function getSelectedDayKey(days = getMatchDays()) {
  if (state.jornadaDayKey && days.some((day) => day.key === state.jornadaDayKey)) return state.jornadaDayKey;
  const next = getNextMatch();
  const nextKey = next ? localDayKey(next.kickoffUtc) : null;
  return nextKey || days[0]?.key || "";
}

function getFocusMatch() {
  const stored = state.focusMatchId ? state.matchesById.get(String(state.focusMatchId)) : null;
  if (stored) return stored;
  const missingOpen = state.data.matches.find(
    (match) => !isPredictionLocked(match) && !isPredictionComplete(getPrediction(state.selectedPlayerId, match.id)),
  );
  return missingOpen || getNextMatch() || state.data.matches[0] || null;
}

function setFocusMatch(matchId) {
  state.focusMatchId = matchId;
  localStorage.setItem(STORAGE_KEYS.focusMatch, String(matchId));
}

function moveFocus(direction, preferMissing) {
  const current = getFocusMatch();
  if (!current) return;
  const matches = state.data.matches;
  const currentIndex = matches.findIndex((match) => match.id === current.id);
  const candidates = direction > 0 ? matches.slice(currentIndex + 1) : matches.slice(0, currentIndex).reverse();
  const next =
    (preferMissing
      ? candidates.find((match) => !isPredictionLocked(match) && !isPredictionComplete(getPrediction(state.selectedPlayerId, match.id)))
      : null) || candidates[0] || current;
  setFocusMatch(next.id);
  renderView();
}

function applyScoreStep(button) {
  const matchId = button.dataset.stepMatch;
  const side = button.dataset.side;
  const direction = Number(button.dataset.scoreStep) || 0;
  const input = document.querySelector(`input[data-predict-match="${matchId}"][data-side="${side}"]`);
  if (!input || input.disabled) return;
  const current = input.value === "" ? 0 : Number(input.value);
  input.value = Math.max(0, current + direction);
  savePredictionInput(input);
  renderHeader();
  updateProgressPanels();
}

function getPlayerProgress(playerId = state.selectedPlayerId) {
  const total = state.data?.matches.length || 0;
  let complete = 0;
  for (const match of state.data?.matches || []) {
    if (isPredictionComplete(getPrediction(playerId, match.id))) complete += 1;
  }
  return { complete, total, missing: Math.max(0, total - complete) };
}

function modelSuggestedScore(match) {
  const model = matchModel(match);
  if (!model) return null;
  if (model.draw > model.home && model.draw > model.away) return { home: 1, away: 1 };
  if (model.home >= model.away) return { home: model.home > 0.62 ? 2 : 1, away: model.away > 0.28 ? 1 : 0 };
  return { home: model.home > 0.28 ? 1 : 0, away: model.away > 0.62 ? 2 : 1 };
}

function sortStandings(a, b) {
  return (
    b.points - a.points ||
    b.gd - a.gd ||
    b.gf - a.gf ||
    (getTeam(a.teamId)?.name.en || "").localeCompare(getTeam(b.teamId)?.name.en || "")
  );
}

function getPrediction(playerId, matchId) {
  if (!playerId) return null;
  return state.predictions[playerId]?.[String(matchId)] || null;
}

function getActivePool() {
  return state.pools.find((pool) => pool.id === state.selectedPoolId) || state.pools[0] || null;
}

function getPoolPlayers(pool = getActivePool()) {
  if (!pool) return [];
  const allowed = new Set(pool.playerIds || []);
  return state.players.filter((player) => allowed.has(player.id));
}

function ensurePoolSelection() {
  if (!state.pools.length) state.pools = loadPools(state.players);
  if (!state.selectedPoolId || !state.pools.some((pool) => pool.id === state.selectedPoolId)) {
    state.selectedPoolId = state.pools[0]?.id || null;
  }
  const poolPlayers = getPoolPlayers();
  if (!state.selectedPlayerId || !poolPlayers.some((player) => player.id === state.selectedPlayerId)) {
    state.selectedPlayerId = poolPlayers[0]?.id || null;
  }
  localStorage.setItem(STORAGE_KEYS.selectedPool, state.selectedPoolId || "");
  localStorage.setItem(STORAGE_KEYS.selectedPlayer, state.selectedPlayerId || "");
}

function isPredictionComplete(prediction) {
  return (
    prediction?.home !== "" &&
    prediction?.away !== "" &&
    prediction?.home !== undefined &&
    prediction?.away !== undefined &&
    Number.isFinite(Number(prediction.home)) &&
    Number.isFinite(Number(prediction.away))
  );
}

function isPredictionLocked(match) {
  return Date.now() >= new Date(match.kickoffUtc).getTime();
}

function isFinished(match) {
  const status = String(match.status || "").toLowerCase();
  return status === "finished" || status === "final" || status === "fulltime";
}

function isLive(match) {
  const status = String(match.status || "").toLowerCase();
  return !isFinished(match) && status && status !== "notstarted" && Date.now() >= new Date(match.kickoffUtc).getTime();
}

function statusLabel(match) {
  if (isFinished(match)) return t("finished");
  if (isLive(match)) return t("live");
  return t("notStarted");
}

function renderScoreLine(match) {
  if (isFinished(match) || isLive(match)) return `${Number(match.homeScore) || 0}-${Number(match.awayScore) || 0}`;
  return "vs";
}

function getTeam(id) {
  if (!id) return null;
  return state.teamsById?.get(String(id)) || null;
}

function getStadium(id) {
  if (!id) return null;
  return state.stadiumsById?.get(String(id)) || null;
}

function getSelectedPlayer() {
  return state.players.find((player) => player.id === state.selectedPlayerId) || null;
}

function teamName(team) {
  return escapeHtml(team.name[state.lang] || team.name.en);
}

function renderFlag(team, size = "") {
  if (!team) return `<div class="flag ${size} flag-placeholder">TBD</div>`;
  return `<img class="flag ${size}" src="${escapeAttr(team.flag)}" alt="${escapeAttr(team.name.en)} flag" loading="lazy" />`;
}

function stageLabel(stage) {
  return STAGE_LABELS[stage]?.[state.lang] || stage;
}

function localizeLabel(label) {
  if (!label) return "-";
  if (state.lang === "en") return escapeHtml(label);
  return escapeHtml(
    label
      .replace(/Runner-up Group ([A-L])/g, "2.º Grupo $1")
      .replace(/Winner Group ([A-L])/g, "Ganador Grupo $1")
      .replace(/3rd Group ([A-L/]+)/g, "3.º Grupo $1")
      .replace(/Winner Match (\d+)/g, "Ganador Partido $1")
      .replace(/Loser Match (\d+)/g, "Perdedor Partido $1"),
  );
}

function formatDate(iso) {
  return new Intl.DateTimeFormat(state.lang === "es" ? "es-ES" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatClock(iso) {
  return new Intl.DateTimeFormat(state.lang === "es" ? "es-ES" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatDayLabel(iso) {
  return new Intl.DateTimeFormat(state.lang === "es" ? "es-ES" : "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

function localDayKey(iso) {
  const date = new Date(iso);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function deadlineText(match) {
  if (isPredictionLocked(match)) return t("locked");
  const ms = new Date(match.kickoffUtc).getTime() - Date.now();
  const hours = Math.floor(ms / 3600000);
  if (hours < 48) {
    const minutes = Math.max(0, Math.floor((ms % 3600000) / 60000));
    return `${t("closeStatus")} ${hours}h ${minutes}m`;
  }
  const days = Math.ceil(ms / 86400000);
  return `${t("closeStatus")} ${days} ${days === 1 ? t("day") : t("days")}`;
}

function formatTime(iso) {
  return new Intl.DateTimeFormat(state.lang === "es" ? "es-ES" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatVenueLocal(localDate) {
  const [date, time] = localDate.split(" ");
  const [month, day] = date.split("/");
  return `${month}/${day} ${time}`;
}

function t(key) {
  return I18N[state.lang][key] || key;
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function loadPlayers() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.players) || "null");
    return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_PLAYERS;
  } catch {
    return DEFAULT_PLAYERS;
  }
}

function loadPools(players) {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.pools) || "null");
    if (Array.isArray(parsed) && parsed.length) return parsed;
  } catch {
    // Fall through to migration.
  }
  return [
    {
      id: "friends",
      name: I18N.es.friendsGroup,
      playerIds: players.map((player) => player.id),
    },
  ];
}

function loadPredictions() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.predictions) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function persistPlayers() {
  localStorage.setItem(STORAGE_KEYS.players, JSON.stringify(state.players));
}

function persistPools() {
  localStorage.setItem(STORAGE_KEYS.pools, JSON.stringify(state.pools));
}

function persistPredictions() {
  localStorage.setItem(STORAGE_KEYS.predictions, JSON.stringify(state.predictions));
}

function getInitialView() {
  const hash = window.location.hash.replace("#", "");
  return VIEWS.includes(hash) ? hash : "dashboard";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}
