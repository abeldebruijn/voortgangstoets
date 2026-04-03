"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { CreatePracticeExamDialogContent } from "@/app/_components/home/create-practice-exam-dialog-content";
import { buildCreatePracticeExamHref, type ExamRow } from "@/app/util/home";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

export function CreatePracticeExamAction({ exam }: { exam: ExamRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleCreatePracticeExam = ({
    allowRetries,
    repeatIncorrectQuestionsLater,
    questionAmount,
  }: {
    allowRetries: boolean;
    repeatIncorrectQuestionsLater: boolean;
    questionAmount: number;
  }) => {
    setIsRedirecting(true);
    setOpen(false);
    router.push(
      buildCreatePracticeExamHref({
        examId: exam.id,
        allowRetries,
        repeatIncorrectQuestionsLater,
        questionAmount,
      }),
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            disabled={exam.answerableQuestionCount === 0}
          />
        }
      >
        {exam.answerableQuestionCount === 0
          ? "Geen oefentoets beschikbaar"
          : "Oefentoets aanmaken"}
      </DialogTrigger>
      <DialogContent>
        <CreatePracticeExamDialogContent
          key={open ? exam.id : "create-practice-exam-closed"}
          exam={exam}
          isPending={isRedirecting}
          onSubmit={handleCreatePracticeExam}
        />
      </DialogContent>
    </Dialog>
  );
}
