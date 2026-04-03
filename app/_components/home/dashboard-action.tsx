"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import {
  RetryMenuContent,
  type RetryMenuValues,
} from "@/components/retry-menu-content";
import type { MyPracticeExam } from "@/components/my-practice-exams-data-table";

export function DashboardAction({
  practiceExam,
  onContinue,
  onRetry,
}: {
  practiceExam: MyPracticeExam;
  onContinue: () => void;
  onRetry: (values: RetryMenuValues) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  if (practiceExam.actionKind !== "retry") {
    return (
      <Button
        variant={practiceExam.actionKind === "start" ? "default" : "outline"}
        onClick={onContinue}
      >
        {practiceExam.actionKind === "start" ? "Start" : "Doorgaan"}
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>Opnieuw</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <RetryMenuContent
          practiceExamId={practiceExam.id}
          defaultQuestionAmount={practiceExam.questionCount}
          defaultAllowRetries={practiceExam.allowRetries}
          onSubmit={async (values) => {
            setOpen(false);
            await onRetry(values);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
