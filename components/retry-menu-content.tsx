"use client";

import { useState, useTransition } from "react";
import { Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  RETRY_SELECTION_MODES,
  RetrySelectionMode,
  selectionModeLabel,
} from "@/lib/practice";

export type RetryMenuValues = {
  otherQuestions: boolean;
  questionAmount: number;
  allowRetries: boolean;
  questionSelectionMode: RetrySelectionMode;
};

const selectionModeDescription: Record<RetrySelectionMode, string> = {
  globalUnanswered:
    "Picks questions you have never answered before across all practice exams for this exam, then fills any remaining spots with other available questions.",
  sessionUnseen:
    "Prefers questions that were not included in the previous practice exam session, then fills any remaining spots with other available questions.",
  weakest:
    "Prioritizes questions you struggle with most based on your past answers, then fills any remaining spots with other available questions.",
};

export function RetryMenuContent({
  practiceExamId,
  defaultQuestionAmount,
  defaultAllowRetries,
  onSubmit,
  submitLabel = "Start retry",
  className,
}: {
  practiceExamId: string;
  defaultQuestionAmount: number;
  defaultAllowRetries: boolean;
  onSubmit: (values: RetryMenuValues) => Promise<void>;
  submitLabel?: string;
  className?: string;
}) {
  const [otherQuestions, setOtherQuestions] = useState(true);
  const [questionAmount, setQuestionAmount] = useState(defaultQuestionAmount);
  const [allowRetries, setAllowRetries] = useState(defaultAllowRetries);
  const [questionSelectionMode, setQuestionSelectionMode] =
    useState<RetrySelectionMode>("globalUnanswered");
  const [isPending, startTransition] = useTransition();

  return (
    <div className={["flex flex-col gap-3", className ?? ""].join(" ").trim()}>
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-semibold">Retry practice exam</h3>
        <p className="text-sm text-muted-foreground">
          Choose the next question set before starting a new retry.
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor={`question-amount-${practiceExamId}`}
          className="text-sm font-medium"
        >
          Question amount
        </label>
        <Input
          id={`question-amount-${practiceExamId}`}
          type="number"
          min={1}
          value={questionAmount}
          onChange={(event) => {
            const nextValue = Number(event.target.value);
            setQuestionAmount(
              Number.isFinite(nextValue) && nextValue > 0 ? nextValue : 1,
            );
          }}
        />
      </div>

      <label className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm">
        <input
          type="checkbox"
          checked={allowRetries}
          onChange={(event) => setAllowRetries(event.target.checked)}
        />
        <span>Allow retries</span>
      </label>

      <label className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm">
        <input
          type="checkbox"
          checked={otherQuestions}
          onChange={(event) => setOtherQuestions(event.target.checked)}
        />
        <span>Other questions</span>
      </label>

      {otherQuestions ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium">Question selection</legend>
          <TooltipProvider>
            {RETRY_SELECTION_MODES.map((mode) => (
              <div
                key={mode}
                className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm"
              >
                <label className="flex flex-1 items-center gap-3">
                  <input
                    type="radio"
                    name={`selection-mode-${practiceExamId}`}
                    checked={questionSelectionMode === mode}
                    onChange={() => setQuestionSelectionMode(mode)}
                  />
                  <span className="flex-1">{selectionModeLabel(mode)}</span>
                </label>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        aria-label={`About ${selectionModeLabel(mode)}`}
                        className="text-muted-foreground"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Info className="h-4 w-4" />
                      </button>
                    }
                  />
                  <TooltipContent className="max-w-64 font-sans">
                    {selectionModeDescription[mode]}
                  </TooltipContent>
                </Tooltip>
              </div>
            ))}
          </TooltipProvider>
        </fieldset>
      ) : null}

      <Button
        onClick={() => {
          startTransition(async () => {
            await onSubmit({
              otherQuestions,
              questionAmount,
              allowRetries,
              questionSelectionMode,
            });
          });
        }}
        disabled={isPending}
      >
        {isPending ? "Creating retry..." : submitLabel}
      </Button>
    </div>
  );
}
