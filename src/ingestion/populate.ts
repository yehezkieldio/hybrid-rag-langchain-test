import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { pool } from "#/database/drizzle";
import { getNeo4jDriver } from "#/database/neo4j";
import { embeddings } from "#/embeddings";
import { getVectorStore } from "#/retrievers/vector-retriever";

async function populateNeo4j() {
    const driver = getNeo4jDriver();
    const session = driver.session();
    console.log("Populating Neo4j with sample data...");

    try {
        await session.run("MATCH (n) DETACH DELETE n");

        // Add sample nodes and relationships (ADAPT TO YOUR SCHEMA)
        await session.run(`
            CREATE (p1:Person {name: 'Alice', title: 'Software Engineer'})
            CREATE (p2:Person {name: 'Bob', title: 'Data Scientist'})
            CREATE (c1:Company {name: 'Acme Corp'})
            CREATE (proj1:Project {name: 'Project Phoenix', description: 'A next-gen platform.'})
            CREATE (sk1:Skill {name: 'TypeScript'})
            CREATE (sk2:Skill {name: 'Python'})
            CREATE (sk3:Skill {name: 'Neo4j'})

            MERGE (p1)-[:WORKS_AT]->(c1)
            MERGE (p2)-[:WORKS_AT]->(c1)
            MERGE (p1)-[:WORKS_ON]->(proj1)
            MERGE (p1)-[:HAS_SKILL]->(sk1)
            MERGE (p1)-[:HAS_SKILL]->(sk3)
            MERGE (p2)-[:HAS_SKILL]->(sk2)
            MERGE (p2)-[:HAS_SKILL]->(sk3)
            MERGE (c1)-[:OWNS]->(proj1)
        `);
        console.log("Neo4j sample data added.");
    } catch (error) {
        console.error("Error populating Neo4j:", error);
    } finally {
        await session.close();
    }
}

async function populatePgVector() {
    console.log("Populating pgVector with sample documents...");
    const vectorStore = getVectorStore(embeddings);

    try {
        await vectorStore.ensureTableInDatabase();
        console.log("Checked/Created 'documents' table in pgVector.");
    } catch (error) {
        return console.error("Error ensuring table in pgVector:", error);
    }

    const sampleTexts = [
        "Alice is a Software Engineer at Acme Corp. She primarily uses TypeScript and is involved in Project Phoenix.",
        "Bob, a Data Scientist at Acme Corp, specializes in Python and graph databases like Neo4j.",
        "Project Phoenix aims to rebuild the company's main platform using modern technologies.",
        "Acme Corp encourages collaboration between different departments.",
        "Neo4j is a graph database management system developed by Neo4j, Inc.",
        "TypeScript adds static typing to JavaScript, improving code quality and maintainability."
    ];

    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 200,
        chunkOverlap: 20
    });

    const documents: Document[] = [];
    for (const text of sampleTexts) {
        const chunks = await splitter.splitText(text);
        chunks.forEach((chunk, i) => {
            documents.push(
                new Document({
                    pageContent: chunk,
                    metadata: { source: "sample_docs", original_text_index: i, chunk_index: i }
                })
            );
        });
    }

    try {
        await vectorStore.addDocuments(documents);
        console.log(`Added ${documents.length} document chunks to pgVector.`);
    } catch (error) {
        console.error("Error populating pgVector:", error);
    }
}

async function runPopulation() {
    await populateNeo4j();
    await populatePgVector();
    const driver = getNeo4jDriver();
    if (driver) await driver.close();
    await pool.end();
}

runPopulation();
