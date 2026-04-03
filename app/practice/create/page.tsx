"use client";

import { SignInButton } from "@clerk/nextjs";
import { Authenticated, Unauthenticated, useMutation } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

function parseCreatePracticeExamSearchParams(searchParams: URLSearchParams) {
  const examId = searchParams.get("examId");
  const questionAmount = Number(searchParams.get("questionAmount"));
  const allowRetries = searchParams.get("allowRetries");
  const repeatIncorrectQuestionsLater = searchParams.get(
    "repeatIncorrectQuestionsLater",
  );

  if (!examId || !Number.isFinite(questionAmount) || questionAmount < 1) {
    return null;
  }

  return {
    examId: examId as Id<"exams">,
    questionAmount,
    allowRetries: allowRetries === "true",
    repeatIncorrectQuestionsLater: repeatIncorrectQuestionsLater === "true",
  };
}

export default function CreatePracticeExamPage() {
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
        <CreatePracticeExamLoader />
      </Authenticated>
    </main>
  );
}

function CreatePracticeExamLoader() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createPracticeExam = useMutation(api.practiceExams.createPracticeExam);
  const hasStartedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const request = useMemo(
    () => parseCreatePracticeExamSearchParams(searchParams),
    [searchParams],
  );

  useEffect(() => {
    if (!request || hasStartedRef.current) {
      return;
    }

    hasStartedRef.current = true;

    void createPracticeExam({
      examId: request.examId,
      type: "multipleChoice",
      allowRetries: request.allowRetries,
      repeatIncorrectQuestionsLater: request.repeatIncorrectQuestionsLater,
      questionAmount: request.questionAmount,
    })
      .then((result) => {
        router.replace(`/practice/${result.practiceExamId}`);
      })
      .catch((caughtError: unknown) => {
        hasStartedRef.current = false;
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Failed to create practice exam.",
        );
      });
  }, [createPracticeExam, request, router]);

  if (!request) {
    return (
      <div className="flex flex-col gap-4 rounded-2xl border bg-background p-6">
        <h1 className="text-xl font-semibold">Unable to create practice exam</h1>
        <p className="text-sm text-muted-foreground">
          The request is missing required settings.
        </p>
        <div>
          <Button variant="outline" onClick={() => router.replace("/")}>
            Back to dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-4 rounded-2xl border bg-background p-6">
        <h1 className="text-xl font-semibold">Unable to create practice exam</h1>
        <p className="text-sm text-muted-foreground">{error}</p>
        <div>
          <Button variant="outline" onClick={() => router.replace("/")}>
            Back to dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-6 rounded-2xl border bg-background p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold">Preparing practice exam</h1>
            <p className="text-sm text-muted-foreground">
              Loading questions and setting up your session.
            </p>
          </div>
          <Button variant="outline" onClick={() => router.replace("/")}>
            Back to dashboard
          </Button>
        </div>
        <div className="flex flex-col gap-3 rounded-xl border border-dashed p-5">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
          </div>
          <p className="text-sm text-muted-foreground">
            This can take a few seconds for larger exams.
          </p>
        </div>
      </div>
    </div>
  );
}
