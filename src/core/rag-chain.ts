import type { Document } from "@langchain/core/documents";
import type { Embeddings } from "@langchain/core/embeddings";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import type { ChatOpenAI } from "@langchain/openai";
import { retrieveHybridContext } from "#/retrievers/hybrid-retriever";

const formatDocs = (docs: Document[]): string => {
    return docs
        .map((doc, i) => `Context Piece ${i + 1} (Source: ${doc.metadata?.source || "vector"}):\n${doc.pageContent}`)
        .join("\n\n---\n\n");
};

export function createHybridRagChain(llm: ChatOpenAI, embeddings: Embeddings) {
    const prompt = ChatPromptTemplate.fromMessages([
        [
            "system",
            `
            Your name is Mirae, an assistant for question-answering tasks.
            Use the provided context to answer the question as accurately and concisely as possible.
            Do not reference or mention the existence of any context in your response.
            Simply respond with the answer, based solely on the information given.
            If the answer is not available in the context, say you don't know.
            Do not provide explanations or assumptions beyond the given information.

            Context:
            {context}
            `
        ],
        ["human", "Question: {question}"]
    ]);

    const ragChain = RunnableSequence.from([
        {
            // Step 1: Retrieve context in parallel using the hybrid retriever
            context: async (input: { question: string }) => {
                const retrievedDocs = await retrieveHybridContext(input.question, embeddings);
                return formatDocs(retrievedDocs);
            },
            question: (input: { question: string }) => input.question
        },
        // Step 2: Prepare prompt for LLM
        prompt,
        // Step 3: Call LLM with the prompt
        llm,
        // Step 4: Parse the LLM output
        new StringOutputParser()
    ]);

    return ragChain;
}
