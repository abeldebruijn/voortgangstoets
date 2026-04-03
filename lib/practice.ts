export const RETRY_SELECTION_MODES = [
  "globalUnanswered",
  "sessionUnseen",
  "weakest",
] as const;

export type RetrySelectionMode = (typeof RETRY_SELECTION_MODES)[number];

export function formatPracticeType(type: string) {
  return type === "multipleChoice" ? "Meerkeuze" : "Open vragen";
}

export function formatProgress(progress: string) {
  switch (progress) {
    case "completed":
      return "Afgerond";
    case "in_progress":
      return "Bezig";
    default:
      return "Niet gestart";
  }
}

export function selectionModeLabel(mode: RetrySelectionMode) {
  switch (mode) {
    case "globalUnanswered":
      return "Globaal onbeantwoord";
    case "sessionUnseen":
      return "Vorige sessie niet gezien";
    case "weakest":
      return "Zwakste vragen";
  }
}

export function optionLetter(index: number) {
  return String.fromCharCode(65 + index);
}
