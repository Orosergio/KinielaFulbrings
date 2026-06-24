import type { Language, Match } from "../types";

export type BracketStageGroup = {
  id: "r32" | "r16" | "qf" | "sf" | "finals";
  label: string;
  stageIds: string[];
};

export function bracketStages(language: Language): BracketStageGroup[] {
  return [
    { id: "r32", label: language === "es" ? "Ronda de 32" : "Round of 32", stageIds: ["r32"] },
    { id: "r16", label: language === "es" ? "Octavos" : "Round of 16", stageIds: ["r16"] },
    { id: "qf", label: language === "es" ? "Cuartos" : "Quarterfinals", stageIds: ["qf"] },
    { id: "sf", label: language === "es" ? "Semifinales" : "Semifinals", stageIds: ["sf"] },
    { id: "finals", label: language === "es" ? "Finales" : "Finals", stageIds: ["third", "final"] },
  ];
}

export function bracketMatches(matches: Match[], stage: BracketStageGroup) {
  return matches
    .filter((match) => stage.stageIds.includes(match.stage))
    .sort(
      (left, right) =>
        new Date(left.kickoffAt).getTime() -
          new Date(right.kickoffAt).getTime() || left.id - right.id,
    );
}

export function bracketMatchLabel(match: Match, language: Language) {
  if (match.stage === "third") {
    return language === "es" ? "Tercer lugar" : "Third place";
  }
  if (match.stage === "final") return language === "es" ? "Final" : "Final";
  return language === "es" ? "Eliminatoria" : "Knockout";
}
