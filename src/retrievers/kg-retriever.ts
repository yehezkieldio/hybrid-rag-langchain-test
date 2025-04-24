import { Document } from "@langchain/core/documents";
import neo4j from "neo4j-driver";
import { queryKnowledgeGraph } from "#/database/neo4j";

// A more robust solution would use NLP libraries (like spaCy via Python or a JS alternative)
function extractPotentialEntities(query: string): string[] {
    // This is highly naive and needs improvement for real-world use
    const potential = query.match(/\b[A-Z][a-zA-Z]*\b/g) || [];
    const stopwords = new Set(["I", "The", "A", "An", "Is", "Was", "Who", "What", "Where", "When", "Why", "How"]);
    return potential.filter((e) => !stopwords.has(e));
}

function formatKGResults(results: unknown[], queryEntities: string[]): Document[] {
    // This needs to be adapted based on your actual Cypher query results
    return results.map((record, index) => {
        let content = `Information related to: ${queryEntities.join(", ")}\n`;
        // Try to serialize the record nicely
        try {
            content += JSON.stringify(record, null, 2);
        } catch {
            content += "Could not serialize KG record.";
        }
        return new Document({
            pageContent: content,
            metadata: {
                source: "knowledge_graph",
                record_index: index,
                query_entities: queryEntities
            }
        });
    });
}
export async function retrieveKGContext(query: string, k = 2): Promise<Document[]> {
    const entities = extractPotentialEntities(query);
    if (entities.length === 0) {
        console.log("No potential entities found in query for KG retrieval.");
        return [];
    }

    console.log(`Found potential entities for KG query: ${entities.join(", ")}`);

    // This is highly dependent on your KG schema.
    // Example: Find nodes matching the entities and their direct neighbors.
    // Use parameters ($entityList) to prevent injection vulnerabilities.
    const cypherQuery = `
      MATCH (n)
      WHERE n.name IN $entityList OR n.title IN $entityList
      OPTIONAL MATCH (n)-[r]-(m)
      RETURN n, r, m
      LIMIT $limit
    `;

    try {
        const results = await queryKnowledgeGraph(cypherQuery, {
            entityList: entities,
            limit: neo4j.int(k) // Use neo4j.int() to ensure integer type
        });
        console.log(`Retrieved ${results.length} results from knowledge graph.`);
        return formatKGResults(results, entities);
    } catch (error) {
        console.error("Error retrieving from knowledge graph:", error);
        return [];
    }
}
