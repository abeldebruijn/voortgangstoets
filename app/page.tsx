"use client";

import { SignInButton, SignUpButton } from "@clerk/nextjs";
import {
  Authenticated,
  Unauthenticated,
  useMutation,
  useQuery,
} from "convex/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import Nav from "@/components/ui/nav";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  RetryMenuContent,
  type RetryMenuValues,
} from "@/components/retry-menu-content";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatPracticeType, formatProgress } from "@/lib/practice";

type MyPracticeExam = {
  id: Id<"practiceExams">;
  examName: string;
  examYear: number | null;
  examMonth: number | null;
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
  year: number;
  month: number;
  numberOfQuestions: number;
  answerableQuestionCount: number;
};
type DashboardState = {
  myPracticeExams: MyPracticeExam[];
  allExams: ExamRow[];
};

function formatExamLabel(name: string, year: number | null, month: number | null) {
  if (year === null || month === null) {
    return name;
  }

  return `${name} (${year}-${String(month).padStart(2, "0")})`;
}

export default function Home() {
  return (
    <>
      <Nav />
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
  const [createDialogExam, setCreateDialogExam] = useState<ExamRow | null>(
    null,
  );
  const [createAllowRetries, setCreateAllowRetries] = useState(false);
  const [createType, setCreateType] = useState<"multipleChoice" | "openEnded">(
    "multipleChoice",
  );
  const [createQuestionAmount, setCreateQuestionAmount] = useState(20);

  if (!data) {
    return (
      <p className="text-sm text-muted-foreground">Loading dashboard...</p>
    );
  }

  const hasMyPracticeExams = data.myPracticeExams.length > 0;

  const handleCreatePracticeExam = () => {
    if (!createDialogExam || createType !== "multipleChoice") {
      return;
    }

    startTransition(async () => {
      const result = await createPracticeExam({
        examId: createDialogExam.id,
        type: createType,
        allowRetries: createAllowRetries,
        questionAmount: createQuestionAmount,
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
          Start a new session, continue one in progress, or retry with a
          different question strategy.
        </p>
      </div>

      {hasMyPracticeExams ? (
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
              {data.myPracticeExams.map((practiceExam) => (
                <TableRow key={practiceExam.id}>
                  <TableCell className="font-medium">
                    {formatExamLabel(
                      practiceExam.examName,
                      practiceExam.examYear,
                      practiceExam.examMonth,
                    )}
                  </TableCell>
                  <TableCell>{formatProgress(practiceExam.progress)}</TableCell>
                  <TableCell>
                    {practiceExam.scoreCorrect} / {practiceExam.questionCount}
                  </TableCell>
                  <TableCell>{practiceExam.questionCount}</TableCell>
                  <TableCell>{formatPracticeType(practiceExam.type)}</TableCell>
                  <TableCell className="text-right">
                    <DashboardAction
                      practiceExam={practiceExam}
                      onContinue={() =>
                        router.push(`/practice/${practiceExam.id}`)
                      }
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
              ))}
            </TableBody>
          </Table>
        </section>
      ) : null}

      <section className="flex flex-col gap-3 rounded-2xl border bg-background p-4 sm:p-5">
        <div className="flex flex-col gap-1">
          <h3 className="text-base font-semibold">All exams</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Number of questions</TableHead>
              <TableHead className="text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.allExams.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="py-8 text-center text-muted-foreground"
                >
                  No exams found.
                </TableCell>
              </TableRow>
            ) : (
              data.allExams.map((exam) => (
                <TableRow key={exam.id}>
                  <TableCell className="font-medium">
                    {formatExamLabel(exam.name, exam.year, exam.month)}
                  </TableCell>
                  <TableCell>{exam.numberOfQuestions}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      disabled={exam.answerableQuestionCount === 0}
                      onClick={() => {
                        setCreateDialogExam(exam);
                        setCreateAllowRetries(false);
                        setCreateType("multipleChoice");
                        setCreateQuestionAmount(20);
                      }}
                    >
                      {exam.answerableQuestionCount === 0
                        ? "No practice exam available"
                        : "Create practice exam"}
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
            setCreateAllowRetries(false);
            setCreateType("multipleChoice");
            setCreateQuestionAmount(20);
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

          <div className="flex flex-col gap-1">
            <label
              htmlFor="create-question-amount"
              className="text-sm font-medium"
            >
              Question amount
            </label>
            <Input
              id="create-question-amount"
              type="number"
              min={1}
              value={createQuestionAmount}
              disabled={createType !== "multipleChoice"}
              onChange={(event) => {
                const nextValue = Number(event.target.value);
                setCreateQuestionAmount(
                  Number.isFinite(nextValue) && nextValue > 0 ? nextValue : 1,
                );
              }}
            />
          </div>

          <DialogFooter showCloseButton>
            <Button
              onClick={handleCreatePracticeExam}
              disabled={isPending || !createDialogExam}
            >
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
  onRetry: (values: RetryMenuValues) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  if (practiceExam.actionKind !== "retry") {
    return (
      <Button
        variant={practiceExam.actionKind === "start" ? "default" : "outline"}
        onClick={onContinue}
      >
        {practiceExam.actionKind === "start" ? "Start" : "Continue"}
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="outline" />}>
        Retry
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <RetryMenuContent
          practiceExamId={practiceExam.id}
          defaultQuestionAmount={practiceExam.questionCount}
          defaultAllowRetries={practiceExam.allowRetries}
          onSubmit={onRetry}
        />
      </PopoverContent>
    </Popover>
  );
}
