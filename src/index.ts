import type { RunnableSequence } from "@langchain/core/runnables";
import inquirer from "inquirer";
import { createHybridRagChain } from "#/core/rag-chain";
import { pool } from "#/database/drizzle";
import { closeNeo4jDriver } from "#/database/neo4j";
import { embeddings } from "#/embeddings";
import { llm } from "#/llm";

let isExiting = false;
let shutdownTimeout: NodeJS.Timeout;

async function gracefulShutdown(signal?: string) {
    if (isExiting) return;
    isExiting = true;

    console.log(`\nReceived ${signal || "shutdown"} signal. Shutting down...`);

    shutdownTimeout = setTimeout(() => {
        console.error("Forced shutdown after timeout");
        process.exit(1);
    }, 5000);

    try {
        await Promise.race([
            pool.end(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Database shutdown timeout")), 3000))
        ]);

        await closeNeo4jDriver();

        console.log("Connections closed. Exiting.");
        clearTimeout(shutdownTimeout);
        process.exit(0);
    } catch (error) {
        console.error("Error during shutdown:", error);
        clearTimeout(shutdownTimeout);
        process.exit(1);
    }
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGUSR2", () => gracefulShutdown("SIGUSR2"));
process.on("unhandledRejection", (reason) => {
    console.error("Unhandled Rejection:", reason);
    gracefulShutdown("unhandled rejection");
});

async function main() {
    let mainChain: RunnableSequence<
        {
            question: string;
        },
        string
    >;

    try {
        mainChain = createHybridRagChain(llm, embeddings);
        console.log("Main chain initialized.");
    } catch (error) {
        console.error("Failed to initialize the main chain:", error);
        await gracefulShutdown();
        return;
    }

    console.log("Initializing Hybrid RAG Chain...");

    const chatLoop = async () => {
        while (!isExiting) {
            try {
                interface PromptResult {
                    query: string;
                }

                const answer = await Promise.race<PromptResult>([
                    inquirer.prompt([
                        {
                            type: "input",
                            name: "query",
                            message: "You:",
                            validate: (_input: string) => {
                                if (isExiting) {
                                    return false; // Break validation if shutting down
                                }
                                return true;
                            }
                        }
                    ]),
                    new Promise((_, reject) => {
                        const checkExit = setInterval(() => {
                            if (isExiting) {
                                clearInterval(checkExit);
                                reject(new Error("Shutdown requested"));
                            }
                        }, 100);
                    })
                ]);

                if (isExiting) break;

                const query: string = answer.query;
                if (query.toLowerCase() === "exit") {
                    await gracefulShutdown();
                    break;
                }

                if (!query) {
                    continue;
                }

                console.log(`Waiting for assistant to respond...`);

                const result: string = await mainChain.invoke({ question: query });

                console.log(`\nAssistant:\n${result}\n`);
            } catch (error) {
                if (isExiting) break;
                console.error("\nAn error occurred:", error);
            }
        }
    };

    await chatLoop();
}

main().catch((error) => {
    console.error("Unhandled error in main execution:", error);
    process.exit(1);
});
