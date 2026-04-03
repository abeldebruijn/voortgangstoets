"use client";

import { SignInButton, SignUpButton } from "@clerk/nextjs";
import {
  Authenticated,
  Unauthenticated,
  useMutation,
  useQuery,
} from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  MyPracticeExamsDataTable,
  type MyPracticeExam,
} from "@/components/my-practice-exams-data-table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import Nav from "@/components/ui/nav";
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

function buildCreatePracticeExamHref({
  examId,
  allowRetries,
  questionAmount,
}: {
  examId: Id<"exams">;
  allowRetries: boolean;
  questionAmount: number;
}) {
  const params = new URLSearchParams({
    examId,
    allowRetries: String(allowRetries),
    questionAmount: String(questionAmount),
  });

  return `/practice/create?${params.toString()}`;
}

function formatExamLabel(
  name: string,
  year: number | null,
  month: number | null,
) {
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
  const retryPracticeExam = useMutation(api.practiceExams.retryPracticeExam);
  const router = useRouter();

  if (!data) {
    return (
      <p className="text-sm text-muted-foreground">Loading dashboard...</p>
    );
  }

  const hasMyPracticeExams = data.myPracticeExams.length > 0;

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
        <MyPracticeExamsDataTable
          practiceExams={data.myPracticeExams}
          renderAction={(practiceExam) => (
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
          )}
        />
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
                    <CreatePracticeExamAction exam={exam} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>
    </>
  );
}

function CreatePracticeExamAction({ exam }: { exam: ExamRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleCreatePracticeExam = ({
    allowRetries,
    questionAmount,
  }: {
    allowRetries: boolean;
    questionAmount: number;
  }) => {
    setIsRedirecting(true);
    setOpen(false);
    router.push(
      buildCreatePracticeExamHref({
        examId: exam.id,
        allowRetries,
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
          ? "No practice exam available"
          : "Create practice exam"}
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

function CreatePracticeExamDialogContent({
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
        <DialogTitle>Create practice exam</DialogTitle>
        <DialogDescription>{`Based on ${exam.name}.`}</DialogDescription>
      </DialogHeader>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Type</legend>
        <div className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm">
          <span className="size-4 rounded-full border-4 border-primary" />
          <span>Multiple choice</span>
        </div>
        <div className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm text-muted-foreground">
          <span className="size-4 rounded-full border border-muted-foreground/40" />
          <span>Open ended</span>
          <span className="text-xs">Available in the future</span>
        </div>
      </fieldset>

      <label className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm">
        <input
          type="checkbox"
          checked={allowRetries}
          onChange={(event) => setAllowRetries(event.target.checked)}
        />
        <span>Allow retries</span>
      </label>

      <div className="flex flex-col gap-1">
        <label htmlFor="create-question-amount" className="text-sm font-medium">
          Question amount
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
          {isPending ? "Creating..." : "Create practice exam"}
        </Button>
      </DialogFooter>
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>Retry</DialogTrigger>
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
