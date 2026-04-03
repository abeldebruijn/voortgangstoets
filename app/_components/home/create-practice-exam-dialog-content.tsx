"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { AllowRetriesTooltip } from "@/components/allow-retries-tooltip";

import type { ExamRow } from "@/app/util/home";

export function CreatePracticeExamDialogContent({
  exam,
  isPending,
  onSubmit,
}: {
  exam: ExamRow;
  isPending: boolean;
  onSubmit: (values: { allowRetries: boolean; questionAmount: number }) => void;
}) {
  const [allowRetries, setAllowRetries] = useState(false);
  const [questionAmount, setQuestionAmount] = useState(20);

  return (
    <>
      <DialogHeader>
        <DialogTitle>Oefentoets aanmaken</DialogTitle>
        <DialogDescription>{`Gebaseerd op ${exam.name}.`}</DialogDescription>
      </DialogHeader>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Type</legend>
        <div className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm">
          <span className="size-4 rounded-full border-4 border-primary" />
          <span>Meerkeuze</span>
        </div>
        <div className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm text-muted-foreground">
          <span className="size-4 rounded-full border border-muted-foreground/40" />
          <span>Open vragen</span>
          <span className="text-xs">Binnenkort beschikbaar</span>
        </div>
      </fieldset>

      <label className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm">
        <input
          type="checkbox"
          checked={allowRetries}
          onChange={(event) => setAllowRetries(event.target.checked)}
        />
        <span className="flex w-full items-center justify-between gap-2">
          <span>Herkansingen toestaan</span>
          <AllowRetriesTooltip />
        </span>
      </label>

      <div className="flex flex-col gap-1">
        <label htmlFor="create-question-amount" className="text-sm font-medium">
          Aantal vragen
        </label>
        <Input
          id="create-question-amount"
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

      <DialogFooter showCloseButton>
        <Button
          onClick={() => {
            onSubmit({
              allowRetries,
              questionAmount,
            });
          }}
          disabled={isPending}
        >
          {isPending ? "Aanmaken..." : "Oefentoets aanmaken"}
        </Button>
      </DialogFooter>
    </>
  );
}
