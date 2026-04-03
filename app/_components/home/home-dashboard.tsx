"use client";

import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";

import { CreatePracticeExamAction } from "@/app/_components/home/create-practice-exam-action";
import { DashboardAction } from "@/app/_components/home/dashboard-action";
import { formatExamLabel, type DashboardState } from "@/app/util/home";
import {
  MyPracticeExamsDataTable,
  type MyPracticeExam,
} from "@/components/my-practice-exams-data-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { RetryMenuValues } from "@/components/retry-menu-content";
import { api } from "@/convex/_generated/api";

export function HomeDashboard() {
  const data = useQuery(api.practiceExams.dashboard, {}) as
    | DashboardState
    | undefined;
  const retryPracticeExam = useMutation(api.practiceExams.retryPracticeExam);
  const router = useRouter();

  if (!data) {
    return (
      <p className="text-sm text-muted-foreground">Dashboard laden...</p>
    );
  }

  const hasMyPracticeExams = data.myPracticeExams.length > 0;

  const handleRetry = async (
    practiceExam: MyPracticeExam,
    values: RetryMenuValues,
  ) => {
    const result = await retryPracticeExam({
      practiceExamId: practiceExam.id,
      otherQuestions: values.otherQuestions,
      questionAmount: values.questionAmount,
      allowRetries: values.allowRetries,
      questionSelectionMode: values.questionSelectionMode,
    });

    router.push(`/practice/${result.practiceExamId}`);
  };

  return (
    <>
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold">Jouw dashboard</h2>
        <p className="text-sm text-muted-foreground">
          Start een nieuwe sessie, ga verder met een lopende sessie, of probeer
          het opnieuw met een andere vraagstrategie.
        </p>
      </div>

      {hasMyPracticeExams ? (
        <MyPracticeExamsDataTable
          practiceExams={data.myPracticeExams}
          renderAction={(practiceExam) => (
            <DashboardAction
              practiceExam={practiceExam}
              onContinue={() => router.push(`/practice/${practiceExam.id}`)}
              onRetry={(values) => handleRetry(practiceExam, values)}
            />
          )}
        />
      ) : null}

      <section className="flex flex-col gap-3 rounded-2xl border bg-background p-4 sm:p-5">
        <div className="flex flex-col gap-1">
          <h3 className="text-base font-semibold">Alle examens</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Naam</TableHead>
              <TableHead>Aantal vragen</TableHead>
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
                  Geen examens gevonden.
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
