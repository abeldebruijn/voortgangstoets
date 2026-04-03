import type { MyPracticeExam } from "@/components/my-practice-exams-data-table";
import type { Id } from "@/convex/_generated/dataModel";

export type ExamRow = {
  id: Id<"exams">;
  name: string;
  year: number;
  month: number;
  numberOfQuestions: number;
  answerableQuestionCount: number;
};

export type DashboardState = {
  myPracticeExams: MyPracticeExam[];
  allExams: ExamRow[];
};

export function buildCreatePracticeExamHref({
  examId,
  allowRetries,
  repeatIncorrectQuestionsLater,
  questionAmount,
}: {
  examId: Id<"exams">;
  allowRetries: boolean;
  repeatIncorrectQuestionsLater: boolean;
  questionAmount: number;
}) {
  const params = new URLSearchParams({
    examId,
    allowRetries: String(allowRetries),
    repeatIncorrectQuestionsLater: String(repeatIncorrectQuestionsLater),
    questionAmount: String(questionAmount),
  });

  return `/practice/create?${params.toString()}`;
}

export function formatExamLabel(
  name: string,
  year: number | null,
  month: number | null,
) {
  if (year === null || month === null) {
    return name;
  }

  return `${name} (${year}-${String(month).padStart(2, "0")})`;
}
