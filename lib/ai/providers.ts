import { createOpenAI } from "@ai-sdk/openai";
import {
	customProvider,
	extractReasoningMiddleware,
	wrapLanguageModel,
} from "ai";
import { isTestEnvironment } from "../constants";

const THINKING_SUFFIX_REGEX = /-thinking$/;

const proxy = createOpenAI({
	baseURL: process.env.AI_PROXY_URL || "http://localhost:8317/v1",
	apiKey: process.env.AI_PROXY_KEY || "dummy",
});

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

	const isReasoningModel =
		modelId.includes("reasoning") || modelId.endsWith("-thinking");

	if (isReasoningModel) {
		const cleanModelId = modelId.replace(THINKING_SUFFIX_REGEX, "");
		return wrapLanguageModel({
			model: proxy.languageModel(cleanModelId),
			middleware: extractReasoningMiddleware({ tagName: "thinking" }),
		});
	}

	return proxy.languageModel(modelId);
}

export function getTitleModel() {
	if (isTestEnvironment && myProvider) {
		return myProvider.languageModel("title-model");
	}
	return proxy.languageModel(process.env.TITLE_MODEL || "gemini-2.5-flash");
}

export function getArtifactModel() {
	if (isTestEnvironment && myProvider) {
		return myProvider.languageModel("artifact-model");
	}
	return proxy.languageModel(process.env.ARTIFACT_MODEL || "gemini-2.5-flash");
}
