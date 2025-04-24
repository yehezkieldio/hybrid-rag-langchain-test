import neo4j, { Driver } from "neo4j-driver";
import { env } from "#/env";

let driver: Driver | null = null;

export function getNeo4jDriver(): Driver {
    if (!driver) {
        try {
            driver = neo4j.driver(env.NEO4J_URI, neo4j.auth.basic(env.NEO4J_USERNAME, env.NEO4J_PASSWORD));
            driver
                .verifyAuthentication()
                .then(() => {
                    console.log("Neo4j driver initialized successfully.");
                })
                .catch((error) => {
                    console.error("Failed to authenticate with Neo4j:", error);
                    throw error;
                });
        } catch (error) {
            console.error("Failed to create Neo4j driver:", error);
            throw error;
        }
    }
    return driver;
}

export async function closeNeo4jDriver(): Promise<void> {
    if (driver) {
        await driver.close();
        driver = null;
        console.log("Neo4j Driver Closed");
    }
}

export async function queryKnowledgeGraph(
    cypherQuery: string,
    params: Record<string, unknown> = {}
): Promise<unknown[]> {
    const neo4jDriver = getNeo4jDriver();
    const session = neo4jDriver.session();

    try {
        // console.log("Executing Cypher:", cypherQuery, "Params:", params);
        const result = await session.run(cypherQuery, params);
        return result.records.map((record) => record.toObject());
    } catch (error) {
        console.error("Error querying Neo4j:", error);
        return [];
    } finally {
        await session.close();
    }
}
