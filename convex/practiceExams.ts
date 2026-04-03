import { ConvexError, v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  QueryCtx,
  MutationCtx,
} from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

type RetrySelectionMode = "globalUnanswered" | "sessionUnseen" | "weakest";
type StoredSelectionMode =
  | "random"
  | "sameQuestions"
  | RetrySelectionMode;

function requireIdentity(ctx: QueryCtx | MutationCtx) {
  return ctx.auth.getUserIdentity().then((identity) => {
    if (!identity) {
      throw new ConvexError("Unauthorized");
    }

    return identity;
  });
}

function optionLetter(index: number) {
  return String.fromCharCode(65 + index);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function shuffle<T>(items: T[]) {
  const next = [...items];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = next[index];
    next[index] = next[swapIndex];
    next[swapIndex] = current;
  }

  return next;
}

async function getExamQuestions(ctx: QueryCtx | MutationCtx, examId: Id<"exams">) {
  const questions: Doc<"questions">[] = [];

  for await (const question of ctx.db
    .query("questions")
    .withIndex("by_exam_and_number", (queryBuilder) =>
      queryBuilder.eq("exam", examId),
    )) {
    if (question.answer !== undefined) {
      questions.push(question);
    }
  }

  return questions;
}

async function getPracticeExamQuestionRows(
  ctx: QueryCtx | MutationCtx,
  practiceExamId: Id<"practiceExams">,
) {
  const rows: Doc<"practiceExamQuestions">[] = [];

  for await (const row of ctx.db
    .query("practiceExamQuestions")
    .withIndex("by_practiceExam_and_order", (queryBuilder) =>
      queryBuilder.eq("practiceExam", practiceExamId),
    )) {
    rows.push(row);
  }

  return rows;
}

async function getOwnedPracticeExam(
  ctx: QueryCtx | MutationCtx,
  practiceExamId: Id<"practiceExams">,
  userTokenIdentifier: string,
) {
  const practiceExam = await ctx.db.get(practiceExamId);

  if (!practiceExam || practiceExam.userTokenIdentifier !== userTokenIdentifier) {
    throw new ConvexError("Practice exam not found");
  }

  return practiceExam;
}

function getWeakestQuestionIds(
  questions: Doc<"questions">[],
  statsByQuestionId: Map<Id<"questions">, Doc<"userQuestionStats">>,
) {
  const unanswered: Id<"questions">[] = [];
  const incorrectOnly: Id<"questions">[] = [];
  const correctWithRetries: Array<{
    questionId: Id<"questions">;
    attemptsBeforeFirstCorrect: number;
  }> = [];
  const correctFirstTry: Id<"questions">[] = [];

  for (const question of questions) {
    const stat = statsByQuestionId.get(question._id);

    if (!stat || !stat.hasAnswered) {
      unanswered.push(question._id);
      continue;
    }

    if (!stat.hasAnsweredCorrectly) {
      incorrectOnly.push(question._id);
      continue;
    }

    if ((stat.attemptsBeforeFirstCorrect ?? 1) > 1) {
      correctWithRetries.push({
        questionId: question._id,
        attemptsBeforeFirstCorrect: stat.attemptsBeforeFirstCorrect ?? 1,
      });
      continue;
    }

    correctFirstTry.push(question._id);
  }

  correctWithRetries.sort(
    (left, right) =>
      right.attemptsBeforeFirstCorrect - left.attemptsBeforeFirstCorrect,
  );

  return [
    ...shuffle(unanswered),
    ...shuffle(incorrectOnly),
    ...correctWithRetries.map((entry) => entry.questionId),
    ...shuffle(correctFirstTry),
  ];
}

function pickQuestionIds(args: {
  allQuestions: Doc<"questions">[];
  questionAmount: number;
  previousQuestionIds: Id<"questions">[];
  selectionMode: StoredSelectionMode;
  statsByQuestionId: Map<Id<"questions">, Doc<"userQuestionStats">>;
}) {
  const {
    allQuestions,
    questionAmount,
    previousQuestionIds,
    selectionMode,
    statsByQuestionId,
  } = args;
  const allQuestionIds = allQuestions.map((question) => question._id);
  const previousQuestionIdSet = new Set(previousQuestionIds);
  let preferred: Id<"questions">[];

  switch (selectionMode) {
    case "sameQuestions":
      preferred = previousQuestionIds.filter((questionId) =>
        allQuestionIds.includes(questionId),
      );
      break;
    case "globalUnanswered":
      preferred = allQuestionIds.filter((questionId) => {
        const stat = statsByQuestionId.get(questionId);
        return !stat || !stat.hasAnswered;
      });
      preferred = shuffle(preferred);
      break;
    case "sessionUnseen":
      preferred = shuffle(
        allQuestionIds.filter((questionId) => !previousQuestionIdSet.has(questionId)),
      );
      break;
    case "weakest":
      preferred = getWeakestQuestionIds(allQuestions, statsByQuestionId);
      break;
    case "random":
    default:
      preferred = shuffle(allQuestionIds);
      break;
  }

  const selected = preferred.slice(0, questionAmount);

  if (selected.length >= questionAmount) {
    return selected;
  }

  const selectedSet = new Set(selected);
  const backfill = shuffle(
    allQuestionIds.filter((questionId) => !selectedSet.has(questionId)),
  );

  return [...selected, ...backfill].slice(0, questionAmount);
}

async function insertPracticeExam(
  ctx: MutationCtx,
  args: {
    examId: Id<"exams">;
    userTokenIdentifier: string;
    questionIds: Id<"questions">[];
    allowRetries: boolean;
    questionSelectionMode: StoredSelectionMode;
    retryOf?: Id<"practiceExams">;
  },
) {
  const now = Date.now();
  const practiceExamId = await ctx.db.insert("practiceExams", {
    exam: args.examId,
    userTokenIdentifier: args.userTokenIdentifier,
    status: "not_started",
    type: "multipleChoice",
    allowRetries: args.allowRetries,
    questionCount: args.questionIds.length,
    answeredCount: 0,
    correctFirstTryCount: 0,
    activeQuestionOrder: 0,
    questionSelectionMode: args.questionSelectionMode,
    createdAt: now,
    ...(args.retryOf ? { retryOf: args.retryOf } : {}),
  });

  for (const [order, questionId] of args.questionIds.entries()) {
    await ctx.db.insert("practiceExamQuestions", {
      practiceExam: practiceExamId,
      question: questionId,
      order,
      isCorrect: false,
      retryCount: 0,
      attemptCount: 0,
      isLocked: false,
    });
  }

  return practiceExamId;
}

export const dashboard = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    const exams: Doc<"exams">[] = [];

    for await (const exam of ctx.db.query("exams")) {
      exams.push(exam);
    }

    const examQuestionCount = new Map<Id<"exams">, number>();

    for (const exam of exams) {
      let count = 0;

      for await (const question of ctx.db
        .query("questions")
        .withIndex("by_exam_and_number", (queryBuilder) =>
          queryBuilder.eq("exam", exam._id),
        )) {
        if (question.answer !== undefined) {
          count += 1;
        }
      }

      examQuestionCount.set(exam._id, count);
    }

    if (!identity) {
      return {
        myPracticeExams: [],
        allExams: exams.map((exam) => ({
          id: exam._id,
          name: exam.name,
          numberOfQuestions: examQuestionCount.get(exam._id) ?? 0,
        })),
      };
    }

    const practiceExams: Doc<"practiceExams">[] = [];

    for await (const practiceExam of ctx.db
      .query("practiceExams")
      .withIndex("by_userTokenIdentifier_and_createdAt", (queryBuilder) =>
        queryBuilder.eq("userTokenIdentifier", identity.tokenIdentifier),
      )
      .order("desc")) {
      practiceExams.push(practiceExam);
    }

    const examNameById = new Map(exams.map((exam) => [exam._id, exam.name]));

    return {
      myPracticeExams: practiceExams.map((practiceExam) => ({
        id: practiceExam._id,
        examName: examNameById.get(practiceExam.exam) ?? "Unknown exam",
        progress: practiceExam.status,
        scoreCorrect: practiceExam.correctFirstTryCount,
        questionCount: practiceExam.questionCount,
        type: practiceExam.type,
        actionKind:
          practiceExam.status === "completed"
            ? "retry"
            : practiceExam.status === "in_progress"
              ? "continue"
              : "start",
        allowRetries: practiceExam.allowRetries,
        questionSelectionMode: practiceExam.questionSelectionMode,
      })),
      allExams: exams.map((exam) => ({
        id: exam._id,
        name: exam.name,
        numberOfQuestions: examQuestionCount.get(exam._id) ?? 0,
      })),
    };
  },
});

export const createPracticeExam = mutation({
  args: {
    examId: v.id("exams"),
    type: v.union(v.literal("multipleChoice"), v.literal("openEnded")),
    allowRetries: v.boolean(),
  },
  handler: async (ctx, args) => {
    if (args.type !== "multipleChoice") {
      throw new ConvexError("Open ended practice exams are not available yet");
    }

    const identity = await requireIdentity(ctx);
    const exam = await ctx.db.get(args.examId);

    if (!exam) {
      throw new ConvexError("Exam not found");
    }

    const questions = await getExamQuestions(ctx, exam._id);

    if (questions.length === 0) {
      throw new ConvexError("This exam has no questions");
    }

    const questionIds = pickQuestionIds({
      allQuestions: questions,
      questionAmount: Math.min(20, questions.length),
      previousQuestionIds: [],
      selectionMode: "random",
      statsByQuestionId: new Map(),
    });

    const practiceExamId = await insertPracticeExam(ctx, {
      examId: exam._id,
      userTokenIdentifier: identity.tokenIdentifier,
      questionIds,
      allowRetries: args.allowRetries,
      questionSelectionMode: "random",
    });

    return { practiceExamId };
  },
});

export const retryPracticeExam = mutation({
  args: {
    practiceExamId: v.id("practiceExams"),
    otherQuestions: v.boolean(),
    questionAmount: v.number(),
    allowRetries: v.boolean(),
    questionSelectionMode: v.union(
      v.literal("globalUnanswered"),
      v.literal("sessionUnseen"),
      v.literal("weakest"),
    ),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const originalPracticeExam = await getOwnedPracticeExam(
      ctx,
      args.practiceExamId,
      identity.tokenIdentifier,
    );
    const questions = await getExamQuestions(ctx, originalPracticeExam.exam);

    if (questions.length === 0) {
      throw new ConvexError("This exam has no questions");
    }

    const originalRows = await getPracticeExamQuestionRows(ctx, originalPracticeExam._id);
    const previousQuestionIds = originalRows.map((row) => row.question);
    const boundedQuestionAmount = clamp(args.questionAmount, 1, questions.length);
    const statsByQuestionId = new Map<Id<"questions">, Doc<"userQuestionStats">>();

    if (args.otherQuestions) {
      for await (const stat of ctx.db
        .query("userQuestionStats")
        .withIndex("by_userTokenIdentifier_and_exam", (queryBuilder) =>
          queryBuilder
            .eq("userTokenIdentifier", identity.tokenIdentifier)
            .eq("exam", originalPracticeExam.exam),
        )) {
        statsByQuestionId.set(stat.question, stat);
      }
    }

    const questionIds = pickQuestionIds({
      allQuestions: questions,
      questionAmount: boundedQuestionAmount,
      previousQuestionIds,
      selectionMode: args.otherQuestions ? args.questionSelectionMode : "sameQuestions",
      statsByQuestionId,
    });

    const practiceExamId = await insertPracticeExam(ctx, {
      examId: originalPracticeExam.exam,
      userTokenIdentifier: identity.tokenIdentifier,
      questionIds,
      allowRetries: args.allowRetries,
      questionSelectionMode: args.otherQuestions
        ? args.questionSelectionMode
        : "sameQuestions",
      retryOf: originalPracticeExam._id,
    });

    return { practiceExamId };
  },
});

export const markPracticeExamStarted = mutation({
  args: {
    practiceExamId: v.id("practiceExams"),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const practiceExam = await getOwnedPracticeExam(
      ctx,
      args.practiceExamId,
      identity.tokenIdentifier,
    );

    if (practiceExam.status !== "not_started") {
      return { ok: true };
    }

    await ctx.db.patch(practiceExam._id, {
      status: "in_progress",
      startedAt: practiceExam.startedAt ?? Date.now(),
    });

    return { ok: true };
  },
});

export const getPracticeExam = query({
  args: {
    practiceExamId: v.id("practiceExams"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return null;
    }

    const practiceExam = await ctx.db.get(args.practiceExamId);

    if (!practiceExam || practiceExam.userTokenIdentifier !== identity.tokenIdentifier) {
      return null;
    }

    const exam = await ctx.db.get(practiceExam.exam);
    const rows = await getPracticeExamQuestionRows(ctx, practiceExam._id);
    const currentRow =
      practiceExam.status === "completed"
        ? null
        : rows.find((row) => row.order === practiceExam.activeQuestionOrder) ?? null;
    const currentQuestion = currentRow
      ? await ctx.db.get(currentRow.question)
      : null;

    return {
      id: practiceExam._id,
      examName: exam?.name ?? "Unknown exam",
      status: practiceExam.status,
      allowRetries: practiceExam.allowRetries,
      questionCount: practiceExam.questionCount,
      answeredCount: practiceExam.answeredCount,
      correctFirstTryCount: practiceExam.correctFirstTryCount,
      currentQuestion: currentRow && currentQuestion
        ? {
            id: currentQuestion._id,
            question: currentQuestion.question,
            options: currentQuestion.options,
            questionNumber: currentRow.order + 1,
            order: currentRow.order,
            selectedOptionIndex: currentRow.latestSelectedOptionIndex ?? null,
            attemptCount: currentRow.attemptCount,
            isCorrect: currentRow.isCorrect,
            isLocked: currentRow.isLocked,
            feedbackText: currentRow.feedbackText ?? null,
            feedbackSource: currentRow.feedbackSource ?? null,
          }
        : null,
    };
  },
});

export const submitAnswer = mutation({
  args: {
    practiceExamId: v.id("practiceExams"),
    questionId: v.id("questions"),
    selectedOptionIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const practiceExam = await getOwnedPracticeExam(
      ctx,
      args.practiceExamId,
      identity.tokenIdentifier,
    );
    const practiceExamQuestion = await ctx.db
      .query("practiceExamQuestions")
      .withIndex("by_practiceExam_and_question", (queryBuilder) =>
        queryBuilder
          .eq("practiceExam", practiceExam._id)
          .eq("question", args.questionId),
      )
      .unique();

    if (!practiceExamQuestion) {
      throw new ConvexError("Question not found in this practice exam");
    }

    if (practiceExamQuestion.order !== practiceExam.activeQuestionOrder) {
      throw new ConvexError("Only the active question can be answered");
    }

    if (practiceExamQuestion.isLocked) {
      return {
        outcome: practiceExamQuestion.isCorrect ? "correct" : "incorrect",
        feedbackText: practiceExamQuestion.feedbackText ?? null,
        feedbackSource: practiceExamQuestion.feedbackSource ?? null,
        needsAiFeedback: false,
        locked: true,
      };
    }

    const question = await ctx.db.get(args.questionId);

    if (!question) {
      throw new ConvexError("Question not found");
    }

    if (question.answer === undefined) {
      throw new ConvexError("This question has no stored answer");
    }

    if (
      args.selectedOptionIndex < 0 ||
      args.selectedOptionIndex >= question.options.length
    ) {
      throw new ConvexError("Invalid option");
    }

    const isCorrect = question.answer === args.selectedOptionIndex;
    const nextAttemptCount = practiceExamQuestion.attemptCount + 1;
    const shouldLock = isCorrect || !practiceExam.allowRetries;
    const staticHelp = question.help?.[optionLetter(args.selectedOptionIndex)];
    const cachedFeedback =
      practiceExamQuestion.feedbackForOptionIndex === args.selectedOptionIndex
        ? practiceExamQuestion.feedbackText
        : undefined;
    const feedbackText = isCorrect
      ? null
      : cachedFeedback ?? staticHelp ?? question.feedback ?? null;
    const feedbackSource = isCorrect
      ? null
      : cachedFeedback
        ? practiceExamQuestion.feedbackSource
        : staticHelp
          ? "help"
          : question.feedback
            ? "feedback"
            : null;
    const practiceExamPatch: Partial<Doc<"practiceExams">> = {};

    if (practiceExam.status === "not_started") {
      practiceExamPatch.status = "in_progress";
      practiceExamPatch.startedAt = practiceExam.startedAt ?? Date.now();
    }

    if (shouldLock) {
      practiceExamPatch.answeredCount = practiceExam.answeredCount + 1;
      practiceExamPatch.correctFirstTryCount =
        practiceExam.correctFirstTryCount +
        (isCorrect && practiceExamQuestion.attemptCount === 0 ? 1 : 0);
    }

    if (Object.keys(practiceExamPatch).length > 0) {
      await ctx.db.patch(practiceExam._id, practiceExamPatch);
    }

    await ctx.db.patch(practiceExamQuestion._id, {
      firstSelectedOptionIndex:
        practiceExamQuestion.firstSelectedOptionIndex ?? args.selectedOptionIndex,
      latestSelectedOptionIndex: args.selectedOptionIndex,
      firstAttemptCorrect:
        practiceExamQuestion.firstAttemptCorrect ?? isCorrect,
      isCorrect,
      retryCount: practiceExamQuestion.retryCount + (isCorrect ? 0 : 1),
      attemptCount: nextAttemptCount,
      isLocked: shouldLock,
      ...(feedbackText ? { feedbackText } : {}),
      ...(feedbackSource ? { feedbackSource } : {}),
      ...(!isCorrect ? { feedbackForOptionIndex: args.selectedOptionIndex } : {}),
    });

    const existingUserQuestionStat = await ctx.db
      .query("userQuestionStats")
      .withIndex("by_userTokenIdentifier_and_question", (queryBuilder) =>
        queryBuilder
          .eq("userTokenIdentifier", identity.tokenIdentifier)
          .eq("question", question._id),
      )
      .unique();

    if (existingUserQuestionStat) {
      const nextTotalAttempts = existingUserQuestionStat.totalAttempts + 1;

      await ctx.db.patch(existingUserQuestionStat._id, {
        hasAnswered: true,
        hasAnsweredCorrectly:
          existingUserQuestionStat.hasAnsweredCorrectly || isCorrect,
        totalAttempts: nextTotalAttempts,
        lastPracticeExamId: practiceExam._id,
        lastAnsweredAt: Date.now(),
        ...(!existingUserQuestionStat.attemptsBeforeFirstCorrect && isCorrect
          ? { attemptsBeforeFirstCorrect: nextTotalAttempts }
          : {}),
      });
    } else {
      await ctx.db.insert("userQuestionStats", {
        userTokenIdentifier: identity.tokenIdentifier,
        question: question._id,
        exam: question.exam,
        hasAnswered: true,
        hasAnsweredCorrectly: isCorrect,
        totalAttempts: 1,
        lastPracticeExamId: practiceExam._id,
        lastAnsweredAt: Date.now(),
        firstPracticeExamId: practiceExam._id,
        ...(isCorrect ? { attemptsBeforeFirstCorrect: 1 } : {}),
      });
    }

    return {
      outcome: isCorrect ? "correct" : "incorrect",
      feedbackText: feedbackText ?? null,
      feedbackSource: feedbackSource ?? null,
      needsAiFeedback: !isCorrect && !feedbackText,
      locked: shouldLock,
    };
  },
});

export const advanceToNextQuestion = mutation({
  args: {
    practiceExamId: v.id("practiceExams"),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const practiceExam = await getOwnedPracticeExam(
      ctx,
      args.practiceExamId,
      identity.tokenIdentifier,
    );

    if (practiceExam.status === "completed") {
      return { completed: true };
    }

    const currentRow = await ctx.db
      .query("practiceExamQuestions")
      .withIndex("by_practiceExam_and_order", (queryBuilder) =>
        queryBuilder
          .eq("practiceExam", practiceExam._id)
          .eq("order", practiceExam.activeQuestionOrder),
      )
      .unique();

    if (currentRow && !currentRow.isLocked) {
      throw new ConvexError("Answer the current question first");
    }

    const nextOrder = practiceExam.activeQuestionOrder + 1;

    if (nextOrder >= practiceExam.questionCount) {
      await ctx.db.patch(practiceExam._id, {
        status: "completed",
        completedAt: Date.now(),
        activeQuestionOrder: practiceExam.questionCount,
      });

      return { completed: true };
    }

    await ctx.db.patch(practiceExam._id, {
      activeQuestionOrder: nextOrder,
      status: "in_progress",
      startedAt: practiceExam.startedAt ?? Date.now(),
    });

    return { completed: false };
  },
});

export const getWrongAnswerFeedbackContext = internalQuery({
  args: {
    practiceExamId: v.id("practiceExams"),
    questionId: v.id("questions"),
    selectedOptionIndex: v.number(),
    userTokenIdentifier: v.string(),
  },
  handler: async (ctx, args) => {
    const practiceExam = await getOwnedPracticeExam(
      ctx,
      args.practiceExamId,
      args.userTokenIdentifier,
    );
    const row = await ctx.db
      .query("practiceExamQuestions")
      .withIndex("by_practiceExam_and_question", (queryBuilder) =>
        queryBuilder
          .eq("practiceExam", practiceExam._id)
          .eq("question", args.questionId),
      )
      .unique();
    const question = await ctx.db.get(args.questionId);

    if (!row || !question) {
      throw new ConvexError("Feedback context not found");
    }

    if (question.answer === undefined) {
      throw new ConvexError("This question has no stored answer");
    }

    if (question.answer === args.selectedOptionIndex) {
      throw new ConvexError("Feedback requested for a correct answer");
    }

    if (
      row.feedbackText &&
      row.feedbackForOptionIndex === args.selectedOptionIndex &&
      row.feedbackSource === "ai"
    ) {
      return {
        feedbackText: row.feedbackText,
        alreadyGenerated: true,
      };
    }

    return {
      feedbackText: null,
      alreadyGenerated: false,
      questionText: question.question,
      options: question.options,
      correctAnswerIndex: question.answer,
      selectedOptionIndex: args.selectedOptionIndex,
      feedbackPrompt: question.feedbackPrompt ?? null,
      literatureReference: question.literatureReference ?? null,
    };
  },
});

export const storeGeneratedFeedback = internalMutation({
  args: {
    practiceExamId: v.id("practiceExams"),
    questionId: v.id("questions"),
    selectedOptionIndex: v.number(),
    feedbackText: v.string(),
    userTokenIdentifier: v.string(),
  },
  handler: async (ctx, args) => {
    const practiceExam = await getOwnedPracticeExam(
      ctx,
      args.practiceExamId,
      args.userTokenIdentifier,
    );
    const row = await ctx.db
      .query("practiceExamQuestions")
      .withIndex("by_practiceExam_and_question", (queryBuilder) =>
        queryBuilder
          .eq("practiceExam", practiceExam._id)
          .eq("question", args.questionId),
      )
      .unique();

    if (!row) {
      throw new ConvexError("Practice exam question not found");
    }

    await ctx.db.patch(row._id, {
      feedbackText: args.feedbackText,
      feedbackSource: "ai",
      feedbackForOptionIndex: args.selectedOptionIndex,
    });

    return {
      feedbackText: args.feedbackText,
      feedbackSource: "ai" as const,
    };
  },
});
