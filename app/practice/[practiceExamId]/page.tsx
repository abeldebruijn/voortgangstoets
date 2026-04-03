"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Authenticated,
  Unauthenticated,
  useAction,
  useMutation,
  useQuery,
} from "convex/react";
import { SignInButton } from "@clerk/nextjs";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { optionLetter } from "@/lib/practice";

type PracticeExamState = {
  id: Id<"practiceExams">;
  examName: string;
  status: "not_started" | "in_progress" | "completed";
  allowRetries: boolean;
  questionCount: number;
  answeredCount: number;
  correctFirstTryCount: number;
  currentQuestion: {
    id: Id<"questions">;
    question: string;
    options: string[];
    questionNumber: number;
    order: number;
    selectedOptionIndex: number | null;
    attemptCount: number;
    isCorrect: boolean;
    isLocked: boolean;
    feedbackText: string | null;
    feedbackSource: string | null;
  } | null;
};

export default function PracticeExamPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6">
      <Unauthenticated>
        <div className="flex flex-col gap-4 rounded-2xl border bg-background p-6">
          <h1 className="text-xl font-semibold">Sign in to continue</h1>
          <p className="text-sm text-muted-foreground">
            Practice exams are linked to your account.
          </p>
          <SignInButton mode="modal">
            <Button>Sign in</Button>
          </SignInButton>
        </div>
      </Unauthenticated>
      <Authenticated>
        <PracticeExamPlayer />
      </Authenticated>
    </main>
  );
}

function PracticeExamPlayer() {
  const router = useRouter();
  const params = useParams<{ practiceExamId: string }>();
  const practiceExamId = params.practiceExamId as Id<"practiceExams">;
  const data = useQuery(api.practiceExams.getPracticeExam, {
    practiceExamId,
  }) as PracticeExamState | null | undefined;
  const markStarted = useMutation(api.practiceExams.markPracticeExamStarted);
  const submitAnswer = useMutation(api.practiceExams.submitAnswer);
  const advanceToNextQuestion = useMutation(api.practiceExams.advanceToNextQuestion);
  const generateWrongAnswerFeedback = useAction(
    api.practiceFeedback.generateWrongAnswerFeedback,
  );
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, number | null>
  >({});
  const [feedbackOverrides, setFeedbackOverrides] = useState<
    Record<string, { text: string; source: string }>
  >({});
  const [isSubmitting, startSubmitTransition] = useTransition();
  const [isAdvancing, startAdvanceTransition] = useTransition();
  const [countdownState, setCountdownState] = useState<{
    questionId: string;
    seconds: number;
  } | null>(null);

  useEffect(() => {
    if (data?.status === "not_started") {
      void markStarted({ practiceExamId });
    }
  }, [data?.status, markStarted, practiceExamId]);

  const currentQuestion = data?.currentQuestion ?? null;
  const selectedOptionIndex = currentQuestion
    ? (selectedAnswers[currentQuestion.id] ?? currentQuestion.selectedOptionIndex ?? null)
    : null;
  const feedbackOverride = currentQuestion
    ? feedbackOverrides[currentQuestion.id] ?? null
    : null;
  const secondsRemaining =
    currentQuestion && currentQuestion.isCorrect
      ? countdownState?.questionId === currentQuestion.id
        ? countdownState.seconds
        : 5
      : null;

  useEffect(() => {
    if (!currentQuestion?.isCorrect || secondsRemaining === null) {
      return;
    }

    if (secondsRemaining <= 0) {
      startAdvanceTransition(async () => {
        await advanceToNextQuestion({ practiceExamId });
      });
      return;
    }

    const timeout = window.setTimeout(() => {
      setCountdownState((current) => {
        if (!currentQuestion) {
          return null;
        }

        if (!current || current.questionId !== currentQuestion.id) {
          return {
            questionId: currentQuestion.id,
            seconds: 4,
          };
        }

        return {
          questionId: current.questionId,
          seconds: current.seconds - 1,
        };
      });
    }, 1000);

    return () => window.clearTimeout(timeout);
  }, [advanceToNextQuestion, currentQuestion, practiceExamId, secondsRemaining]);

  const feedbackText = feedbackOverride?.text ?? currentQuestion?.feedbackText ?? null;
  const feedbackSource = feedbackOverride?.source ?? currentQuestion?.feedbackSource ?? null;
  const submitDisabled =
    !currentQuestion ||
    selectedOptionIndex === null ||
    currentQuestion.isLocked ||
    isSubmitting;

  const answerTone = useMemo(() => {
    if (!currentQuestion) {
      return null;
    }

    if (currentQuestion.isCorrect) {
      return "correct";
    }

    if (currentQuestion.isLocked || currentQuestion.attemptCount > 0) {
      return "incorrect";
    }

    return null;
  }, [currentQuestion]);

  if (!data) {
    return <p className="text-sm text-muted-foreground">Loading practice exam...</p>;
  }

  if (!currentQuestion) {
    return (
      <div className="flex flex-col gap-4 rounded-2xl border bg-background p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Practice exam
            </p>
            <h1 className="text-2xl font-semibold">{data.examName}</h1>
          </div>
          <Button variant="outline" onClick={() => router.push("/")}>
            Back to dashboard
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          {data.status === "completed"
            ? `Completed. Score: ${data.correctFirstTryCount} / ${data.questionCount}.`
            : "This practice exam is not available."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Practice exam
          </p>
          <h1 className="text-2xl font-semibold">{data.examName}</h1>
          <p className="text-sm text-muted-foreground">
            Question {currentQuestion.questionNumber} of {data.questionCount}
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push("/")}>
          Dashboard
        </Button>
      </div>

      <section className="flex flex-col gap-5 rounded-2xl border bg-background p-5 sm:p-6">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            Score {data.correctFirstTryCount} / {data.questionCount}
          </p>
          <h2 className="text-lg font-semibold leading-relaxed">
            {currentQuestion.question}
          </h2>
        </div>

        <div className="flex flex-col gap-2">
          {currentQuestion.options.map((option, index) => {
            const isSelected = selectedOptionIndex === index;
            const isDisabled = currentQuestion.isLocked || currentQuestion.isCorrect;

            return (
              <button
                key={`${currentQuestion.id}-${index}`}
                type="button"
                disabled={isDisabled}
                onClick={() =>
                  setSelectedAnswers((current) => ({
                    ...current,
                    [currentQuestion.id]: index,
                  }))
                }
                className={[
                  "flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors",
                  isSelected ? "border-primary bg-primary/5" : "border-border",
                  isDisabled ? "cursor-default" : "hover:bg-muted/50",
                ].join(" ")}
              >
                <span className="font-medium">{optionLetter(index)}.</span>
                <span>{option}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-3">
          {!currentQuestion.isLocked && !currentQuestion.isCorrect ? (
            <Button disabled={submitDisabled} onClick={() => {
              if (selectedOptionIndex === null) {
                return;
              }

              startSubmitTransition(async () => {
                const result = await submitAnswer({
                  practiceExamId,
                  questionId: currentQuestion.id,
                  selectedOptionIndex,
                });

                if (result.outcome === "incorrect" && result.needsAiFeedback) {
                  const feedback = await generateWrongAnswerFeedback({
                    practiceExamId,
                    questionId: currentQuestion.id,
                    selectedOptionIndex,
                  });

                  setFeedbackOverrides((current) => ({
                    ...current,
                    [currentQuestion.id]: {
                      text: feedback.feedbackText,
                      source: feedback.feedbackSource,
                    },
                  }));
                } else if (result.feedbackText) {
                  const feedbackText = result.feedbackText;
                  setFeedbackOverrides((current) => ({
                    ...current,
                    [currentQuestion.id]: {
                      text: feedbackText,
                      source: result.feedbackSource ?? "feedback",
                    },
                  }));
                }
              });
            }}>
              {isSubmitting ? "Checking..." : "Submit answer"}
            </Button>
          ) : null}

          {currentQuestion.isCorrect || currentQuestion.isLocked ? (
            <div className="flex flex-col gap-2">
              <Button
                variant={currentQuestion.isCorrect ? "default" : "outline"}
                disabled={isAdvancing}
                onClick={() => {
                  startAdvanceTransition(async () => {
                    await advanceToNextQuestion({ practiceExamId });
                  });
                }}
              >
                {isAdvancing ? "Loading..." : "Go to next question"}
              </Button>
              {currentQuestion.isCorrect && secondsRemaining !== null ? (
                <p className="text-sm text-muted-foreground">
                  Next question in {secondsRemaining}s
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        {answerTone ? (
          <div
            className={[
              "rounded-xl border px-4 py-3 text-sm",
              answerTone === "correct"
                ? "border-primary/20 bg-primary/5 text-foreground"
                : "border-border bg-muted/40 text-foreground",
            ].join(" ")}
          >
            <p className="font-medium">
              {answerTone === "correct" ? "Correct." : "Not correct."}
            </p>
            {feedbackText ? (
              <p className="mt-1 text-muted-foreground">
                {feedbackText}
                {feedbackSource ? ` (${feedbackSource})` : ""}
              </p>
            ) : answerTone === "incorrect" ? (
              <p className="mt-1 text-muted-foreground">
                Feedback is being prepared.
              </p>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
