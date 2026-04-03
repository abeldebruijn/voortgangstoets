"use node";

import { ConvexError, v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

type FeedbackContext =
  | {
      feedbackText: string;
      alreadyGenerated: true;
    }
  | {
      feedbackText: null;
      alreadyGenerated: false;
      questionText: string;
      options: string[];
      correctAnswerIndex: number;
      selectedOptionIndex: number;
      feedbackPrompt: string | null;
      literatureReference: string | null;
    };

type FeedbackResult = {
  feedbackText: string;
  feedbackSource: "ai";
};

function fallbackFeedback() {
  return "That answer is not correct. Review the stem carefully, compare the chosen option with the best matching alternative, and focus on the concept the question is testing.";
}

function buildPrompt(args: {
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  selectedOptionIndex: number;
  feedbackPrompt: string | null;
  literatureReference: string | null;
}) {
  const optionLines = args.options
    .map((option, index) => `${String.fromCharCode(65 + index)}. ${option}`)
    .join("\n");

  return [
    "Explain briefly why the chosen answer is wrong and why the correct answer fits better.",
    "Keep it to 2-4 sentences.",
    "Do not mention hidden chain-of-thought.",
    "Question:",
    args.questionText,
    "Options:",
    optionLines,
    `Chosen wrong answer: ${String.fromCharCode(65 + args.selectedOptionIndex)}`,
    `Correct answer: ${String.fromCharCode(65 + args.correctAnswerIndex)}`,
    args.feedbackPrompt ? `Topic hint: ${args.feedbackPrompt}` : null,
    args.literatureReference
      ? `Reference: ${args.literatureReference}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function extractContent(payload: {
  choices?: Array<{
    message?: {
      content?: string | Array<{ text?: string }>;
    };
  }>;
}) {
  const content = payload?.choices?.[0]?.message?.content;

  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((entry) =>
        typeof entry?.text === "string" ? entry.text : "",
      )
      .join("")
      .trim();
  }

  return "";
}

export const generateWrongAnswerFeedback = action({
  args: {
    practiceExamId: v.id("practiceExams"),
    questionId: v.id("questions"),
    selectedOptionIndex: v.number(),
  },
  handler: async (ctx, args): Promise<FeedbackResult> => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new ConvexError("Unauthorized");
    }

    const context = (await ctx.runQuery(
      internal.practiceExams.getWrongAnswerFeedbackContext,
      {
        ...args,
        userTokenIdentifier: identity.tokenIdentifier,
      },
    )) as FeedbackContext;

    if (context.feedbackText && context.alreadyGenerated) {
      return {
        feedbackText: context.feedbackText,
        feedbackSource: "ai",
      };
    }

    if (!("questionText" in context)) {
      throw new ConvexError("Feedback context unavailable");
    }

    const apiKey = process.env.AI_GATEWAY_API_KEY;
    const baseUrl =
      process.env.AI_GATEWAY_BASE_URL ?? "https://ai-gateway.vercel.sh/v1";
    const model = process.env.AI_GATEWAY_MODEL ?? "openai/gpt-4.1-mini";
    let feedbackText = fallbackFeedback();

    if (apiKey) {
      try {
        const response = await fetch(
          `${baseUrl.replace(/\/$/, "")}/chat/completions`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model,
              temperature: 0.3,
              messages: [
                {
                  role: "system",
                  content:
                    "You are a concise medical exam tutor. Explain wrong answers clearly and briefly.",
                },
                {
                  role: "user",
                  content: buildPrompt(context),
                },
              ],
            }),
          },
        );

        if (response.ok) {
          const payload = await response.json();
          const generated = extractContent(payload);

          if (generated) {
            feedbackText = generated;
          }
        }
      } catch {
        feedbackText = fallbackFeedback();
      }
    }

    return (await ctx.runMutation(internal.practiceExams.storeGeneratedFeedback, {
      ...args,
      feedbackText,
      userTokenIdentifier: identity.tokenIdentifier,
    })) as FeedbackResult;
  },
});
