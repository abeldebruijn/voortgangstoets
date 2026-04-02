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
    answer: v.number(),
    literatureReference: v.optional(v.string()),
    feedback: v.optional(v.string()),
    feedbackPrompt: v.optional(v.string()),
    exam: v.id("exams"),
    help: v.optional(v.record(v.string(), v.string())), // {A: string, B: string}
  }),

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
});
