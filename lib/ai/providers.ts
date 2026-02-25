import { createGroq } from "@ai-sdk/groq";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";
import { isTestEnvironment } from "../constants";

const THINKING_SUFFIX_REGEX = /-thinking$/;

// CLIProxyAPI — coding tasks (Codex primary, Claude secondary, Gemini tertiary)
const cliproxy = createOpenAICompatible({
  name: "cliproxy",
  baseURL: process.env.CLIPROXY_BASE_URL || "http://cliproxy:8317/v1",
  apiKey: process.env.AI_PROXY_KEY || "fake",
});

// Groq — general chat, memory summarization, agent orchestration
const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY || "",
});

// Models that route through CLIProxyAPI
const CLIPROXY_MODEL_IDS = new Set([
  "gemini-3-flash-preview",
  "gemini-3-pro-preview",
  "gemini-2.5-pro",
  "gpt-5.3-codex",
  "gpt-5.3-codex-spark",
  "gpt-5.2",
]);

// Determine which provider handles a model
function resolveProvider(modelId: string): "cliproxy" | "groq" {
  if (CLIPROXY_MODEL_IDS.has(modelId.replace(THINKING_SUFFIX_REGEX, ""))) {
    return "cliproxy";
  }
  return "groq";
}

export const myProvider = isTestEnvironment
  ? (() => {
      const {
        artifactModel,
        chatModel,
        reasoningModel,
        titleModel,
      } = require("./models.mock");
      return customProvider({
        languageModels: {
          "chat-model": chatModel,
          "chat-model-reasoning": reasoningModel,
          "title-model": titleModel,
          "artifact-model": artifactModel,
        },
      });
    })()
  : null;

export function getLanguageModel(modelId: string) {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel(modelId);
  }

  const provider = resolveProvider(modelId);
  const isReasoningModel =
    modelId.includes("reasoning") || modelId.endsWith("-thinking");

  const cleanModelId = modelId.replace(THINKING_SUFFIX_REGEX, "");

  // adapted from plan: route by provider based on model ID
  const baseModel =
    provider === "cliproxy"
      ? cliproxy.languageModel(cleanModelId)
      : groq.languageModel(cleanModelId);

  console.log(`[provider] ${modelId} → ${provider}`);

  if (isReasoningModel) {
    return wrapLanguageModel({
      model: baseModel,
      middleware: extractReasoningMiddleware({ tagName: "thinking" }),
    });
  }

  return baseModel;
}

export function getTitleModel() {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel("title-model");
  }
  const titleModelId = process.env.TITLE_MODEL || "llama-3.3-70b-versatile";
  console.log(`[provider] title → groq (${titleModelId})`);
  return groq.languageModel(titleModelId);
}

export function getArtifactModel() {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel("artifact-model");
  }
  const artifactModelId = process.env.ARTIFACT_MODEL || "llama-3.3-70b-versatile";
  console.log(`[provider] artifact → groq (${artifactModelId})`);
  return groq.languageModel(artifactModelId);
}

// Export for use in memory/summarization jobs
export function getGroqModel(modelId = "llama-3.3-70b-versatile") {
  return groq.languageModel(modelId);
}
