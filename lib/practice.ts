export const RETRY_SELECTION_MODES = [
  "globalUnanswered",
  "sessionUnseen",
  "weakest",
] as const;

export type RetrySelectionMode = (typeof RETRY_SELECTION_MODES)[number];

export function formatPracticeType(type: string) {
  return type === "multipleChoice" ? "Multiple choice" : "Open ended";
}

export function formatProgress(progress: string) {
  switch (progress) {
    case "completed":
      return "Completed";
    case "in_progress":
      return "In progress";
    default:
      return "Not started";
  }
}

export function selectionModeLabel(mode: RetrySelectionMode) {
  switch (mode) {
    case "globalUnanswered":
      return "Globally unanswered";
    case "sessionUnseen":
      return "Previous-session unseen";
    case "weakest":
      return "Weakest questions";
  }
}

export function optionLetter(index: number) {
  return String.fromCharCode(65 + index);
}
