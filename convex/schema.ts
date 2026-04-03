import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  numbers: defineTable({
    value: v.number(),
  }),

  exams: defineTable({
    name: v.string(),
    year: v.number(),
    month: v.number(),
  }),

  questions: defineTable({
    number: v.number(),
    question: v.string(),
    options: v.array(v.string()),
    answer: v.optional(v.number()),
    literatureReference: v.optional(v.string()),
    feedback: v.optional(v.string()),
    feedbackPrompt: v.optional(v.string()),
    exam: v.id("exams"),
    help: v.optional(v.record(v.string(), v.string())), // {A: string, B: string}
  }).index("by_exam_and_number", ["exam", "number"]),

  practiceSessions: defineTable({
    exam: v.id("exams"),
    userId: v.string(),
    score: v.number(),
    dataCreated: v.string(),
    timeStarted: v.string(),
    timeEnded: v.string(),
    questions: v.array(v.id("questions")),
    type: v.union(v.literal("MultipleChoice"), v.literal("OpenEnded")),
    allowRetries: v.boolean(),
  }),

  practiceExams: defineTable({
    exam: v.id("exams"),
    userTokenIdentifier: v.string(),
    status: v.union(
      v.literal("not_started"),
      v.literal("in_progress"),
      v.literal("completed"),
    ),
    type: v.literal("multipleChoice"),
    allowRetries: v.boolean(),
    questionCount: v.number(),
    answeredCount: v.number(),
    correctFirstTryCount: v.number(),
    activeQuestionOrder: v.number(),
    questionSelectionMode: v.union(
      v.literal("random"),
      v.literal("sameQuestions"),
      v.literal("globalUnanswered"),
      v.literal("sessionUnseen"),
      v.literal("weakest"),
    ),
    createdAt: v.number(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    retryOf: v.optional(v.id("practiceExams")),
  }).index("by_userTokenIdentifier_and_createdAt", [
    "userTokenIdentifier",
    "createdAt",
  ]),

  practiceExamQuestions: defineTable({
    practiceExam: v.id("practiceExams"),
    question: v.id("questions"),
    order: v.number(),
    firstSelectedOptionIndex: v.optional(v.number()),
    latestSelectedOptionIndex: v.optional(v.number()),
    firstAttemptCorrect: v.optional(v.boolean()),
    isCorrect: v.boolean(),
    retryCount: v.number(),
    attemptCount: v.number(),
    isLocked: v.boolean(),
    feedbackText: v.optional(v.string()),
    feedbackSource: v.optional(
      v.union(v.literal("help"), v.literal("feedback"), v.literal("ai")),
    ),
    feedbackForOptionIndex: v.optional(v.number()),
  })
    .index("by_practiceExam_and_order", ["practiceExam", "order"])
    .index("by_practiceExam_and_question", ["practiceExam", "question"]),

  userQuestionStats: defineTable({
    userTokenIdentifier: v.string(),
    question: v.id("questions"),
    exam: v.id("exams"),
    hasAnswered: v.boolean(),
    hasAnsweredCorrectly: v.boolean(),
    totalAttempts: v.number(),
    attemptsBeforeFirstCorrect: v.optional(v.number()),
    firstPracticeExamId: v.optional(v.id("practiceExams")),
    lastPracticeExamId: v.optional(v.id("practiceExams")),
    lastAnsweredAt: v.number(),
  })
    .index("by_userTokenIdentifier_and_exam", ["userTokenIdentifier", "exam"])
    .index("by_userTokenIdentifier_and_question", [
      "userTokenIdentifier",
      "question",
    ]),
});
