import { Document } from "@langchain/core/documents";
import { Embeddings } from "@langchain/core/embeddings";
import { retrieveKGContext } from "./kg-retriever";
import { retrieveVectorContext } from "./vector-retriever";

interface HybridRetrieverOptions {
    vectorK?: number;
    kgK?: number;
}

export async function retrieveHybridContext(
    query: string,
    embeddings: Embeddings,
    options: HybridRetrieverOptions = {}
): Promise<Document[]> {
    const { vectorK = 4, kgK = 2 } = options;

    console.log(`Initiating parallel retrieval: Vector (k=${vectorK}), KG (k=${kgK})`);

    const [vectorResults, kgResults] = await Promise.all([
        retrieveVectorContext(query, embeddings, vectorK),
        retrieveKGContext(query, kgK) // KG retrieval might return fewer than k if no entities match
    ]);

    console.log(`Vector results: ${vectorResults.length}, KG results: ${kgResults.length}`);

    // Combine results. Optionally add markers or modify metadata.
    // Simple strategy: Put KG results first if found, as they might be more specific.
    const combinedContext = [...kgResults, ...vectorResults];

    // Optional: Deduplication (based on pageContent or a more sophisticated method)
    const uniqueContextMap = new Map<string, Document>();
    for (const doc of combinedContext) {
        // Simple deduplication based on exact page content
        if (!uniqueContextMap.has(doc.pageContent)) {
            uniqueContextMap.set(doc.pageContent, doc);
        }
    }

    const finalContext = Array.from(uniqueContextMap.values());

    console.log(`Aggregated and deduplicated context size: ${finalContext.length}`);

    // Potential more sophisticated implementation ranking:
    // 1. Score Normalization: If retrievers provide scores, normalize them.
    // 2. Relevance Re-ranking: Use a smaller LLM or cross-encoder to re-rank based on the query.
    // 3. Heuristics: Prioritize KG for specific entity questions, vectors for broader semantic queries.

    return finalContext;
}
