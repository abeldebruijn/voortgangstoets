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
import {
  RetryMenuContent,
  type RetryMenuValues,
} from "@/components/retry-menu-content";
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

function ScoreDial({ correct, total }: { correct: number; total: number }) {
  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
  const [displayPercentage, setDisplayPercentage] = useState(0);
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const dialColor =
    displayPercentage <= 33
      ? "rgb(239 68 68)"
      : displayPercentage <= 66
        ? "rgb(251 146 60)"
        : "rgb(34 197 94)";
  const dialTrackColor =
    displayPercentage <= 33
      ? "rgb(239 68 68 / 0.14)"
      : displayPercentage <= 66
        ? "rgb(251 146 60 / 0.14)"
        : "rgb(34 197 94 / 0.14)";
  const dashOffset =
    circumference -
    (Math.min(Math.max(displayPercentage, 0), 100) / 100) * circumference;

  useEffect(() => {
    let frameId = 0;
    const durationMs = 900;
    const startedAt = performance.now();

    setDisplayPercentage(0);

    const tick = (now: number) => {
      const elapsed = now - startedAt;
      const progress = Math.min(elapsed / durationMs, 1);
      const eased = 1 - (1 - progress) * (1 - progress);

      setDisplayPercentage(Math.round(percentage * eased));

      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    frameId = window.requestAnimationFrame(tick);

    return () => window.cancelAnimationFrame(frameId);
  }, [percentage]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative h-36 w-36">
        <svg
          viewBox="0 0 140 140"
          className="-rotate-90 h-full w-full"
          aria-label={`Score ${percentage} percent`}
        >
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke={dialTrackColor}
            strokeWidth="8"
          />
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke={dialColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <div
          className="absolute inset-0 flex items-center justify-center text-4xl font-semibold"
          style={{ color: dialColor }}
        >
          {displayPercentage}
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Score {correct} / {total}
      </p>
    </div>
  );
}

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
  const retryPracticeExam = useMutation(api.practiceExams.retryPracticeExam);
  const advanceToNextQuestion = useMutation(
    api.practiceExams.advanceToNextQuestion,
  );
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
  const [jitterState, setJitterState] = useState<{
    questionId: string;
    optionIndex: number;
    nonce: number;
  } | null>(null);

  useEffect(() => {
    if (data?.status === "not_started") {
      void markStarted({ practiceExamId });
    }
  }, [data?.status, markStarted, practiceExamId]);

  const currentQuestion = data?.currentQuestion ?? null;
  const selectedOptionIndex = currentQuestion
    ? (selectedAnswers[currentQuestion.id] ??
      currentQuestion.selectedOptionIndex ??
      null)
    : null;
  const feedbackOverride = currentQuestion
    ? (feedbackOverrides[currentQuestion.id] ?? null)
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
  }, [
    advanceToNextQuestion,
    currentQuestion,
    practiceExamId,
    secondsRemaining,
  ]);

  useEffect(() => {
    if (!jitterState) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setJitterState((current) =>
        current?.nonce === jitterState.nonce ? null : current,
      );
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [jitterState]);

  const feedbackText =
    feedbackOverride?.text ?? currentQuestion?.feedbackText ?? null;
  const feedbackSource =
    feedbackOverride?.source ?? currentQuestion?.feedbackSource ?? null;
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

  const handleRetry = async (values: RetryMenuValues) => {
    const result = await retryPracticeExam({
      practiceExamId,
      otherQuestions: values.otherQuestions,
      questionAmount: values.questionAmount,
      allowRetries: values.allowRetries,
      questionSelectionMode: values.questionSelectionMode,
    });

    router.push(`/practice/${result.practiceExamId}`);
  };

  if (!data) {
    return (
      <p className="text-sm text-muted-foreground">Loading practice exam...</p>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-6 rounded-2xl border bg-background p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-semibold">{data.examName}</h1>
            </div>
            <Button variant="outline" onClick={() => router.push("/")}>
              Back to dashboard
            </Button>
          </div>
          {data.status === "completed" ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <ScoreDial
                correct={data.correctFirstTryCount}
                total={data.questionCount}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              This practice exam is not available.
            </p>
          )}
        </div>
        {data.status === "completed" ? (
          <section className="flex flex-col gap-3 rounded-2xl border bg-background p-5 sm:p-6">
            <RetryMenuContent
              practiceExamId={data.id}
              defaultQuestionAmount={data.questionCount}
              defaultAllowRetries={data.allowRetries}
              onSubmit={handleRetry}
            />
          </section>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">{data.examName}</h1>
        </div>
        <Button variant="outline" onClick={() => router.push("/")}>
          Dashboard
        </Button>
      </div>

      <section className="flex flex-col gap-5 rounded-2xl border bg-background p-5 sm:p-6">
        <div className="flex flex-col gap-2">
          <div className="flex gap-4 justify-between">
            <p className="text-sm text-muted-foreground">
              Question {currentQuestion.questionNumber} of {data.questionCount}
            </p>
            <p className="text-sm text-muted-foreground">
              Score {data.correctFirstTryCount} / {data.questionCount}
            </p>
          </div>
          <h2 className="text-lg font-semibold leading-relaxed">
            {currentQuestion.question}
          </h2>
        </div>

        <div className="flex flex-col gap-2">
          {currentQuestion.options.map((option, index) => {
            const isSelected = selectedOptionIndex === index;
            const isDisabled =
              currentQuestion.isLocked || currentQuestion.isCorrect;
            const isCorrectSelection = currentQuestion.isCorrect && isSelected;
            const isJittering =
              jitterState?.questionId === currentQuestion.id &&
              jitterState.optionIndex === index;

            return (
              <button
                key={`${currentQuestion.id}-${index}-${isJittering ? jitterState.nonce : 0}`}
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
                  isCorrectSelection
                    ? "border-green-600 bg-green-50 text-green-900"
                    : isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border",
                  isDisabled ? "cursor-default" : "hover:bg-muted/50",
                ].join(" ")}
                style={
                  isJittering
                    ? { animation: "answer-jitter 320ms ease-in-out 1" }
                    : undefined
                }
              >
                <span className="font-medium">{optionLetter(index)}.</span>
                <span>{option}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-3">
          {!currentQuestion.isLocked && !currentQuestion.isCorrect ? (
            <Button
              disabled={submitDisabled}
              onClick={() => {
                if (selectedOptionIndex === null) {
                  return;
                }

                startSubmitTransition(async () => {
                  const result = await submitAnswer({
                    practiceExamId,
                    questionId: currentQuestion.id,
                    selectedOptionIndex,
                  });

                  if (result.outcome === "incorrect") {
                    setJitterState((current) => ({
                      questionId: currentQuestion.id,
                      optionIndex: selectedOptionIndex,
                      nonce: (current?.nonce ?? 0) + 1,
                    }));
                  }

                  if (
                    result.outcome === "incorrect" &&
                    result.needsAiFeedback
                  ) {
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
                  } else if (result.outcome === "correct") {
                    setFeedbackOverrides((current) => {
                      const next = { ...current };
                      delete next[currentQuestion.id];
                      return next;
                    });
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
              }}
            >
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
            {answerTone === "incorrect" && feedbackText ? (
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
