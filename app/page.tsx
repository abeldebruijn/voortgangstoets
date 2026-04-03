"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Authenticated,
  Unauthenticated,
  useMutation,
  useQuery,
} from "convex/react";
import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  formatPracticeType,
  formatProgress,
  RETRY_SELECTION_MODES,
  RetrySelectionMode,
  selectionModeLabel,
} from "@/lib/practice";

type MyPracticeExam = {
  id: Id<"practiceExams">;
  examName: string;
  progress: "not_started" | "in_progress" | "completed";
  scoreCorrect: number;
  questionCount: number;
  type: "multipleChoice";
  actionKind: "start" | "continue" | "retry";
  allowRetries: boolean;
  questionSelectionMode: string;
};
type ExamRow = {
  id: Id<"exams">;
  name: string;
  numberOfQuestions: number;
};
type DashboardState = {
  myPracticeExams: MyPracticeExam[];
  allExams: ExamRow[];
};

export default function Home() {
  return (
    <>
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Voortgang
            </p>
            <h1 className="text-lg font-semibold">Practice exams</h1>
          </div>
          <Authenticated>
            <UserButton />
          </Authenticated>
        </div>
      </header>
      <main className="mx-auto flex min-h-[calc(100vh-61px)] w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6">
        <Authenticated>
          <Dashboard />
        </Authenticated>
        <Unauthenticated>
          <SignInForm />
        </Unauthenticated>
      </main>
    </>
  );
}

function SignInForm() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 rounded-2xl border bg-background p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">Sign in to start practicing</h2>
        <p className="text-sm text-muted-foreground">
          Your dashboard and question history are only visible after login.
        </p>
      </div>
      <div className="flex gap-2">
        <SignInButton mode="modal">
          <Button>Sign in</Button>
        </SignInButton>
        <SignUpButton mode="modal">
          <Button variant="outline">Sign up</Button>
        </SignUpButton>
      </div>
    </div>
  );
}

function Dashboard() {
  const data = useQuery(api.practiceExams.dashboard, {}) as
    | DashboardState
    | undefined;
  const router = useRouter();
  const createPracticeExam = useMutation(api.practiceExams.createPracticeExam);
  const retryPracticeExam = useMutation(api.practiceExams.retryPracticeExam);
  const [isPending, startTransition] = useTransition();
  const [createDialogExam, setCreateDialogExam] = useState<ExamRow | null>(null);
  const [createAllowRetries, setCreateAllowRetries] = useState(false);
  const [createType, setCreateType] = useState<"multipleChoice" | "openEnded">(
    "multipleChoice",
  );

  if (!data) {
    return <p className="text-sm text-muted-foreground">Loading dashboard...</p>;
  }

  const handleCreatePracticeExam = () => {
    if (!createDialogExam || createType !== "multipleChoice") {
      return;
    }

    startTransition(async () => {
      const result = await createPracticeExam({
        examId: createDialogExam.id,
        type: createType,
        allowRetries: createAllowRetries,
      });

      setCreateDialogExam(null);
      router.push(`/practice/${result.practiceExamId}`);
    });
  };

  return (
    <>
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold">Your dashboard</h2>
        <p className="text-sm text-muted-foreground">
          Start a new session, continue one in progress, or retry with a different
          question strategy.
        </p>
      </div>

      <section className="flex flex-col gap-3 rounded-2xl border bg-background p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-semibold">My practice exams</h3>
            <p className="text-sm text-muted-foreground">
              All practice exams you created.
            </p>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Exam</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Questions</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.myPracticeExams.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No practice exams yet.
                </TableCell>
              </TableRow>
            ) : (
              data.myPracticeExams.map((practiceExam) => (
                <TableRow key={practiceExam.id}>
                  <TableCell className="font-medium">{practiceExam.examName}</TableCell>
                  <TableCell>{formatProgress(practiceExam.progress)}</TableCell>
                  <TableCell>
                    {practiceExam.scoreCorrect} / {practiceExam.questionCount}
                  </TableCell>
                  <TableCell>{practiceExam.questionCount}</TableCell>
                  <TableCell>{formatPracticeType(practiceExam.type)}</TableCell>
                  <TableCell className="text-right">
                    <DashboardAction
                      practiceExam={practiceExam}
                      onContinue={() => router.push(`/practice/${practiceExam.id}`)}
                      onRetry={async (values) => {
                        const result = await retryPracticeExam({
                          practiceExamId: practiceExam.id,
                          otherQuestions: values.otherQuestions,
                          questionAmount: values.questionAmount,
                          allowRetries: values.allowRetries,
                          questionSelectionMode: values.questionSelectionMode,
                        });

                        router.push(`/practice/${result.practiceExamId}`);
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border bg-background p-4 sm:p-5">
        <div className="flex flex-col gap-1">
          <h3 className="text-base font-semibold">All exams</h3>
          <p className="text-sm text-muted-foreground">
            Create a new multiple choice practice exam from the database.
          </p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Number of questions</TableHead>
              <TableHead className="text-right">Create practice exam</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.allExams.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                  No exams found.
                </TableCell>
              </TableRow>
            ) : (
              data.allExams.map((exam) => (
                <TableRow key={exam.id}>
                  <TableCell className="font-medium">{exam.name}</TableCell>
                  <TableCell>{exam.numberOfQuestions}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCreateDialogExam(exam);
                        setCreateAllowRetries(false);
                        setCreateType("multipleChoice");
                      }}
                    >
                      Create practice exam
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>

      <Dialog
        open={createDialogExam !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCreateDialogExam(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create practice exam</DialogTitle>
            <DialogDescription>
              {createDialogExam
                ? `Based on ${createDialogExam.name}.`
                : "Choose how to start your practice session."}
            </DialogDescription>
          </DialogHeader>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium">Type</legend>
            <label className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm">
              <input
                type="radio"
                name="practice-type"
                checked={createType === "multipleChoice"}
                onChange={() => setCreateType("multipleChoice")}
              />
              <span>Multiple choice</span>
            </label>
            <label className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm text-muted-foreground">
              <input type="radio" name="practice-type" disabled />
              <span>Open ended</span>
              <span className="text-xs">v1 disabled</span>
            </label>
          </fieldset>

          <label className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={createAllowRetries}
              onChange={(event) => setCreateAllowRetries(event.target.checked)}
            />
            <span>Allow retries</span>
          </label>

          <DialogFooter showCloseButton>
            <Button onClick={handleCreatePracticeExam} disabled={isPending || !createDialogExam}>
              {isPending ? "Creating..." : "Create practice exam"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DashboardAction({
  practiceExam,
  onContinue,
  onRetry,
}: {
  practiceExam: MyPracticeExam;
  onContinue: () => void;
  onRetry: (values: {
    otherQuestions: boolean;
    questionAmount: number;
    allowRetries: boolean;
    questionSelectionMode: RetrySelectionMode;
  }) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [otherQuestions, setOtherQuestions] = useState(true);
  const [questionAmount, setQuestionAmount] = useState(practiceExam.questionCount);
  const [allowRetries, setAllowRetries] = useState(practiceExam.allowRetries);
  const [questionSelectionMode, setQuestionSelectionMode] =
    useState<RetrySelectionMode>("globalUnanswered");
  const [isPending, startTransition] = useTransition();

  if (practiceExam.actionKind !== "retry") {
    return (
      <Button variant={practiceExam.actionKind === "start" ? "default" : "outline"} onClick={onContinue}>
        {practiceExam.actionKind === "start" ? "Start" : "Continue"}
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="outline" />}>Retry</PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <PopoverHeader>
          <PopoverTitle>Retry practice exam</PopoverTitle>
          <PopoverDescription>
            Choose the next question set before starting a new retry.
          </PopoverDescription>
        </PopoverHeader>

        <label className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm">
          <input
            type="checkbox"
            checked={otherQuestions}
            onChange={(event) => setOtherQuestions(event.target.checked)}
          />
          <span>Other questions</span>
        </label>

        <div className="flex flex-col gap-1">
          <label htmlFor={`question-amount-${practiceExam.id}`} className="text-sm font-medium">
            Question amount
          </label>
          <Input
            id={`question-amount-${practiceExam.id}`}
            type="number"
            min={1}
            value={questionAmount}
            onChange={(event) => {
              const nextValue = Number(event.target.value);
              setQuestionAmount(Number.isFinite(nextValue) && nextValue > 0 ? nextValue : 1);
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

        {otherQuestions ? (
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium">Question selection</legend>
            {RETRY_SELECTION_MODES.map((mode) => (
              <label
                key={mode}
                className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm"
              >
                <input
                  type="radio"
                  name={`selection-mode-${practiceExam.id}`}
                  checked={questionSelectionMode === mode}
                  onChange={() => setQuestionSelectionMode(mode)}
                />
                <span>{selectionModeLabel(mode)}</span>
              </label>
            ))}
          </fieldset>
        ) : null}

        <Button
          onClick={() => {
            startTransition(async () => {
              await onRetry({
                otherQuestions,
                questionAmount,
                allowRetries,
                questionSelectionMode,
              });
            });
          }}
          disabled={isPending}
        >
          {isPending ? "Creating retry..." : "Start retry"}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
