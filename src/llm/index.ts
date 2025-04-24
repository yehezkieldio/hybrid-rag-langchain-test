import { ChatOpenAI } from "@langchain/openai";
import { env } from "#/env";

export const llm = new ChatOpenAI({
    model: env.OPENROUTER_LLM_MODEL,
    openAIApiKey: env.OPENROUTER_API_KEY,
    configuration: {
        baseURL: env.OPENROUTER_BASE_URL
    },
    temperature: 0.2,
    maxTokens: 500,
    streaming: false
});
